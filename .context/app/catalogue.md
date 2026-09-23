# The catalogue

Styles, pattern libraries and kits are **rows in the database**, not TypeScript
constants (D13). They are seeded from files under
`prisma/seeds/app-beatbreaker/data/`, read through `/api/v1/catalogue/*`, edited
by an admin without a deploy, and shaped from the start for rows a user creates
later (§10, D16).

What did **not** move: meters, lanes and slots. Those are the structural
constants the wire format is built on — a saved pattern is a row of digits per
lane at a meter's step count, so editing the set would not change a preference,
it would change what every stored pattern means. They stay in code and are
served read-only from `/api/v1/catalogue/meters`.

## The rule the whole phase turns on

> **Nothing under `lib/app/breaks/` or `components/app/` imports style, library
> or kit content.** The domain takes a resolved style, entry or kit as an
> argument.

`tests/unit/lib/app/breaks/no-content-imports.test.ts` enforces it by grep. That
is not belt-and-braces: the refactor is a hundred call sites, and the way it
comes undone is not a revert but one import added back in six months because a
function needed "just the default style". That import compiles, passes every
other test, and silently reintroduces a copy of the catalogue in the bundle that
an admin's edit cannot reach.

`tests/**` and `prisma/seeds/**` are exempt, deliberately — the tests feed the
domain the _same_ seed data through the new arguments, which is the only thing
that keeps the golden-byte assertions meaningful.

## Tables

| Model            | Table             | Notes                                                                                       |
| ---------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| `Style`          | `style`           | `key`, `label`, `group`, `hint`, `meter`, `position`, `currentVersion`. Never holds params. |
| `StyleVersion`   | `style_version`   | `params Json`, `version`, `note`, `createdById`. **Immutable.**                             |
| `PatternLibrary` | `pattern_library` | A named, ordered list. One system row today: `famous-breaks`.                               |
| `LibraryEntry`   | `library_entry`   | `group`, `title`, `artist`, `note`, `bpm`, `styleKey`, `meter`, `doc Json`, `links Json`.   |
| `Kit`            | `kit`             | `engine`, `label`, `hint`, `group`, `credit`, `params Json`, `samples Json`.                |

Every row carries `ownerId String?` (null = a system row) and a `visibility`
that is `system` on all of them today. Both columns exist now rather than later
because retrofitting ownership onto rows other people's patterns already point
at is the migration nobody wants to write.

`Break` gains `styleVersionId`, nulled rather than cascaded when a version goes:
the v4 document carries the snapshot, so losing the link loses provenance only.

### Four things the schema does that Prisma cannot express

All four are hand-written in `20260923102558_catalogue` and probed by
`lib/app/db-drift.ts`, because Prisma computes desired state without them and
emits a `DROP` on some later unrelated migration.

1. **The FKs to `user`.** `ownerId` is a plain scalar, not a `@relation` — a
   relation needs a back-reference field ON `User`, which is the fork-and-edit
   trap. `ON DELETE CASCADE`, so erasure reaches a user's own rows.
2. **`style_version.createdById` is `SET NULL`, not cascade.** A version
   outlives its author on purpose: patterns other people made point at it. What
   erasure removes is the link, which is the personal data.
3. **Partial unique indexes on the system rows.** `@@unique([ownerId, key])`
   does _not_ stop two system styles sharing a key, because Postgres treats
   NULLs as distinct. `style_system_key_key` and its two siblings are
   `UNIQUE … WHERE "ownerId" IS NULL`, and the probe asserts the predicate as
   well as the name — an index recreated without its `WHERE` is a different
   constraint.
4. **Six statements deleted from the generated migration by hand** — two
   `DROP CONSTRAINT` against the breaks/takes user FKs, three `DROP INDEX`
   against Sunrise's hand-folded vector and full-text indexes, and an `ALTER`
   dropping a generated column's default. The migration says so at the top. See
   `.context/database/prisma-unmodelled-objects.md`.

## A style is edited by adding a version

**Versions are immutable.** Changing a style's parameters writes version n+1 and
moves `Style.currentVersion`; the old version stays forever because breaks people
saved point at it. There is no route that can update one —
`POST /api/v1/admin/catalogue/styles/[key]/versions` is the only write path, and
`lib/app/breaks/catalogue/admin.ts` has no update function to call.

That is what keeps the reproducibility promise: the same seed plus the same style
version always gives back the same pattern, so a break saved in March still plays
in June after its style was retuned.

The seed follows the same rule. Re-running it with changed parameters adds a
version rather than overwriting one; re-running it unchanged is a no-op.

## Wire format v4 — a pattern stands on its own

A pattern now carries two things it did not:

- `styleVersionId` (`sv` on the wire) — which version produced it. Provenance.
- `attrs` (`sa`) — a snapshot of the five style attributes playback, the critic
  and the MIDI export read: `feel`, `swingUnit`, `kickFeather`, `targetDensity`,
  `hatDepth`.

Those five are not an arbitrary subset. They are exactly what is read off a
style _after_ a pattern exists; everything else a style says is an instruction to
the generator, spent the moment the notes are written. So:

| Operation                           | Needs                       |
| ----------------------------------- | --------------------------- |
| play, score, export (MIDI, engrave) | the pattern's own `attrs`   |
| generate, derive a B, doctor        | the live `Style`, passed in |

A pattern whose style has been deleted, retuned or made private still opens,
plays, scores and exports. It cannot be re-generated or doctored, and the caller
is the one who can say so.

**`unpack` no longer falls back to `'funk'`.** A v3 code substituted the default
for a style it did not recognise, which quietly relabelled somebody else's
pattern as one of ours — and now that styles are rows, "not recognised" usually
means "not on this installation". The key is kept as written.

**v3 codes still decode.** They carry no snapshot, so `decodeBreak(code, styles)`
takes an optional synchronous `StyleLookup` that rebuilds one from the current
catalogue. Without it the break still opens, with default feel — a v3 break that
sounds a shade straighter is a better answer than an unopenable one.

> A trap worth knowing: `packedPatternSchema.sa` is `styleAttrsSchema.optional()`,
> and Zod applies a `.default()` **through** an `.optional()` wrapper. An earlier
> version defaulted inside `styleAttrsSchema`, so `sa` parsed to `{}` rather than
> `undefined` and the lookup was never reached — while `sv` (which has no
> default) _was_ rebuilt. A v3 break decoded claiming to be Dilla version 1 while
> playing with no feel at all. The default lives on `patternSchema.attrs` now.

## Validation — rows are external data

`lib/app/breaks/catalogue/schemas.ts` holds `styleParamsSchema`,
`kitParamsSchema`, `kitSamplesSchema` and `libraryEntrySchema`. Rows are
validated **on write and on read** (§11, H9).

Reading through the schema is the part that is easy to argue out of. The argument
against is that the write path already checked; the answer is that the write path
that checked may not be the write path that wrote — a row can predate the current
bounds, arrive from a restored backup, or be set by hand at a psql prompt during
an incident. Any of those puts an unbounded weight table in front of the
generator, which is a hang rather than an error message.

A row that fails is **dropped from the list, not thrown**: one bad style costs
you that style, not the whole picker. `lib/app/breaks/catalogue/rows.ts` returns
the problems and the data layer logs them — a style that vanishes with nothing in
the log is a bug report that starts "it used to be there".

`tests/unit/lib/app/breaks/catalogue/schemas.test.ts` drives the generator with
200 random _valid_ styles and requires that it never throws, never produces a
non-finite step and always terminates. That test found a real defect on its first
run: `noKick: [20]` on a 16-step bar ran `bar.k[20] = 0`, which does not throw —
it extends the lane array and leaves holes, and a hole reads as `undefined` in
the engraver and the transport. The write is bounded now, in `applyKickRules` and
in both clave branches.

## The data layer

`lib/app/breaks/catalogue/data.ts` is the only place that reads the three tables.
Route handlers, server components and (Phase 7) BeatBuddy's tools all call it.

- `listStyles()`, `getStyle(key, version?)`, `listKits()`, `listLibraries()`,
  `getLibrary(key)`, `studioCatalogue()`.
- **Server-side only.** Not marked with the `server-only` package — Sunrise
  deliberately does not depend on it, because this tier is also consumed outside
  Next.js. The Studio gets its catalogue as a prop, which is the seam that keeps
  the rule true.
- Cached in a **process-local memo** with a 60-second backstop, invalidated by
  `invalidateCatalogue()` on every admin write. Not `unstable_cache`: `lib/app/**`
  is held to being framework-agnostic, and `revalidateTag` would buy nothing here
  anyway, because it only reaches other instances when a shared cache handler is
  configured and `next.config.js` configures none. **On more than one instance an
  admin's edit reaches the writing instance immediately and the others within the
  TTL.** If this ever runs behind more than a couple of instances, the fix is a
  shared cache, not a longer comment.

The `(studio)` pages call `studioCatalogue()` directly rather than fetching this
app's own API — same functions, one fewer hop, and no server render waiting on
its own server. That is also what makes "loading the Studio makes no per-item
catalogue requests" true by construction.

## Endpoints

### Read — public, cached, ETagged

No session. The catalogue answers a signed-out visitor because the `/p/` player
and the marketing pages need it (D2) and a native client reads it before anyone
has signed in (D14). Rate limiting is the `catalogue` tier registered in
`lib/app/rate-limit.ts`: **240/min keyed on IP**, applied by `proxy.ts`.

| Route                          | Returns                                                        |
| ------------------------------ | -------------------------------------------------------------- |
| `GET /api/v1/catalogue/styles` | every style at its current version, plus the group order       |
| `GET …/styles/[key]`           | one style; `?version=N` for an older one                       |
| `GET …/libraries`              | the libraries, with entry counts and headings                  |
| `GET …/libraries/[key]`        | one library, **every entry's document included**               |
| `GET …/kits`                   | the kits, with sample URLs built server-side                   |
| `GET …/meters`                 | meters, lanes, percussion, slots, voices — read-only constants |

Every one answers a matching `If-None-Match` with `304`, and sends
`Cache-Control: public, max-age=0, must-revalidate` — `public` because nothing
here is about a person, `must-revalidate` so the ETag stays in charge and an
admin's edit is visible on the next request rather than after a TTL.

### Write — admin only, audited

Under `/api/v1/admin/catalogue/`, behind `withAdminAuth`, at Sunrise's `admin`
tier (30/min). Every write records an `AiAdminAuditLog` entry and invalidates the
cache.

| Route                            | Verb              | What                                    |
| -------------------------------- | ----------------- | --------------------------------------- |
| `…/styles`                       | `GET`, `POST`     | list with version counts; create at v1  |
| `…/styles/[key]`                 | `PATCH`           | group and position — **not** parameters |
| `…/styles/[key]/versions`        | `GET`, `POST`     | the versions; add one                   |
| `…/libraries/[key]/entries`      | `GET`, `POST`     | the entries; add one                    |
| `…/libraries/[key]/entries/[id]` | `PATCH`, `DELETE` | correct one; remove one                 |
| `…/kits/[key]`                   | `PATCH`           | metadata, knobs, credit, sample map     |

The entry routes are what D10 asks for: a correction to a title or a credit lands
without a deploy, and lands with an audit entry so the correction is itself
findable. The delete is a real delete — an entry taken down because a rights
holder objected has to actually go, and patterns people made from it are their
own rows and are untouched.

**Columns are derived from parameters, never sent alongside them.** A style's
label, hint and meter live both in the row (so a list query can read them) and in
`params` (so the generator has one object). A request that could set them
separately would let the two disagree, and then "what is this style called" has
two answers.

## `/admin/catalogue`

A plain operator page, at `/admin/catalogue`, registered through the
`lib/app/admin-nav.ts` seam. Three lists — styles with their version counts, the
libraries with their headings, the kits with their credits — and a detail page
per style.

**Rendered on the server from `admin-lists.ts`, not from `data.ts`.** Two
reasons, and both matter: the public data layer is memoised, which is right for
a picker read on every page load and wrong for the page an admin reloads to
check the edit they just saved; and the queries are different, because a list
row needs counts an editor reads and a client does not.

The style editor has two forms, and the split is the model rather than a layout
choice. **Where it sits** (heading, position) is a `PATCH`; **what it plays** is
a `POST` that writes a new version, and the button says which number it will be.
There is no "save" for the current version because there is no endpoint that
could do it.

Parameters are a **validated JSON editor** rather than a generated form. A style
has thirty-odd fields, half of them weighted tables and step lists, and a form
rendering all of them would be a week of work to produce something worse than a
text box for the handful of people who will use it. What the text box must not
be is unvalidated: it parses through the same `styleParamsSchema` the endpoint
does, before the request goes out, so a bad weight is named with its field and
reason rather than coming back as a 400.

Library entries and kits are corrected through the API rather than through a
form. That is a real stop, not an oversight — the endpoints exist, they are
audited, and a form for them is worth building when somebody has actually needed
one twice.

## Seeding

`prisma/seeds/app-beatbreaker/001-catalogue.ts` writes 37 styles, 47 famous
breaks in one library, and 13 kits. Its data lives beside it under `data/`, and
**only that seed imports it**.

- Upserts by key, so **re-seeding is a no-op**. (The runner also skips a unit
  whose content hash has not moved — that is an optimisation, not the guarantee.)
- The unit declares `hashInputs` naming the three data files and
  `public/kits/manifest.json`, so editing one re-runs it.
- Library entries are **converted to wire-v4 documents at seed time** by
  `patternFromLibrary` + `packPattern`, with the style's snapshot baked in. A
  client shows an entry without the bar-string parser, and retuning a style later
  does not change how Funky Drummer plays.
- A kit's `samples` comes from `public/kits/manifest.json`. The audio files stay
  where they are; the row is the copy every client reads.
- An entry removed from `data/library.ts` is deleted from the table, so the list
  cannot keep showing something the source no longer has.

Because `ownerId` is nullable, `upsert({ where: { ownerId_key: … } })` does not
work — Prisma types a compound unique's fields as non-null and Postgres would not
match on it either. Uniqueness among system rows is the partial index, and a
find-then-write is how you use one. `upsertSystemRow` in the seed does that.

## What a fork changes

- A different style table, library or kit set: edit `data/`, re-seed.
- A different percussion sample set: it is found by looking for the kit row whose
  `samples.perc` is set, not by a hard-coded key — so it is a row, not a code
  change. (`PackSource.PERC_FROM = 'virtuosity'` is gone.)
- Somewhere else for kit audio: `Kit.samples` names files, and the URL is built
  in the `…/kits` route.

## Tests

| File                                                   | What it holds                                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `tests/unit/lib/app/breaks/no-content-imports.test.ts` | the grep: no application code imports the seed data or declares a table of its own |
| `tests/unit/lib/app/breaks/catalogue/schemas.test.ts`  | every shipped row round-trips; the bounds; the 200-run generator property test     |
| `tests/helpers/catalogue.ts`                           | builds the catalogue from the seed data, with no database — the tests' fixture     |
| `tests/unit/lib/app/defaults.test.ts`                  | the rate-limit and data-export seam pins                                           |
| `tests/unit/lib/db/drift-probes.test.ts`               | the FK and partial-index probe pins                                                |
| `tests/unit/reserved-fork-tiers.test.ts`               | the list of models in `app.prisma`                                                 |
