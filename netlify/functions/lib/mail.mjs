// Optional email alert through Resend (https://resend.com, free tier).
// Enabled only when RESEND_API_KEY and NOTIFY_TO are set. Never throws.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export async function notifyEnquiry(rec) {
  const { RESEND_API_KEY, NOTIFY_TO, NOTIFY_FROM } = process.env;
  if (!RESEND_API_KEY || !NOTIFY_TO) return false;

  const rows = [
    ["Name", rec.name],
    ["Mobile", rec.phone],
    ["Email", rec.email || "—"],
    ["Service", rec.service],
    ["Message", rec.message || "—"],
    ["Page", rec.page || "—"],
    ["Received", rec.createdAt],
  ];
  const html = `<h2 style="font-family:Arial">New website enquiry</h2><table cellpadding="8" style="font-family:Arial;font-size:15px;border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="color:#555;border-bottom:1px solid #eee"><b>${k}</b></td><td style="border-bottom:1px solid #eee">${esc(v).replace(/\n/g, "<br>")}</td></tr>`)
    .join("")}</table>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: NOTIFY_FROM || "VRK Website <onboarding@resend.dev>",
        to: NOTIFY_TO.split(",").map((s) => s.trim()).filter(Boolean),
        ...(rec.email ? { reply_to: rec.email } : {}),
        subject: `New enquiry: ${rec.service} — ${rec.name}`,
        html,
        text,
      }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
