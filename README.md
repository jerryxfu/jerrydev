# jerryxf

This is the repository for my personal website, [jerryxf.net](https://jerryxf.net).

### Useful development resources

- Color palette generator: [https://mycolor.space/](https://mycolor.space/)
- Mesh gradient generator: [https://csshero.org/mesherv2/](https://csshero.org/mesherv2/)

### Progressive web app

`vite-plugin-pwa` in `vite.config.ts` (`generateSW`), whose comments say why each setting is what it is. In short: the precache holds `index.html`
and the fonts (KaTeX's only once a post needs them); pages come from the network first, the precached shell offline; hashed JS and CSS, pictures and videos
are cached the first time they're used. Nothing matches `api.jerryxf.net`, so Expedite and Rendezvous load offline but can't do anything, which `OfflineToast`
says. A new deployment's worker waits until the site's tabs are closed (`registerType: "prompt"`, with no prompt shown).

Service workers don't register under `pnpm dev`. To test, run `pnpm build && pnpm preview` and use DevTools -> Network -> Offline.

#### Removing it

Uninstall the plugin, delete the `VitePWA({ ... })` block and its import from `vite.config.ts`, and delete `src/components/OfflineToast/` along with its
import and `<OfflineToast />` in `src/main.tsx`.

**Do the unregister release first.** Removing the plugin doesn't remove the service worker from browsers that already have one. A registered worker keeps
serving its cached `index.html`, and once the build stops shipping a `sw.js` there is nothing to replace it with: those visitors can be pinned to the old
version for good, with no way to reach them afterwards. So ship one release with:

```ts
VitePWA({
    selfDestroying: true,
    // leave the rest of the config as-is
});
```

which builds a worker whose only job is to unregister itself and delete its caches. Leave it deployed long enough for returning visitors to pick it up, then
remove the plugin.

### Dates and times

There is no date library and no shared date module, on purpose (below).

**A `Date` is an instant, not a calendar day.** Any time you need a calendar day, go through local fields (`getFullYear`/`getMonth`/`getDate`), never
through UTC. Two ways it goes wrong, both of which have put wrong dates on this site:

- Flooring the milliseconds between two local midnights. Midnights an exact number of days apart are 23h or 25h short of a multiple of 24h whenever a DST
  transition sits between them, so the floor loses a whole day.
- `toISOString().slice(0, 10)` on a local midnight. It re-renders the instant in UTC: the previous calendar day for anyone at a positive offset.

The rule:

- To turn a `YYYY-MM-DD` literal into a `Date`, always append `T00:00:00`. A bare date string parses as UTC midnight and renders the wrong day west of
  Greenwich. `postDate()` in `BlogPage/posts.tsx` wraps this; `hello-blog.mdx` documents it.
- To turn a `Date` back into `YYYY-MM-DD`, use a local-fields helper (`toISODate` in `rendezvous/utils.ts`, `isoDay` in `time/utils.ts`,
  `HomePage/Blog/BlogFeed.tsx` and `HomePage/Experience/Experience.tsx`). **Never `toISOString()`.**
- To count calendar days, collapse both endpoints with `new Date(y, m, d)` and `Math.round` the quotient. Never `Math.floor`, never raw millisecond
  subtraction.

**Why no shared module.** `Temporal` (TC39's replacement for `Date`) makes this distinction part of the type: `Temporal.PlainDate` has no time zone, and
`.since()` counts days correctly across DST. Once it has baseline support (check MDN), adopt it directly rather than a house API; its polyfill is too
heavy for this site.

**If it's centralized before then**, the core is two functions in `src/date.ts`: `toISODate(d)` (local `Y-M-D`, written four times today) and
`localDate(iso)` (owns the `T00:00:00` idiom). The rest is different on purpose: the scheduler's minutes-since-midnight model, the duration formatters, the
two `timeUntil` (different outputs), SuperICU's `performance.now()` clocks. Two traps:

- **Don't unify the day counts behind one signature.** `formatDate` computes `today - date` (positive for the past); `formatPostAge` computes
  `date - today` (negative, as `Intl.RelativeTimeFormat` reads the sign as the direction). One shared argument order turns every date on the blog into
  "in 5 days".
- **`index.html` runs its own `new Date().getHours()`** for the night-mode boot overlay: an inline classic script, outside the module graph, that can't
  import from `src/`.

There is no test runner. A centralized module should come with its first tests: a day count across a spring-forward boundary, `toISODate` under
`TZ=Asia/Tokyo`, and `localDate` on an unpadded `"2026-9-1"`.
