// GET /api/health -> shows which settings this deploy can see (true/false only, never the values)

export default async () => {
  const has = (k) => Boolean((Netlify.env.get(k) || "").trim());
  const yt = Netlify.env.get("YOUTUBE_API_KEY") || "";
  const body = {
    version: "2026-10-14b",
    YOUTUBE_API_KEY: has("YOUTUBE_API_KEY"),
    youtube_key_length: yt.trim().length,
    youtube_key_has_spaces_or_quotes: /^\s|\s$|["']/.test(yt),
    SOUNDCLOUD: has("SOUNDCLOUD_CLIENT_ID") && has("SOUNDCLOUD_CLIENT_SECRET"),
    PAYWALL_ON: has("LEMONSQUEEZY_PRODUCT_ID"),
    BUY_URL: has("BUY_URL"),
    context: Netlify.env.get("CONTEXT") || "unknown",
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};

export const config = { path: "/api/health" };
