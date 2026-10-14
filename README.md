# Crate Digger

Paste a playlist link (or track names) and every song gets one-tap buttons to Beatport, Bandcamp, Juno, Traxsource, Qobuz, 7digital, SoundCloud and a free-download search, plus an automatic iTunes availability and price check.

## What's in here

- `public/index.html`: the whole website
- `netlify/functions/playlist.mjs`: pulls track names from a YouTube / YouTube Music playlist link
- `netlify/functions/soundcloud.mjs`: pulls track names from a SoundCloud playlist link (off until keys are added)
- `netlify/functions/itunes.mjs`: checks whether a track is on iTunes and its price
- `netlify.toml`: tells Netlify where everything is

## Environment variables (Netlify → Site configuration → Environment variables)

| Name | Needed? | Where it comes from |
|---|---|---|
| `YOUTUBE_API_KEY` | Yes | Google Cloud → APIs & Services → Credentials |
| `SOUNDCLOUD_CLIENT_ID` | Optional | SoundCloud developer app (needs Artist Pro) |
| `SOUNDCLOUD_CLIENT_SECRET` | Optional | Same app as above |

After adding or changing a variable, redeploy: Deploys → Trigger deploy → Deploy site.

## Deploy

1. Put these files in a GitHub repo (the files at the top level, not inside an extra folder).
2. Netlify → Add new site → Import an existing project → GitHub → pick the repo.
3. Leave the build command blank. Netlify reads `netlify.toml`. Click Deploy.
4. Add `YOUTUBE_API_KEY`, then redeploy.

## Coming next (phase 2)

- Lemon Squeezy payments + license keys
- Saved lists tied to a license key (Netlify Blobs)
- Apple Music playlist links (needs Apple Developer Program)
