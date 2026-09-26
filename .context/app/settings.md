# Where the Studio keeps its settings

Phase 4A, decisions D19 and D21 in the [plan](./planning/app-plan.md). Every
value the Studio remembers lives in exactly one of three places:

| Where                                          | What                                                                                                               | Why there                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **The pattern** (`Break.doc`)                  | tempo, swing, layer, arrangement, and each section's style, meter, lanes and notes                                 | It is part of the pattern. Opening the pattern restores it.                 |
| **Your account** (`StudioSettings`)            | the kit and its tuning, how you practise, the generator's dials, and the starting values for a new pattern (below) | It is about how you play, so it follows you to every device you sign in on. |
| **This browser** (`localStorage`, `bb.*` keys) | chart size, view mode, the Patterns drawer's last tab, and two short-lived hand-offs                               | It depends on the screen, or only has to last a few minutes.                |

Nothing is stored twice. In particular the console no longer keeps its own copy
of the open pattern's tempo, style, meter, bars, swing, layer or arrangement in
the browser (the prototype's `bb.bpm`, `bb.style` and the rest are gone, and
nothing reads them). A pattern that has never been saved is kept whole in
`bb.scratch`, so a reload does not lose it. The base tempo the layer match works
from is worked out from the document's tempo and layer whenever a pattern goes
on the stage, so it is not stored either.

Light/dark is Sunrise's own `theme` key and is not the Studio's.

## Your account: `StudioSettings`

One row per person: `userId` (primary key, FK to `user` with `ON DELETE
CASCADE`, hand-written in the migration and probed by `lib/app/db-drift.ts`),
`prefs` (jsonb) and `updatedAt`. The account export has a `studioSettings`
section.

| Field                                               | What                                                                           | Default                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------- |
| `kit`                                               | The kit playing now — yours, or one a style brought with it                    | `studio70`                       |
| `userKit`                                           | The kit you picked yourself, handed back when a style that imposed one is left | `studio70`                       |
| `sound`                                             | Tuning overrides: kit → voice (or `master`) → parameter → value                | `{}`                             |
| `percSamples`                                       | Sampled percussion on kits that ship it                                        | `true`                           |
| `countIn`                                           | Bars of count-in, 0–2                                                          | `1`                              |
| `ceiling`                                           | Where the tempo ramp stops, 50–300                                             | `130`                            |
| `matchTempo`                                        | Tempo follows the layer                                                        | `false`                          |
| `density`, `ghosts`                                 | Generator dials, 0–100                                                         | `55`, `60`                       |
| `hats`, `feel`                                      | Generator dials, 0–150                                                         | `100`                            |
| `lanesMode`, `customLanes`                          | The style's lanes or your own (toms, two percussion slots)                     | `style`                          |
| `userMeter`                                         | The meter you picked yourself, handed back when a style stops imposing one     | the default                      |
| `guides`, `sticking`, `preview`                     | Notation guides, sticking, preview a change before keeping it                  | on, off, on                      |
| `startStyle`, `startMeter`, `startBars`, `startBpm` | What _New pattern_ opens with (D21)                                            | `funk`, default meter, `2`, `94` |

The schema is `studioSettingsSchema` in `lib/validations/studio-settings.ts`;
the defaults are `DEFAULT_STUDIO_SETTINGS` beside it. The data layer is
`lib/app/breaks/saved/settings.ts` (server-only).

**Every field is bounded.** Tempos are 50–300 and clamped to the meter's
`maxBpm` where they are used. Each tuning parameter is held to the widest range
any engine gives it (`TUNING_RANGES`), and `withTuning` takes only the keys the
kit's own engine has. `kit`, `userKit` and `startStyle` must name a playable
kit or a style the catalogue has; a static schema cannot know that, so the data
layer checks them on write and on read.

**Read field by field.** A field never set takes its default quietly. A stored
field that no longer parses, or names a kit or style that has gone, takes its
default and is named in one `warn` log line; the rest of the row is unaffected.

### `/api/v1/studio-settings`

| Method  | What                                                                                                                                                                                                                                                                                                                   |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`   | Every field, the default where you have never set one.                                                                                                                                                                                                                                                                 |
| `PATCH` | Any subset; each field given replaces the stored one, the rest are left alone. One jsonb `\|\|` statement, so two devices patching different fields both land. 200 with the settings as they now stand. An unknown field, a value out of range or an unknown kit/style key is a 400 naming it, and nothing is written. |

`withAuth`, scoped to the session user; the section rate limit from `proxy.ts`
applies. It sits beside `/pins` and `/history`, outside Sunrise's `/users/me/`.

### How the Studio uses it

Both Studio pages read the row server-side (`readStudioSettings`) and pass it to
`StudioProvider` as `settings`, so the Studio opens with your kit and tuning,
not a flash of defaults. `useStudioSettings`
(`components/app/breaks/use-studio-settings.ts`) holds the console's copy and
writes changes back the way a pattern autosaves: one `PATCH` `AUTOSAVE_MS` after
the last change, carrying only the fields changed; requests go one at a time; a
dropped connection keeps what did not land and retries; anything waiting is sent
with `keepalive` when the Studio unmounts or the page is hidden.

### What moves the starting values (D21)

The console's live style, meter, bars and tempo belong to the pattern on the
stage. The `start*` fields change only when you change one of those while the
pattern on the stage is **new and never saved**. Opening or editing a saved
pattern never moves them, so _New pattern_ opens the way you last set one up,
whatever you have opened since. The provider tells the console whether the stage
is saved (`stageSaved`) at the moment of the change.

## This browser: the key module

Every key the Studio writes is listed, with the schema it is read back through,
in `lib/app/breaks/browser-keys.ts`:

| Key              | What                                                            | Schema / default                           | Read by                                     |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------- |
| `bb.size`        | Chart zoom                                                      | number 0.7–1.7 / `1`                       | the console, via `useStoredSetting`         |
| `bb.view`        | Which layers the chart shows                                    | `A`, `B` or `both` / `both`                | the console, via `useStoredSetting`         |
| `bb.patternsTab` | The Patterns drawer's last tab (also written by a `?tab=` link) | one of `PATTERNS_TABS`, or `null` / `null` | the Patterns drawer, via `useStoredSetting` |
| `bb.scratch`     | The pattern on the stage that has never been saved              | `{ payload, at }`, payload a share payload | `lib/app/breaks/scratch.ts`                 |
| `bb.pendingLink` | A `#b=` link held across sign-in, for an hour (H5)              | `{ hash, at }`                             | `lib/app/breaks/pending-link.ts`            |

`useStoredSetting(setting)` (`lib/app/breaks/use-stored-setting.ts`) wraps
Sunrise's `useLocalStorage`, which is left untouched. It takes a setting from
the key module, not a bare key, and anything that fails the schema (bad JSON,
the wrong type, out of range) reads as the fallback. The two hand-offs are read
once by their own modules, through the same schemas.

**Adding a browser key:** add it to the key module with a schema and fallback,
and read it with `useStoredSetting`. First ask whether it is really about this
screen; if it is about how someone plays, it belongs in `StudioSettings`.
`tests/unit/lib/app/breaks/browser-keys.test.ts` fails on any `useLocalStorage`
in `components/app/` or `lib/app/` outside the wrapper, and on any quoted `bb.`
key outside the key module.

## Not stored

The open drawer (component state plus a one-shot `?drawer=` link), the MIDI
port, the metronome and the mixer are per session.
