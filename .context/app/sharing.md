# Sharing and the community library

What Phase 6 of [`planning/app-plan.md`](./planning/app-plan.md) builds: a
pattern anyone can open from a link, a public library of patterns published
under a username, copies that credit what they came from, and moderation. This
page grows with each of Phase 6's three PRs; it covers **6-i** — who can open
a pattern, usernames and copies.

## Anti-patterns first

- **Don't put `userId`, an account `name` or an email in anything a
  non-owner reads.** Public work is attributed to the username (D3) and to
  nothing else. `GET /api/v1/breaks/:id` strips `userId`, `parentId` and
  `gridHash` (H8); a new read that returns a `Break` row does the same.
- **Don't write `visibility: 'published'` outside the publish route.** The
  create and update schemas accept `private` and `link` only, so a PATCH
  cannot skip the username, duplicate and word checks publishing runs (6.9).
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
`tests/unit/components/app/account/`.
