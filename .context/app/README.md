# BeatBreaker app docs

The fork's own documentation tier. Sunrise never writes here, so these files
merge cleanly on every upstream sync. Platform docs live in the named domain
folders beside this one; start at [`../substrate.md`](../substrate.md).

| Doc                                                | What it is                                                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [`breaks.md`](./breaks.md)                         | The break domain: modules, invariants, the share-code wire format, `/api/v1/breaks`.                                                           |
| [`catalogue.md`](./catalogue.md)                   | The catalogue: styles, libraries and kits as rows, wire format v4, the read and admin APIs, seeding.                                           |
| [`patterns.md`](./patterns.md)                     | Your patterns (Phase 4): the pattern as a document, autosave, opening, Details and link chips, and what was left as it is.                     |
| [`settings.md`](./settings.md)                     | Where the Studio keeps its settings (Phase 4A): the pattern, your account (`StudioSettings`, `/api/v1/studio-settings`), and the browser keys. |
| [`shell.md`](./shell.md)                           | The Studio shell: the `(studio)` route group, the frame, the drawers, and where a new control goes.                                            |
| [`spike-drawers.md`](./spike-drawers.md)           | Spike A: what the drawers were measured on, the seven findings, and the device pass that was not done.                                         |
| [`planning/app-plan.md`](./planning/app-plan.md)   | The phased plan for turning the console into a live app: shell and drawers, saved patterns, sharing, BeatBuddy, launch.                        |
| [`planning/site-copy.md`](./planning/site-copy.md) | Pre-written copy for the public pages, dialogs and empty states.                                                                               |

Each phase of the plan adds its own page here (`shell.md`, `catalogue.md`,
`patterns.md`, `controls.md`, `sharing.md`, `beatbuddy.md`) as it lands.
