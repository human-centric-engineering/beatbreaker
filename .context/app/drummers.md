# Drummers: the model and the lineage

What Phase 11-a and 11-b of [`planning/app-plan.md`](./planning/app-plan.md)
built (D47–D49): every famous drummer in BeatBreaker is a **record** in the drummer
model as well as a **style** in the catalogue, and the records draw a map of
who learned from whom. The style is how BeatBreaker _plays_ a drummer; that is
in [`catalogue.md`](./catalogue.md#a-drummer-is-a-style). This page is the
record, the graph, the API, and the map and pages that show them.

## Anti-patterns first

- **Don't add a drummer style without a record, or a record with a
  `style_key` and no style.** `tests/unit/lib/app/lineage/model.test.ts`
  fails both ways. The record is where the evidence lives; the style is where
  the playing lives.
- **Don't import the records from app code.** They are seed content (D13),
  under `prisma/seeds/app-beatbreaker/data/drummer-model/`. App code reads the
  tables through `lib/app/lineage/data.ts`; only the seed and the tests read the
  files (`scripts/lineage/read-corpus.ts`). `no-content-imports.test.ts` holds
  it.
- **Don't store a masked performer's real identity.** A record whose
  `identity.persona.real_identity_policy` is `private_do_not_research` may not
  carry `full_name`, `born` or `died`, and must not be researched. The check
  refuses it and the seed will not write it (Klek de Poitrine, Sleep Token's II
  and Ghost's Nameless Ghoul on drums are the cases).
- **Don't read an edge's `relation` as its direction.** The model has two
  dozen relationship types and says them from the declarer's side
  (`influenced_by`, `taught`). The builder turns each into a `kind` and an
  arrow from ancestor to descendant; draw from `kind`, `directed`, `from` and
  `to`.
- **Don't claim a transcription.** Every pattern is `stylistic_archetype` or
  `approximation`; `transcribed_*` fidelity without `verified` status fails the
  check.
- **Don't draw from `relation`, or trace through anything but lineage.** The
  map's highlight follows influence and teacher edges only (`isLineageEdge`):
  a bandmate is not an ancestor, and taking someone's chair passes nothing on.
  The pages' "Learned from" and "Passed on to" use the same rule, so the map
  and the pages agree.
- **Don't show a record field by casting it.** The stored record is unchecked
  JSON; a page reads it through `readDrummerRecord`, which drops a field that
  does not read and never returns a masked performer's name or dates.
- **Don't call a device a polyrhythm unless it is one, or add one without a
  source.** A record's `devices` (12-b) use one vocabulary, where only
  `cross-rhythm` and `hemiola` are polyrhythms; an odd meter, a sextuplet
  lick or a reputation is not a device. `checkCorpus` refuses a device that
  cites no source, or cites an id that is not in the source registry (a
  pattern id would resolve, then vanish from the citation), and a
  cross-rhythm or hemiola without its ratio. A
  drummer with none found gets a `devices_search`, never an invented device.
  A style's `polyFills` (12-c) are written only from these devices: one the
  record plays in fills, solos or comping (`poly-fill.test.ts`).
- **Don't put the graph in the vector store.** Traversal, direction and filters
  need rows. BeatBuddy reads the same tables (11-f): `find_drummers` and
  `get_drummer` in `lib/app/breaks/buddy/`, through `listDrummers`,
  `findLineageSlug` and `getLineageProfile` in `data.ts`. See
  [beatbuddy.md](./beatbuddy.md#the-tools).

## The model

The owner's drummer model, v1.5. Its own README is in the folder; the layout:

| Folder        | What                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| `schema/`     | JSON Schemas (2020-12): `drummer`, `recording`, `style`, `common`, `sources`. **The standard.**                 |
| `drummers/`   | One record per drummer: identity, eras, feel, technique, sound, traits, patterns, relationships, `beatbreaker`. |
| `recordings/` | One per track or album, with a `drum_performances` entry per drummer on it.                                     |
| `styles/`     | Genres (`style:songo`). **Not** catalogue styles: those are generators keyed `songo`.                           |
| `sources/`    | Source registries, one file per drummer added since v1.3 (`core.json` is the original).                         |

Ids are namespaced (`drummer:`, `rec:`, `style:`, `pattern:`, `src:`…), global
and never change. A reference to a drummer nobody has modelled is allowed: it
becomes a stub on the map.

**What v1.6 added (15-a):** the `candidate` record status, for a drummer
researched for the long list but not built (D72, D74): identity, bands,
genres, key recordings, `legacy.contribution` (a sourced line on what they
brought), and `beatbreaker.group` and `build_priority`. No patterns, no
`style_key`, no feel profile required. The builder marks a candidate
`modelled: false`, so the map draws it like a stub, but with its own years
and genres; it has a `/drummers/[slug]` page with its record and no Play.
`checkCorpus` checks the contribution's sources are in the registry.
`schema_version` is `const: "1.6.0"`. The long list itself is
`planning/drumming-research.md` §DA.

**What v1.4 added to v1.3:**

- `beatbreaker.style_key`: the catalogue style that plays this drummer.
- `meta.schema_version` is `const: "1.4.0"`; every record is at it.
- Sources are read from every file in `sources/`, so records can be added
  without editing one shared file.
- Five records: Bonham, Stubblefield, Tony Williams, Tony Allen, Yussef Dayes
  (written from `planning/drumming-research.md` §E–K), with their recordings and
  sources, and the styles `hard-rock`, `uk-jazz`, `broken-beat`.

**What v1.5 added (12-b):**

- `technique_profile.coordination.devices[]`: `kind` (the vocabulary of
  `polyrhythm-plan.md` §3, `DEVICE_KINDS` in `types.ts`), `ratio` (`n:m`, the
  cross pulse first), `where` (`groove`, `comping`, `fills`, `solos`),
  `description`, `examples` (songs as the source names them, no timestamps),
  `pattern_ids`, and `evidence` with at least one `source_ids`.
- `technique_profile.coordination.devices_search`: the date and what was read
  in the transcription-level search, with a note of leads that did not hold.
  `model.test.ts` holds every record to a device or a search (D56).
- `schema_version` is `const: "1.5.0"`. `polyrhythm_usage` stays as a weight.

**What the builder fixes** (the model's `tools/validate.py` did these wrong):

- A drummer met only on a shared recording (Tony Allen, Orestes Vilató, JR
  Robinson) had an edge and no node. Every edge end is now a node.
- A person named without an id was a different node per kind: Cozy Cole was
  `person:cozy-cole` and `drummer:cozy-cole`. A drummer named without an id is
  `drummer:<slug>`; a musician or teacher is `person:<slug>`.
- Peers, family and shared recordings came out as arrows. They are undirected,
  stored once with their ends in id order.
- `admired` was drawn as lineage. Ringo admired Jim Keltner, who is younger:
  it is regard between peers.

## The graph

`lib/app/lineage/build.ts` — `buildLineage(corpus)`, pure. The relationship
types and the way each one points are the `RELATIONSHIPS` table there:

| `kind`       | Relations                                                                                                                             | Arrow                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `influence`  | `influenced(_by)`, `cites_as_influence`, `cited_by`, `style_lineage`, `tradition_lineage`, `imitated_by`, `parodied_by`, `covered_by` | ancestor → descendant |
| `teacher`    | `studied_with`, `taught`, `mentored(_by)`                                                                                             | teacher → student     |
| `succession` | `replaced`, `replaced_by`                                                                                                             | earlier → later       |
| `peer`       | `bandmate`, `rhythm_section_partner`, `played_alongside`, `co_drummer_with`, `sub_for`, `admired`, `composed_for`                     | none                  |
| `family`     | `family`                                                                                                                              | none                  |
| `recording`  | two drummers on one record (`same_recording`)                                                                                         | none                  |
| `style`      | a genre's `parents` (`derived_from`, `fusion_of`, `sub_genre_of`…)                                                                    | parent → child        |

Claims of one kind about one pair are one edge — a claim both sides made, or
`taught` and `mentored` from the same teacher. The edge carries the
best-evidenced claim whole (its relation, confidence, scope and declarer), so a
relation is never paired with another claim's evidence; strength is the
largest given. An edge's id is a hash of its ends, kind and recording, so it is
the same on every run whichever claim wins.

A person named without an id is one node: `drummer:<slug>` if any record calls
them a drummer (by kind or by a `drummer:` id), otherwise `person:<slug>`. A
name with no Latin letters gets a short hash for a slug, so two such names stay
two people.

`lib/app/lineage/check.ts` — `checkCorpus(corpus)`: the rules a schema cannot
state. Unique ids; every reference resolves (bar unmodelled drummers); a key
recording has the drummer on it; lanes fit `numerator × steps_per_beat` and
`bars`; a clave's carrying voice has a lane; no stored identity for a private
persona; no `transcribed_*` before `verified`; every relationship type has an
entry in `RELATIONSHIPS` (the builder skips one that does not, so it would
vanish from the map); every device cites a source, and a cross-rhythm or
hemiola has its ratio, and every id a device cites is a source. A recording's performers must be `drummer:` ids — the
parser refuses anything else.

`checkGraph(graph)`: what the built graph must be before it is written. Every
slug unique (the column is), ids and slugs within 120 characters, no edge from
a node to itself.

## The tables and the seed

Three system tables in `prisma/schema/app.prisma`, no user FK, excluded from
the data export with that reason:

- `LineageNode` — every node. `id` is the model id, `slug` the URL slug (a
  drummer's is bare, `bernard-purdie`; others keep their kind,
  `style-songo`). `record` holds the whole model record for a modelled one.
  `devices` (12-b) is the builder's `LineageDevice[]`: the record's devices
  with each source looked up in the registry (title and URL), because the
  registry itself is not stored. `[]` for a stub; read through Zod in
  `data.ts`, which drops a device that does not read (or has lost its
  sources) and logs a warning: the rows and the vocabulary have drifted, and
  the seed wants a re-run.
- `LineageEdge` — `fromId`, `toId` (cascade), `relation`, `kind`, `directed`,
  `strength`, `confidence`, `scope`, `declaredBy`, `recordingId`.
- `LineageRecording` — `id`, `title`, `artist`, `year`, `drummerIds`, `record`.

`prisma/seeds/app-beatbreaker/004-lineage.ts` reads the files, refuses a
corpus with any `checkCorpus` or `checkGraph` error, and **replaces the three
tables whole** in one transaction: three deletes, three bulk inserts. Nothing
from an earlier run survives — not an edge's old confidence, not the record of
a drummer who is now only a stub — and a refused corpus leaves the tables as
they were. No user FK points at these tables, so a replace orphans nothing.
Every model file, and the code that reads them, is a hash input, so editing
either re-runs it.

## The API

Catalogue reads (no auth, `catalogue` rate-limit tier, ETag, `public` cache):

| Route                                  | Returns                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `GET /api/v1/catalogue/lineage`        | `{ nodes, edges }` — every node without its record, every edge             |
| `GET /api/v1/catalogue/lineage/[slug]` | `{ node, record, edges, neighbours, recordings }`; 404 for an unknown slug |

`record` is the model's JSON as stored. A page that shows it parses the parts
it needs.

## The map and the pages (11-b)

| Route              | What                                                                                                                                                                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/drummers`        | The map (`components/app/drummers/lineage-map.tsx`) from `md` up; the list (`lineage-list.tsx`) below it. `?trace=<slug>` opens it with that person traced.                                                                                                                                                    |
| `/drummers/[slug]` | Any person by slug (a genre 404s). A record: summary, traits with confidence, technique, rhythmic devices with their sources (12-b; only an `http(s)` address is a link), eras, recordings, learned from / passed on to / around them. A stub: the links that name it. **Play** → `/studio?style=<style_key>`. |

Both are public server components reading `lib/app/lineage/data.ts`; the
public nav lists Drummers and the sitemap lists `/drummers` and every
modelled drummer.

**The layout** — `lib/app/lineage/layout.ts`, `layoutLineage(graph)`, pure and
run on the server:

- **People only.** Genre (`style`) nodes join only each other, so they stay
  off. A stub with no link to a person is left out; a record always shows.
- **x is the start year**, `pxPerYear` 14. A stub has no year: each edge to
  someone dated is a hint (ancestor −10, descendant +10, peer ±0) and it takes
  the middle one, repeated so chains of stubs fill in. Italic on the map. One
  with nothing to go on goes in a "Dates unknown" column (the real records
  have none; a test holds it).
- **A band per family**, top to bottom: jazz, funk and soul, rock, Latin, African
  and Asian, metal and experimental. A record's family is its heaviest genre's
  in `GENRE_FAMILY`; a stub takes its neighbours' majority. **A new genre
  needs a row in `GENRE_FAMILY`** — `layout.test.ts` fails until it has one.
- **Rows** inside a band are packed left to right so labels never overlap
  (estimated at `charWidth` 6.6px a character).

**The map** draws edges coloured by kind, dashed below `likely`
(`isTentative`), with an arrow when directed. Pointing at or focusing a
person traces them (`traceLineage`); hover and keyboard focus are tracked
apart, so one leaving never drops the other. The "Trace a drummer" select
keeps a trace and lists the records plus whoever `?trace=` named; Esc
clears. Filters: link kinds (checkboxes) and a confidence floor;
a stub left with no visible edge is hidden. **Plays** (12-b) offers the
device kinds some record names; picking one keeps those drummers lit, dims
everyone else and every link not between two of them, and names them in the
status line. It composes with a trace: the traced person stays lit whatever
they play, since the status line is about them, and everyone else must be on
the trace and play the device. Pan is the scrolling box; zoom
is three buttons (50–150%). Each person is a `next/link` inside the SVG, so
Tab walks the map in band order.

**The Studio's `?style=`** (`components/app/shell/studio-address.ts`):
`readStudioStyle` checks the shape, the page checks the catalogue has it and
that no `?entry=` or `?session=` was given (`Object.hasOwn`, so `constructor`
is not a style), and the provider calls the console's `newBreakIn(key)`
through the replacing wrapper, so an unsaved stage is asked about first. It
is **not a pick**: your starting style is untouched, and the next plain New is
in yours. A key the console cannot write says so. The login link carries it. Since 11-e
every record has a `style_key`; one added without it gets no Play.

## Adding a drummer

1. Write `drummers/<slug>.json` at schema 1.6.0, modelled on
   `bernard-purdie.json`: evidence on every claim, `transcription.status`
   `archetype` or `draft`, relationships with `drummer:` ids where the person
   is a drummer. Name their rhythmic `devices` with sources, or record the
   `devices_search` that found none.
2. Add `recordings/` for the key recordings (or a `drum_performances` entry to
   one that exists), and `sources/<slug>.json`.
3. If it is playable, add the style (`catalogue.md`) and set
   `beatbreaker.style_key`.
4. `npx vitest run tests/unit/lib/app/lineage` until green, then
   `npm run db:seed`.

## Tests

| File                                                          | What it holds                                                                                                          |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/lib/app/lineage/model.test.ts`                    | the real records: Ajv against the schemas, the checks, style ↔ record, the graph, a device or a search for each        |
| `tests/unit/lib/app/lineage/build.test.ts`                    | the builder's decisions: direction, merging, stubs, ids                                                                |
| `tests/unit/lib/app/lineage/check.test.ts`                    | each rule, broken once                                                                                                 |
| `tests/unit/prisma/seeds/app-beatbreaker/004-lineage.test.ts` | the seed: writes it all, idempotent, updates changed edges, clears a stub's record, refuses a bad corpus or slug clash |
| `tests/unit/app/api/v1/catalogue/lineage.test.ts`             | the two routes: public, ETag and 304, 404                                                                              |
| `tests/unit/lib/app/lineage/layout.test.ts`                   | tracing, confidence, the layout rules, and the real records: every genre has a family, every person dated, no overlap  |
| `tests/unit/lib/app/lineage/relations.test.ts`                | learned from / passed on to / around                                                                                   |
| `tests/unit/lib/app/lineage/record.test.ts`                   | every real record reads; a masked identity never shows; one bad field costs only that field                            |
| `tests/unit/components/app/drummers/lineage-map.test.tsx`     | the map: links, tracing, filters, zoom                                                                                 |
| `tests/unit/app/(public)/drummers/`                           | the two pages: list and map, `?trace=`, Play, stubs, masked records, 404                                               |
