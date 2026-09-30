# About you

What Phase 7B of [`planning/app-plan.md`](./planning/app-plan.md) builds: a
drummer says what they use BeatBreaker for, what they play and how well, and
where people can watch or hear them. The app uses all of it; their public page
shows only what they switch on. Profiles can be reported, like patterns.

## Anti-patterns first

- **Don't return About-you fields from a public read except through
  `publicPart` / `publicAbout`** (`lib/app/breaks/community/about.ts`). It is
  the one place a switch is read. A field switched off is absent, not empty,
  and `styleAbility` is public only when both _styles_ and _ability_ are,
  because it names the styles.
- **Don't store a channel URL the client sent.** `drummerAboutSchema` runs
  each one through `parseChannelLink` (`community/channels.ts`) and keeps the
  URL it rebuilds from the handle. The platform is decided from the URL, never
  taken from the body, so a link cannot be labelled as something it is not.
  Rows are re-parsed on read (`readStoredChannels`), and an entry that no
  longer parses is dropped.
- **Don't embed a channel.** They are outbound links with
  `rel="me noopener noreferrer nofollow ugc"`, and nothing is added to
  `appFrameSrc`.
- **Don't let a platform's own host fall through to "website".** A URL on
  `youtube.com`, `instagram.com` etc. that the platform's rule refuses is
  refused, not accepted as a personal website (`PLATFORM_DOMAINS`).
- **Don't give BeatBuddy the channel links.** The `studio` context
  contributor sends purposes, styles and ability — private ones included,
  because they are the drummer's own — and nothing a stranger could have typed.
- **Don't read the drummer by the context id.** The contributor uses the
  `userId` the chat handler passes; `contextId` is the constant `'about'`.
- **Don't write the ability's starting values on every save.** `aboutSaved`
  writes `startLevel` and `startBpm` only when the ability _changed_, so a
  tempo the drummer has since set (D21) survives saving an unrelated field.

## The row

`DrummerAbout` (migration `drummer_about`), one per person, keyed by
`userId` (hand-written FK, cascades, probed by `lib/app/db-drift.ts`). It is
separate from `DrummerProfile` because it needs no username.

| Field          | Holds                                                                   | Public by default |
| -------------- | ----------------------------------------------------------------------- | ----------------- |
| `purposes`     | Any of `learning`, `teaching`, `designing`. Empty = not said.           | No                |
| `styles`       | Up to 8 catalogue style keys, checked on write and on read.             | No                |
| `ability`      | `just-starting` … `professional` (D27), or null.                        | No                |
| `styleAbility` | Style → ability, for chosen styles only; pruned when a style is let go. | With both above   |
| `channels`     | Up to 8 `{ kind, url, drumming }`, canonical; at most one `website`.    | Yes               |
| `public`       | A switch per field (D28). A missing switch is the default above.        | —                 |
| `askedAt`      | When Home's three questions were answered or skipped.                   | —                 |

An empty row reads the same as no row. Skipping Home's card writes one with
only `askedAt`.

## Channel links

| Kind         | Accepted                                                 | Stored as                                        |
| ------------ | -------------------------------------------------------- | ------------------------------------------------ |
| `youtube`    | `/@handle`, `/channel/UC…`                               | `https://www.youtube.com/@handle`                |
| `instagram`  | `/handle` (not `/p/`, `/reel/` …)                        | `https://www.instagram.com/handle`               |
| `tiktok`     | `/@handle`                                               | `https://www.tiktok.com/@handle`                 |
| `x`          | `x.com/handle`, `twitter.com/handle`                     | `https://x.com/handle`                           |
| `facebook`   | `/name`, `/profile.php?id=`                              | `https://www.facebook.com/name`                  |
| `twitch`     | `/name`                                                  | `https://www.twitch.tv/name`                     |
| `soundcloud` | `/name`                                                  | `https://soundcloud.com/name`                    |
| `bandcamp`   | `name.bandcamp.com` (one label only)                     | `https://name.bandcamp.com`                      |
| `website`    | Any other `https` host with a dot; no IP, port, userinfo | host + path, no query or fragment; shown as host |

The icons are generic (`lucide-react` ships no brand marks): a video camera
for YouTube and TikTok, a camera for Instagram, and so on, beside the
platform's name.

## API

| Route                                           | Who       | What                                                                           |
| ----------------------------------------------- | --------- | ------------------------------------------------------------------------------ |
| `GET /api/v1/drummer-about`                     | You       | Every field, empty where unsaid.                                               |
| `PUT /api/v1/drummer-about`                     | You       | Any subset; a field left out is left alone. `asked: true` sets `askedAt`.      |
| `GET /api/v1/public/drummers/:username`         | Anyone    | Username, bio, and the switched-on fields. ETag, `public` rate tier.           |
| `POST /api/v1/public/drummers/:username/report` | Signed in | `{ reason, note? }`: `spam`, `offensive`, `bad-link`, `other`.                 |
| `GET /api/v1/admin/drummers`                    | Admin     | Profiles with open reports.                                                    |
| `POST /api/v1/admin/drummers/:id`               | Admin     | `strip-links` (empties channels, closes open `bad-link` reports) or `dismiss`. |

## Where it shows and what it does

- **Settings → About you** (`components/app/account/about-you-section.tsx`,
  through the `account-sections` seam, after _Drummer profile_, whose free-text
  field is now labelled _Bio_).
- **Home** offers purpose, ability and styles once (`askAbout` in
  `readHome`): until answered or skipped, and never once any is set.
- **`/u/[username]`** shows the channel links and the switched-on fields, and
  a _Report_ button to signed-in readers who are not the owner.
- **Ability → a new pattern's start.** `ABILITY_START` maps Just starting to
  L1 at 70 BPM up to Professional at L5 at 115; intermediate is the old
  default (L3, 94).
- **Styles → the Studio.** `preferStyles` (`lib/app/breaks/catalogue/prefer.ts`)
  puts a _Your styles_ group first in the style picker and your styles'
  famous breaks first in the libraries. It returns a copy; the catalogue memo
  is everyone's.
- **BeatBuddy** gets purposes, styles and ability through
  `lib/app/breaks/buddy/about-context.ts`. A save invalidates the cached
  context so the next turn sees it.
- **Home by purpose** is Phase 7D's, when Sessions exists.

## Reports on profiles

`DrummerReport` (migration `drummer_reports`) is `BreakReport`'s twin:
`subjectId` cascades, `reporterId` and `resolvedById` are nulled on erasure.
The daily cap of 20 counts pattern and profile reports together. The queue at
`/admin/patterns` lists profiles below patterns. Hiding an offensive username
or bio is not an action yet (plan §10).

## Privacy

`DrummerAbout` is export section `about`; the reports you filed about profiles
are `profileReportsFiled`, naming each profile by username (never the owner's
user id). Both cascade or null on erasure as above. The privacy policy says
the fields are optional and the channel links public by default.
