# Drummers: the model and the lineage

What Phase 11-a of [`planning/app-plan.md`](./planning/app-plan.md) built
(D47, D48): every famous drummer in BeatBreaker is a **record** in the drummer
model as well as a **style** in the catalogue, and the records draw a map of
who learned from whom. The style is how BeatBreaker _plays_ a drummer; that is
in [`catalogue.md`](./catalogue.md#a-drummer-is-a-style). This page is the
record, the graph and the API.

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
  refuses it and the seed will not write it (Klek de Poitrine is the case).
- **Don't read an edge's `relation` as its direction.** The model has two
  dozen relationship types and says them from the declarer's side
  (`influenced_by`, `taught`). The builder turns each into a `kind` and an
  arrow from ancestor to descendant; draw from `kind`, `directed`, `from` and
  `to`.
- **Don't claim a transcription.** Every pattern is `stylistic_archetype` or
  `approximation`; `transcribed_*` fidelity without `verified` status fails the
  check.
- **Don't put the graph in the vector store.** Traversal, direction and filters
  need rows. The records' prose goes to a knowledge base for BeatBuddy as well
  (11-f), but the map reads the tables.

## The model

The owner's drummer model, v1.4. Its own README is in the folder; the layout:

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

**What v1.4 added to v1.3:**

- `beatbreaker.style_key`: the catalogue style that plays this drummer.
- `meta.schema_version` is `const: "1.4.0"`; every record is at it.
- Sources are read from every file in `sources/`, so records can be added
  without editing one shared file.
- Five records: Bonham, Stubblefield, Tony Williams, Tony Allen, Yussef Dayes
  (written from `planning/drumming-research.md` §E–K), with their recordings and
  sources, and the styles `hard-rock`, `uk-jazz`, `broken-beat`.

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

A claim both sides made is one edge, keeping the surer confidence and the
larger strength. An edge's id is a hash of its ends, relation and recording,
so it is the same on every run.

`lib/app/lineage/check.ts` — `checkCorpus(corpus)`: the rules a schema cannot
state. Unique ids; every reference resolves (bar unmodelled drummers); a key
recording has the drummer on it; lanes fit `numerator × steps_per_beat` and
`bars`; a clave's carrying voice has a lane; no stored identity for a private
persona; no `transcribed_*` before `verified`.

## The tables and the seed

Three system tables in `prisma/schema/app.prisma`, no user FK, excluded from
the data export with that reason:

- `LineageNode` — every node. `id` is the model id, `slug` the URL slug (a
  drummer's is bare, `bernard-purdie`; others keep their kind,
  `style-songo`). `record` holds the whole model record for a modelled one.
- `LineageEdge` — `fromId`, `toId` (cascade), `relation`, `kind`, `directed`,
  `strength`, `confidence`, `scope`, `declaredBy`, `recordingId`.
- `LineageRecording` — `id`, `title`, `artist`, `year`, `drummerIds`, `record`.

`prisma/seeds/app-beatbreaker/004-lineage.ts` reads the files, refuses a
corpus with any `checkCorpus` error, and makes the tables say exactly what the
records say: upsert by id, delete what is gone. Every model file is a hash
input, so editing a record re-runs it.

## The API

Catalogue reads (no auth, `catalogue` rate-limit tier, ETag, `public` cache):

| Route                                  | Returns                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `GET /api/v1/catalogue/lineage`        | `{ nodes, edges }` — every node without its record, every edge             |
| `GET /api/v1/catalogue/lineage/[slug]` | `{ node, record, edges, neighbours, recordings }`; 404 for an unknown slug |

`record` is the model's JSON as stored. A page that shows it parses the parts
it needs.

## Adding a drummer

1. Write `drummers/<slug>.json` at schema 1.4.0, modelled on
   `bernard-purdie.json`: evidence on every claim, `transcription.status`
   `archetype` or `draft`, relationships with `drummer:` ids where the person
   is a drummer.
2. Add `recordings/` for the key recordings (or a `drum_performances` entry to
   one that exists), and `sources/<slug>.json`.
3. If it is playable, add the style (`catalogue.md`) and set
   `beatbreaker.style_key`.
4. `npx vitest run tests/unit/lib/app/lineage` until green, then
   `npm run db:seed`.

## Tests

| File                                                          | What it holds                                                                    |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `tests/unit/lib/app/lineage/model.test.ts`                    | the real records: Ajv against the schemas, the checks, style ↔ record, the graph |
| `tests/unit/lib/app/lineage/build.test.ts`                    | the builder's decisions: direction, merging, stubs, ids                          |
| `tests/unit/lib/app/lineage/check.test.ts`                    | each rule, broken once                                                           |
| `tests/unit/prisma/seeds/app-beatbreaker/004-lineage.test.ts` | the seed: writes it all, idempotent, removes the stale, refuses a bad corpus     |
| `tests/unit/app/api/v1/catalogue/lineage.test.ts`             | the two routes: public, ETag and 304, 404                                        |
