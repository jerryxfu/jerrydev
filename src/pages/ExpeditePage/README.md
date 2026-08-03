# Expedite

Short-lived file and text sharing. Three transfer types and one five-character code.

| Type   | Path the bytes take               | Size ceiling | Lives for    |
|--------|-----------------------------------|--------------|--------------|
| `text` | JSON body -> MongoDB              | 500 KB       | 1 min – 24 h |
| `file` | Presigned PUT -> Cloudflare R2    | 16 GB        | 1 min – 24 h |
| `p2p`  | WebRTC data channel, peer to peer | none         | session only |

Codes are 5 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no I/O/0/1). Uniqueness is checked across all three types, so `GET /drop/:code` resolves any of them
and the UI decides what to render from the returned `type`.

---

## Frontend layout

```
ExpeditePage/
  Expedite.tsx          orchestrator: view state, all fetch calls, engine wiring
  types.ts              DropMeta, DropSettings, P2P status/snapshot shapes
  utils.ts              formatting helpers (formatBytes, formatEta, ...)
  uploadEngine.ts       R2 upload: single PUT or multipart, with progress
  p2p/
    peer.ts             shared WebRTC plumbing, rate meter, protocol constants
    sender.ts           offer -> publish -> wait -> stream file
    receiver.ts         answer -> receive -> stream to disk
  views/
    LandingView         send tiles + retrieve field
    UploadView          text/file composer + settings
    CreatedView         code + share link
    ResultView          retrieved text/file
    P2PSendView         session code, countdown, notes
    P2PReceiveView      offer preview, support gate
    UploadProgress      multipart part grid
    P2PProgress         phase ladder + transfer stats (presentational, no hooks)
```

`Expedite.tsx` owns every piece of state and every network call. The views are presentational and take callbacks. Transfer engines are plain async functions
taking an options object with callbacks and an `AbortSignal` — same shape as
`uploadEngine.ts`, deliberately.

---

## Direct P2P

### Why it works the way it does

**Non-trickle ICE.** Both sides finish gathering candidates before sending their SDP, so signalling is three messages instead of a candidate stream. Costs 1–3s
up front and makes the server much simpler. Gathering is capped at 5s (9s when TURN is on, since relay allocation needs an extra round trip).

**Sender creates the code.** Matches text and file drops, matches the WebRTC convention that the offerer initiates, and means the session doc can carry
`fileName`/`fileSize`/`mimeType` for the receiver's preview and save dialog.

**SSE, not polling.** The sender may hold a code for ten minutes. Polling that would blow through the rate limiter; one long-lived `EventSource` doesn't.
Headers are flushed immediately so Cloudflare's ~100s time-to-headers limit never applies, with heartbeat comments every 25s for intermediate proxies.

**Receiving is Chromium desktop only.** The gate is `"showSaveFilePicker" in
window`. Every other browser would have to buffer the whole file in memory and fall over past a gigabyte, so it's refused up front rather than failing at 80%.
Chrome on Android doesn't ship the picker either, so one feature detect covers mobile too. **Sending works everywhere** — it only needs `File.slice()`.

**The save picker must be the first `await` in its click handler.** It requires a user gesture, and any earlier `await` spends it. Sequence is: enter code ->
click Receive -> picker opens -> *then* negotiate.

### Session lifecycle

```
sender                          server                        receiver
  |-- POST /p2p/init ----------->|  store offer, mint code
  |<-- code --------------------|
  |-- GET /p2p/:code/events ---->|  SSE held open
  |                              |<-- GET /drop/:code -------- |  returns offer
  |                              |<-- POST /p2p/:code/answer -- |
  |<== event: answer ============|  then deletes the session
  |============ data channel, direct ==========================|
```

Unclaimed sessions expire after 10 minutes. The client tears down and publishes a **new offer under a new code** — it can't reuse the old one, because the ICE
candidates in a ten-minute-old SDP reference NAT bindings that have lapsed, so reconnecting would fail at the checking stage with nothing to show for it.

Teardown on tab close uses `fetch(..., {keepalive: true})`. `sendBeacon` can't be used because it only issues POSTs.

### Transfer mechanics

64 KB chunks (clamped to 75% of the negotiated SCTP `maxMessageSize`), ordered reliable channel. Flow control pauses above 8 MB buffered and resumes below 1 MB
via `bufferedamountlow`.

Termination is byte count reached, with a NUL-prefixed `CTRL_EOF` string as backup, and a `CTRL_DONE` ack so the sender knows the receiver finished writing.

Receiver writes are serialised through a promise chain — `write()` is async and message events are not, so without it a fast sender interleaves writes and
scrambles the file.

**The sender reports `queued - bufferedAmount`, not `queued.`** Bytes handed to SCTP aren't bytes delivered. Reporting `queued` produced a sawtooth whose flat
sections defeated the speed calculation and made the two screens disagree.

### TURN

Off by default, toggled per side. **Only one side needs it on** — a relay candidate is a public reachable address, so the peer without TURN can pair against it
using an ordinary srflx candidate.

Credentials are minted server-side (`config/turn.ts`), cached in-process, and **URLs on port 53 are stripped**: Cloudflare returns alternate ports, browsers
block 53, and with non-trickle gathering a hanging URL delays the whole SDP and can cost the relay candidates entirely.

`getStats()` reports the nominated pair, so the UI says whether the transfer is actually direct or relayed rather than leaving the toggle a mystery.

### Reading the status panel

- `candidates` — **local** candidates only. `0 relay` on one side while the other shows relay is normal and fine; see the one-side-is-enough note above.
- `pair` — `(direct)` vs `(relayed)`. Toggling TURN on and still seeing `(direct)`
  means a direct path was found and preferred. Working as intended.
- `rtt` — `—` means not reported. Firefox often omits it on the offering side.
- `buffer` — should oscillate between roughly 1 and 8 MB. Pinned at 8 MB means the receiver can't keep up.

---

## Backend

```
routes/expedite/
  index.ts    router assembly
  shared.ts   config constants + generateCode, parseTtl, getUsedBytes
  text.ts     POST /drop/text
  file.ts     POST /drop/file/init, /drop/file/complete
  p2p.ts      POST /p2p/init, /p2p/:code/answer, /p2p/turn
              GET  /p2p/:code/events (SSE)
              DELETE /p2p/:code
  drops.ts    GET /drop/:code, GET /stats, DELETE /drop/:code
```

One Mongo collection for all three types, with a TTL index on `expiresAt` that cleans expired drops, orphaned upload reservations, and abandoned p2p sessions
alike.

`status` means different things per type, which is the one genuinely confusing part: for `file`, `pending` means the upload isn't verified and the drop is
invisible. For `p2p`, `pending` means the session is **live and waiting for a receiver**. The `p2p` branch in `GET /drop/:code` must therefore come before the
generic pending check.

`getUsedBytes()` only sums `fileSize` when `type === "file"`, so p2p sessions contribute nothing to the 50 GB cap. Nothing about a direct transfer touches R2.

---

## Gotchas

- **`config/origins.ts` is the single source for the allowlist**, shared by CORS in `server.ts` and `originGuard.ts`. These were separate lists once and had
  already drifted. Referer must be parsed with `new URL()` and compared by
  `.origin` — a prefix check accepts `https://jerryxf.net.evil.com`.
- **`showSaveFilePicker` isn't in `lib.dom.d.ts`.** It's WICG, not WHATWG; lib.dom ships the OPFS half only. Declared in `src/types/file-system-access.d.ts`.
- **morgan logs on response finish**, so an open SSE stream produces no log line until the client disconnects. Looks like a dropped request. It isn't.
- **`.expedite_btn-primary` has `flex: 1`** for horizontal button rows. Inside a flex column that reads as `flex-grow` and stretches the button vertically.
- **Progress bars shouldn't have CSS width transitions** when updates arrive every ~100ms; the animation restarts before it lands and the bar trails.
- `npx` fails in this repo — `devEngines.packageManager` pins pnpm. Use
  `pnpm exec`.

---

## Verifying changes

```bash
pnpm exec tsc --noEmit
pnpm exec eslint . --report-unused-disable-directives
pnpm exec vite build
```

For P2P specifically, same-machine cross-browser is the *worst* case, not the easiest: mDNS obfuscation hides host candidates from the other browser and
srflx↔srflx needs router hairpinning. Enable TURN, or test across genuinely different networks (phone on cellular -> laptop).
