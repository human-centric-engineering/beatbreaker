# Your speeds and the tables

What Phase 7C of [`planning/app-plan.md`](./planning/app-plan.md) builds: a
drummer records the fastest tempo they can play a pattern _well_, at a layer,
with the date and time and optionally a video. Every record is kept, so over
time it is their progress. On a published pattern or a famous break, their
best can go on a public table.

## Anti-patterns first

- **Don't take the notes, the title or the tempo ceiling from the client.**
  `recordSpeed` (`lib/app/breaks/saved/speeds.ts`) reads the target and
  stores its _stored_ notes hash, its title, and holds `bpm` to 40 and the
  target meter's `maxBpm`. The body names the target by id and nothing else.
- **Don't list a record on a private target.** `listed` is forced false on
  anything but a published pattern or a famous break, whatever the request
  said, so publishing a pattern later never puts records on a table nobody
  was asked about.
- **Don't add a route that sets `listed` on an existing record.** Unlisting
  by a moderator is final because nothing lists a record again. A record's
  listing is decided once, when it is made.
- **Don't build a table with Prisma's `distinct`.** It picks one row per
  drummer in memory, over every row. `readSpeedTable`
  (`lib/app/breaks/community/speed-tables.ts`) is one query: `DISTINCT ON`,
  a join to `drummer_profile` (only drummers with a username), and a window
  count.
- **Don't build SQL fragments in `lib/app`.** It may not import
  `@prisma/client` values, so the two target columns are both named and bound
  (`targetIds`); the null one matches nothing.
- **Don't return a user id from a table.** A row is the record's id (what a
  report names), a username, a tempo, a date and a video link. The note is
  never public.
- **Don't embed Instagram, TikTok or X.** They are outbound links only
  (D29), so `appFrameSrc` does not grow. YouTube and Vimeo are click-to-load,
  built from the id by `parseVideoLink`.

## The record

`SpeedRecord` (migration `speed_records`):

| Field                        | Holds                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| `userId`                     | Hand-written FK, cascades, probed by `lib/app/db-drift.ts`.                                             |
| `breakId` / `libraryEntryId` | At most one (hand-written CHECK `speed_record_one_target`). Both **SetNull**: your history outlives it. |
| `titleSnapshot`              | What the target was called; shown once the target has gone.                                             |
| `level`, `bpm`               | The layer (1–5) and the tempo.                                                                          |
| `gridHash`                   | The target's notes when recorded — `Break.gridHash`, or an entry's `sectionHash`.                       |
| `videoUrl`                   | Canonical, as `parseVideoLink` rebuilt it.                                                              |
| `note`                       | Up to 280 characters. Private.                                                                          |
| `listed`                     | On the public table. Only ever true on a public target.                                                 |
| `recordedAt`                 | The server's clock.                                                                                     |

Your best is the highest `bpm` per target and layer. A day holds 50 new
records (`SPEED_DAILY_CAP`).

## Listing, and asking once

`StudioSettings.listSpeeds` is `ask`, `list` or `keep`, and starts as `ask`.

- A request with `listed` on a public target, while the setting is `ask`,
  also sets it (`list` or `keep`). That is the "asked once" — on the server,
  so every client gets it from the same call.
- A request without `listed` takes the setting; `ask` counts as not listed.
- The Practise drawer asks with two buttons (_Save and list it_ · _Save, keep
  it off_) while the setting is `ask`, and after that shows one Save and a
  checkbox that starts at the setting.

## The tables

A drummer's row is their best at the layer. A record is on a table when it is
`listed`, its drummer has a username, and its `gridHash` is the target's
notes now. A published pattern's notes are fixed (7A), so its records always
match; an admin can correct a famous break, and records on the old notes drop
off. Order: highest tempo, then earliest.

| Where                                           | What                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `GET /api/v1/public/patterns/:slug/speeds`      | A published pattern's table. `level` (default 5), `video=1`, paging. |
| `GET /api/v1/public/library-entries/:id/speeds` | A famous break's — they have no public page.                         |
| `/p/[slug]` _Speeds_                            | The table, a layer switcher, _Video only_, Report per row.           |
| Practise drawer                                 | Your place ("2nd of 41 at Groove") and the top five at your layer.   |
| `/u/[username]` _Speeds_                        | Their listed bests, newest first (`listedBests`).                    |

Your own records and places: `GET /api/v1/speed-records?breakId=…` (or
`libraryEntryId`). `POST` records one; `DELETE /api/v1/speed-records/:id`
deletes one of yours.

## Video links

`parseVideoLink` (`lib/app/breaks/community/video-links.ts`):

| Platform  | Accepted                                     | Stored as                                    | Embeds |
| --------- | -------------------------------------------- | -------------------------------------------- | ------ |
| YouTube   | what `parseReferenceLink` takes, video only  | `https://www.youtube.com/watch?v=…`          | Yes    |
| Vimeo     | `vimeo.com/<id>`                             | `https://vimeo.com/<id>`                     | Yes    |
| Instagram | `/p/<code>`, `/reel/<code>`, `/reels/<code>` | `https://www.instagram.com/{p,reel}/<code>/` | No     |
| TikTok    | `/@handle/video/<id>`                        | `https://www.tiktok.com/@handle/video/<id>`  | No     |
| X         | `/<handle>/status/<id>` on x or twitter      | `https://x.com/<handle>/status/<id>`         | No     |

A song link (YouTube Music, Spotify) is refused: it is not a video of anyone
playing. A stored link that no longer parses is dropped on read.

## Keeping it honest (D25)

Records are self-reported, and every page that shows them says so. A video
link earns a badge and the _Video only_ filter. A signed-in reader can report
a row that is not theirs (`POST /api/v1/public/speeds/:id/report`: _Speed
doesn't look right_, _Bad or misleading link_, _Something else_; the daily
report cap is shared with patterns and profiles). `SpeedReport` (migration
`speed_reports`) cascades with its record and nulls its reporter and resolver.

`/admin/patterns` lists _Reported speeds_. **Unlist** sets `listed = false`,
closes the open reports and emails the drummer (`speed-unlisted`); the record
stays in their history. **Dismiss** closes the reports.

## Privacy

`SpeedRecord` and `SpeedReport` are declared in `lib/app/data-export.ts`
(`speedRecords`, `speedReportsFiled`). Erasure cascades the records; the
tables read live rows, so an erased drummer is off every table on the next
read. The privacy policy says what a record holds and what a table shows.
