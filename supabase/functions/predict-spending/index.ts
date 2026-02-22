import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch transactions
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (txError) throw txError;

    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({
        weekEstimate: 0,
        monthEstimate: 0,
        typicalSpend: 0,
        confidence: "Not enough data",
        dataMonths: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use AI to generate predictions
    const apiKey = Deno.env.get("GROQ_API_KEY");
    const txSummary = transactions.slice(0, 100).map(t => `${t.date}: ${t.category} ${t.amount}`).join("\n");

    const today = new Date().toISOString().slice(0, 10);
    const dates = transactions.map(t => t.date);
    const oldestDate = dates[dates.length - 1];
    const monthsDiff = Math.max(1, Math.ceil((new Date(today).getTime() - new Date(oldestDate).getTime()) / (30 * 24 * 60 * 60 * 1000)));

    const totalSpending = transactions.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const monthlyAvg = totalSpending / monthsDiff;

    // Calculate last 3 months average
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentTx = transactions.filter((t: any) => new Date(t.date) >= threeMonthsAgo);
    const recentTotal = recentTx.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const typicalSpend = Math.round(recentTotal / Math.min(3, monthsDiff) * 100) / 100;

    // Week estimate: daily avg * 7
    const dayOfMonth = new Date().getDate();
    const currentMonthTx = transactions.filter((t: any) => t.date.startsWith(today.slice(0, 7)));
    const currentMonthTotal = currentMonthTx.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const dailyAvg = currentMonthTotal / Math.max(dayOfMonth, 1);
    const weekEstimate = Math.round(dailyAvg * 7 * 100) / 100;
    const monthEstimate = Math.round(dailyAvg * 30 * 100) / 100;

    let confidence = "Low confidence";
    if (monthsDiff >= 6) confidence = "High confidence (6+ months of data)";
    else if (monthsDiff >= 3) confidence = "Medium confidence (3+ months of data)";
    else confidence = `Low confidence (${monthsDiff} month${monthsDiff > 1 ? 's' : ''} of data)`;

    // Use AI for a spending insight
    let aiInsight = "";
    if (apiKey) {
      try {
        const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: "You are a concise financial advisor. Given spending data, provide ONE brief actionable insight in 1-2 sentences. No markdown." },
              { role: "user", content: `My recent transactions:\n${txSummary}\n\nMonthly average: ${monthlyAvg.toFixed(2)}. Current month projection: ${monthEstimate}. Typical 3-month average: ${typicalSpend}. Give me a brief insight.` }
            ],
            max_tokens: 100,
          }),
        });
        const aiData = await aiRes.json();
        aiInsight = aiData.choices?.[0]?.message?.content || "";
      } catch {
        aiInsight = "";
      }
    }

    return new Response(JSON.stringify({
      weekEstimate,
      monthEstimate,
      typicalSpend,
      confidence,
      dataMonths: monthsDiff,
      aiInsight,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("predict-spending error:", err);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
