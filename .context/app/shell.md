# The Studio shell

How the app view is put together: the `(studio)` route group, the frame, the
drawers, and where a control goes when you add one.

Phase 1 of [`planning/app-plan.md`](./planning/app-plan.md). **It moved things;
it did not add or remove any.** Every control the console had, the Studio has.

## The route group

```
app/(studio)/
├── layout.tsx          maintenance wrapper + the three fonts
├── loading.tsx         H11 — the group ships one from the start
├── error.tsx           same shape as (protected)'s, incl. the session check
└── studio/
    ├── page.tsx        /studio
    └── [id]/page.tsx   /studio/<id> — opens a saved pattern (Phase 4)
```

A group of its own because the Studio is not a page in the site's centred
column. `(protected)`'s layout wraps every page in `container mx-auto px-4 py-8`,
and a nested layout cannot escape its parent — which is why `breaks.css` used to
carry `main:has(.bb) { max-width: none }`, a stylesheet reaching _up_ to undo a
layout. That hatch is gone.

`/breaks` stays for good as a permanent redirect to `/studio`. Every share link
handed out before the move points at it.

### Why neither route is in `protected-routes.ts`

Both gate themselves in their page instead. A shared break travels in the URL
fragment (`/studio#b=…`), the server never sees a fragment, and the proxy's edge
redirect to `/login` drops it — so a signed-out visitor with a link would sign in
and land on a fresh break. That is H5. `SignInToOpen` stashes the fragment in
`localStorage` first, and the `/breaks` redirect is deliberately bare, because a
browser only carries a fragment across to a target that has none of its own.

**If you add a Studio route, gate it in the page.** Adding `/studio` to
`protected-routes.ts` would silently reintroduce H5.

## The frame

`components/app/shell/` — everything below is fork-owned.

| File                   | What it is                                                           |
| ---------------------- | -------------------------------------------------------------------- |
| `studio-frame.tsx`     | Puts it together; owns which tool is open and the keyboard shortcuts |
| `studio-header.tsx`    | Mark, pattern name, transport, tools menu, `HeaderActions`           |
| `studio-footer.tsx`    | Read-out and lamps wide; the whole transport on a phone              |
| `studio-transport.tsx` | Both transports and the lamps                                        |
| `tool-rail.tsx`        | The tab strip (≥1024px) and the same tools as a header menu below it |
| `tool-drawer.tsx`      | The right-hand drawer and the two-snap bottom sheet                  |
| `studio.css`           | The frame's layout. **Media queries, never JS** — see below          |

`components/app/studio/` is the Studio's own content: `studio-provider.tsx`
(state), `stage.tsx` (chart + step editor) and `panels/` (one file per tool).

### The layout is the stylesheet's job

`studio.css` is mobile-first with one breakpoint at **1024px**. JS decides only
which _component_ a tool opens into — a drawer or a sheet — because that is the
one thing a media query cannot express.

Spike A did the layout in JS too, with `matchMedia` after hydration: the server
HTML came out narrow and the frame jumped ~72px on first load. Don't reintroduce
that. If you find yourself reading a width to decide what to render, check
whether CSS can decide it instead.

### Non-modal, on purpose

The drawer and the sheet both keep the chart live, playback running and the
transport reachable. `onInteractOutside` is prevented, so clicking the chart does
not dismiss what you are working in; `Esc` and the ✕ close it, and focus goes
back to whatever opened it — the rail tab, or the header's tools button on a
phone, where there is no rail.

Spike A measured the two things that mattered: the stage's bounding box is
identical open and closed at 1440/1024/768/390, and 30 open/close cycles while
playing produced no scheduler stall.

## State

One provider, mounted by each Studio page, wrapping the frame:

```tsx
<StudioProvider>
  <StudioFrame />
</StudioProvider>
```

`useBreakConsole()` is unchanged and is still called exactly once — the provider
is what calls it. Everything in the frame reads `useStudio()`, which is that hook
plus two things the split created:

- **`catalogue`** — styles, kits and the famous-breaks library. Panels read them
  from here rather than importing the constants, which is the seam Phase 2 moves
  to the database behind. Meters, lanes and slots are **not** in it: they are what
  the wire format is built on, so they stay in code.
- **`toast` / `say`** — the drawers raise it and the frame shows it, and those
  are siblings now.

The provider also owns the audio lifetime, closing the `AudioContext` on unmount
(H7). A browser allows a page only a handful and will not reopen a closed one.

## Opening on a drawer

`/studio?drawer=<tool>` opens the Studio with that tool's drawer showing, and
`&tab=<tab>` picks the Patterns drawer's tab. Build the address with
`studioDrawerHref()` and read it with `readStudioDrawer()`, both in
`components/app/shell/studio-address.ts` — a plain module, not a client one,
so the server page validates the query against the same `STUDIO_TOOLS` and
`PATTERNS_TABS` the rail and the drawer are built from. A value that is not a
tool is no drawer; a tab that is not one is the drawer on its usual tab.

The page hands it to `StudioProvider` as `openDrawer`, and the frame opens it
**once the width is measured** (`useWide()` returns `measured`). Two things
there are load-bearing:

- **Not before.** Until the media query is read, `wide` is a guess, and the
  frame closes whatever is open when the width changes.
- **The open effect is declared after the close-on-width-change effect.** On a
  phone both fire in the same commit, in declaration order, and the close must
  not come last. `studio-open-drawer.test.tsx` fails if they are swapped.

The tab is written where the Patterns drawer keeps the one you last chose
(`rememberPatternsTab`, `bb.patternsTab`), so a link and your own choice are
one setting.

## Adding a control

- **To an existing tool** — edit that panel under
  `components/app/studio/panels/`. Nothing else needs to know.
- **A new tool** — add it to `TOOLS` in `tool-rail.tsx` and to `PANELS` in
  `studio-frame.tsx`. It appears in the rail, in the phone menu and in both
  drawer shapes with no other change.
- **Conditional class names** — use `cn()`, never string concatenation.
  `prettier-plugin-tailwindcss` rewrites template literals inside `className` and
  turned `` `btn${on ? ' on' : ''}` `` into `btnon`, silently (Spike A).
- **A new keyboard shortcut** — it goes in `studio-frame.tsx`, behind the guard
  that skips `input, textarea, select, button, [role="slider"], [role="menuitem"]`
  and anything contenteditable. A drawer is full of buttons, and Space on a
  focused button already presses it; firing play as well is an action the user
  did not ask for.

## Theme

`app/brand-theme.css` carries the paper-and-brass palette on the `consumer`
surface, light and dark, so the whole site and every body-portaled overlay
(dialogs, toasts, the cookie banner) is branded — `/admin` keeps the Sunrise
defaults. The `.bb` token block in `breaks.css` is still the Studio's own working
set. See [`../ui/surface-theming.md`](../ui/surface-theming.md) for the six
constraints, two of which (unlayered selectors, the compound `.dark` form) this
file depends on.

## Known, and deliberate

- **The critic's score is behind the Generate drawer.** It was visible at all
  times in the console's rail. That is the drawers' trade, and it is the kind of
  thing Phase 5's ergonomic review exists to settle — possibly by putting the
  score in the footer beside the read-out.
- **The cookie banner and the phone transport.** The banner is `fixed bottom-0`
  and 205px tall at 390px, over the footer transport until it is answered. The
  frame makes room for it with `body:has([role='dialog'][aria-label='Cookie
consent'])` rather than being covered — a fixed guess at its height per
  breakpoint, which is honest but will drift if the banner's copy changes.
- **No real-device pass.** Spike A's headless results are in
  [`spike-drawers.md`](./spike-drawers.md); the iOS/iPad/VoiceOver pass listed at
  the end of it was skipped. Scroll-vs-drag inside the sheet, rubber-banding and
  keyboard resize are the untested ones, and they are what `vaul` exists for if
  the hand-rolled sheet turns out not to hold up.
