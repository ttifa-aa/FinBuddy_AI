// Chat Analytics Edge Function
// This function provides AI-powered financial analysis and chat capabilities
// Using Groq API (free tier, no credit card required)
// Get your free key at: https://console.groq.com

// Import Supabase Edge Runtime types and client
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Main Edge Function handler
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── AUTHENTICATION ──────────────────────────────────────────────────────

    // Extract and validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify the user's JWT token
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── REQUEST VALIDATION ──────────────────────────────────────────────────

    // Parse and validate request body
    const { message, history } = await req.json();
    if (!message || typeof message !== "string" || message.length > 1000) {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── DATA FETCHING ───────────────────────────────────────────────────────

    // Fetch user's recent transactions (up to 500, ordered by date descending)
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("id, amount, category, description, date, flagged")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(500);

    if (txError) throw txError;

    // Fetch user's profile data (budget and currency preferences)
    const { data: profile } = await supabase
      .from("profiles")
      .select("monthly_budget, currency")
      .eq("user_id", user.id)
      .single();

    // ── DATA PROCESSING ─────────────────────────────────────────────────────

    // Set up date and financial context
    const today = new Date().toISOString().slice(0, 10);
    const currency = profile?.currency ?? "USD";
    const budget = profile?.monthly_budget ?? 2000;

    // Format transaction data for AI analysis (limit to 200 most recent)
    const txLines = (transactions ?? [])
      .slice(0, 200)
      .map((t: any) => `${t.date} | ${t.category} | ${t.description} | ${t.amount} | flagged:${t.flagged ?? false}`)
      .join("\n");

    // Calculate spending summary by category
    const catSummary: Record<string, { total: number; count: number }> = {};
    for (const t of transactions ?? []) {
      const cat = t.category || "Other";
      if (!catSummary[cat]) catSummary[cat] = { total: 0, count: 0 };
      catSummary[cat].total += Number(t.amount);
      catSummary[cat].count++;
    }
    const catLines = Object.entries(catSummary)
      .map(([cat, s]) => `${cat}: total=${s.total.toFixed(2)}, count=${s.count}`)
      .join("\n");

    // Calculate daily spending totals for trend analysis
    const dailyTotals: Record<string, number> = {};
    for (const t of transactions ?? []) {
      dailyTotals[t.date] = (dailyTotals[t.date] || 0) + Number(t.amount);
    }

    // Detect spending anomalies (transactions > 2x category average)
    const anomalies: any[] = [];
    for (const t of transactions ?? []) {
      const cat = t.category || "Other";
      const avg = catSummary[cat] ? catSummary[cat].total / catSummary[cat].count : 0;
      if (Number(t.amount) > avg * 2 && avg > 0) anomalies.push(t);
    }
    const anomalyLines = anomalies
      .slice(0, 10)
      .map((t: any) => `${t.date} | ${t.category} | ${t.description} | ${t.amount}`)
      .join("\n");

    // ── AI PROMPT CONSTRUCTION ──────────────────────────────────────────────

    // Construct comprehensive system prompt with user data and instructions
    const systemPrompt = `You are a personal finance analyst chatbot. You have READ-ONLY access to the user's transaction data. Today is ${today}. Currency: ${currency}. Monthly budget: ${budget}.

TRANSACTION DATA (date | category | description | amount | flagged):
${txLines || "No transactions yet."}

CATEGORY SUMMARY:
${catLines || "No data."}

DAILY TOTALS (for trend charts):
${Object.entries(dailyTotals).sort().slice(-30).map(([d, t]) => `${d}: ${(t as number).toFixed(2)}`).join("\n") || "No data."}

ANOMALIES (expenses > 2x category average):
${anomalyLines || "None detected."}

INSTRUCTIONS:
1. Answer financial questions by analyzing the data above. Never modify data.
2. For expense entry requests (e.g., "spent 50 on lunch"), respond with EXACTLY this JSON on its own line:
   $$EXPENSE:{"amount":50,"category":"Food","description":"lunch","date":"${today}"}$$
   Then add a confirmation message asking the user to confirm.
3. For trend/chart requests, include a chart block:
   $$CHART:{"type":"bar","labels":["Mon","Tue"],"values":[100,200],"title":"Spending Trend"}$$
4. For list/table requests, include a table block:
   $$TABLE:{"headers":["Date","Category","Amount"],"rows":[["2026-02-01","Food","50.00"]]}$$
5. Use markdown formatting for emphasis. Keep responses concise.
6. For anomaly/outlier questions, analyze the anomalies data above.
7. For comparative questions (this month vs last month), compute from the transaction data.
8. Always include the currency symbol (${currency}) when showing amounts.
9. When asked about merchants/vendors, search the description field.
10. For "how much" questions, always provide the exact computed total.

BUDGET COACHING INSTRUCTIONS:
You are also a personalized budget coach. When users mention savings goals, purchases they want to make, or financial targets:

11. SAVINGS GOAL DETECTION: When a user says something like "I want to buy X for $Y by [date]" or "I want to save $Y for X":
    - Calculate exactly how many days/weeks/months remain until the target date
    - Calculate how much they need to save per day, per week, and per month
    - Look at their actual spending data to find specific categories where they can realistically cut back
    - Suggest a concrete weekly savings plan based on their real spending habits
    - Be specific — name the actual categories they overspend on and by how much
    - Show a savings progress table like:
      $$TABLE:{"headers":["Week","Save Per Week","Running Total"],"rows":[["Week 1","$X","$X"],["Week 2","$X","$2X"]]}$$

12. SPENDING HABIT COACHING: When asked for advice on saving or budgeting:
    - Analyse their top 3 spending categories from the data
    - Identify which ones are highest relative to typical budgets
    - Give specific, actionable cutback suggestions (e.g. "You spent ${currency}X on Food this month — reducing to ${currency}Y would free up ${currency}Z")
    - Always be encouraging and realistic, not judgmental

13. FINANCIAL DISCIPLINE TIPS: When users ask for general financial advice:
    - Base advice on their actual spending patterns, not generic tips
    - Point out positive trends (e.g. "Your Food spending dropped 20% this month — great progress!")
    - Suggest the 50/30/20 rule adapted to their actual budget
    - Recommend which category to tackle first based on their data

14. GOAL TRACKING: If a user mentions a previously stated goal, check if their recent spending aligns with achieving it and give an honest progress update.

15. Always end coaching responses with one specific actionable tip the user can apply TODAY based on their data.`;

    // ── AI API CALL ─────────────────────────────────────────────────────────

    // Validate Groq API key is configured
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      return new Response(JSON.stringify({ error: "AI not configured — set GROQ_API_KEY secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build conversation history in OpenAI-compatible format (Groq uses same format)
    const conversationMessages = [
      { role: "system", content: systemPrompt },
      ...(Array.isArray(history)
        ? history.slice(-10).map((h: any) => ({
            role: h.role === "bot" ? "assistant" : h.role,
            content: h.text || h.content || "",
          }))
        : []),
      { role: "user", content: message },
    ];

    // Call Groq API for AI response
    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: conversationMessages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    // Handle API errors
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Groq error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── RESPONSE HANDLING ───────────────────────────────────────────────────

    // Parse AI response and return to client
    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content || "I couldn't process that. Please try again.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // ── ERROR HANDLING ────────────────────────────────────────────────────────
  } catch (err) {
    console.error("chat-analytics error:", err);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
