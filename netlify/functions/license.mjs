// GET /api/license            -> { paywall, buyUrl }
// GET /api/license (header x-license-key) -> { paywall, buyUrl, valid }

import { paywallOn, validateKey } from "../lib/license.mjs";

export default async (req) => {
  const paywall = paywallOn();
  const buyUrl = Netlify.env.get("BUY_URL") || "";
  const key = req.headers.get("x-license-key");
  const body = { paywall, buyUrl };
  if (key) body.valid = paywall ? await validateKey(key) : true;
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
};

export const config = { path: "/api/license" };
