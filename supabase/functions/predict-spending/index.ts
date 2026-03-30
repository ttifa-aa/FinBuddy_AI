// Predict Spending Edge Function
// This function analyzes user transaction history to predict future spending
// and provides AI-powered financial insights

// Import Supabase Edge Runtime types and client
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// CORS headers for cross-origin requests
// CORS stands for Cross-Origin Resource Sharing and allows this function to be called from the frontend application hosted on a different origin.
// The headers specify that any origin can access this function and define which headers are allowed in requests.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Main Edge Function handler
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── AUTHENTICATION ──────────────────────────────────────────────────────

    // Extract and validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Initialize Supabase client and verify user token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── DATA FETCHING ───────────────────────────────────────────────────────

    // Fetch all user transactions ordered by date (most recent first)
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (txError) throw txError;

    // Handle case where user has no transactions
    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({
        weekEstimate: 0,
        monthEstimate: 0,
        typicalSpend: 0,
        confidence: "Not enough data",
        dataMonths: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── DATA ANALYSIS ───────────────────────────────────────────────────────

    // Prepare transaction summary for AI analysis (limit to 100 most recent)
    const apiKey = Deno.env.get("GROQ_API_KEY");
    const txSummary = transactions.slice(0, 100).map(t => `${t.date}: ${t.category} ${t.amount}`).join("\n");

    // Calculate data timeframe and basic statistics
    const today = new Date().toISOString().slice(0, 10);
    const dates = transactions.map(t => t.date);
    const oldestDate = dates[dates.length - 1];
    const monthsDiff = Math.max(1, Math.ceil((new Date(today).getTime() - new Date(oldestDate).getTime()) / (30 * 24 * 60 * 60 * 1000)));

    // Calculate overall spending metrics
    const totalSpending = transactions.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const monthlyAvg = totalSpending / monthsDiff;

    // Calculate 3-month average for more recent spending patterns
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentTx = transactions.filter((t: any) => new Date(t.date) >= threeMonthsAgo);
    const recentTotal = recentTx.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const typicalSpend = Math.round(recentTotal / Math.min(3, monthsDiff) * 100) / 100;

    // ── SPENDING PROJECTIONS ────────────────────────────────────────────────

    // Calculate weekly and monthly spending estimates based on current month progress
    const dayOfMonth = new Date().getDate();
    const currentMonthTx = transactions.filter((t: any) => t.date.startsWith(today.slice(0, 7)));
    const currentMonthTotal = currentMonthTx.reduce((s: number, t: any) => s + Number(t.amount), 0);
    const dailyAvg = currentMonthTotal / Math.max(dayOfMonth, 1);
    const weekEstimate = Math.round(dailyAvg * 7 * 100) / 100;
    const monthEstimate = Math.round(dailyAvg * 30 * 100) / 100;

    // Determine confidence level based on data availability
    let confidence = "Low confidence";
    if (monthsDiff >= 6) confidence = "High confidence (6+ months of data)";
    else if (monthsDiff >= 3) confidence = "Medium confidence (3+ months of data)";
    else confidence = `Low confidence (${monthsDiff} month${monthsDiff > 1 ? 's' : ''} of data)`;

    // ── AI INSIGHTS ─────────────────────────────────────────────────────────

    // Generate AI-powered spending insight using Groq API
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
        // Silently fail if AI call fails - aiInsight remains empty
        aiInsight = "";
      }
    }

    // ── RESPONSE ────────────────────────────────────────────────────────────

    // Return spending predictions and insights
    return new Response(JSON.stringify({
      weekEstimate,
      monthEstimate,
      typicalSpend,
      confidence,
      dataMonths: monthsDiff,
      aiInsight,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // ── ERROR HANDLING ────────────────────────────────────────────────────────
  } catch (err) {
    console.error("predict-spending error:", err);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
