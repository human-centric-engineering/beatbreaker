# Spike A — drawers

**Status: headless checks done; real-device pass pending.** Branch
`spike-a-drawers` (to be deleted once this is final). Page: `/spike/drawers`.

The question (app-plan §4, Phase 0): can the Studio's tools live in drawers that
never move the chart, without glitching playback, with sane focus/`Esc`/screen
reader behaviour under Radix `modal={false}` — and does the phone sheet need
`vaul`?

## What was built

One throwaway frame: header with transport, the engraved chart on a stage,
a 48px tool rail (two tools), a footer. ≥1024px: a non-modal right drawer over
`@radix-ui/react-dialog`. <1024px: a hand-rolled bottom sheet with two snap
points (55% / 92%), drag with flick velocity, a tappable handle as the
non-drag alternative, and a modal/non-modal switch. A meter on the page samples
the stage's box every frame and runs a 25 ms timer chain shaped like the
transport's scheduler, counting wake-ups later than 105 ms (lookahead 130 ms −
tick 25 ms) — the point at which a note would be scheduled late.

## Results — headless Chrome, 1440 / 1024 / 768 / 390

| Check                                                        | Result                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------- |
| Stage box identical, drawer/sheet closed vs open             | Yes, at all four widths (0.0 px)                              |
| 30 drawer toggles while playing                              | 0 stalls; worst timer lateness 11–20 ms desktop, ~59 ms sheet |
| Drawer stays open when the chart is clicked                  | Yes (`onInteractOutside` prevented)                           |
| `Esc` closes — from inside the drawer, and from the chart    | Yes, both; focus returns to the rail button that opened it    |
| Swap drawer (Generate → Sound) without close/open            | Yes, content swaps in place                                   |
| Shortcuts don't fire while typing in a drawer                | Yes                                                           |
| Drawer semantics                                             | `role="dialog"`, labelled by its title, no `aria-modal`       |
| Sheet: snap, drag up, handle tap, flick down to close, `Esc` | All work; last control reachable at the 55% snap              |
| Modal sheet                                                  | Scrim, stage `aria-hidden`, focus moves in and back out       |

## Findings

1. **Lay the frame out in CSS, not JS.** The spike picks drawer vs sheet with
   `matchMedia` after hydration; the server HTML is laid out narrow, so the
   frame jumps ~72 px on first load. Phase 1: the frame's grid comes from media
   queries; JS only decides which _component_ to mount for the drawer, and only
   once opened.
2. **Space is ambiguous once drawers hold buttons.** Space on a focused button
   presses it; the console's shortcut guard only skips text fields. The spike
   skips buttons, sliders and selects too. Carry that guard into Phase 1.
3. **Pointer capture on the grip swallows taps** on the handle and ✕ inside it.
   Capture only after the pointer has moved 4 px. (Found and fixed here — the
   sort of thing `vaul` gets right for you.)
4. **The cookie banner covers the phone tab bar.** Sunrise's consent banner is
   205 px tall at 390 px wide and sits over the tab bar and transport until
   answered. Phase 1 must decide how the `(studio)` frame coexists with it
   (e.g. pad the frame by the banner while it shows).
5. **A modal sheet covers the transport.** On a phone the transport is in the
   footer, under a sheet at either snap. For most tools that is fine; for
   BeatBuddy (watch the chart change) and Practise (tempo while playing) a
   non-modal sheet, or a mini transport in the sheet header, is worth it. The
   spike has a switch to try both.
6. **The formatter eats spaces in template-literal class names.**
   `prettier-plugin-tailwindcss` turned `` `btn${on ? ' on' : ''}` `` into
   `'on'`, silently producing `btnon`. Use `cn()` for conditional classes —
   never string concatenation — in every Phase 1 component.
7. **At 1440 px the drawer covers the chart's right edge** (the chart is
   centred at 1100 px max). Expected by plan §2 item 5; confirm it reads as
   acceptable on a real monitor.

## `vaul`?

**Provisional: not needed.** Two snaps, drag, flick and a handle came to ~100
lines, transform-only. Revisit if the device pass finds scroll-vs-drag
conflicts inside the sheet (iOS), rubber-banding, or keyboard-resize issues —
those are what `vaul` exists for.

## Real-device pass — to do

Open `http://<mac-lan-ip>:3030/spike/drawers` (dev server run with
`ALLOWED_DEV_ORIGINS=<ip>`), press Play, then:

- iPhone and iPad (Safari): open/close each tool repeatedly while playing —
  listen for glitches, read the meter's stall count; drag/flick the sheet;
  scroll the mixer at 55%; rotate the iPad across 1024 px.
- VoiceOver: open a tool from the rail, move through it, close with the ✕ and
  with a two-finger scrub; focus should land back on the rail button.
- Try the sheet modal and non-modal.
