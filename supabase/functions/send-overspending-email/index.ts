import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Full currency symbol map — matches CurrencyContext.tsx on the frontend
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF",
  CNY: "¥",
  BRL: "R$",
};

function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { user_id, percentage, total_spent, budget, category, category_total } =
      await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has overspending email alerts enabled
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("display_name, email_overspending_alerts, currency")
      .eq("user_id", user_id)
      .single();

    if (profileErr) {
      console.error("Profile fetch error:", profileErr);
      throw new Error("Could not fetch user profile");
    }

    if (!profile?.email_overspending_alerts) {
      console.log(`Skipping email for user ${user_id} — overspending alerts disabled`);
      return new Response(
        JSON.stringify({ success: true, skipped: "preference_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user's email from auth
    const { data: authData, error: authErr } = await supabase.auth.admin.getUserById(user_id);
    if (authErr || !authData?.user?.email) {
      console.error("Auth user fetch error:", authErr);
      throw new Error("User email not found");
    }

    const userEmail = authData.user.email;
    const symbol = getCurrencySymbol(profile.currency ?? "USD");
    const pct = Number(percentage);

    // Determine severity for subject line and email type
    // pct >= 100 = critical (budget exceeded), pct >= 80 = warning
    const isCritical = pct >= 100;
    const subject = isCritical
      ? `🚨 Budget Exceeded — You've spent ${pct}% of your monthly budget`
      : `⚠️ Budget Warning — You've used ${pct}% of your monthly budget`;

    // Call the send-email function
    const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: userEmail,
        subject,
        type: "overspending",
        data: {
          name: profile.display_name || userEmail.split("@")[0],
          percentage: String(pct),
          total_spent: `${symbol}${Number(total_spent).toFixed(2)}`,
          budget: `${symbol}${Number(budget).toFixed(2)}`,
          category: category || "",
          category_total: category_total
            ? `${symbol}${Number(category_total).toFixed(2)}`
            : "",
          // Pass severity so send-email can style the email differently
          severity: isCritical ? "critical" : "warning",
        },
      }),
    });

    const result = await emailRes.json();

    if (!emailRes.ok) {
      console.error("send-email returned error:", result);
      throw new Error(`send-email failed: ${JSON.stringify(result)}`);
    }

    console.log(`Budget alert email sent to ${userEmail} (${pct}%)`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-overspending-email error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
