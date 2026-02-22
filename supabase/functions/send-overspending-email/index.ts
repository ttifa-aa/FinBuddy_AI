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

    const { user_id, percentage, total_spent, budget, category, category_total } = await req.json();

    // Check if user has overspending emails enabled
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email_overspending_alerts, currency")
      .eq("user_id", user_id)
      .single();

    if (!profile?.email_overspending_alerts) {
      return new Response(
        JSON.stringify({ success: true, skipped: "preference_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email
    const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
    if (!authUser?.user?.email) {
      throw new Error("User email not found");
    }

    const currencySymbol = profile.currency === "INR" ? "₹" : profile.currency === "EUR" ? "€" : "$";

    // Call send-email
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

    const result = await emailRes.json();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-overspending-email error:", error);
    return new Response(JSON.stringify({ success: false, error: "An error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
