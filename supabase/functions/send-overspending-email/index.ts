// Send Overspending Email Edge Function
// Called when a user's spending reaches a budget threshold.
// Invoked by: (1) the DB trigger via pg_net, (2) the client-side fallback in use-transactions.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // FIX: Always create the admin client with the service role key regardless
    // of what Bearer token the caller used. The DB trigger passes the service
    // role key as Bearer; the client SDK passes the user's JWT. Both are valid
    // callers — we always do admin operations with the service role key below.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { user_id, percentage, total_spent, budget, category, category_total } =
      await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has overspending email alerts enabled
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("display_name, email_overspending_alerts, currency")
      .eq("user_id", user_id)
      .single();

    if (profileErr) throw profileErr;

    if (!profile?.email_overspending_alerts) {
      return new Response(
        JSON.stringify({ success: true, skipped: "preference_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user's email from Supabase Auth admin API
    const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(user_id);
    if (authErr || !authUser?.user?.email) {
      throw new Error("User email not found");
    }

    const currencySymbol =
      profile.currency === "INR" ? "₹" : profile.currency === "EUR" ? "€" : "$";

    // FIX: Call send-email using the service role key in the Authorization header.
    // Previously this was using the wrong key variable causing 401 errors.
    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        // The send-email function validates this header via Supabase's built-in
        // JWT verification middleware. Service role key is a valid Bearer token.
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        // Required by Supabase Edge Function gateway
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        to: authUser.user.email,
        subject: `🚨 Budget Alert: You've used ${percentage}% of your monthly budget`,
        type: "overspending",
        data: {
          name: profile.display_name || authUser.user.email.split("@")[0],
          percentage: String(percentage),
          total_spent: `${currencySymbol}${total_spent}`,
          budget: `${currencySymbol}${budget}`,
          category: category || "",
          category_total: category_total ? `${currencySymbol}${category_total}` : "",
        },
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      throw new Error(`send-email returned ${emailRes.status}: ${errBody}`);
    }

    const result = await emailRes.json();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("send-overspending-email error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
