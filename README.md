# jerryxf

This is the repository for my personal website, [jerryxf.net](https://jerryxf.net).

### Useful development resources

- Color palette generator: [https://mycolor.space/](https://mycolor.space/)
- Mesh gradient generator: [https://csshero.org/mesherv2/](https://csshero.org/mesherv2/)

### Progressive web app

Configured in `vite.config.ts` via `vite-plugin-pwa`, in `generateSW` mode.

Precached: JS, CSS, HTML, fonts, every route chunk, both vendor chunks and the three gradient-mesh stylesheets. Not precached: the project images and the video.
Those are picked up by a `CacheFirst` runtime rule the first time they're actually viewed, capped at 80 entries and 30 days.

Nothing matches `api.jerryxf.net`, so API calls always go to the network. Expedite and Rendezvous therefore load offline but can't do anything, which is what
`OfflineToast` warns about.

`registerType: "autoUpdate"` means a new deployment's service worker takes over on the next page load with no prompt.

Service workers don't register under `pnpm dev` unless `devOptions.enabled` is set. To test, run `pnpm build && pnpm preview` and use DevTools -> Network ->
Offline.

#### Removing it

Uninstall the plugin, delete the `VitePWA({ ... })` block and its import from `vite.config.ts`, delete `src/components/OfflineToast/` along with its import and
`<OfflineToast />` in `src/main.tsx`, and drop `dev-dist` from `.gitignore`.

**Do the unregister release first.** Removing the plugin does not remove the service worker from browsers that already have one. A registered worker keeps
serving its cached `index.html`, and once the build stops shipping a `sw.js` there is nothing to replace it with — those visitors can be pinned to the old
version indefinitely, with no way to reach them afterwards. So ship one release with:

```ts
VitePWA({
    selfDestroying: true,
    // leave the rest of the config as-is
});
```

which builds a worker whose only job is to unregister itself and delete its caches. Leave it deployed long enough for returning visitors to pick it up, then
remove the plugin.

### Dates and times

There is no date library and no shared date module. That is deliberate for now — see the plan below.

**Two bugs were fixed in September 2026, both of which produced wrong dates on screen:**

- `formatDate` (`src/utils.ts`) floored the millisecond difference between two local midnights. Local midnights an exact
  number of days apart are 23h or 25h short of a multiple of 24h whenever a DST transition sits between them, so the
  floor lost a whole day. Every project and experience card dated outside the current DST period was one day short, for
  eight months of the year, in every DST-observing timezone. Fixed with `Math.round` over field-constructor midnights.
- `getDateRange` (`src/pages/rendezvous/utils.ts`) built local-midnight `Date`s and then stringified them with
  `toISOString().slice(0, 10)`, which re-renders the instant in UTC — the previous calendar day for anyone at a positive
  offset. A Berlin visitor opening a single-date event saw one dead column headed with the wrong weekday and could never
  submit. Fixed by calling `toISODate`, which already existed in the same file.

Both were the same underlying mistake: **a `Date` is an instant, not a calendar day.** Any time you need a calendar day,
go through local fields (`getFullYear`/`getMonth`/`getDate`), never through UTC.

#### The rule until then

- To turn a `YYYY-MM-DD` literal into a `Date`, always append `T00:00:00`. A bare date string parses as UTC midnight and
  renders the wrong day west of Greenwich. `postDate()` in `BlogPage/posts.tsx` wraps this; `hello-blog.mdx` documents it.
- To turn a `Date` back into `YYYY-MM-DD`, use a local-fields helper (`toISODate` in `rendezvous/utils.ts`, `isoDay` in
  `HomePage/Blog/BlogFeed.tsx`). **Never `toISOString()`.**
- To count calendar days, collapse both endpoints with `new Date(y, m, d)` and `Math.round` the quotient. Never `Math.floor`,
  never raw millisecond subtraction.

#### Why there is no shared module yet

`Temporal` is the TC39 replacement for `Date` and is designed around exactly this distinction — `Temporal.PlainDate` has no
timezone, so the `toISOString` mistake is unrepresentable, and `.since()` returns calendar-correct day counts across DST.
Firefox has shipped it; Chrome and Safari were still in progress as of early 2026 (**check MDN/caniuse for current status
before acting on this note**). Building a hand-rolled `src/date.ts` now means writing an abstraction that Temporal makes
redundant, and the polyfill is too heavy for a personal site.

So: wait for baseline support, then adopt `Temporal` directly rather than inventing a house API.

#### The plan, if we do centralize before then

An audit of all 228 date/time sites in `src/` concluded the defensible core is **two functions**, not a util module:

- `toISODate(d: Date): string` — local `Y-M-D`. Already exists twice, correctly, in two files that don't know about each
  other, and the bug above was a third site reaching for `toISOString()` instead. Strongest case; move it to `src/date.ts`.
- `localDate(iso: string): Date` — owns the `T00:00:00` idiom, ~33 call sites across four features. Readability only, no
  bug. Note the param must be `string`, not a `${number}-${number}-${number}` template type: under `noUncheckedIndexedAccess`
  the rendezvous callers pass `sorted[0]` (`string | undefined`) and plain `string`, so the template type would need an
  overload to survive the move.

Explicitly **not** worth centralizing, all verified as deliberately different contracts rather than drift:

- The scheduler's minutes-since-midnight model. It has no `Date` in the layout math, which is the right design.
- All six duration formatters (ms vs minutes, clock-shaped vs prose-shaped, floor for a stopwatch vs round for an ETA).
- Both `timeUntil` implementations — same name, different output contracts on purpose.
- Everything in SuperICU: those are monotonic `performance.now()` playheads and a self-consistent alert log, not calendar time.

Two traps for whoever does this:

- **Do not unify the day-count arithmetic behind one signature.** `formatDate` computes `today - date` (positive for past);
  `formatPostAge` computes `date - today` (negative, because `Intl.RelativeTimeFormat` uses the sign for direction and its
  branches read `days > -30`). One shared argument order flips every date on the blog to "in 5 days".
- **`index.html` runs its own `new Date().getHours()`** for the night-mode boot overlay. It is an inline classic script,
  outside the module graph, and cannot import from `src/`.

There are no tests and no test runner. If this is centralized, it should land with the first three: `calendarDaysBetween`
across a spring-forward boundary, `toISODate` under `TZ=Asia/Tokyo`, and `localDate` on an unpadded `"2026-9-1"`.

<br>

<br>

# React + TypeScript + Vite (generated by vite)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast
  Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
    // other rules...
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.json', './tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: __dirname,
    },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the
  `extends` list
