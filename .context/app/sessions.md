# Practice sessions

What Phase 7D of [`planning/app-plan.md`](./planning/app-plan.md) builds: a
drummer puts patterns from the library into a timed session, then plays it.
Each pattern starts below its target tempo, climbs to the target, holds it,
and the session moves on. A session can be shared with a link.

7D ships as four PRs. This page covers **7D-i, the sums and the data**: the
time split, the climb, the three tables and `/api/v1/practice-sessions`.
Building one in the UI (7D-ii), running one in the Studio (7D-iii) and sharing
one (7D-iv) add their sections as they land.

## Anti-patterns first

- **Don't store a split the client worked out.** The server re-splits the
  minutes (`splitMinutes`, `lib/app/practice/split.ts`) on every write that
  could move them: create, a new total, and the items list. The client sends
  minutes only for the items it pinned. What is stored always adds up to
  `totalMinutes`, whatever was sent.
- **Don't store a target that defaulted.** `goalBpm` is null unless the
  drummer chose a goal. A null goal is read as their best at the item's
  layer, from their speed records (`yourBests`), else the pattern's own
  tempo, when the session is read. So the target follows them as they get
  faster, and a saved copy can take its targets from the saver's own speeds.
- **Don't put the climb in a component.** `tempoAt` (`lib/app/practice/climb.ts`)
  is pure, so the Studio's runner and a native client (D14) play the same
  session.
- **Don't take a title or a meter from the body.** An item names its pattern
  by id. The title, and the meter whose `maxBpm` bounds a goal, are read from
  the database, and a new pattern is checked visible to the caller by the same
  rule that opens it (`openableBy`, or `PUBLIC` for a famous break).
- **Don't change an item's pattern.** An item kept in the list by `id` keeps
  its target. A different pattern is a new item.
- **Don't keep target ids in a run.** `PracticeRun.items` is titles and
  tempos, so a deleted pattern leaves nothing dangling in your history.

## The time split (D31)

| Rule                    | What the code does                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Equal by default        | The free items share the minutes the pinned ones leave, in whole minutes. Any remainder goes a minute each to the first free items.                   |
| Nudging pins            | `nudgeMinutes` sets one item's minutes and pins it, held between 1 and `nudgeCeiling` so it never moves another pinned item. The free items re-split. |
| A minute each           | Every item gets at least one, so a session holds no more items than minutes (a 400 otherwise).                                                        |
| Pins that no longer fit | Adding an item, or cutting the total, below what the pins hold: pins give way from the last back, each down to a minute.                              |
| Every item pinned       | If they do not add up, the last absorbs the difference. A nudge with every other item pinned stays at what fits.                                      |

The property tests run thousands of seeded cases from `rng.ts`: the total
holds, pinned items never move, and every item has a minute.

## The climb (D30)

Each slot is a **climb** and then a **hold**. The climb takes the first
`climbPct` of the slot (default 67) and ends at the target. The start is
`startPct` below the target (default 20%, never under 40 bpm).

| Shape           | Climb                                                    |
| --------------- | -------------------------------------------------------- |
| `steady`        | Linear.                                                  |
| `gentle-start`  | Ease-in (x²): more of the climb near the start tempo.    |
| `gentle-finish` | Ease-out: more of it near the target.                    |
| `steps`         | `climbSteps` (2–8) equal steps, each for an equal share. |

`tempoAt(elapsed, plan)` gives whole bpm. It is monotonic, starts at the start
tempo, reaches the target at the climb's share and stays there. The tempo
only changes at a cycle boundary, so the runner (7D-iii) reads it there. The
session sets the defaults, and each item may override `startPct`, `climbPct`,
`climbShape` and `climbSteps` (null is the session's).

## The tables

| Model                 | Holds                                                                                                                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PracticeSession`     | `userId` (hand-written FK, cascades), name, description, `totalMinutes` (5–120), the climb defaults, `countIn` (0–2 bars), `visibility` (`private` · `link`), `slug`, `parentId` (a copy's source, SetNull).                       |
| `PracticeSessionItem` | `sessionId` (cascades), dense `position`, `breakId` / `libraryEntryId` (at most one, CHECK `practice_session_item_one_target`, both SetNull) with `titleSnapshot`, `level`, `goalBpm?`, `minutes`, `minutesPinned`, the overrides. |
| `PracticeRun`         | `userId` (hand-written FK, cascades), `sessionId` (SetNull) and `sessionName`, `startedAt`, `endedAt` (the server's), `items` — `[{ title, level, targetBpm, reachedBpm, seconds }]`.                                              |

An item whose pattern was deleted, or made private by someone else, reads
with `target: null` and its snapshot title; the runner skips it. Up to twelve
items. 100 sessions a person (`SESSIONS_MAX`, a 429), 50 runs a day
(`RUN_DAILY_CAP`).

**Erasure:** your sessions, their items and your runs go. Someone else's copy
of your session stays theirs with `parentId` nulled, and their items on your
patterns keep their titles. Export: `practiceSessions` (items inside) and
`practiceRuns`, declared in `lib/app/data-export.ts`. Checked against a real
database on 2026-10-01.

## The API

All under `withAuth`, scoped to the caller. Someone else's session is a 404.

| Route                                     | Does                                                                                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/practice-sessions`           | Your sessions, newest change first, with titles, item count, visibility and when you last ran each. One query.                      |
| `POST /api/v1/practice-sessions`          | Create, with or without items. 201.                                                                                                 |
| `GET /api/v1/practice-sessions/:id`       | The session and its items, each with `bestBpm`, `targetBpm` (goal, else best, else tempo, held to 40–meter ceiling) and `startBpm`. |
| `PATCH /api/v1/practice-sessions/:id`     | Its own fields. A new total re-splits.                                                                                              |
| `DELETE /api/v1/practice-sessions/:id`    | Delete it and its items. Runs stay.                                                                                                 |
| `PUT /api/v1/practice-sessions/:id/items` | The whole list in order: kept items by `id`, new ones by target. Reorder, edit, add and remove are one call.                        |
| `GET /api/v1/practice-sessions/:id/runs`  | Your runs of it, newest first, up to 50.                                                                                            |
| `POST /api/v1/practice-sessions/:id/runs` | A finished run, with the slots played. Started in the last day; up to a minute ahead is taken as now. 201.                          |

Request and response shapes are in `lib/validations/practice-sessions.ts`;
the data layer is `lib/app/breaks/saved/sessions.ts` and `runs.ts`.
