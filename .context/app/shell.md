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
| `studio-frame.tsx`     | Puts it together; owns which tool is open and the key handler        |
| `shortcuts.ts`         | Every keyboard shortcut, in one table the handler and `?` sheet read |
| `shortcuts-sheet.tsx`  | The `?` sheet                                                        |
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
- **`notice` / `say` / `dismiss`** — the drawers raise it and the frame shows it
  (`StudioToast`), and those are siblings now. `useNotice`
  (`components/app/studio/use-notice.ts`) decides how long each kind stays:
  `say('Link copied')` goes after `TOAST_MS`; `say(msg, { error: true })` is
  announced as an alert and stays until dismissed; `say(msg, { action: { label:
'Undo', run } })` stays for `UNDO_MS`. Every `say` is a new line with a new
  timer, even with the same words, and a line's timer only ever takes down
  that line. A hook that says things takes the `Say` type, not
  `(message: string) => void`.
- **`viewMode` and `editing`** — one section choice (E11). `viewMode` (A · B ·
  Both, on the chart) is what shows, plays and exports. `editing` is derived,
  never set: the chosen section, or with Both the one under the playhead while
  it moves, else the last one chosen or edited (`editingSection()` in
  `use-break-console.ts`). The grid and the Doctor use `editing`.

The provider also owns the audio lifetime, closing the `AudioContext` on unmount
(H7). A browser allows a page only a handful and will not reopen a closed one.

**Settings.** The pages read your `StudioSettings` row and pass it to the
provider as `settings`; what stays in the browser is read through
`useStoredSetting` and listed in `lib/app/breaks/browser-keys.ts`. Where each
value lives, and why, is in [`settings.md`](./settings.md). A new control that
remembers something starts there.

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
one setting. Once opened, `drawer` and `tab` are taken out of the address
(`history.replaceState`, keeping anything else, a `#b=` included), so a reload
or a return to that history entry does not open it again over the tab you
chose since.

## Adding a control

Every control is listed in [`controls.md`](./controls.md), with its drawer,
name, help, shortcut and target, and a test holds the list to the Studio, so
a new control needs its row there. That page also has the owner's browser
checklist.

- **To an existing tool** — edit that panel under
  `components/app/studio/panels/`. Nothing else needs to know.
- **A new tool** — add it to `TOOLS` in `tool-rail.tsx` and to `PANELS` in
  `studio-frame.tsx`. It appears in the rail, in the phone menu and in both
  drawer shapes with no other change.
- **Conditional class names** — use `cn()`, never string concatenation.
  `prettier-plugin-tailwindcss` rewrites template literals inside `className` and
  turned `` `btn${on ? ' on' : ''}` `` into `btnon`, silently (Spike A).
- **A new keyboard shortcut** — add a row to `SHORTCUTS` in `shortcuts.ts`. The
  handler in `studio-frame.tsx` walks that table and the `?` sheet draws it, so
  the new key is listed the moment it works. Give the control it stands in for
  the row's `aria` as `aria-keyshortcuts`. The handler's guard skips
  `input, textarea, select` and anything contenteditable, and leaves Space and
  Enter to a focused button, slider or menu item: a drawer is full of buttons,
  and firing play as well is an action the user did not ask for.
- **An on/off or a pick-one** — `<Toggle>` or `<Segmented>` from
  `components/app/studio/`. A toggle's label is fixed and its state is
  `aria-pressed` and the lit `on` style; a segmented choice is a radio group
  with one tab stop, the arrows moving the choice. Nothing else writes
  `aria-pressed` or `aria-checked` — `shell/studio-controls.test.ts` greps for
  it — and no label carries its state ("Click on", "Muted"):
  `toggle-and-segmented.test.tsx` presses every toggle in the Studio and fails
  if a name changes. Play is the one face that changes (▶ / ■); its name does
  not.
- **A cell in the grid** — `StepEditor` takes `onSet(bar, lane, step, value,
stroke)`, the console's `setCell`. A tap is `defaultHit(lane)` or 0, the
  picker sets any value, and a drag sends `start` once then `continue`, so
  it is one undo step. Cell size is `--cell` (24px, or 32px with a coarse
  pointer) times `--grid-zoom` (`bb.gridSize`).
- **Tempo** — `<TempoControl>`: − and + step by one and repeat while held, the
  number is typed and clamped to 50 and the meter's ceiling as it is set, and
  `slider` adds the range input. The header and the Practise drawer have the
  slider; the phone footer does not. A quick tempo is `quickTempo(pct)`, a
  percentage of the pattern's own tempo that leaves `baseBpm` where it is —
  never `setBpm`, which would make it the break's tempo.
- **Something undoable that the server does** — clear the screen at once, say
  it with an Undo action, and send the request when `UNDO_MS` has passed or the
  Studio goes (`pagehide`, with `keepalive`). Clear history is the model
  (`use-practice-history.ts`): requests made while it is held queue behind it,
  so the deferred request cannot take them.
- **Printing** — `@media print` in `studio.css` flattens the frame and hides
  its chrome; the one in `breaks.css` hides what of the stage is for setting
  the chart rather than reading it. A new control on the stage needs a line
  there too; `studio-controls.test.ts` checks the frame's rules.
- **Help text** — one line in the panel, the rest in `<StudioHelp>`
  (`components/app/studio/studio-help.tsx`), Sunrise's `FieldHelp` with a 24px
  target. `studio-help.test.tsx` opens every drawer and fails on a hint over
  fifteen words; a style's or kit's own description is marked `.blurb` and is
  exempt.
- **What the tools are called** — the rail reads Generate · Edit · Patterns ·
  Sound · Practise · Share. The ids (`gen`, `doctor`, `kit`, `practice`,
  `export`) are the old names, kept because they are in `?drawer=` links.

## Theme

`app/brand-theme.css` carries the paper-and-brass palette on the `consumer`
surface, light and dark, so the whole site and every body-portaled overlay
(dialogs, toasts, the cookie banner) is branded — `/admin` keeps the Sunrise
defaults. The `.bb` token block in `breaks.css` is still the Studio's own working
set. See [`../ui/surface-theming.md`](../ui/surface-theming.md) for the six
constraints, two of which (unlayered selectors, the compound `.dark` form) this
file depends on.

## Known, and deliberate

- **The critic's number is in the footer, its card in two drawers.** Generate
  and Edit both show `ScoreCard`, because only one drawer opens at a time and a
  musical edit is judged by whether the score went up (Phase 5, 5.5). Phones
  have no footer read-out, so there the score is in those two drawers only.
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
