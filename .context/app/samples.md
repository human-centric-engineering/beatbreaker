# Your own samples and kits

Phase 4A, decision D20 in the [plan](./planning/app-plan.md). Drum samples you
load into a kit are uploaded to your account, not kept in the browser, so a kit
of yours plays the same on every device you sign in on. Nothing about them is
public: only you can play your samples, until Phase 6 decides whether a
published pattern may carry them.

## Anti-patterns

- **Do not put your kits in the catalogue.** `/api/v1/catalogue/kits` is public,
  `Cache-Control: public`, memoised per process and filtered to
  `visibility: 'system'`. A kit of yours there would be served to the next
  caller. Your kits go through `/api/v1/kits`, and the Studio adds them to the
  catalogue it hands the console, per person (`withYourKits`).
- **Do not write a sample with `public: true`, or serve it from a storage URL.**
  Every sample is written `public: false` and read back with `download()` in
  `GET /api/v1/samples/:id/audio`, after the owner check.
- **Do not trust the browser's encoding.** The Studio sends one format, but the
  API is public. The upload route reads the WAV header itself (`parseWav`).
- **Do not use Sunrise's `uploadLimiter` for samples.** It is 10 per 15 minutes
  per IP, too few to fill a 15-slot kit, and keyed on the wrong thing. Samples
  have `sampleUploadLimiter`, keyed on the session.
- **Do not mint a system kit key starting `yours-`.** That prefix is what the
  server mints your kits' keys under. A seed test enforces it.

## What a sample is

One format only: **mono, 16-bit PCM, 44.1 kHz WAV**, at most **12 seconds** and
**1.5 MB** (12 s of it is about 1.06 MB). Whatever you pick — mp3, m4a, ogg,
flac, wav — the browser turns it into that before it is sent:

`encodeWav` (`lib/app/breaks/audio/encode-wav.ts`): decode → mix to mono →
resample to 44.1 kHz through an `OfflineAudioContext` → trim the silence in
front (first sample above 2% of the peak, less 1 ms) → PCM16. A file over
32 MB is refused before decoding, and one over 12 s after trimming is refused
before upload, each with a sentence saying why.

The server checks again in `POST /api/v1/samples`: the body is capped by
`Content-Length` before `formData()` is read, then the file size, then the WAV
header (`parseWav`, `lib/app/breaks/samples/wav.ts`), then the duration from
the `data` chunk.

## Limits

| Limit                    | Value             | Where                                     |
| ------------------------ | ----------------- | ----------------------------------------- |
| Length                   | 12 s              | `MAX_SAMPLE_SECONDS`, `samples/limits.ts` |
| Size                     | 1.5 MB            | `MAX_SAMPLE_BYTES`                        |
| Samples per account      | 150               | env `SAMPLES_MAX_COUNT`                   |
| Bytes per account        | 50 MB             | env `SAMPLES_MAX_BYTES`                   |
| Uploads per person       | 60 per 10 minutes | `sampleUploadLimiter`, `samples/data.ts`  |
| Kits of your own         | 20                | `MAX_YOUR_KITS`                           |
| File the browser decodes | 32 MB             | `MAX_PICKED_BYTES`                        |

The two account limits are env settings (`lib/app/env.ts`) so production can
move them without a release. They are checked in the transaction that records
the upload, behind a per-person advisory lock
(`pg_advisory_xact_lock(4120001, hashtext(userId))`), so two uploads at once
cannot both see room for one. The row is written in that transaction and the
file after it commits; if the write fails the row is removed. So a refused
upload leaves no file, and a failed write leaves no row.

## Storage

Sunrise storage (`lib/storage`), under `samples/<userId>/<uuid>.wav`, always
`public: false`. The key is random rather than the sample's id, because the
id does not exist until the row does; it is unique and never leaves the server.

| Environment | Provider                                              |
| ----------- | ----------------------------------------------------- |
| Development | `local`, private directory `.storage/private/`        |
| Production  | a **private** S3-compatible bucket (S3 or R2) — below |

`public/uploads/` is not used: Next serves it to anyone. **Vercel Blob cannot
hold private objects and cannot back samples.** The sample routes refuse with a
503 — `STORAGE_NOT_CONFIGURED` with no provider, `STORAGE_NOT_PRIVATE` when the
provider cannot keep an object private or read it back — rather than store
anything in the open.

**Phase 8 (the bucket setting).** Choose S3 or R2, block public access on the
bucket, and set `S3_OBJECTS_PRIVATE_BY_DEFAULT=true` (or `S3_USE_ACL=true`).
Sunrise cannot see a bucket's policy from the SDK, so without one of those it
reports `privateObjects: false` and every sample upload is a 503.

## The data

`Sample` (`prisma/schema/app.prisma`): `userId` (FK to `user`, `ON DELETE
CASCADE`, hand-written in `20260926180000_samples` and probed by
`lib/app/db-drift.ts`), `name`, `slot`, `bytes`, `durationMs`, `storageKey`
(unique), `createdAt`; indexed on `userId` for the quota sum.

Your kits are `Kit` rows with `ownerId` set, `engine: 'user'`,
`visibility: 'private'` and group _Your kits_. Each filled slot's
`samples.slots[slot].files` holds one sample id, the shape a recorded kit uses
for its file names. Keys are minted by the server: `yours-` plus 32 hex
characters. Deleting a sample empties every slot of yours that held it, in the
same transaction. The seeded system `user` kit ("Nothing is uploaded") is gone,
and the seed removes it from a database seeded before Phase 4A.

The data layers are `lib/app/breaks/samples/data.ts` (samples) and
`lib/app/breaks/samples/kits.ts` (your kits), both server-only.
`lib/app/breaks/samples/your-kit.ts` is pure: a kit of yours as a catalogue
entry, and the catalogue with your kits added.

## Erasure and export

Rows cascade from `user`. No FK reaches storage, so `initApp()`
(`lib/app/bootstrap.ts`) registers the app's erasure hook,
`beatbreaker-samples`, whose `cleanupExternal` deletes the `samples/<userId>/`
prefix before the erasure transaction. It is best-effort by the hook contract:
a failure is logged by `eraseUser` and does not stop the erasure. (Avatars do
not take this path; core `eraseUser` removes theirs itself.)

The export has a `samples` section (each row: name, slot, size, length and
storage key, not the audio) and the `kits` section includes your kits.

## API

| Route                           | What                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| `GET /api/v1/samples`           | Your samples, newest first, and `usage` (`count`, `bytes`, `maxCount`, `maxBytes`)     |
| `POST /api/v1/samples`          | Multipart `file`, `slot`, `name`. 201 with `{ sample, usage }`                         |
| `DELETE /api/v1/samples/:id`    | Empties the slots holding it, removes the row, then the file. `{ id, deleted, usage }` |
| `GET /api/v1/samples/:id/audio` | The WAV, owner only, `Cache-Control: private, max-age=31536000, immutable`             |
| `GET /api/v1/kits`              | Your kits, each filled slot with its sample's name and audio URL                       |
| `POST /api/v1/kits`             | `{ label? }`: a new, empty kit. 201                                                    |
| `GET /api/v1/kits/:id`          | One kit of yours                                                                       |
| `PATCH /api/v1/kits/:id`        | `{ label?, slots? }`: each slot given names one of your samples, or `null` to empty it |
| `DELETE /api/v1/kits/:id`       | The kit goes; its samples stay                                                         |

Someone else's sample or kit, and a system kit, answer **404** everywhere. The
upload's refusals each carry their own code and a sentence for the person:
`SAMPLE_TOO_LARGE` (413), `SAMPLE_NOT_WAV` (400, `details.reason` is one of
`not-wav`, `truncated`, `not-pcm`, `not-mono`, `wrong-rate`, `wrong-depth`,
`no-data`), `SAMPLE_TOO_LONG` (400), `SAMPLE_LIMIT_COUNT` / `SAMPLE_LIMIT_BYTES`
(409), `SAMPLE_NOT_STORED` (502), 429 and 503 as above. `KIT_LIMIT` (409) on the
21st kit.

The settings route accepts your kit keys for `kit` and `userKit`; a kit of yours
that you delete makes those read as their defaults ([`settings.md`](./settings.md)).

## In the Studio

Both Studio pages read your kits and samples server-side with the pattern. The
provider holds them in `useYourSounds` (`components/app/studio/`) and adds your
kits to the catalogue, so a slot you fill plays on the next bar. The Kit drawer
(`panels/your-sounds.tsx`): _New kit of your own_, the kit's name, _Delete this
kit_, a Load / Replace / ✕ per slot, and a _Your samples_ card with the usage
meter and a delete (asked twice) per sample.

Playback is `YourSampleSource` (`lib/app/breaks/audio/your-samples.ts`), in the
engine's `SourceStack` beside the packs. It fetches each sample id's audio once,
decodes it, and keeps the buffer by id; a slot with nothing in it, or a sample
that would not load, falls through to the synthesised voice.

## Tests

| File                                                           | What it holds                                                                 |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `tests/unit/lib/app/breaks/samples/wav.test.ts`                | the reader's refusals, one per way to be wrong; the writer round-trips        |
| `tests/unit/lib/app/breaks/audio/encode-wav.test.ts`           | mono 16-bit 44.1 kHz out, silence gone, the length and size refusals          |
| `tests/unit/lib/app/breaks/audio/your-samples.test.ts`         | which URLs are fetched, once; a failed sample is an empty slot; fallbacks     |
| `tests/integration/api/v1/samples/route.test.ts`               | every refusal, the 150th/151st, 50 MB, no row on a failed write, 404s, 503s   |
| `tests/integration/api/v1/kits/route.test.ts`                  | slots, someone else's sample refused, someone else's kit 404, the kit limit   |
| `tests/unit/lib/app/sample-erasure.test.ts`                    | the hook is registered and deletes the prefix                                 |
| `tests/unit/components/app/studio/panels/your-sounds.test.tsx` | an mp3 goes up as WAV, a refusal is shown, usage after an upload and a delete |
| `tests/helpers/your-sounds-db.ts`                              | the in-memory `sample`/`kit` table the route tests run the data layers over   |
