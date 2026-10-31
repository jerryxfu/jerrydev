# Expedite

Short-lived file and text sharing. Four types and one five-character code.

| Type   | Path the bytes take                        | Size ceiling               | Lives for    |
|--------|--------------------------------------------|----------------------------|--------------|
| `text` | JSON body -> MongoDB                       | 500 KB                     | 1 min – 24 h |
| `file` | Presigned PUT -> Cloudflare R2             | 16 GB (several: one zip)   | 1 min – 24 h |
| `p2p`  | WebRTC data channel, peer to peer          | none                       | session only |
| `live` | a room's items: texts in MongoDB, files R2 | 500 KB a text, 1 GB a file | 1 h          |

Codes are 5 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no I/O/0/1). Uniqueness is checked across all the types, so `GET /drop/:code` resolves any of them
and the UI decides what to render from the returned `type`.

---

## Frontend layout

```
ExpeditePage/
  Expedite.tsx          orchestrator: view state, all fetch calls, engine wiring
  types.ts              DropMeta, DropSettings, P2P status/snapshot shapes
  utils.ts              formatting helpers, saveBlob, downloadLinks
  uploadEngine.ts       R2 upload: single PUT or multipart, with progress (putToR2, shared with live rooms)
  files.ts              the files picked to send: their paths, dropped folders read, no file added twice
  zip.ts                several files as one stored zip (buildZip, zipFiles), and a zip read back (readZip, entryData)
  crc32.ts              the zip's checksum, read in crc32.worker.ts
  sha256.ts             SHA-256 in sha256.worker.ts: the sender's at upload, checked against the receiver's saved copy
  pdfPage.ts            a PDF's first page, by pdf.js (loaded on the first PDF shown)
  useFileDrag.ts        files dragged over an element (the root refuses them, so no file opens in place of the page)
  highlight.ts          Shiki on demand, file extensions, Auto's language guess, line-by-line colouring
  p2p/
    peer.ts             shared WebRTC plumbing, rate meter, protocol constants
    sender.ts           offer -> publish -> wait -> stream file
    receiver.ts         answer -> receive -> stream to disk
  live/
    room.ts             a live room's API calls, its stream, and your seats (tokens in localStorage, by code)
    useLiveRoom.ts      the room as the page has it: members, items, your files going up, and what to do in it
  views/
    LandingView         send tiles + retrieve field
    UploadView          text/file composer + settings
    CodeEditor          the text box for code: a textarea over its coloured copy
    TextStats           the text box's statistics, counted when the typing pauses
    CreatedView         code + share link + QR code
    ResultView          retrieved text/file
    FilePreview         picture/video/audio/PDF/text preview, sent and received
    FileZone            the files to send: a zone, then their stack
    FileStack           several files, a row each
    ZipStack            a received zip's files, each one shown or saved on its own
    Disclosure          folded section (P2P's technical side), open state remembered
    CopyField           read-only field with a copy button: a drop's link, or a curl command
    P2PSendView         session code, countdown, notes
    P2PReceiveView      offer preview, support gate
    UploadProgress      multipart part grid
    P2PProgress         phase ladder + transfer stats
    LiveView            a live room: its bar and a box per person
```

`Expedite.tsx` owns the state and the network calls, but for two: `FilePreview` reads the start of a text file to show it, and a live room's are
`useLiveRoom`'s (Expedite holds it). The views take callbacks. Transfer engines are plain async functions taking an options object with callbacks and an
`AbortSignal`, the same shape as `uploadEngine.ts`, on purpose.

---

## Live rooms

A room for live work: one code, up to 6 people (its creator included) for an hour from its creation. Each person has a box; what they paste or drop
anywhere on the page goes into theirs, and everyone sees every box fill. Files are 1 GB at most (a bigger one is a File drop's), texts 500 KB, both
counted in the 50 GB cap while the room lasts. One network sends 200 of them in 10 minutes at most (`liveItemLimiter`), texts and files together.

- **Seats.** Opening the code (the Live tile makes one, the retrieve field or the link joins) takes a seat, and you can't watch without one: the 6 is
  really 6 people. The API answers a token, kept in localStorage by code (`expedite:live`): a reload, or the link opened again in the same browser, puts
  you back in your seat. Back keeps it; Leave frees it and deletes what you sent. The creator can't leave: they end the room, or remove someone (their
  seat frees, their items go). Someone removed can join again with the code: ending the room is the answer to a code that leaked.
- **Here or away.** The page checks in (`POST /live/:code/here`) every 30 s, and while a file goes up; someone is away 90 s after their last, and their
  box goes grey. Not the stream: in production the platform keeps it open after its page has gone. 90 s, as a hidden tab's timer can slow to once a
  minute.
- **The stream** (`GET /live/:code/events?token=`, SSE like P2P's) sends the members when they change and the room's whole list of items whenever its
  `rev` moves, never a change alone. A write lands first and bumps `rev` after, so a stream can see a change twice but never miss one. A text, or a
  finished file's links (signed until the room ends), is sent once per stream; the page keeps it. A dropped stream reconnects on its own and sends
  everything again; the page keeps the links it has, or every picture would download again.
- **Pasting.** Anywhere but in a field: sent at once (files as files, text as text). In the composer, text stays to be sent. The Paste button reads the
  clipboard (`navigator.clipboard.read`): a phone's way to paste a picture.
- **Previews.** Text is checked for code with the composer's guess (`resolveLanguage(AUTO, …)`). Files use `FilePreview`'s `mini` (a text file's first
  lines from a 4 KB Range request). A PDF's first page is fetched whole, so up to 16 MB only (`THUMB_MAX`, see "Several files").
- **Downloads.** Download all and Download new (not downloaded in this browser yet), in the others' boxes. Each file goes to the browser's own downloads
  from a hidden frame, half a second apart (`downloadLinks`): a link opened in the page would stop the one before it while it starts. Chromium asks once
  to allow several. Which ones were downloaded is kept with the seat, so a reload knows them.
- **Layout.** On a laptop, Columns (a box per column) or Grid (two rows), kept for the browser (`expedite:live-layout`); a phone shows a box at a time.
  The room is the screen's height and the boxes take what the header leaves. A box is never narrower than 312px (`BOX_MIN`): past that the boxes scroll
  sideways, each as wide as leaves the next one's edge in view (`PEEK`). The row that scrolls (`.live_scroll`) is a flex row around the boxes' grid,
  because Safari sizes a grid that scrolls itself as if its scrollbar took no room: the boxes ran under the bar, and the row scrolled down by it.
- **Leaving the page** stops the stream and the files going up; a file given up is deleted (keepalive), so nobody sees it coming forever. A page
  that goes without saying so (a crash, a lost network): its files still coming are deleted once its person is away (the streams look every 15 s).

---

## Several files

Pick or drop several files, or a folder, on the File or Direct P2P screen: they make a stack (`FileZone`, `FileStack`), with Add files
and, on a computer, Add a folder. One file goes as it is. Several go as one zip, made in the page as they're sent.

- **A stored zip, made of the files themselves.** No compression, so its size is known before it's made, and each file inside is one
  run of its bytes. `buildZip` returns a `File` of small headers between the picked files (`new File([header, file, header, file, ...,
  directory])`): nothing is copied or held in memory, and the upload and the P2P sender slice it like any file, so a multipart part can be
  retried and a P2P transfer goes on from the receiver's byte after a reconnect. A zip streamed as it's made (client-zip's way) couldn't:
  a stream can't go back.
- **The cost: each file read once first.** A zip's headers hold each file's CRC-32 before its bytes, so `crc32Of` reads them all in a
  worker before the zip exists ("Preparing the zip... 45%"), about 1.5 GB/s in Chromium. Then the SHA-256 and the upload read the zip as
  they read a file.
- **The format**: UTF-8 names (flag 11, and NFC: a Mac's are decomposed), DOS times, Unix permissions (rw-r--r--), Zip64 past 4 GB or
  65,535 files (a File drop goes to 16 GB). A Mac's `.DS_Store` stays out of a dropped folder; a name taken twice gets a number ("a (2).jpg").
  Not yet opened in Windows Explorer.
- **Its name: `12_files_ABCDE.zip`.** The code is made by the API, after the page sends the name, so the page sends `fileName:
  "12_files.zip"` and `files: 12`, and the API names it (`stackName` in `shared.ts`; `POST /drop/file/init` and `POST /p2p/init`, so each
  new P2P code gets its name).
- **Receiving: the zip's files, without unzipping.** Any zip received shows its files (`ZipStack`): its central directory is read from its
  end (two or three reads of a few KB), and each file from its own bytes, inflated if deflated (`DecompressionStream`), so a zip made
  elsewhere opens too. Folders' entries and macOS's `__MACOSX` copies are left out; an encrypted file only lists. From a drop's link,
  with Range requests (the text preview's way: no extra permission); from a Direct P2P copy, by slicing it: in memory (Firefox, Safari),
  or read back from the file Chromium wrote it to (`handle.getFile()`: the save picker lets the page read it).
- **The limits, from a link only**: a link can't point at part of a file, so a file is fetched into the page to be shown (up to 100 MB,
  `OPEN_MAX`) or saved on its own (up to 1 GB, `SAVE_MAX`); bigger, the zip. From a P2P copy, any size: it's a slice.
- **Small pictures**: a picture or a PDF up to 16 MB (`THUMB_MAX`) shows a small copy in its row once the row comes near the screen,
  drawn into a canvas (an `<img>` decoded once, then dropped: a stack of photos doesn't keep them all decoded). A PDF's first page is
  pdf.js's (`pdfPage.ts`; about 450 KB and a 1.2 MB worker, loaded on the first PDF, one PDF at a time through one worker). It reads the
  PDF whole: pdf.js checks the last page whenever it opens a PDF, and in one that isn't linearized (most) that walks every page's object,
  spread all through the file. Reading by ranges was tried and dropped: a 6 MB PDF took 94 requests and 19 s for its first page.

---

## Direct P2P

### Why it works the way it does

**Non-trickle ICE.** Both sides finish gathering candidates before sending their SDP, so signalling is three messages instead of a candidate stream. Costs 1–3s
up front and makes the server much simpler. Gathering is capped at 9s with the relay (its allocation needs an extra round trip), 5s without it, and ends 1s
after the first relay candidate: the rest come within a few hundred ms of it, while one server can take 40s to give up (`turn:...:443?transport=udp`, on a
network that drops IPv4 UDP to port 443, which held every gathering to the 9s cap). An answerer that finds a working route while gathering (both
ends on one machine) stops there, so its answer can carry host candidates only. That's Chrome, and harmless: the route already works.

**Sender creates the code.** Matches text and file drops, matches the WebRTC convention that the offerer initiates, and means the session doc can carry
`fileName`/`fileSize`/`mimeType` for the receiver's preview and save dialog.

**SSE, not polling.** The sender may hold a code for ten minutes. Polling that would blow through the rate limiter; one long-lived `EventSource` doesn't.
Headers are flushed immediately so Cloudflare's ~100s time-to-headers limit never applies, with heartbeat comments every 25s for intermediate proxies.

**Receiving depends on the browser** (`p2pReceiveMode` in `types.ts`):

- **disk**: `"showSaveFilePicker" in window` (Chromium on a computer). Streams to the picked file, no size limit.
- **memory**: other browsers on a computer (Firefox, Safari). No picker, so the file is kept in the tab, up to `P2P_MEMORY_MAX` (1 GB), and saved to the
  downloads once complete, with a Save again button in case the browser didn't (Safari may ask first). The receiver copies the chunks into a Blob every 16 MB,
  so memory stays near the file's size rather than doubling at the end. Bigger drops are refused up front rather than failing at 80%.
- **none**: phones and tablets, detected as `(pointer: coarse)` (an iPad passes for a Mac otherwise). They pause a page when the screen locks or another app
  comes up, and iOS closes a tab that holds too much. Chrome on Android has no picker either.

**Sending works everywhere**: it only needs `File.slice()`.

**The save picker must be the first `await` in its click handler.** It requires a user gesture, and any earlier `await` spends it. Sequence is: enter code ->
click Receive -> picker opens -> *then* negotiate.

### Session lifecycle

```
sender                          server                        receiver
  |-- POST /p2p/init ----------->|  store offer, mint code
  |<-- code, sender's token -----|
  |-- GET /p2p/:code/events ---->|  SSE held open
  |                              |<-- GET /drop/:code -------- |  returns offer
  |                              |<-- POST /p2p/:code/answer -- |
  |                              |--- receiver's token ------->|
  |<== event: answer ============|  the session stays, paired
  |============ data channel, direct ==========================|
  |-- DELETE /p2p/:code -------->|  once the transfer is over
```

**Reconnecting after a network switch.** A transfer outlives its connections. A connection dies when either side
changes network (the Wi-Fi switched, the phone left it for its data). Both sides then drop it and make a fresh one
through the paired session, each with its token, and the receiver says how much it has saved: the sender goes on from
there.

```
sender                          server                        receiver
  |   lost: the channel closed, or 5 s without a word from the other side
  |                              |<-- GET /reconnect/events -- |  SSE, held while reconnecting
  |-- POST /reconnect (offer) -->|  round + 1                  |
  |-- GET /reconnect/events ---->|== event: offer ===========>|
  |                              |<-- POST /reconnect/answer -- |
  |<== event: answer ============|                             |
  |============ new connection, new data channel ==============|
  |<-- CTRL_AT (bytes saved) ----------------------------------|  where the sender goes on from
```

A fresh connection rather than an ICE restart of the old one (tried first, and dropped), because browsers carry an old
connection through a network change each their own way. Firefox closes the channel within a second of losing its
network. Chromium and Safari bring the old route back by themselves, from a new port, and Firefox never moves to it:
both sides say connected and nothing moves, even after a completed ICE restart. Every browser makes a new connection
the same way, so one path covers all of it, and the first connection is just a transfer going on from byte 0.

A loss is seen the same way on both sides: the channel closes, or nothing comes from the other side for 5 s (the
receiver reports what it has saved every second, the sender's chunks keep coming). The receiver writes everything that
arrived before it says where it is, so no byte is lost or doubled. An attempt gives each call to the API 15 s, waits 15 s
for the answer, then 15 s for the channel, and another follows 3 s after one fails; without a connection for 90 s, the
sender gives up, and the receiver 10 s later. A side that stops on purpose (Cancel, a closed tab, a failure) ends the
session, and the other side's next attempt finds it gone and stops at once ("The receiver stopped the transfer"). The
reconnect stream waits through a network that's still down: a browser closes an EventSource for good when it can't
reach the server at all, so `waitForSignal` opens it again every 3 s, and only the API's `gone` stops it. The constants
and the why are in `p2p/peer.ts` (`STALL_MS`); the loss is `watchLink`, the attempts `reconnect` in `sender.ts` and
`answerReconnect` in `receiver.ts`.

Unclaimed sessions expire after 10 minutes. The client tears down and publishes a **new offer under a new code**: it can't reuse the old one, because the ICE
candidates in a ten-minute-old SDP reference NAT bindings that have lapsed, so reconnecting would fail at the checking stage with nothing to show for it.

Teardown on tab close uses `fetch(..., {keepalive: true})`. `sendBeacon` can't be used because it only issues POSTs.

### Transfer mechanics

64 KB chunks (clamped to 75% of the negotiated SCTP `maxMessageSize`), ordered reliable channel. Flow control pauses above 8 MB buffered and resumes below 1 MB
via `bufferedamountlow`.

Termination is byte count reached, with a NUL-prefixed `CTRL_EOF` string as backup, and a `CTRL_DONE` ack so the sender knows the receiver finished writing.
Only `CTRL_DONE` counts as delivered (the receiver's disk can still fill up after the last byte went out); a channel that closes first
is a lost connection, and the reconnect takes it from there. So `CTRL_DONE` isn't cut off, the receiver doesn't close after sending it: the sender closes
on hearing it, and the receiver closes anyway after 5s. Until then the receiver keeps sending `CTRL_AT` with its byte count every second (closing a big
file can take a while), so the sender doesn't take the wait for a lost connection. Known gap: a connection lost just after the receiver sent `CTRL_DONE`
and before it arrived leaves the file saved but the sender reporting "The receiver stopped the transfer".

Receiver writes are serialised through a promise chain: `write()` is async and message events are not, so without it a fast sender interleaves writes and
scrambles the file. The chain belongs to the transfer, not to one connection: a new connection starts once the last one's writes are done.

**The sender reports `queued - bufferedAmount`, not `queued.`** Bytes handed to SCTP aren't bytes delivered. Reporting `queued` produced a sawtooth whose flat
sections defeated the speed calculation and made the two screens disagree.

### TURN

Offered from the start on both sides, unless the month's relay quota is spent: then `POST /p2p/turn` mints nothing (403), and the pages gather without it.
The API checks the quota, not the page: anyone can call the API with the site's Origin header, and the credential is one for everyone, valid 24 hours (one
minted before the cap still works until then). Relay candidates are gathered with the others, and ICE ranks pairs by type (host
above srflx above relay), so the relay only carries the file when no direct pair answers. The fallback is instant: no failed attempt to wait out, no second
round. The quota counts relayed bytes, so a transfer that goes direct uses none of it.

**One side's relay is enough** (a failed credential mint, say): a relay candidate is a public reachable address, so the peer without TURN can pair against it
using an ordinary srflx candidate.

Credentials are minted server-side (`config/turn.ts`), cached in-process, and **URLs on port 53 are stripped**: Cloudflare returns alternate ports, browsers
block 53, and with non-trickle gathering a hanging URL delays the whole SDP and can cost the relay candidates entirely.

`getStats()` reports the pair the data goes through (the transport's `selectedCandidatePairId`; Firefox marks it `selected`), so the UI says whether the
transfer is actually direct or relayed.

---

## Same-LAN direct requires mDNS: read this before debugging a failed direct connection

**This is the most likely reason a direct transfer isn't going direct, and it is almost never the code.**

Both browsers replace host candidates with a random mDNS hostname by default, so the SDP carries `62dd1680-f778-4851-9e81-d27918aac088.local` instead of
`192.168.2.x`. Two peers on the same LAN can only pair `host ↔ host`, which requires each side to resolve the other's `.local` name by multicasting a query to
`224.0.0.251:5353` and getting an answer. **If anything on the network drops or fails to answer that multicast, direct is impossible**: the only surviving pair
is srflx ↔ srflx, which is both peers' *own* public IP, and that needs router hairpinning that consumer gear generally won't do.

### The signature

From a real failing run (Mac Firefox -> Windows Chrome, same /24):

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
| `--disable-features=WebRtcHideLocalIpsWithMdns`          | Works, but does not survive a normal relaunch: silently reverts and looks like a regression.                     |
| Provision TURN and fall back                             | What Expedite already does. What everyone does.                                                                   |

### Who it affects

Same-LAN transfers only: they depend on mDNS, and that's the "send to my own laptop" case. Across networks, peers pair `srflx ↔ srflx` by ordinary UDP
hole punching, unaffected. About 20% of WebRTC connections relay in general (60–85% on corporate networks), and Snapdrop, PairDrop and ShareDrop have the
same failure, answered the same way: TURN. It does make the relay quota matter more than it looks, which is why the quota stat and the relay guard exist.

---

## Diagnosing a failed direct connection

Work top to bottom. Most of these are environmental and none of them are in the repo.

**1. Capture a usable webrtc-internals dump.** It records nothing retroactively and drops the PeerConnection when the creating tab closes.

```
open chrome://webrtc-internals in a SECOND tab
start the transfer in the Expedite tab
while it's still running, WITHOUT closing the Expedite tab -> Create Dump -> Download
```

`"PeerConnections": {}` means it was captured too late. Take two: during negotiation, and once a pair is picked (or ICE has failed).
Firefox's `about:webrtc` keeps every connection since Firefox started: pick the right entry.

**2. Read the remote description.** `.local` in the remote host candidates plus
`checking -> disconnected -> failed` is the mDNS diagnosis above, confirmed.

**3. Check candidate reconciliation.** The UI's `peer N` should equal what the other side published. If they match, signalling and the API are provably healthy
and the problem is purely ICE connectivity: don't go looking in `p2p.ts`.

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
  displaying as enabled: toggle it off and on.
- **Firefox `obfuscate_host_addresses` persists.** Unlike Chrome's command-line switch (in the table above) it survives restarts, so a half-reverted
  workaround leaves one browser at defaults and one not, which produces results that look contradictory.
- **IPv6 STUN 701 errors are benign.** `onicecandidateerror` with
  `"STUN host lookup received error"` against both Cloudflare and Google STUN on an IPv6 interface, while the IPv4 srflx gathers fine, is normal on a
  v4-only-reachable network. It costs gathering time, not connectivity.
- **`showSaveFilePicker` needs a secure context.** Testing dev builds cross-device over `http://<lan-ip>` from `vite --host` makes it disappear and the receiver
  falls back to memory mode (1 GB at most), in Chrome too. Test against prod, or give dev a local cert.

---

## Backend

```
routes/expedite/
  index.ts    router assembly
  shared.ts   config constants + generateCode, parseTtl, getUsedBytes, countView, newR2Key, sendJsonError
  text.ts     POST /drop/text; createTextDrop (shared with raw.ts)
  file.ts     POST /drop/file/init, /drop/file/complete; startFileUpload, finishFileUpload (shared with raw.ts), signUpload (and live.ts)
  p2p.ts      POST /p2p/init, /p2p/:code/answer, /p2p/turn, /p2p/:code/reconnect, /p2p/:code/reconnect/answer
              GET  /p2p/:code/events, /p2p/:code/reconnect/events (SSE)
              DELETE /p2p/:code
  live.ts     POST /live, /live/:code/join, /live/:code/here, /live/:code/items, /live/:code/items/:id/complete
              PATCH and DELETE /live/:code/members/:id, DELETE /live/:code/items/:id, DELETE /live/:code
              GET  /live/:code/events (SSE)
  drops.ts    GET /drop/:code, GET /stats, DELETE /drop/:code
  raw.ts      the terminal's, in plain text (mounted in routes/index.ts, outside the origin guard):
              GET /raw/:code, PUT /raw/ and /raw/:name, POST /raw/start, POST /raw/:code/done
```

**Sending from a terminal.** Every terminal drop lasts 12 hours, with no view limit, and is deletable: there are no options, so the commands stay short (and
clear of zsh's `?`).

- `curl -T <file> https://api.jerryxf.net/expedite/raw/` (curl adds the file's name after the slash) or `<command> | curl -T - …/raw/` sends it in one request.
  A pipe is a text drop when it's UTF-8 text without a NUL byte, 500 KB at most; anything else a file drop, nameless for a pipe (it downloads as
  `expedite-CODE`). The API stores the file in R2 itself and computes its SHA-256. The answer: "Upload successful. Drop expires in 12h.", then the
  code, its page and the command to get it back, a line each.
- One request carries 32 MB at most: Cloud Run refuses a bigger body (Cloudflare, one over 100 MB) with its own 413, before Express runs. So a bigger file
  goes the page's way, straight to R2, through the scripts in the site's `public/`: `curl -fsSL https://jerryxf.net/expedite.sh | sh -s <file>` (macOS, Linux,
  WSL, Git Bash) and `& ([scriptblock]::Create((irm https://jerryxf.net/expedite.ps1))) <file>` (PowerShell, a script block so the execution policy doesn't
  stop it). Up to 32 MB they make the one request; bigger, `POST /raw/start` (name, size) answers the code, the type and a signed link per 100 MB part, each
  part goes to R2, and `POST /raw/:code/done` (the SHA-256, then the ETags) checks and completes the drop. Both read 100 MB parts: `PART_SIZE` changes
  them too. Not yet run on Windows PowerShell 5.1.

**From a terminal.** `curl https://api.jerryxf.net/expedite/raw/ABCDE` prints a text drop as it is. A file drop redirects to its download link:
`curl -LOJ` saves it under its name (curl's `-J` takes the ASCII stand-in, so accents become `_`), `curl -L` streams it to stdout, to pipe it into a
command. Without `-L` the view is spent, so the body gives a command with the link, which works until the drop expires. A P2P code answers 409 (it needs a
browser). Every GET counts a view, like the page, and shares its rate limit; HEAD answers 405 so `curl -I` doesn't spend one. A chat app's link preview
fetches the link too: share the page's link, not this one.

One Mongo collection for all the types, with a TTL index on `expiresAt` that cleans expired drops, orphaned upload reservations, abandoned p2p sessions
and ended live rooms alike. Its monitor runs about once a minute, so `GET /drop/:code` and `GET /raw/:code` look only at drops not yet expired. A live
room's items are a second collection (`LiveItem`), with the room's expiry and their own TTL index; their R2 objects are left to the bucket's lifecycle rule
(nothing links to them by then).

A view is counted in one atomic step, while one is left (`countView`): of two opens at the same moment, a one-time drop goes to one only, and the other gets
404. `DELETE /drop/:code` is for text and file drops; a P2P session and a live room end through their own routes.

`status` means different things per type, which is the one genuinely confusing part: for `file`, `pending` means the upload isn't verified and the drop is
invisible. For `p2p`, `pending` means the session is **live and waiting for a receiver**. The `p2p` branch in `GET /drop/:code` must therefore come before the
generic pending check.

`getUsedBytes()` only sums `fileSize` when `type === "file"`, so p2p sessions contribute nothing to the 50 GB cap. Nothing about a direct transfer touches R2.
Live rooms' items add their `size` (texts and files).

---

## Reading the status panel

Under Connection details, folded.

- `WebRTC ICE candidates`: **local** candidates only, plus `peer N` for what arrived from the other side. `0 relay` locally while the other end shows relay is normal; see
  the one-side-is-enough note. `peer N` matching the other side's published total means signalling is healthy.
- `Route`: `(direct)` vs `(relayed)`. Relay candidates gathered and still `(direct)`
  means a direct path was found and preferred. Working as intended.
    - `host ↔ host`: both sides resolved each other's mDNS, or both published raw IPs.
    - `host ↔ prflx`: **direct, via peer-reflexive discovery.** One side's address was learned from an inbound connectivity check rather than the SDP. Expected
      when only one side publishes raw IPs.
    - `srflx ↔ relay` / `relay ↔ srflx`: relayed, one-sided TURN. Correct and expected.
- `RTT`: a dash means not reported. Firefox often omits it on the offering side.
- `Buffer` (the sender's): should oscillate between roughly 1 and 8 MB. Pinned at 8 MB means the receiver can't keep up.

---

## Gotchas

- **`config/origins.ts` is the single source for the allowlist**, shared by CORS in `server.ts` and `originGuard.ts`: two lists drift.
  Referer must be parsed with `new URL()` and compared by `.origin`: a prefix check accepts `https://jerryxf.net.evil.com`.
- **`showSaveFilePicker` isn't in `lib.dom.d.ts`.** It's WICG, not WHATWG; lib.dom ships the OPFS half only. Declared in `src/types/file-system-access.d.ts`.
- **morgan logs on response finish**, so an open SSE stream produces no log line until the client disconnects. Looks like a dropped request. It isn't.
- **Buttons are `components/Button`**, shared with the Time page. The main one grows (`flex: 1`) only inside `.expedite_btn-row`: on the button itself, a flex
  column read it as `flex-grow` and stretched the button vertically.
- **Progress bars shouldn't have CSS width transitions** when updates arrive every ~100ms; the animation restarts before it lands and the bar trails.
- **Don't hand-write `-webkit-` prefixes.** The production CSS minifier keeps the last vendor-prefixed property, so writing `-webkit-backdrop-filter` next to
  `backdrop-filter` strips the unprefixed form in the build. Let autoprefixing do it.
- `npx` fails in this repo: `devEngines.packageManager` pins pnpm. Use `pnpm exec`.

---

## Verifying changes

```bash
pnpm exec tsc -b --noEmit
pnpm lint
pnpm build
```

The API: `pnpm build` (tsc).

For P2P, the test topologies are not equally informative and the easy-sounding ones are the hardest:

| Topology                        | Exercises           | Notes                                                                                                                               |
|---------------------------------|---------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| Two browsers, one machine       | mDNS only           | **Worst case, not easiest.** No network involved at all, so a failure here is always local (permissions, mDNS responders fighting). |
| Two devices, same LAN           | mDNS + L2           | Fails wholesale if multicast is filtered. Good relay-fallback bench precisely *because* it fails.                                   |
| Two devices, different networks | srflx hole punching | **The actual common case, and the least tested.** Never touches mDNS. A phone on cellular often relays (below).                     |

Not seen yet: a direct `srflx ↔ srflx` route between two networks. A phone on cellular -> laptop relays behind a carrier's NAT, and so do two networks behind one
public address when the router doesn't hairpin. Mobile hotspot not tried.