import { requirePro } from "../lib/license.mjs";
// GET /api/itunes?q=<Artist - Title>
// Checks Apple's free iTunes Search API and returns the best match:
// { found: true, artist, title, price, currency, url } or { found: false }
// No key needed. Results are cached in the browser for a day.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "private, max-age=86400" },
  });

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\((feat|ft|with)[^)]*\)/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["the", "a", "and", "feat", "ft", "x", "original", "mix"].includes(w));

function score(query, r) {
  const want = new Set(norm(query));
  const have = new Set(norm(`${r.artistName} ${r.trackName}`));
  if (!want.size) return 0;
  let hit = 0;
  for (const w of want) if (have.has(w)) hit++;
  return hit / want.size;
}

export default async (req) => {
  const blocked = await requirePro(req);
  if (blocked) return blocked;
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 200);
  if (!q) return json({ error: "Missing track name." }, 400);
  try {
    const term = encodeURIComponent(q.replace(/\s+-\s+/, " "));
    const res = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=10&country=us`);
    if (!res.ok) return json({ found: false, busy: res.status === 403 || res.status === 429 }, 200);
    const data = await res.json();
    const best = (data.results || [])
      .map((r) => ({ r, s: score(q, r) }))
      .sort((a, b) => b.s - a.s)[0];
    if (!best || best.s < 0.6) return json({ found: false });
    const r = best.r;
    return json({
      found: true,
      artist: r.artistName,
      title: r.trackName,
      price: r.trackPrice > 0 ? r.trackPrice : null,
      currency: r.currency,
      url: r.trackViewUrl,
    });
  } catch (e) {
    return json({ found: false, busy: true });
  }
};

export const config = { path: "/api/itunes" };
