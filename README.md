# AVRXT Muzix

Personal Last.fm listening journal for [muzix.avrxt.dev](https://muzix.avrxt.dev).

It consumes `https://api.avrxt.dev/v1/music/chart` from the existing Cloudflare Worker. Last.fm credentials stay in Cloudflare. No Spotify Premium developer application or Supabase browser connection is required by Muzix.

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
