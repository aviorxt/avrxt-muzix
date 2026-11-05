# AVRXT Muzix

Personal Last.fm listening journal for [muzix.avrxt.dev](https://muzix.avrxt.dev).

It consumes `https://api.avrxt.dev/v1/music/chart` from the existing Cloudflare Worker. Last.fm credentials stay in Cloudflare. No Spotify Premium developer application or Supabase browser connection is required by Muzix.

The visual language matches the main AVRXT site: monochrome surfaces, outlined Outfit headings, Inter body text, Space Mono labels, fine borders and restrained grids. Home/Profile navigation connects the three sites.

## Artwork

Song/album covers use Last.fm detail metadata, then verified Apple catalogue matches. Names are checked against both artist and title; alternate versions and unrelated search results are rejected. Apple Music links accompany its artwork. If Apple's shared datacentre endpoint is rate-limited, the browser can query its public CORS API without credentials. Those requests are paced below approximately 20/minute, deduplicated, and successful artwork is cached locally for 24 hours. A first visit can therefore fill missing covers gradually.

Artist images come from exact-name Deezer artist records through `/v1/music/artist-image`, cached in the Worker for 24 hours. Album artwork is not used as a substitute for an artist record. Source links accompany portraits. Missing/unverified images retain a neutral placeholder; a broken image URL also triggers lookup.

## Local development

```bash
npm ci
npm run dev
```

`npm test`, `npm run lint`, and `npm run build` verify the backend adapter and frontend.

## Data and freshness

- Browser refresh: every 30 seconds while visible; immediate refresh on return.
- Last.fm recent history / now playing: cached for 20 seconds per Cloudflare data centre.
- Charts, profile and monthly summary: cached for 15 minutes.
- Failed upstream requests back off for 30 seconds. Cached history remains available for up to 24 hours; stale now-playing is cleared immediately after an upstream error.
- Top artists, tracks and albums use Last.fm's rolling `1month` period (labelled Last 30 days). The monthly capsule is calculated separately from timestamped scrobbles, using calendar-month boundaries in Asia/Kolkata.
- Monthly history is bounded to 10 pages / 2,000 entries and a refresh time budget. Incomplete coverage is labelled; artist counts and the most-played track then describe only fetched history. Monthly totals come from Last.fm.
- Now-playing is Last.fm's reported scrobbling state, which can lag the player. There is no invented progress, pause state, playlist context, shuffle or repeat state. A client that only submits completed scrobbles may not provide now-playing.
- Missing artwork uses a designed fallback. Track IDs use artist and title together; repeat listens retain separate timestamps.

## Backend

See [worker/README.md](worker/README.md). Deploy backend routes before releasing this frontend. Keep existing Spotify routes for other AVRXT applications until those consumers are migrated separately.
