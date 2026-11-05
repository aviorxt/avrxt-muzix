# Last.fm adapter for the existing AVRXT gateway

`lastfm.mjs` is a module for the existing `avrxt-api-gateway`, not a replacement gateway. Keep unrelated routes, existing bindings, origin restrictions and authentication intact.

Cloudflare production secret: `LASTFM_API_KEY`. Optional variable: `LASTFM_USERNAME` (defaults to `avrxt`). The API secret and Last.fm write-auth session are unnecessary for public read endpoints.

Import `handleMuzix` and route the four `/v1/music/` endpoints (chart, now-playing, artwork and artist-image) to it. Keep the gateway's CORS wrapper and rate limiting, and honour the existing public-profile enabled flag:

```js
import { handleMuzix } from './lastfm.mjs';

// Inside the existing fetch handler, after OPTIONS and rate-limit handling:
if (['/v1/music/chart', '/v1/music/now-playing', '/v1/music/artwork', '/v1/music/artist-image'].includes(url.pathname)) {
  const profile = await getPublicConfig(env);
  if (profile?.site?.profileEnabled === false) {
    return json(request, { error: 'PROFILE_DISABLED' }, 404, { 'Cache-Control': 'no-store' });
  }
  try { return withCors(request, await handleMuzix(request, env)); }
  catch {
    return json(request, { error: 'Listening feed temporarily unavailable.' }, 502, { 'Cache-Control': 'no-store' });
  }
}
```

The Cloudflare dashboard editor uses a bundled single file: place the module functions before the existing code, omit its final named export, and add the route block to the existing fetch handler. The deployed snapshot and original rollback source are kept outside the public frontend repository.

## Workers Cache safeguards

`cache-policy.mjs` wraps the existing gateway's returned responses. Apply it before enabling Workers Cache in Cloudflare:

```js
import { gatewayCachePolicy } from './cache-policy.mjs';
export default {
  async fetch(request, env, ctx) {
    return gatewayCachePolicy(request, await existingGateway.fetch(request, env, ctx));
  }
};
```

Only successful public reads of the root, public status, weather and link previews are eligible. Explicit upstream private/no-store directives remain respected. All other paths, errors, write requests, cookie-bearing requests, Authorization-bearing requests and Set-Cookie responses receive `private, no-store`. CORS/cache variants include Origin, Cookie and Authorization. WebSocket response objects remain untouched.

Spotify playback, Discord presence, health, profile config and all music endpoints bypass the outer Workers Cache. The music endpoints still share the internal Last.fm cache. This prevents cache hits from bypassing per-request checks on private or live endpoints.

The dependent `avrxt-me` site still consumes the existing Spotify playback shape and Supabase realtime. Its migration is separate; never silently return the new music contract from a Spotify route. The main website's newsletter/contact/mail operations are not cacheable. Keep the production gateway snapshot in sync with its private source repository before a later deployment from that repository.

The Cache API shares data within each Cloudflare data centre, with in-flight coalescing per isolate. This is demand-driven polling, not a global singleton worker or a scheduled background collector. No KV, Durable Object, cron trigger or new paid service is required.

Test with `node --test worker/lastfm.test.mjs`. Live verification should check both music endpoints, CORS for `https://muzix.avrxt.dev`, unsupported methods, shared recent-data timestamps, and existing gateway routes.

Rollback: restore the previous Cloudflare code deployment. The new secret can remain unused. Restore the prior frontend deployment if the frontend has already switched to the new contract.
