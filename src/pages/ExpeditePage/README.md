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
using an ordinary srflx candidate. Verified on real traffic: a 128 MB transfer completed `relay ↔ srflx` with the receiver reporting `0 relay` locally.

Credentials are minted server-side (`config/turn.ts`), cached in-process, and **URLs on port 53 are stripped**: Cloudflare returns alternate ports, browsers
block 53, and with non-trickle gathering a hanging URL delays the whole SDP and can cost the relay candidates entirely.

`getStats()` reports the nominated pair, so the UI says whether the transfer is actually direct or relayed rather than leaving the toggle a mystery.

The **auto relay fallback** is the primary mechanism; the toggle is a shortcut, not a permission. On an ICE failure the sender republishes under the *same code*
with TURN forced and the receiver polls for the new session, reusing the already-granted file handle. `p2pRelayRetry` in `Expedite.tsx` drives a
"retrying using TURN…" note on the progress readout — it is a **separate prop, not a field on `P2PStatus`**, because the engines overwrite `status.detail` on
every phase change and would wipe it within milliseconds.

`setUseTurn(true)` is deliberately **not** called on a relay retry. `retryWithTurn` is passed as a parameter and short-circuits both the engine call and the
auto-retry guard, so flipping the state only had the effect of leaving the toggle stuck on for the rest of the tab session — which silently masked repeat direct
failures by sending every subsequent transfer straight to relay.

---

## Same-LAN direct requires mDNS — read this before debugging a failed direct connection

**This is the most likely reason a direct transfer isn't going direct, and it is almost never the code.**

Both browsers replace host candidates with a random mDNS hostname by default, so the SDP carries `62dd1680-f778-4851-9e81-d27918aac088.local` instead of
`192.168.2.x`. Two peers on the same LAN can only pair `host ↔ host`, which requires each side to resolve the other's `.local` name by multicasting a query to
`224.0.0.251:5353` and getting an answer. **If anything on the network drops or fails to answer that multicast, direct is impossible** — the only surviving pair
is srflx ↔ srflx, which is both peers' *own* public IP, and that needs router hairpinning that consumer gear generally won't do.

### The signature

From a real failing run (2026-08-08, Mac Firefox -> Windows Chrome, same /24):

```
remote (Firefox):  a=candidate:0 1 UDP ... cf6f2b90-…-8e04e5df63e2.local 56985 typ host
                   a=candidate:2 1 TCP ... cf6f2b90-…-8e04e5df63e2.local 9     typ host tcptype active
                   a=candidate:1 1 UDP ... 174.89.164.103                56985 typ srflx
local  (Chrome):   candidate:3281275733 1 udp ... d72e1d10-…-dbce425c5ca6.local 61010 typ host

oniceconnectionstatechange  "checking" -> "disconnected"
onconnectionstatechange     "connecting" -> "failed"
```

Both sides published `.local`, neither resolved the other's, one unusable pair, dead.

**The proof it's mDNS and nothing else:** setting Firefox's
`media.peerconnection.ice.obfuscate_host_addresses` to `false` made the same pair connect immediately as `host ↔ prflx (direct)` at 9.5 MB/s. Firefox published
raw IPs, Chrome sent checks straight at them, and Chrome's own (still unresolvable) address arrived at Firefox as **peer-reflexive**, discovered from the
inbound packet rather than the SDP. One side publishing raw IPs is sufficient.

### There is no client-side fix

The private IP is never exposed to JavaScript. `RTCIceCandidate.relatedAddress` is **null for host candidates** by spec, so the real address cannot be recovered
and re-published. This is the deliberate design of the mDNS privacy feature and every browser implements it.

What exists, and why none of it is shippable:

| Approach                                                 | Verdict                                                                                                           |
|----------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| `WebRtcLocalIpsAllowedUrls` Chrome enterprise policy     | Real and persistent, but managed devices only. **Use it for the test bench** (below), never a user-facing answer. |
| `getUserMedia` permission suppresses obfuscation         | Requesting camera access for a file transfer tool is an unacceptable trade.                                       |
| `chrome://flags/#enable-webrtc-hide-local-ips-with-mdns` | **Removed in M91.** Does not exist any more.                                                                      |
| `--disable-features=WebRtcHideLocalIpsWithMdns`          | Works, but does not survive a normal relaunch — silently reverts and looks like a regression.                     |
| Provision TURN and fall back                             | What Expedite already does. What everyone does.                                                                   |

### Does this affect every user?

No, and the shape of it matters:

- **Cross-network transfers never touch mDNS.** Two peers on different networks pair `srflx ↔ srflx` via ordinary UDP hole punching. This is the common real
  case ("send this to my friend") and it is unaffected.
- **Same-LAN transfers depend entirely on mDNS resolution.** This is the case that breaks, and it's the "send to my own laptop" case.
- Industry baseline is roughly **20% of WebRTC connections relaying** overall (measured 17.7% in one large published dataset), rising to 60–85% on corporate
  networks with managed firewalls. Expedite falling back to relay on some fraction of transfers is normal, not a defect.
- Snapdrop, PairDrop and ShareDrop all have the identical failure documented in their issue trackers. Mozilla closed the ShareDrop report as WONTFIX / site
  issue. PairDrop's official answer is "deploy a TURN server". **Expedite's architecture is already the industry-standard answer to this problem.**

The one real product consequence: same-LAN transfers relaying more often than intuition suggests makes the Cloudflare TURN egress quota more load-bearing than
it looks. The quota stat and the relay guard exist for that reason.

---

## Diagnosing a failed direct connection

Work top to bottom. Most of these are environmental and none of them are in the repo.

**1. Capture a usable webrtc-internals dump.** It records nothing retroactively and drops the PeerConnection when the creating tab closes.

```
open chrome://webrtc-internals in a SECOND tab
start the transfer in the Expedite tab
while it's still running, WITHOUT closing the Expedite tab -> Create Dump -> Download
```

`"PeerConnections": {}` means it was captured too late. Take three: during negotiation, at the failure, after the relay retry.

**2. Read the remote description.** `.local` in the remote host candidates plus
`checking -> disconnected -> failed` is the mDNS diagnosis above, confirmed.

**3. Check candidate reconciliation.** The UI's `peer N` should equal what the other side published. If they match, signalling and the API are provably healthy
and the problem is purely ICE connectivity — do not go looking in `p2p.ts`.

**4. Test L2 reachability with ARP, not ping.**

```bash
arp -a | grep <peer-ip>     # a MAC address = fine; (incomplete) = client isolation
```

**Windows Defender Firewall blocks inbound ICMP echo by default, on Private profile too**, so a failed ping to a Windows box proves nothing.

**5. A/B the obfuscation.** Set Firefox `media.peerconnection.ice.obfuscate_host_addresses` to `false` and retest. Direct now works -> mDNS resolution was the
only thing missing. Still relays -> packets are being dropped, different investigation. **Set it back to `true` afterwards or every subsequent test lies.**

---

## Environment gotchas (not code)

These have each cost a debugging session. They look exactly like regressions.

- **macOS Local Network permission.** On macOS 15+, WebRTC's mDNS use is gated by Privacy & Security -> Local Network. Chrome can be **absent from the list
  entirely with no prompt ever shown**, which silently kills mDNS registration and resolution. It is not TCC-managed, so `tccutil reset` cannot clear it;
  Apple's own answer is a fresh user account or a VM snapshot. There is also a known bug where the permission stops functioning after a Mac restart while still
  displaying as enabled — toggle it off and on.
- **Chrome mDNS flag.** `chrome://flags/#enable-webrtc-hide-local-ips-with-mdns` was removed in **M91**. The CLI equivalent does not persist across a normal
  relaunch, so a workaround applied on Monday is gone on Tuesday with nothing in git to explain it. For a persistent bench, use the
  `WebRtcLocalIpsAllowedUrls` policy instead.
- **Firefox `obfuscate_host_addresses` persists.** Unlike the Chrome side it survives restarts, so a half-reverted workaround leaves one browser at defaults and
  one not — which produces results that look contradictory.
- **IPv6 STUN 701 errors are benign.** `onicecandidateerror` with
  `"STUN host lookup received error"` against both Cloudflare and Google STUN on an IPv6 interface, while the IPv4 srflx gathers fine, is normal on a
  v4-only-reachable network. It costs gathering time, not connectivity.
- **`showSaveFilePicker` needs a secure context.** Testing dev builds cross-device over `http://<lan-ip>` from `vite --host` makes it disappear and the receiver
  hits the unsupported screen before WebRTC is involved. Test against prod, or give dev a local cert.

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

## Reading the status panel

- `candidates` — **local** candidates only, plus `peer N` for what arrived from the other side. `0 relay` locally while the other end shows relay is normal; see
  the one-side-is-enough note. `peer N` matching the other side's published total means signalling is healthy.
- `pair` — `(direct)` vs `(relayed)`. Toggling TURN on and still seeing `(direct)`
  means a direct path was found and preferred. Working as intended.
    - `host ↔ host` — both sides resolved each other's mDNS, or both published raw IPs.
    - `host ↔ prflx` — **direct, via peer-reflexive discovery.** One side's address was learned from an inbound connectivity check rather than the SDP. Expected
      when only one side publishes raw IPs.
    - `srflx ↔ relay` / `relay ↔ srflx` — relayed, one-sided TURN. Correct and expected.
- `rtt` — `—` means not reported. Firefox often omits it on the offering side.
- `buffer` — should oscillate between roughly 1 and 8 MB. Pinned at 8 MB means the receiver can't keep up.

---

## Gotchas

- **`config/origins.ts` is the single source for the allowlist**, shared by CORS in `server.ts` and `originGuard.ts`. These were separate lists once and had
  already drifted. Referer must be parsed with `new URL()` and compared by
  `.origin` — a prefix check accepts `https://jerryxf.net.evil.com`.
- **`showSaveFilePicker` isn't in `lib.dom.d.ts`.** It's WICG, not WHATWG; lib.dom ships the OPFS half only. Declared in `src/types/file-system-access.d.ts`.
- **morgan logs on response finish**, so an open SSE stream produces no log line until the client disconnects. Looks like a dropped request. It isn't.
- **`.expedite_btn-primary` has `flex: 1`** for horizontal button rows. Inside a flex column that reads as `flex-grow` and stretches the button vertically.
- **Progress bars shouldn't have CSS width transitions** when updates arrive every ~100ms; the animation restarts before it lands and the bar trails.
- **Don't hand-write `-webkit-` prefixes.** The production CSS minifier keeps the last vendor-prefixed property, so writing `-webkit-backdrop-filter` next to
  `backdrop-filter` strips the unprefixed form in the build. Let autoprefixing do it.
- **A `<div>` inside a `<dl>` may only group a `<dt>` with its `<dd>`.** The mode help panel therefore renders inside the `<dd>`, not as a sibling.
- `npx` fails in this repo — `devEngines.packageManager` pins pnpm. Use
  `pnpm exec`.

---

## Verifying changes

```bash
pnpm exec tsc --noEmit
pnpm exec eslint . --report-unused-disable-directives
pnpm exec vite build
```

For P2P, the test topologies are not equally informative and the easy-sounding ones are the hardest:

| Topology                        | Exercises           | Notes                                                                                                                               |
|---------------------------------|---------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| Two browsers, one machine       | mDNS only           | **Worst case, not easiest.** No network involved at all, so a failure here is always local (permissions, mDNS responders fighting). |
| Two devices, same LAN           | mDNS + L2           | Fails wholesale if multicast is filtered. Good relay-fallback bench precisely *because* it fails.                                   |
| Two devices, different networks | srflx hole punching | **The actual common case, and the least tested.** Never touches mDNS. Phone on cellular -> laptop is the cheapest way to run it.    |

Verified end to end as of 2026-08-08: 5 GB Firefox -> Chrome; 1 GB Firefox -> Chrome; 128 MB relayed `relay ↔ srflx` cross-device at 8.5–9.5 MB/s with exact
candidate reconciliation both directions; 128 MB direct `host ↔ prflx` at 9.5 MB/s; iOS Safari -> desktop Chrome; automatic relay recovery reusing the granted
file handle without user action.

Still untested: mobile hotspot topology, and a genuinely cross-network transfer between two different physical sites.