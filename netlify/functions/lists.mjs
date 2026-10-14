// GET /api/lists  -> { tracks: [...] }   (saved list for this license key)
// PUT /api/lists  body { tracks: [...] } -> { saved: true }
// Pro only. Lists are stored in Netlify Blobs under a hash of the license key.

import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";
import { paywallOn, validateKey } from "../lib/license.mjs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req) => {
  const key = (req.headers.get("x-license-key") || "").trim();
  if (!paywallOn()) return json({ error: "Saved lists turn on once payments are set up." }, 501);
  if (!(await validateKey(key))) return json({ error: "This is a Pro feature. Unlock it with your license key.", pro: true }, 402);

  const id = createHash("sha256").update(key).digest("hex");
  const store = getStore("lists");

  if (req.method === "GET") {
    const data = await store.get(id, { type: "json" });
    return json({ tracks: data?.tracks || [], updated: data?.updated || null });
  }

  if (req.method === "PUT") {
    let body;
    try { body = await req.json(); } catch (e) { return json({ error: "Bad data." }, 400); }
    const tracks = (Array.isArray(body?.tracks) ? body.tracks : [])
      .slice(0, 2000)
      .map((t) => ({ q: String(t?.q || "").slice(0, 300), got: Boolean(t?.got) }))
      .filter((t) => t.q);
    await store.setJSON(id, { tracks, updated: new Date().toISOString() });
    return json({ saved: true });
  }

  return json({ error: "Method not allowed." }, 405);
};

export const config = { path: "/api/lists" };
