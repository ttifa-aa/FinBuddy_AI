import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Mic, MicOff, Bot, User, Loader2 } from "lucide-react";
import { parseExpense } from "@/lib/expense-parser";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useAddTransaction, type Transaction } from "@/hooks/use-transactions";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import type { ParsedExpense } from "@/lib/expense-parser";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
}

interface ChatSidebarProps {
  transactions: Transaction[];
}

// Parse special blocks from AI response
function parseSpecialBlocks(text: string) {
  const parts: Array<{ type: "text" | "chart" | "table" | "expense"; content: string; data?: any }> = [];
  let remaining = text;

  const blockRegex = /\$\$(CHART|TABLE|EXPENSE):(\{[\s\S]*?\})\$\$/g;
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    try {
      const data = JSON.parse(match[2]);
      parts.push({ type: match[1].toLowerCase() as any, content: "", data });
    } catch {
      parts.push({ type: "text", content: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text" as const, content: text }];
}

function MiniChart({ data }: { data: { type: string; labels: string[]; values: number[]; title?: string } }) {
  const chartData = data.labels.map((label, i) => ({ name: label, value: data.values[i] || 0 }));

  return (
    <div className="my-2 bg-background/50 rounded-lg p-2">
      {data.title && <p className="text-xs font-semibold mb-1 text-foreground/70">{data.title}</p>}
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
          <YAxis tick={{ fontSize: 9 }} width={35} />
          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniTable({ data }: { data: { headers: string[]; rows: string[][] } }) {
  return (
    <div className="my-2 overflow-x-auto rounded-lg border border-border bg-background/50">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {data.headers.map((h, i) => (
              <th key={i} className="px-2 py-1.5 text-left font-semibold text-foreground/70">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border/50 last:border-0">
              {row.map((cell, ci) => (
                <td key={ci} className="px-2 py-1 text-foreground/80">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RichMessage({ text }: { text: string }) {
  const parts = parseSpecialBlocks(text);

  return (
    <div>
      {parts.map((part, i) => {
        if (part.type === "chart" && part.data) {
          return <MiniChart key={i} data={part.data} />;
        }
        if (part.type === "table" && part.data) {
          return <MiniTable key={i} data={part.data} />;
        }
        return (
          <div key={i} className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>p]:leading-relaxed [&>ul]:my-1 [&>ol]:my-1">
            <ReactMarkdown>{part.content}</ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}

export function ChatSidebar({ transactions }: ChatSidebarProps) {
  const { user } = useAuth();
  const { format } = useCurrency();
  const addTransaction = useAddTransaction();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Hi! I'm your **AI finance analyst**. I can:\n- 📊 Answer questions like *\"How much did I spend on food last week?\"*\n- 📈 Show spending trends and charts\n- 🔍 Detect unusual charges\n- 💰 Log expenses via voice or text\n\nTry asking me anything! 🎤",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingExpense, setPendingExpense] = useState<ParsedExpense | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = useCallback((role: "user" | "bot", text: string) => {
    setMessages((prev) => [...prev, { id: Date.now().toString() + role, role, text }]);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    addMessage("user", text);
    setInput("");

    // Handle pending expense confirmation
    if (pendingExpense) {
      const lower = text.toLowerCase();
      if (lower === "yes" || lower === "y" || lower === "confirm") {
        addTransaction.mutate({
          description: pendingExpense.description,
          amount: pendingExpense.amount,
          category: pendingExpense.category,
          date: pendingExpense.date,
        });
        addMessage("bot", `✅ Saved! ${format(pendingExpense.amount)} for "${pendingExpense.description}" under **${pendingExpense.category}**.`);
        setPendingExpense(null);
        return;
      } else {
        addMessage("bot", "Okay, discarded. Ask me anything or log another expense!");
        setPendingExpense(null);
        return;
      }
    }

    // Send to AI analytics backend
    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        addMessage("bot", "⚠️ Please log in to use the analytics assistant.");
        setIsLoading(false);
        return;
      }

      const conversationHistory = messages
        .filter((m) => m.id !== "welcome")
        .slice(-10)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-analytics`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: text, history: conversationHistory }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        addMessage("bot", `⚠️ ${errData.error || "Something went wrong. Please try again."}`);
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      const reply = data.reply || "I couldn't process that.";

      // Check if AI returned an expense to confirm
      const expenseMatch = reply.match(/\$\$EXPENSE:(\{[\s\S]*?\})\$\$/);
      if (expenseMatch) {
        try {
          const expenseData = JSON.parse(expenseMatch[1]);
          setPendingExpense({
            amount: expenseData.amount,
            category: expenseData.category,
            description: expenseData.description,
            date: expenseData.date || new Date().toISOString().split("T")[0],
            confidence: 0.9,
          });
          // Show the reply without the raw expense block
          const cleanReply = reply.replace(/\$\$EXPENSE:\{[\s\S]*?\}\$\$/, "").trim();
          addMessage("bot", cleanReply || `Log **${format(expenseData.amount)}** for "${expenseData.description}" → **${expenseData.category}**?\n\nSave this? (yes/no)`);
        } catch {
          addMessage("bot", reply);
        }
      } else {
        addMessage("bot", reply);
      }
    } catch (err) {
      console.error("Chat error:", err);
      addMessage("bot", "⚠️ Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, pendingExpense, addMessage, addTransaction, messages, format]);

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="bg-chat-header text-chat-header-foreground px-5 py-4 flex items-center gap-3">
        <Bot className="h-5 w-5" />
        <div>
          <h2 className="text-sm font-bold">Finance Analyst</h2>
          <p className="text-xs opacity-80">Ask anything about your spending</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 animate-slide-in-right ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "bot" && (
              <div className="w-7 h-7 rounded-full bg-chat-bot flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-chat-bot-foreground" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user" ? "bg-chat-user text-chat-user-foreground rounded-br-sm" : "bg-chat-bot text-chat-bot-foreground rounded-bl-sm"}`}>
              {msg.role === "bot" ? <RichMessage text={msg.text} /> : msg.text}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-chat-user flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5 text-chat-user-foreground" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-chat-bot flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="h-3.5 w-3.5 text-chat-bot-foreground" />
            </div>
            <div className="bg-chat-bot text-chat-bot-foreground rounded-xl rounded-bl-sm px-4 py-2.5 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border bg-background">
        <div className="flex items-center gap-2">
          {isSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              className={`p-2.5 rounded-lg transition-all ${isListening ? "bg-accent text-accent-foreground animate-pulse-soft" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={isListening ? "Listening..." : isLoading ? "Thinking..." : "Ask about spending or log an expense..."}
            className="flex-1 bg-muted rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
