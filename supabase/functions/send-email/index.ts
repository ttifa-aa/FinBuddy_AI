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
    <div style="background:#9A5554;padding:28px 32px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px;">🚨 Urgent Budget Alert</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#3a3a3a;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Hi <strong>${data.name || "there"}</strong>,
      </p>
      <p style="color:#3a3a3a;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Your spending has reached <strong style="color:#9A5554;">${data.percentage}%</strong> of your monthly budget.
      </p>
      ${data.category ? `<p style="color:#3a3a3a;font-size:15px;line-height:1.7;margin:0 0 16px;">
        <strong>Category breached:</strong> ${data.category}<br>
        <strong>Category total:</strong> ${data.category_total}<br>
        <strong>Overall spending:</strong> ${data.total_spent} of ${data.budget} budget
      </p>` : `<p style="color:#3a3a3a;font-size:15px;line-height:1.7;margin:0 0 16px;">
        <strong>Total spending:</strong> ${data.total_spent} of ${data.budget} budget
      </p>`}
      <div style="background:#fdf2f2;border-left:4px solid #9A5554;padding:16px;border-radius:8px;margin:24px 0;">
        <p style="margin:0;color:#9A5554;font-size:14px;font-weight:600;">
          Consider reviewing your recent expenses and adjusting your spending plan.
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
    <div style="background:#A89294;padding:28px 32px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px;">📝 Log Your Spending</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#3a3a3a;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Hi <strong>${data.name || "there"}</strong>,
      </p>
      <p style="color:#3a3a3a;font-size:15px;line-height:1.7;margin:0 0 16px;">
        We noticed you haven't logged any expenses in the last 24 hours. Staying consistent with your spending diary is the key to financial awareness! 💪
      </p>
      <div style="background:#f5f7f8;border-left:4px solid #A89294;padding:16px;border-radius:8px;margin:24px 0;">
        <p style="margin:0;color:#6b6b6b;font-size:14px;font-weight:600;">
          Even small purchases matter. Open FinBuddy and log today's expenses — it takes just seconds!
        </p>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${data.app_url || '#'}" style="display:inline-block;background:#A89294;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
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
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { to, subject, type, data } = (await req.json()) as EmailRequest;

    const html =
      type === "overspending"
        ? buildOverspendingHtml(data)
        : buildReminderHtml(data);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FinBuddy <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(result)}`);
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-email error:", error);
    return new Response(JSON.stringify({ success: false, error: "An error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
