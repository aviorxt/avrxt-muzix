# The monthly frequency

Muzix subscriptions use the existing `api.avrxt.dev` Worker and Resend. The verified sender is `Muzix <notes@muzix.avrxt.dev>`. All messages share the monochrome Inter / Outfit / Space Mono design and `with 🩶 @avrxt` signature. Email clients without web-font support use Arial and Courier New.

The homepage form requests explicit consent. `/v1/music/subscribe` sends a signed confirmation valid for at most 48 hours. Opening the fragment-based link does not subscribe anyone: the reader must click Confirm. Only `/v1/music/confirm` adds the verified address to **Muzix Monthly**. No subscriber addresses or credentials are stored in the frontend, Git repository, logs, or workflow artifacts.

Confirmation and welcome messages are idempotent within Resend's 24-hour idempotency window. Requests use the existing Cloudflare rate limiter with a separate Muzix key prefix. The welcome unsubscribe link removes only the Muzix segment. Monthly broadcasts include Resend's native unsubscribe placeholder and respect global unsubscribed contacts. Confirming never overrides an existing global opt-out. Resend handles delivery suppression for broadcasts.

## Runtime configuration

Cloudflare encrypted secrets: `MUZIX_RESEND_API_KEY`, `MUZIX_NEWSLETTER_SECRET`. The signing secret is a random 32-byte value; rotating it invalidates existing confirmation and welcome-unsubscribe links. Existing `LASTFM_API_KEY` and bindings are preserved. `MUZIX_SEGMENT_ID` is a public configuration value in the private gateway's Wrangler configuration.

GitHub Actions encrypted repository secrets: `MUZIX_RESEND_API_KEY`, `LASTFM_API_KEY`. Repository variable: `MUZIX_SEGMENT_ID`. Use the persisted segment ID shown after creation settles; the initial optimistic UI ID may differ. Resend's full-access key is necessary for contact and broadcast operations and must never be put in a `NEXT_PUBLIC_` variable.

The private `avrxt.dev/api-worker` contains the deployed gateway wrapper and mirrored `newsletter.mjs` and `newsletter-email.mjs`. When changing the public email template or subscription module, sync these copies before deploying that Worker. All newsletter routes remain private/no-store under the existing gateway cache policy. The main/profile subscription routes are unchanged.

## Monthly delivery

`.github/workflows/monthly-muzix.yml` runs on the first of each month at 03:00 UTC / **08:30 Asia/Kolkata**. GitHub may queue a scheduled run. The first new scheduled edition is December 1, 2026, covering November 2026. Scheduled runs use `send`; manually dispatched runs default to `preview`.

- `preview`: produce HTML, plain text, and a public listening snapshot artifact; no Resend write.
- `draft`: create or refresh the edition's Resend draft, without sending.
- `send`: send the edition to confirmed contacts in the Muzix segment.

Leave `month` empty for the previous completed calendar month, or specify `YYYY-MM`. Current and future months are rejected. The script retrieves all completed Last.fm scrobbles for the India calendar month (up to 100,000), preserving repeated plays and excluding live entries. Missing pages, inconsistent totals, or upstream errors stop delivery; partial counts are never presented as complete.

Each edition is named `muzix-monthly-YYYY-MM`. Workflow concurrency serializes runs. A rerun reuses an existing draft and skips already sent/scheduled/sending editions; it never automatically retries an ambiguous write. Inspect Resend before retrying after a network failure. The uploaded artifact contains only public listening data and email content, with no recipient list. Run `npm test`, `npm run lint`, and `npm run build` for validation.

## Extended edition

The scheduled edition now includes song/album covers, a featured on-loop song, five artist portraits, ten ranked tracks, three albums, active days, busiest day and a weekday listening chart. Artwork uses verified Last.fm / Apple catalogue matches; artist images use Deezer. Missing images retain neutral text placeholders and external artwork links include source credits.

Playtime is an explicit full-track estimate: known track duration × completed scrobbles. The email reports known-play coverage and never invents a duration for unmatched songs. Duration lookup has a four-minute / 500-track budget, so a large or incomplete catalogue still produces honest partial coverage rather than a false total.

Manual preview mode also accepts the current month, labels it “month so far,” and cannot publish it to Resend. Draft/send modes require a completed month. The Nexus logo is an identical copy of the supplied asset, served from `/brand/mail/` with cross-origin image permission for email clients; the supplied white AVRXT banner is used on the dark header. Confirmation and welcome mail share the same branding.

The site uses shadcn Button, Input, Checkbox, Card and Badge components, styled with AVRXT tokens. Confirmation links survive reload until completion; mobile controls have at least 44px touch targets. CSS transitions and scroll reveals respect reduced-motion preferences.

Manual send-current mode sends an explicitly labelled month-so-far special edition. It uses a separate muzix-special-YYYY-MM-DD identity so a same-day rerun cannot duplicate the send or suppress the normal complete-month edition. Scheduled runs still use completed-month send mode.
