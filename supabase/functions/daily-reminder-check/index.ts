// Daily Reminder Check Edge Function
// This function checks for users who haven't logged transactions in the last 24 hours
// and sends them reminder emails if they have daily reminders enabled

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

    // ── USER FETCHING ───────────────────────────────────────────────────────

    // Get all users who have daily email reminders enabled
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("user_id, display_name, email_daily_reminders")
      .eq("email_daily_reminders", true);

    if (profileErr) throw profileErr;

    // ── REMINDER PROCESSING ──────────────────────────────────────────────────

    // Initialize results array to track email sending outcomes
    const results: string[] = [];

    // Calculate time threshold (24 hours ago)
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Process each user with daily reminders enabled
    for (const profile of profiles || []) {
      // Check the date of their most recent transaction
      const { data: lastTx } = await supabase
        .from("transactions")
        .select("date")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // Determine if user needs a reminder (no transaction in last 24 hours)
      const lastDate = lastTx?.date ? new Date(lastTx.date) : null;
      const needsReminder = !lastDate || lastDate < twentyFourHoursAgo;

      // Skip users who don't need reminders
      if (!needsReminder) continue;

      // ── EMAIL SENDING ─────────────────────────────────────────────────────

      // Get user's email address from Supabase Auth
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      if (!authUser?.user?.email) continue;

      // Call the send-email Edge Function to deliver the reminder
      const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: authUser.user.email,
          subject: "📝 Don't forget to log your spending today!",
          type: "daily_reminder",
          data: {
            name: profile.display_name || authUser.user.email.split("@")[0],
            app_url: Deno.env.get("APP_URL") || "https://sams-finbuddy-ai.lovable.app",
          },
        }),
      });

      // Record the email sending result
      const emailResult = await emailRes.json();
      results.push(`${authUser.user.email}: ${emailResult.success ? "sent" : "failed"}`);
    }

    // ── RESPONSE ────────────────────────────────────────────────────────────

    // Return success response with processing details
    return new Response(
      JSON.stringify({ success: true, processed: results.length, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  // ── ERROR HANDLING ────────────────────────────────────────────────────────
  } catch (error) {
    console.error("daily-reminder-check error:", error);
    return new Response(JSON.stringify({ success: false, error: "An error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
