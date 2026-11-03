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

Everything about dates and times goes through `Temporal` (ES2026), with no library and no house module. TypeScript knows it through
`ESNext.Temporal` in `tsconfig.app.json`.

**Which type.** A calendar day is a `Temporal.PlainDate`, a time of day a `PlainTime`, a moment an `Instant`, a moment on a clock somewhere a
`ZonedDateTime` (`Temporal.Now.zonedDateTimeISO()`, `.withTimeZone(zone)`). Spans come from `.until()` and `.since()`, which count calendar days right
across a DST change. Format with `toLocaleString`.

**Safari has no Temporal yet** (Nov 2026; Chrome and Edge 144, Firefox 139 do). `main.tsx` loads `temporal-polyfill` before anything is drawn, only where
`Temporal` is missing: its own chunk, under 20 kB gzipped, not precached. Two rules follow:

- **No Temporal while a module loads**, only inside functions and components. On Safari, every module the first page imports has run before the polyfill
  arrives.
- **Dates in the site's data are text.** Blog posts, projects and experiences write `"2026-09-01"` (the `IsoDay` type, `src/utils.ts`), read with
  `Temporal.PlainDate.from` where they're shown. Sorting them at load compares them as text, which ISO days allow. The API's times are instant strings,
  read with `Temporal.Instant.from`. The build (Node 24, no Temporal) reads `src/head.ts` and the post list, so they must stay that way.

**What stays as it is.** `Date.now()` and `performance.now()`, as millisecond clocks: when a timer ends, a transfer's speed, the sync pattern's lock on
the wall clock. They're numbers, not dates. The night-mode script in `index.html` keeps its `new Date().getHours()`: it runs before any module.

Three things to know:

- **Hours as `"numeric"`, not `"2-digit"`.** Chrome writes a Temporal time's 2-digit hour without its zero in 12-hour locales, and the polyfill with it, so
  the browsers would disagree.
- **Month ends.** `until` counts Jan 31 to Feb 28 as 28 days, not a month, like most date calculators. Jan 31 + 1 month is still Feb 28.
- **Day counts have a sign.** `formatDate` counts from the date to today (positive for the past); `formatPostAge` from today to the date (negative, which
  `Intl.RelativeTimeFormat` reads as "ago"). Swap them and every date on the blog reads "in 5 days".

There is no test runner.
