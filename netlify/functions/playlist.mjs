import { requirePro } from "../lib/license.mjs";
// GET /api/playlist?url=<YouTube or YouTube Music playlist link>
// Returns { title, tracks: [ "Artist - Title", ... ] }
// Needs the YOUTUBE_API_KEY environment variable in Netlify.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "private, max-age=600" },
  });

function playlistId(input) {
  const m = String(input).match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{12,}$/.test(input)) return input;
  return null;
}

function toLine(title, channel) {
  title = (title || "").trim();
  channel = (channel || "").trim();
  if (/ - Topic$/i.test(channel)) {
    const artist = channel.replace(/ - Topic$/i, "");
    return title.includes(" - ") ? title : `${artist} - ${title}`;
  }
  if (title.includes(" - ") || title.includes(" – ")) return title;
  return channel ? `${channel} - ${title}` : title;
}

export default async (req) => {
  const blocked = await requirePro(req);
  if (blocked) return blocked;
  const key = (Netlify.env.get("YOUTUBE_API_KEY") || process.env.YOUTUBE_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (!key) return json({ error: "The site owner hasn't added a YouTube API key yet." }, 500);

  const link = new URL(req.url).searchParams.get("url") || "";
  const id = playlistId(link);
  if (!id) return json({ error: "That doesn't look like a YouTube playlist link. It should contain list=…" }, 400);

  const api = "https://www.googleapis.com/youtube/v3";
  let title = "YouTube playlist";
  try {
    const meta = await fetch(`${api}/playlists?part=snippet&id=${id}&key=${key}`).then((r) => r.json());
    if (meta.error) return json({ error: `YouTube said: ${meta.error.message}` }, 502);
    if (!meta.items?.length) return json({ error: "Playlist not found. Make sure it's set to Public or Unlisted." }, 404);
    title = meta.items[0].snippet.title;

    const tracks = [];
    let pageToken = "";
    for (let page = 0; page < 40; page++) {
      const url = `${api}/playlistItems?part=snippet&maxResults=50&playlistId=${id}&key=${key}${pageToken ? `&pageToken=${pageToken}` : ""}`;
      const data = await fetch(url).then((r) => r.json());
      if (data.error) return json({ error: `YouTube said: ${data.error.message}` }, 502);
      for (const item of data.items || []) {
        const s = item.snippet || {};
        if (/^(Deleted|Private) video$/i.test(s.title || "")) continue;
        tracks.push(toLine(s.title, s.videoOwnerChannelTitle));
      }
      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }
    return json({ source: "youtube", title, tracks });
  } catch (e) {
    return json({ error: "Couldn't reach YouTube. Try again in a minute." }, 502);
  }
};

export const config = { path: "/api/playlist" };
