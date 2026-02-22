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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all users who have daily reminders enabled
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("user_id, display_name, email_daily_reminders")
      .eq("email_daily_reminders", true);

    if (profileErr) throw profileErr;

    const results: string[] = [];
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const profile of profiles || []) {
      // Check last transaction date
      const { data: lastTx } = await supabase
        .from("transactions")
        .select("date")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const lastDate = lastTx?.date ? new Date(lastTx.date) : null;
      const needsReminder = !lastDate || lastDate < twentyFourHoursAgo;

      if (!needsReminder) continue;

      // Get user email from auth
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      if (!authUser?.user?.email) continue;

      // Call send-email function
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

      const emailResult = await emailRes.json();
      results.push(`${authUser.user.email}: ${emailResult.success ? "sent" : "failed"}`);
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("daily-reminder-check error:", error);
    return new Response(JSON.stringify({ success: false, error: "An error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
