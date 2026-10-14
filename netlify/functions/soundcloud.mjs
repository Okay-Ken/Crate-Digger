// GET /api/soundcloud?url=<SoundCloud playlist/set link>
// Returns { title, tracks: [ "Artist - Title", ... ] }
// Needs SOUNDCLOUD_CLIENT_ID and SOUNDCLOUD_CLIENT_SECRET in Netlify
// (registering a SoundCloud app requires an Artist Pro subscription).
// Until those are set, this returns a friendly "not turned on yet" message.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let cached = { token: null, expires: 0 };

async function getToken(id, secret) {
  if (cached.token && Date.now() < cached.expires) return cached.token;
  const res = await fetch("https://secure.soundcloud.com/oauth/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json; charset=utf-8",
      authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("token");
  cached = { token: data.access_token, expires: Date.now() + ((data.expires_in || 3600) - 60) * 1000 };
  return cached.token;
}

export default async (req) => {
  const id = Netlify.env.get("SOUNDCLOUD_CLIENT_ID");
  const secret = Netlify.env.get("SOUNDCLOUD_CLIENT_SECRET");
  if (!id || !secret) return json({ error: "SoundCloud import isn't turned on yet. Paste the track names instead." }, 501);

  const link = new URL(req.url).searchParams.get("url") || "";
  if (!/soundcloud\.com\//i.test(link)) return json({ error: "That doesn't look like a SoundCloud link." }, 400);

  try {
    const token = await getToken(id, secret);
    const headers = { authorization: `OAuth ${token}`, accept: "application/json; charset=utf-8" };
    const playlist = await fetch(`https://api.soundcloud.com/resolve?url=${encodeURIComponent(link)}`, { headers }).then((r) => r.json());
    if (!playlist || playlist.kind !== "playlist") return json({ error: "That link isn't a public SoundCloud playlist." }, 404);

    const tracks = [];
    let next = `https://api.soundcloud.com/playlists/${playlist.id}/tracks?limit=200&linked_partitioning=true`;
    for (let i = 0; next && i < 10; i++) {
      const page = await fetch(next, { headers }).then((r) => r.json());
      const list = Array.isArray(page) ? page : page.collection || [];
      for (const t of list) {
        const artist = t.user?.username || "";
        const title = t.title || "";
        tracks.push(title.includes(" - ") ? title : `${artist} - ${title}`);
      }
      next = Array.isArray(page) ? null : page.next_href;
    }
    return json({ source: "soundcloud", title: playlist.title, tracks });
  } catch (e) {
    return json({ error: "Couldn't reach SoundCloud. Try again in a minute." }, 502);
  }
};

export const config = { path: "/api/soundcloud" };
