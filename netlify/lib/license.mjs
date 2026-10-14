// Shared paywall check. The paywall is OFF until LEMONSQUEEZY_PRODUCT_ID is set in Netlify.
// When it's on, Pro endpoints require a valid Lemon Squeezy license key for that product,
// sent by the page in the "x-license-key" header.

const cache = new Map(); // key -> { ok, until }

export function paywallOn() {
  return Boolean(Netlify.env.get("LEMONSQUEEZY_PRODUCT_ID"));
}

export async function validateKey(key) {
  key = String(key || "").trim();
  if (!key || key.length > 100) return false;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.ok;

  let ok = false;
  try {
    const res = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ license_key: key }),
    });
    const data = await res.json();
    const product = String(Netlify.env.get("LEMONSQUEEZY_PRODUCT_ID") || "");
    const status = data?.license_key?.status;
    ok = Boolean(data?.valid) && String(data?.meta?.product_id) === product && status !== "disabled" && status !== "expired";
  } catch (e) {
    ok = false;
  }
  cache.set(key, { ok, until: Date.now() + (ok ? 10 : 1) * 60 * 1000 });
  return ok;
}

// Returns null when allowed, or a Response to send back when blocked.
export async function requirePro(req) {
  if (!paywallOn()) return null;
  const ok = await validateKey(req.headers.get("x-license-key"));
  if (ok) return null;
  return new Response(JSON.stringify({ error: "This is a Pro feature. Unlock it with your license key.", pro: true }), {
    status: 402,
    headers: { "content-type": "application/json" },
  });
}
