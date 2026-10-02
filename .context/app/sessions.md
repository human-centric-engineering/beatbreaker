# Practice sessions

What Phase 7D of [`planning/app-plan.md`](./planning/app-plan.md) builds: a
drummer puts patterns from the library into a timed session, then plays it.
Each pattern starts below its target tempo, climbs to the target, holds it,
and the session moves on. A session can be shared with a link.

7D ships as four PRs. This page covers **7D-i, the sums and the data** (the
time split, the climb, the three tables and `/api/v1/practice-sessions`) and
**7D-ii, building one** (the editor, _Add to a session_ and Home) and
**7D-iii, running one** (the runner and the Studio's session bar) and
**7D-iv, sharing one** (the link, `/s/[slug]` and saving a copy).

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
- **Don't send a kept item's pattern back.** The items route takes the whole
  list. An item already in the session goes back as `keptItem(view)`
  (`lib/app/practice/items.ts`): its `id` and settings, no `breakId`. The
  route refuses an id that names a pattern too.
- **Don't fetch your sessions per row.** _Add to a session_ reads the list
  when its menu opens, once. A drawer of forty rows asks nothing until one is
  used.
- **Don't time a session with `setTimeout`.** The runner's clock is the audio
  clock: the transport's downbeat and loop-boundary times. A timer is used
  only to refresh the time shown.
- **Don't switch the trainer off to run a session.** `setSessionHold` holds
  the ramp and _match tempo_ off beside your settings, not in them. A page
  closed mid-session leaves your settings as they were.
- **Don't share a session someone else could not play.** Sharing checks
  every item is readable by anyone — a pattern shared by link or published,
  or a famous break — and refuses, naming the ones that are not. A pattern
  made private later is `available: false` on the public read, with no title.
- **Don't put a user id in the public read.** `getPublicSession` reads the
  owner's id only to look up their username and their bests, and drops it.
  Item ids and the session's own id stay out too.
- **Don't carry the owner's goals into a copy.** A saved copy's `goalBpm` is
  null on every item, so its targets are the saver's best, else the tempo.
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

## Building one (7D-ii)

| Where                        | What                                                                                                                                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/practice`                  | Your sessions, from `listSessions()` (one query), and _New session_ (an empty one, 20 minutes, opened in the editor). In `appProtectedRoutes` and the header.                                                                    |
| `/practice/[id]`             | `SessionEditor`: name, description, total, the climb defaults and count-in, then each pattern's minutes, layer, goal and its own climb. One _Save_: `PATCH` if the session's fields changed, then `PUT …/items` if the list did. |
| The Studio's Patterns drawer | _Add to a session_ (the list icon) on every `Row`, beside the ★. _Make a session from this shelf_ above Practising and Later.                                                                                                    |
| `/p/[slug]`                  | _Add to a session_ in `PatternActions`, for a signed-in reader. Adds the pattern itself, not a copy.                                                                                                                             |
| Home                         | _Your sessions_ (the first five) and _Make a session from this shelf_ on Practising. With `teaching` among your purposes, _Your sessions_ comes first.                                                                           |

**The editor splits as you go.** It runs the same `splitMinutes` and
`nudgeMinutes` as the server, so what it shows adds up before you save. A
number field takes effect when you leave it or press Enter, so typing "12"
never re-splits at "1". Changing an item's minutes pins it; the pin button
lets it go. The server splits again on save, and its answer replaces the page.

**Start and target are the server's.** They depend on your best at the
item's layer, which the browser does not have. After an edit to the layer,
goal or start, the row says _Save to see its new tempos_ rather than show a
stale number.

**Reordering is by buttons.** Up and down move an item, and the focus follows
the button you pressed. At the top or bottom that button is disabled, so the
focus moves to the other one.

**A new session from patterns** (`createSessionWith`,
`components/app/practice/session-api.ts`) takes the first twelve, five
minutes each (`defaultTotal`), named after the pattern or the shelf. The
targets are worked out on the server. A session with twelve patterns, or one
per minute, is shown in the menu as _Full_.

## Running one (7D-iii)

`/studio?session=[id]` runs one of your sessions. The page reads it with
`readSession()`. Someone else's session, or an id that is not one, is the
not-found page. Signed out, sign-in comes back to the same address. The
editor's _Run it_ links there.

| Piece                                        | Does                                                                                                                                                                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Transport` (`lib/app/breaks/audio/`)        | `onLoop(loops, at)` gives each boundary's audio-clock time. `onDownbeat(at)` gives the time bar 1 sounds, after the count-in, on every `start()`.                                                                       |
| `runner.ts` (`lib/app/practice/`)            | Pure. Fed the downbeat, each boundary, _Pause_, _Skip_, _+1 min_ and _Stop_. Gives the tempo to set and when to move on. A slot ends at the first boundary past its time.                                               |
| `useSessionRun` (`components/app/practice/`) | Opens each slot's pattern with the provider's `openTarget`, at the item's layer and start tempo. Starts the transport once the stage has rendered it. Plays the tempo the runner gives at each boundary. Posts the run. |
| `SessionBar`                                 | Above the stage: the name, "Pattern 2 of 5", the time left, the tempo now → the target, and the controls. Draws the runner's state and decides nothing.                                                                 |

**Moving on.** The next pattern is loaded and `start()`ed, so it plays the
count-in the Studio already has. A slot whose pattern would not open is
skipped, and the Studio says so.

**Pause.** _Pause_ stops the transport and banks the time played. _Resume_
starts the same pattern from its top, with the count-in, and the clock carries
on from what was banked. Stopping the transport any other way (Space, the
header's Stop) is a pause too.

**Waiting on the stage.** If putting the next pattern on the stage would ask
"Save your changes?", the run pauses until you answer and press _Resume_. A
slot skipped while its pattern was still loading is let land before the next
one opens, so it never covers the next one. _Start_ and _Resume_ wake the audio
inside the click, which Safari needs before sound can start. Leaving the
Studio mid-run logs what was played, as _Stop_ would.

**+1 min** lengthens this slot's hold only. The climb keeps its plan, so the
tempo never steps back.

**The ramp and _match tempo_** are held off while the run is going
(`sessionHold`, in `use-break-console.ts`), so an item's tempo is the tempo you
hear. Both come back when the run ends or the Studio is left.

**Your own pattern** remembers its layer and tempo as you play it, as it does
with the tempo trainer. After a session it opens at the layer and tempo the
session left it at.

**The end-of-slot prompt** ("Played “Cold Carpet” well at 112?") records a 7C
speed at the tempo reached and the item's layer. Your `listSpeeds` setting
decides whether it is listed. It is not offered when the stage held a famous
break you had edited, or a variation you had not saved. A speed there would not
be a speed on the pattern the session names.

**The run** is posted once, when it ends: the last slot finishing, or _Stop_.
It holds the slots played. A run stopped before any slot ran its course, or was
skipped after playing, is not logged.

## Sharing one (7D-iv)

The data layer is `lib/app/breaks/saved/session-sharing.ts`.

| Route                                              | Does                                                                                                                                                                               |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/practice-sessions/:id/share`         | Share with a link: `{ visibility: 'link', slug }`. The slug is minted once and kept. 409 `ITEMS_NOT_SHARED` with `details.items` (`{ position, title, reason: private \| gone }`). |
| `DELETE /api/v1/practice-sessions/:id/share`       | Stop sharing. The slug is kept, so sharing again revives the same link.                                                                                                            |
| `GET /api/v1/public/practice-sessions/:slug`       | No session needed; `public` tier (per IP); ETag and 304. Unshared, deleted and never-minted are one 404.                                                                           |
| `POST /api/v1/public/practice-sessions/:slug/copy` | Signed in. 201 with the copy as `GET …/:id` reads it. Keeps only the items the saver can open; `parentId` set unless the session is the saver's own; the 100 cap applies.          |

**The public read** gives each item's target as the **owner** sees it: their
goal, else their best at its layer (listed or not), else the pattern's tempo.
The share dialog says so before you share. An available item links to its
`/p/` page, or to `/studio?entry=[id]` for a famous break, which has no public
page: a signed-out visitor signs in first, and the Studio's sign-in keeps
`?entry=` so they land on the break. The owner's _Run it_ shows even when every
item has gone private since: a private pattern is still the owner's to play.

**The credit.** A copy's `copiedFrom` is `{ username, slug }` — the owner's
username, and the source's slug while it is still shared — read from
`parentId` when the session is read. Nothing when the owner has no username or
the source is deleted; `lineageOf` is not used, since it credits published
patterns only.

**`/s/[slug]`** (`app/(public)/s/[slug]/page.tsx`) is always `noindex`.
Signed out: the page and the sign-up strip (`components/app/community/sign-up-strip.tsx`,
shared with `/p/`). The owner: _Edit it_ and _Run it_. Anyone else signed
in: _Save to my sessions_ and _Run it_ (`shared-session-actions.tsx`), both
of which copy first — a session runs from your own sessions, with your
targets.

**The share dialog** (`components/app/practice/share-session.tsx`) sits in the
editor's header. It is disabled while there are unsaved edits, since the link
shares what is saved, and on a refusal it lists the patterns to share first,
with a Studio link for each of your own.
