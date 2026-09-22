# BeatBreaker app docs

The fork's own documentation tier. Sunrise never writes here, so these files
merge cleanly on every upstream sync. Platform docs live in the named domain
folders beside this one; start at [`../substrate.md`](../substrate.md).

| Doc                                                | What it is                                                                                                              |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [`breaks.md`](./breaks.md)                         | The break domain: modules, invariants, the share-code wire format, `/api/v1/breaks`.                                    |
| [`shell.md`](./shell.md)                           | The Studio shell: the `(studio)` route group, the frame, the drawers, and where a new control goes.                     |
| [`spike-drawers.md`](./spike-drawers.md)           | Spike A: what the drawers were measured on, the seven findings, and the device pass that was not done.                  |
| [`planning/app-plan.md`](./planning/app-plan.md)   | The phased plan for turning the console into a live app: shell and drawers, saved patterns, sharing, BeatBuddy, launch. |
| [`planning/site-copy.md`](./planning/site-copy.md) | Pre-written copy for the public pages, dialogs and empty states.                                                        |

Each phase of the plan adds its own page here (`shell.md`, `patterns.md`,
`controls.md`, `sharing.md`, `beatbuddy.md`) as it lands.
