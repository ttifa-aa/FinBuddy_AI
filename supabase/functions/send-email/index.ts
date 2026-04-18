import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  to: string;
  subject: string;
  type: "overspending" | "daily_reminder";
  data: Record<string, string>;
}

function buildOverspendingHtml(data: Record<string, string>): string {
  // Use different header color for warning vs critical
  const isCritical = data.severity === "critical";
  const headerColor = isCritical ? "#9A3A3A" : "#C07A3A"; // deep red vs burnt orange
  const accentColor = isCritical ? "#9A3A3A" : "#C07A3A";
  const bgColor = isCritical ? "#fdf2f2" : "#fdf6ee";
  const emoji = isCritical ? "🚨" : "⚠️";
  const headline = isCritical ? "Budget Exceeded" : "Budget Warning";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#f5f0f0;font-family:'Quicksand',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:${headerColor};padding:28px 32px;text-align:center;">
      <p style="margin:0 0 6px;font-size:28px;">${emoji}</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px;">${headline}</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#3a3a3a;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Hi <strong>${data.name || "there"}</strong>,
      </p>
      <p style="color:#3a3a3a;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Your spending has reached <strong style="color:${accentColor};font-size:18px;">${data.percentage}%</strong> of your monthly budget.
      </p>
      ${
        data.category
          ? `<p style="color:#3a3a3a;font-size:15px;line-height:1.7;margin:0 0 16px;">
              <strong>Triggered by:</strong> ${data.category} (${data.category_total})<br>
              <strong>Total spending:</strong> ${data.total_spent} of ${data.budget} budget
             </p>`
          : `<p style="color:#3a3a3a;font-size:15px;line-height:1.7;margin:0 0 16px;">
              <strong>Total spending:</strong> ${data.total_spent} of ${data.budget} budget
             </p>`
      }
      <div style="background:${bgColor};border-left:4px solid ${accentColor};padding:16px;border-radius:8px;margin:24px 0;">
        <p style="margin:0;color:${accentColor};font-size:14px;font-weight:600;">
          ${
            isCritical
              ? "You have exceeded your budget for this month. Consider pausing non-essential spending."
              : "You're approaching your monthly limit. Review your recent expenses to stay on track."
          }
        </p>
      </div>
      <p style="color:#888;font-size:13px;margin:24px 0 0;text-align:center;">
        — Your FinBuddy AI Assistant
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildReminderHtml(data: Record<string, string>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#f0f2f3;font-family:'Quicksand',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#2A9D8F;padding:28px 32px;text-align:center;">
      <p style="margin:0 0 6px;font-size:28px;">📝</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px;">Log Your Spending</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#3a3a3a;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Hi <strong>${data.name || "there"}</strong>,
      </p>
      <p style="color:#3a3a3a;font-size:15px;line-height:1.7;margin:0 0 16px;">
        We noticed you haven't logged any expenses in the last 24 hours. Staying consistent with your spending diary is the key to financial awareness! 💪
      </p>
      <div style="background:#f0faf9;border-left:4px solid #2A9D8F;padding:16px;border-radius:8px;margin:24px 0;">
        <p style="margin:0;color:#2A9D8F;font-size:14px;font-weight:600;">
          Even small purchases matter. Open FinBuddy and log today's expenses — it takes just seconds!
        </p>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${data.app_url || "#"}" style="display:inline-block;background:#2A9D8F;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
          Open FinBuddy
        </a>
      </div>
      <p style="color:#888;font-size:13px;margin:24px 0 0;text-align:center;">
        — Your FinBuddy AI Assistant
      </p>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY secret is not set in Supabase");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured — RESEND_API_KEY missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, subject, type, data } = (await req.json()) as EmailRequest;

    if (!to || !subject || !type) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: to, subject, type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html =
      type === "overspending"
        ? buildOverspendingHtml(data)
        : buildReminderHtml(data);

    console.log(`Sending ${type} email to ${to}`);

    // NOTE: The "from" address must be either:
    //   a) "onboarding@resend.dev" — but ONLY works if "to" is your Resend account email
    //   b) A verified domain address like "alerts@yourdomain.com"
    // If emails aren't arriving, this is almost always the cause.
    // Set up a domain in Resend dashboard → Domains and update the from address below.
    const fromAddress = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `FinBuddy <${fromAddress}>`,
        to: [to],
        subject,
        html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error(`Resend API error [${res.status}]:`, JSON.stringify(result));
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(result)}`);
    }

    console.log(`Email sent successfully. Resend ID: ${result.id}`);

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-email error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
