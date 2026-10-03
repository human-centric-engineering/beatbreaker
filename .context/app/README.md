# BeatBreaker app docs

The fork's own documentation tier. Sunrise never writes here, so these files
merge cleanly on every upstream sync. Platform docs live in the named domain
folders beside this one; start at [`../substrate.md`](../substrate.md).

| Doc                                                | What it is                                                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [`analytics.md`](./analytics.md)                   | Analytics and the policies (Phase 8): the app's events and where they fire, consent, and how `/privacy` and `/terms` read the export manifest. |
| [`about.md`](./about.md)                           | About you (Phase 7B): the fields, channel links, what is public, profile reports, and what the app does with it.                               |
| [`beatbuddy.md`](./beatbuddy.md)                   | BeatBuddy (Phase 7): the loop, the workspace and its rev, and what Spike B found on the live model.                                            |
| [`breaks.md`](./breaks.md)                         | The break domain: modules, invariants, the share-code wire format, `/api/v1/breaks`.                                                           |
| [`catalogue.md`](./catalogue.md)                   | The catalogue: styles, libraries and kits as rows, wire format v4, the read and admin APIs, seeding.                                           |
| [`patterns.md`](./patterns.md)                     | Your patterns (Phase 4): the pattern as a document, autosave, opening, Details and link chips, and what was left as it is.                     |
| [`samples.md`](./samples.md)                       | Your own samples and kits (Phase 4A): the one WAV format, the limits, private storage, `/api/v1/samples` and `/api/v1/kits`, erasure.          |
| [`sessions.md`](./sessions.md)                     | Practice sessions (Phase 7D): the time split, the climb, the tables, `/api/v1/practice-sessions`.                                              |
| [`sound.md`](./sound.md)                           | The sound (Phase 9): a note's path, lane channels and pans, the master ceiling, round-robins and the slot's two shapes.                        |
| [`settings.md`](./settings.md)                     | Where the Studio keeps its settings (Phase 4A): the pattern, your account (`StudioSettings`, `/api/v1/studio-settings`), and the browser keys. |
| [`sharing.md`](./sharing.md)                       | Sharing (Phase 6): visibility and slugs, copies and their credit line, usernames and `/api/v1/drummer-profile`.                                |
| [`shell.md`](./shell.md)                           | The Studio shell: the `(studio)` route group, the frame, the drawers, and where a new control goes.                                            |
| [`speeds.md`](./speeds.md)                         | Your speeds and the tables (Phase 7C): the record, listing, the tables and who is on them, video links, reporting and unlisting.               |
| [`controls.md`](./controls.md)                     | Every Studio control: drawer, name, help, shortcut, target; the owner's browser checklist. Tested.                                             |
| [`spike-drawers.md`](./spike-drawers.md)           | Spike A: what the drawers were measured on, the seven findings, and the device pass that was not done.                                         |
| [`planning/app-plan.md`](./planning/app-plan.md)   | The phased plan for turning the console into a live app: shell and drawers, saved patterns, sharing, BeatBuddy, launch.                        |
| [`planning/site-copy.md`](./planning/site-copy.md) | Pre-written copy for the public pages, dialogs and empty states.                                                                               |

Each phase of the plan adds its own page here (`shell.md`, `catalogue.md`,
`patterns.md`, `controls.md`, `sharing.md`, `beatbuddy.md`) as it lands.
