# Drummer Model (v1.5)

Data model for BeatBreaker: drummers, their playable vocabulary, the recordings they played on, the styles they belong to, and the lineage between them.

## Layout

```
schema/        JSON Schemas (2020-12)
  common       shared types: ids, evidence, instruments, articulations, Pattern, Transcription, Source
  drummer      one drummer per file
  recording    one track/album per file, with a drum_performance per drummer
  style        genre / idiom / groove family, with parent links
  sources      a source registry (an array of sources)
drummers/      one record per drummer
recordings/    one per track or album
styles/        genres (`style:songo`); not BeatBreaker's catalogue styles
sources/       source registries, one file per drummer since v1.4 (core.json is the original)
```

## Run

In BeatBreaker this folder is seed content. The checks that `tools/validate.py`
made are now tests, and the lineage build is `lib/app/lineage/build.ts`:

```
npx vitest run tests/unit/lib/app/lineage   # schemas (Ajv), references, grids, privacy, style_key
npm run db:seed                             # writes the lineage tables
```

See `.context/app/drummers.md` for the graph, the tables and the API.

References to drummers who are not yet modelled (e.g. `drummer:max-roach`) are allowed. They appear as stub nodes on the lineage map.

## Ids

Namespaced and global: `drummer:`, `rec:`, `style:`, `pattern:`, `src:`, `kit:`, `era:`, `trait:`, `lick:`. Pick the id once and never change it; BeatBreaker will key on it.

## Patterns

Two representations, use either or both:

- `lanes`: one string per instrument, one character per step, bars split by `|`. Legend: `.` rest, `x` hit, `X` accent, `g` ghost, `o` open hat, `h` half-open, `c` cross-stick, `r` rimshot, `f` flam, `d` drag, `b` buzz, `k` foot chick, `s` foot splash, `B` ride bell, `-` sustain.
- `events`: precise per-note velocity, articulation, sticking, microtiming and duration. Authoritative where present.

## Transcription workflow

Every pattern carries `fidelity` (what it is) and `transcription` (where it is in review).

| status    | meaning                                                          |
| --------- | ---------------------------------------------------------------- |
| archetype | "in the style of", not a quote                                   |
| draft     | an attempt at the real part, unverified                          |
| in_review | submitted for checking                                           |
| verified  | checked; schema requires `method` and at least one `reviewed_by` |
| rejected  | kept for history                                                 |

Suggested promotion path: isolate drums with Demucs, record measured tempo, swing ratio and per-voice offsets in `stem_analysis`, update lanes/events, set status to `in_review`, then `verified` once a second person has checked it. Each change gets a `history` entry. The check refuses a pattern that claims `transcribed_*` fidelity without `verified` status.

## Evidence

Any claim can carry `evidence` with a confidence (`verified`, `widely_reported`, `likely`, `inferred`, `speculative`, `needs_verification`), source ids, and `alternatives` for disputed facts (Purdie's birth year is the worked example).

## v1.2 additions (from the stress test)

- `identity.pseudonymous` and `identity.persona` for masked or anonymous performers. `real_identity_policy: private_do_not_research` makes the validator reject any stored real name or birth details.
- `relationship.scope` (`individual` / `band`) so band-level influences don't masquerade as the drummer's own.
- `pattern.clave` (type, direction, which voice carries it). The validator checks the carrying voice exists.
- `pattern.cross_rhythms` for polyrhythms and polymetric accent cycles.
- `pattern.improvised` to mark samples of improvised comping rather than fixed parts.
- `feel_profile.swing.ratio_by_tempo` because jazz swing flattens as tempo rises.
- `feel_profile.timekeeping_context` (free, click, live loops, sequencer, dancers).
- Instruments `pedal_cowbell`, `pedal_jam_block`; articulations `open_tone`, `slap`, `muted_tone`.
- Coordination scores `foot_ostinato_usage` and `double_bass`.
- Trait categories `performance_persona` and `performance_constraint`.

## v1.3 additions (timbaleros, alter egos, left-handers)

- `identity.setup_type` (drum_kit, timbales, hybrid_kit_timbales, ...) and `identity.primary_instruments`, because Tito Puente and Changuito are not primarily kit drummers.
- `identity.alter_egos` for public side personas (Copeland's Klark Kent). Private identities still use `persona` with `private_do_not_research`.
- Instruments `bongo_bell` and `cha_cha_bell`; lane character `p` for shell / paila (cáscara).
- Relationship types `admired`, `covered_by`, `composed_for`.
- `handedness` plus `kit_orientation` already covered Ringo (left-handed on a right-handed kit); left-led fills are expressed with `sticking_lane`.

## v1.4 additions (BeatBreaker Phase 11)

- `beatbreaker.style_key`: the catalogue style that plays this drummer. Every drummer style has one record naming it and every `style_key` names one (a test holds both).
- `meta.schema_version` is `const: "1.4.0"`.
- `sources/` may hold several files.
- Records for John Bonham, Clyde Stubblefield, Tony Williams, Tony Allen and Yussef Dayes; styles `hard-rock`, `uk-jazz`, `broken-beat`.

## v1.5 additions (BeatBreaker Phase 12-b)

- `technique_profile.coordination.devices[]`: the rhythmic devices a drummer plays, each with a `kind` from one vocabulary (`cross-rhythm`, `hemiola`, `grouping`, `polymeter`, `metric-modulation`, `displacement`, `timeline`, `ostinato-independence`, `polytempo`), an optional `ratio` (`n:m`, the cross pulse first), `where` it is played, a `description`, `examples`, and `evidence` that must cite at least one source. Only `cross-rhythm` and `hemiola` are polyrhythms; the rest are named for what they are.
- `technique_profile.coordination.devices_search`: the transcription-level search made for devices — its date and what was read — so a drummer with no device says it was looked for. Every drummer record has a device or a search (a test holds it).
- `polyrhythm_usage` stays, as a weight.
- `meta.schema_version` is `const: "1.5.0"`.
