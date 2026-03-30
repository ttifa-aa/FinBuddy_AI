// Send Overspending Email Edge Function
// This function sends budget alert emails when users exceed spending thresholds
// Called automatically when spending reaches certain percentages of monthly budget

// Import Deno HTTP server utilities and Supabase client
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Main Edge Function handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── SETUP ───────────────────────────────────────────────────────────────

    // Get Supabase configuration from environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Initialize Supabase client with service role for admin operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── REQUEST PARSING ─────────────────────────────────────────────────────

    // Parse request body containing overspending alert data
    const { user_id, percentage, total_spent, budget, category, category_total } = await req.json();

    // ── USER PREFERENCES ────────────────────────────────────────────────────

    // Check if user has overspending email alerts enabled
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email_overspending_alerts, currency")
      .eq("user_id", user_id)
      .single();

    // Skip sending email if user has disabled overspending alerts
    if (!profile?.email_overspending_alerts) {
      return new Response(
        JSON.stringify({ success: true, skipped: "preference_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── EMAIL RETRIEVAL ────────────────────────────────────────────────────

    // Get user's email address from Supabase Auth
    const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
    if (!authUser?.user?.email) {
      throw new Error("User email not found");
    }

    // ── CURRENCY FORMATTING ─────────────────────────────────────────────────

    // Determine currency symbol based on user's currency preference
    const currencySymbol = profile.currency === "INR" ? "₹" : profile.currency === "EUR" ? "€" : "$";

    // ── EMAIL SENDING ──────────────────────────────────────────────────────

    // Call the send-email Edge Function to deliver the overspending alert
    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
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

    // ── RESPONSE ────────────────────────────────────────────────────────────

    // Return the result from the email sending function
    const result = await emailRes.json();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // ── ERROR HANDLING ────────────────────────────────────────────────────────
  } catch (error) {
    console.error("send-overspending-email error:", error);
    return new Response(JSON.stringify({ success: false, error: "An error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
