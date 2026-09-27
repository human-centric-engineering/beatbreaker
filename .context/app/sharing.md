# Sharing and the community library

What Phase 6 of [`planning/app-plan.md`](./planning/app-plan.md) builds: a
pattern anyone can open from a link, a public library of patterns published
under a username, copies that credit what they came from, and moderation. This
page grows with each of Phase 6's three PRs: **6-i** — who can open a
pattern, usernames and copies; **6-ii** — the public pages and API;
**6-iii** — publishing, reports and moderation.

## Anti-patterns first

- **Don't put `userId`, an account `name` or an email in anything a
  non-owner reads.** Public work is attributed to the username (D3) and to
  nothing else. `GET /api/v1/breaks/:id` strips `userId`, `parentId` and
  `gridHash` (H8); a new read that returns a `Break` row does the same.
- **Don't write `visibility: 'published'` outside `publishBreak`.** The
  create and update schemas accept `private` and `link` only, so a PATCH
  cannot skip the flag, username, word, duplicate and daily-cap checks — and
  a PATCH that edits a pattern already published runs the word and duplicate
  checks again (`assertPublishable`).
- **Don't name a reporter to anyone.** The queue shows only whether the
  reporter's account still exists; the owner's email says a report was made,
  not by whom.
- **Don't filter "someone else may open it" by hand.** It is `openableBy(userId)`
  / `OPENABLE` in `lib/app/breaks/community/visibility.ts`, used by the Studio,
  the API, the copy route, pins and the history. Before Phase 6 it was
  `{ shared: true }`, written out in three places.
- **Don't mint a slug in the browser, or a second one for a row that has
  one.** `visibilityData` (`community/sharing.ts`) mints only when a row
  leaves `private` without a slug, and the slug is kept after — so a link
  that stopped working when its pattern went private works again when it is
  shared again.
- **Don't credit a link-shared parent.** `lineageOf` credits a copy only while
  its parent is published: the credit links to the parent, and a copy shared
  onward would hand a private address to strangers.
- **Don't write the username rules anywhere but `community/username.ts`.** The
  form and the API both run `usernameSchema`.
- **Don't read public patterns anywhere but `community/public.ts`.** The API,
  `/p/`, `/explore`, `/u/` and the sitemap all go through it, and it is the
  one place that drops `userId` after looking up the username.
- **Don't put a reference link in an iframe without pressing.** The embeds
  are click-to-load, `src` is `embedUrl` (built from the id), and
  `appFrameSrc` lists exactly the three embed origins. No thumbnails.

## Who can open a pattern

`Break.visibility` replaced `Break.shared` (migration `sharing`, which mapped
`shared = true` to `link` and gave each such row a slug).

| Value       | Who can open it                                                                                   | Listed?                   |
| ----------- | ------------------------------------------------------------------------------------------------- | ------------------------- |
| `private`   | The owner.                                                                                        | No                        |
| `link`      | Anyone with `/p/<slug>` (signed in or not, D2 — the page arrives in 6-ii), or by id if signed in. | No                        |
| `published` | As `link`, and it is in the community library under the owner's username (6-iii).                 | Yes, in `/explore` (6-ii) |

- **The slug** is ten characters of lower-case Crockford base32
  (`community/slug.ts`, 50 bits — not enumerable). Public URLs use it; the
  cuid stays internal. Rows the migration converted have ten hex characters,
  which `slugSchema` also accepts.
- **`gridHash` and `difficulty`** are derived from `doc` by `columnsFromDoc`
  on every write, like `bpm` and `level` (`community/grid.ts`). `gridHash` is
  a sha256 of the notes alone — every lane of both sections, no name, tempo,
  style or pins — for the duplicate check at publish. `difficulty` is 1 easy ·
  2 medium · 3 hard from the busier section's hits per second at the
  pattern's tempo (`MEDIUM_FROM` 6, `HARD_FROM` 10), a first cut for the
  library's filter; the critic has no difficulty of its own. Rows written
  before Phase 6 have both null until their next save.

## Copies

`POST /api/v1/breaks/:id/copy` — `{ title?, doc? }`. A new, **private**
pattern owned by the caller, from any pattern they can open (the same
`openSavedBreak` read, so a miss is a 404). `doc` is the notes as the caller
has them now — someone else's pattern may have been edited before saving —
and defaults to the stored one; `title` defaults to the original's. The
description and links come across. A copy of **someone else's** pattern sets
`parentId`; a copy of your own does not.

`parentId` is a Prisma self-relation, `ON DELETE SET NULL`: deleting the
original, or erasing its owner, leaves every copy with its new owner and
removes the credit line rather than naming someone who asked to be forgotten.

**The credit line** — "Based on _X_ by @_Y_" — is `basedOn` on
`GET /api/v1/breaks/:id` and on the copy's own 201, from `lineageOf`: the
parent's title, slug and owner's username, only while the parent is
`published` and its owner has a username. The Studio draws it under the title
(`BasedOn` in `stage.tsx`).

## Usernames

`DrummerProfile` — `userId` (primary key, hand-written cascading FK, probed),
`username` (unique, stored lower-case), `bio`, `usernameChangedAt`.
`ReservedUsername` — `username`, `heldUntil`: a name someone gave up, which
nobody may take until `heldUntil`. It has no user id, and is excluded from the
export with that reason.

The rules (`community/username.ts`):

- 3–24 characters, `a-z`, `0-9`, `-`, `_`, starting with a letter or digit;
  case-insensitive.
- Refused as **unavailable** — one answer, so the list is not taught: the
  site's own addresses and roles (`admin`, `explore`, `support`, …);
  look-alikes of `admin`, `beatbreaker`, `moderator`, `official` and
  `support` anywhere in the name once disguises are undone (`4dm1n`,
  `the_admin`); a blocked word (`community/words.ts`, a deliberately short
  list — reporting catches the rest).
- **Changing** it is allowed once per 30 days (`USERNAME_CHANGE_DAYS`);
  choosing the first one is not a change. The old name is held for 30 days
  (`USERNAME_HOLD_DAYS`) so the old `/u/` links are not someone else's the
  next day. A held name reads as **taken**.

| Route                                             | Does                                                                                                                                                                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/drummer-profile`                     | `{ username, bio, nextChangeAt }`, or `null` before a username is chosen.                                                                                                                                                   |
| `PUT /api/v1/drummer-profile`                     | `{ username, bio? }`. A name that breaks the rules is a 400; taken, held, or a change inside 30 days is a 409 with the words to show. Two people claiming one free name: the second is told it is taken (the unique index). |
| `GET /api/v1/drummer-profile/available?username=` | `{ available: true }` or `{ available: false, reason: 'shape' \| 'unavailable' \| 'taken', message }`. Your own name is available to you.                                                                                   |

All three are `withAuth`, `decidedBy: 'self'`, under the section rate cap.

**Settings → Drummer profile** is the first thing registered through the
`account-sections` seam (`lib/app/account-sections.ts`):
`components/app/account/drummer-profile-section.tsx` reads the profile with
the page, `drummer-profile-form.tsx` edits it. Settings only — `/profile` is
the account card, whose name field is the private name this keeps apart.

**Erasure.** The profile cascades. Nothing holds an erased user's username
afterwards; holding it would mean keeping it, which erasure is for not doing.

## The public API

No session needed (D2); rate-limited by IP through the `public` tier
(`lib/app/rate-limit.ts`, 120/min); ETag and `304` with
`public, max-age=0, must-revalidate`, so a pattern made private stops being
served on the next request (`app/api/v1/public/_shared.ts`).

| Route                               | Does                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/public/patterns`       | Published patterns only. `style`, `meter`, `tempo` (`slow` < 90 · `medium` 90–120 · `fast` > 120), `difficulty` (1–3; an empty value is no filter, as on `/explore`), `sort=newest\|saved`, `limit` ≤ 48, `cursor` (opaque; `meta.nextCursor`). Cards: slug, title, description, style, meter, bpm, level, difficulty, `linkKinds`, `publishedAt`, `author` (a username), `saves`. |
| `GET /api/v1/public/patterns/:slug` | A `link` or `published` pattern, whole: the card's fields plus `visibility`, `links`, `doc`, `basedOn` and `critique: { score, verdict, playable }`. Private, deleted, never minted and malformed are one 404.                                                                                                                                                                     |

`saves` is the count of copies (`children`), and "most saved" sorts on it —
no separate table. Cursors are offsets, base64url'd, because a count cannot
be a keyset. Usernames for a page come from one query (`usernamesOf`), never
one per card.

## The public pages

All in `app/(public)/`, under the marketing header and footer.

- **`/p/[slug]`** — the title, "by @username" (none for a link share by
  someone with no username), style, time signature, tempo and difficulty, the
  credit line, the description; the **player** (`components/app/community/pattern-player.tsx`:
  play, tempo, layer — the Studio's `Transport` and `BreakAudio` over the
  default system kit, no editor); the **chart**, engraved on the server
  (`public-chart.tsx`), so it is in the first paint and in what a link
  preview reads; the **reference links** (`reference-embeds.tsx`); then, signed
  in, **Save a copy** (the copy route, then the Studio on the copy) and **Open
  in the editor** (`pattern-actions.tsx`), or signed out, the sign-up strip. A
  link share is `noindex, nofollow`. `not-found.tsx` is "This pattern isn't
  shared any more" for every miss.
- **`opengraph-image.tsx`** — 1200×630: the title, the byline and the first
  two bars of A, as a standalone SVG (`community/svg-markup.ts` fills in the
  colours and faces the stylesheet would, and escapes the text).
- **`/explore`** — the library, with a plain GET filter form (style, time
  signature, tempo, difficulty, sort) read through the API's own schema
  (`readPublicListQuery`, which drops a field that does not parse rather than
  erroring), cards (`pattern-card.tsx`, link icons only) and _More patterns_.
- **`/u/[username]`** — the username, the bio and their published patterns. An
  unknown username is a 404.
- **Navigation** — Explore is in the public header (`lib/app/public-nav.ts`)
  and the signed-in one (`lib/app/protected-nav.ts`).
- **Sitemap** — `/explore`, every published `/p/` and every drummer with
  something published (`publishedForSitemap`). Never a link share.
  Regenerated at most hourly (`revalidate`), not frozen at build time.
- **Signing up from `/p/`** returns to the pattern: the signup form honours
  `callbackUrl` as the login form does (a platform file, marked FORK).

**Your samples stay private.** A pattern carries no kit (the kit is a setting,
D19), so the player plays the default system kit. Nothing about publishing a
pattern reaches anyone's samples (D20).

### For the owner to check in a browser

These are Phase 6's checks that need a browser, which the sessions building
it cannot drive (the rule from Phase 5):

- A signed-out browser opens a `/p/` link, sees the chart within a second and
  hears it play (Safari and iOS included).
- The link pasted into a chat app shows the notation as its preview.
- With a video and a song link, the network panel shows no request to
  YouTube, Vimeo or Spotify until a placeholder is pressed, and the embeds
  then play under the production CSP.
- `/explore` and `/u/` at 390px and 1440px, light and dark.

## Publishing

`POST /api/v1/breaks/:id/publish` — `{ confirm: true }` (the "I wrote this, or
I built it from a pattern whose author is credited on it" tick). The one place
a row becomes `published` (`community/publish.ts`); the create and update
schemas cannot write it. In order:

| Refusal             | Status | When                                                                                                                                                                                                    |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLISHING_PAUSED` | 403    | The `PATTERN_PUBLISHING` flag is off. A missing flag reads as off (`isFeatureEnabled`), so the switch fails closed; the seed `app-beatbreaker/002-publishing-flag` creates it on.                       |
| `NOT_FOUND`         | 404    | Not yours, as every write.                                                                                                                                                                              |
| `USERNAME_REQUIRED` | 409    | No drummer profile (D3).                                                                                                                                                                                |
| `NOT_ALLOWED`       | 422    | A blocked word in the title or description (`textIsBlocked`).                                                                                                                                           |
| `DUPLICATE`         | 409    | The notes (`gridHash`, recomputed from the document) match someone else's published pattern, or either section matches a famous break (`sectionHash`). Your own earlier publication is not a duplicate. |
| `PUBLISH_LIMIT`     | 429    | `PUBLISH_DAILY_CAP` (10) _first_ publications in 24 hours. Republishing keeps the pattern's first `publishedAt`, so it neither counts again nor jumps back to the top of Newest.                        |

On success: a slug if it had none, `visibility: 'published'`, `publishedAt`
(the first one, if it was published before), and a fresh `gridHash` and
`difficulty`.

**Editing a published pattern is held to the same checks.** `NOT_ALLOWED` and
`DUPLICATE` are `assertPublishable`, which `PATCH /api/v1/breaks/:id` also runs
when a pattern stays published and its title, description or notes change —
refusing with the same codes and writing nothing. Unpublishing in the same
edit (`visibility` given) needs no check, and neither do links, which are
moderated by report. In the Studio a refused autosave shows as the header's
save error and waits for the next edit. **Unpublishing** is
`PATCH /api/v1/breaks/:id` with `visibility: 'link'` (the Studio's
_Unpublish_ — the link still works) or `'private'` (_Stop sharing_).

The title and description are not HTML-sanitised on the way in: every surface
renders them as text through React, and the one place that writes markup by
hand — the Open Graph image's SVG — escapes its own text.

**In the Studio**, the Share card has **Publish…** beside _Share with a link_,
opening `publish-dialog.tsx` (site-copy §6). With no username yet, choosing
one is the first step of the same dialog. A refusal stays in the dialog with
the server's words; `doc.publish()` in `use-pattern-document.ts` returns them.

## Reports and moderation

`BreakReport` — `breakId` (a Prisma relation, cascade), `reporterId` and
`resolvedById` (hand-written FKs to `user`, **SET NULL**, probed), `reason`,
`note`, `status` (`open` · `dismissed` · `actioned`), `resolvedAt`. The report
outlives the reporter and the admin: it is the moderation record about a
pattern. The export's `reportsFiled` section is the reports you filed — not
those about your patterns, and never the admin who resolved one.

| Route                                       | Does                                                                                                                                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/public/patterns/:slug/report` | Signed in. `{ reason: spam \| not-theirs \| offensive \| bad-link \| other, note? }`. One open report per person per pattern (a second updates it). Your own pattern is a 400; 20 a day. |
| `GET /api/v1/admin/patterns`                | Admin. The queue: every pattern with an open report, oldest first, with its owner's username and email. Never who reported it.                                                           |
| `POST /api/v1/admin/patterns/:id`           | Admin. `{ action: unpublish \| strip-links \| dismiss }`. Audit-logged (`pattern.<action>`).                                                                                             |

- **unpublish** — `private` (not `link`: a link being passed around may be
  what was reported), open reports actioned, the owner emailed
  (`components/app/emails/pattern-unpublished.tsx`) after the write, so a
  failed email never leaves it public.
- **strip-links** — links removed, still published, open `bad-link` reports
  actioned.
- **dismiss** — open reports dismissed; nothing else moves.

Each takes effect on the next public read: the public layer reads
`visibility` fresh and its responses must revalidate.

`/admin/patterns` (registered in `lib/app/admin-nav.ts` as _Reported
patterns_) renders the queue on the server and shows whether publishing is on.
**Report** on `/p/` is `components/app/community/report-button.tsx`, shown to a
signed-in reader who does not own the pattern.

## The community in the Studio and on Home

- **Patterns › Community** (`CommunityList` in `patterns-panel.tsx`) reads
  `GET /api/v1/public/patterns` once when shown, newest or most saved, and
  opens a pattern in place by its id — as someone else's, so Save keeps a
  credited copy.
- **Home › Published** lists your published patterns (`readHome`), each
  linking to its public page, with its saves; the first-visit screen gains
  _Browse the community library_.

## Erasure

Deleting an account deletes its patterns, published ones included (the
`break_userId_fkey` cascade), and its profile. Copies other people saved keep
their new owner and lose the credit line: `parentId` is `ON DELETE SET NULL`.
A report the erased user filed stays, with `reporterId` nulled. Checked
against a real database on 2026-09-27 through `eraseUser()`: the published
original and the profile gone, the other person's copy kept with `parentId`
null. The Privacy page says so; the Terms carry D9's grant.

## In the Studio

The **Share with a link** card sits under Details at the top of Share &
export (`components/app/studio/share-card.tsx`):

- a scratch pattern: "Save the pattern to share it with a link";
- yours, private: **Share with a link** (PATCH `visibility: 'link'`);
- yours, shared or published: the `/p/<slug>` link, **Copy link** (the
  absolute URL) and **Stop sharing** (PATCH `private`, which also unpublishes);
- someone else's: their link, if it has one, and a note that a copy can be
  shared.

It reads and writes `useStudio().doc.sharing` / `doc.share()` in
`use-pattern-document.ts`. `sharing` arrives with the pattern — from
`/studio/[id]` server-side, or from `GET /api/v1/breaks/:id` when a pattern is
opened in place — and is reset by `detach`. **Save on someone else's
pattern goes through the copy route**, so the copy is credited. If the
original has gone — deleted or made private while it was open — the copy route
404s, and Save falls back to a plain new pattern with no credit.

_Copy break code_ and _Copy Studio link_ (the `#b=` link) stay below: they
carry the notes themselves and need no saved row.

## Tests

`tests/unit/lib/app/breaks/community/` (the rules, the hashes, slugs,
visibility, lineage and the profile's data layer);
`tests/integration/api/v1/breaks/` (visibility on create and PATCH, H8, the
credit line, the copy route); `tests/integration/api/v1/drummer-profile/`;
`tests/unit/components/app/studio/share-card.test.tsx`,
`use-pattern-document.test.ts` and `details-form.test.tsx` (Save on someone
else's pattern posts to the copy route);
`tests/unit/components/app/account/`. 6-ii:
`tests/integration/api/v1/public/`, `tests/unit/lib/app/breaks/community/`
(`public.ts`, `svg-markup.ts`), `tests/unit/app/(public)/`,
`tests/unit/components/app/community/`. 6-iii:
`tests/unit/lib/app/breaks/community/` (`publish.ts`, `reports.ts`,
`moderation.ts`), `tests/integration/api/v1/breaks/[id]/publish*`,
`tests/integration/api/v1/public/patterns/[slug]/report*`,
`tests/integration/api/v1/admin/patterns/`, `tests/unit/app/admin/patterns/`,
the publish dialog, the report button, the Community tab and Home.
