// Small response / request helpers shared by all functions.

export function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

export function clientIp(req, context) {
  return (
    context?.ip ||
    req.headers.get("x-nf-client-connection-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

// Reject cross-site browser posts: if an Origin header is present it must match this site.
export function sameOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

// Read a JSON (or urlencoded) body with a hard size cap.
export async function readBody(req, maxBytes = 16 * 1024) {
  const text = await req.text();
  if (text.length > maxBytes) {
    const err = new Error("Payload too large");
    err.status = 413;
    throw err;
  }
  const type = req.headers.get("content-type") || "";
  try {
    if (type.includes("application/x-www-form-urlencoded")) return Object.fromEntries(new URLSearchParams(text));
    return text ? JSON.parse(text) : {};
  } catch {
    const err = new Error("Invalid request body");
    err.status = 400;
    throw err;
  }
}
