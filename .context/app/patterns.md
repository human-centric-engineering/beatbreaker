# Your patterns

What Phase 4 of [`planning/app-plan.md`](./planning/app-plan.md) built: what you
make is in your account, you can find it again, and you pick up where you left
off. This page is the Studio side — the pattern as a document, and where each
piece of Phase 4 lives. The endpoints, their parameters and the tables are in
[`breaks.md`](./breaks.md); this page links to them rather than repeating them.

## Anti-patterns first

- **Don't put anything that is not music in `doc`.** `doc` is the share-code
  wire format, and a pasted code must not be able to put a URL on someone's
  screen. A description and reference links are `Break` columns, sent and
  saved beside the document, never in it.
- **Don't take a list column from the request body.** `level`, like `bpm`,
  `swing` and `style`, is read off `doc` by `columnsFromDoc`
  (`lib/app/breaks/columns.ts`). A client that sends `level` is ignored.
- **Don't put a typed link in an `href`.** Every link goes through
  `parseReferenceLink` (`lib/app/breaks/links.ts`) — in the form, in the API
  schema, when the row is read back (`readStoredLinks`), and again when the
  stage draws a chip. What is stored and drawn is the URL it rebuilt from the
  id.
- **Don't record "opened" or "pinned" on `Break`.** A famous break has no
  `Break` row to hold either. Pins are the `Pin` table (D17), visits the
  `PracticeVisit` table (D18). The first build had `pinned` and
  `lastOpenedAt` columns; they were taken out before main ever carried them.
- **Don't let a different pattern onto the stage without `detach()`.**
  Without it, pressing N on a saved pattern would autosave a random roll over
  it. The provider wraps every replacing action (`replace()` in
  `studio-provider.tsx`); a new one goes through it too.

## The pattern as a document

`components/app/studio/use-pattern-document.ts` — `usePatternDocument()`,
called once, by `StudioProvider`, beside `useBreakConsole()`. The console knows
the notes; this knows that the notes belong to something. The Studio reads it
as `useStudio().doc`.

| Field / call                   | What it is                                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `mine`                   | The saved pattern on the stage (null for scratch); `mine` is false for someone else's shared pattern.                                                |
| `status`                       | `scratch` · `saved` · `unsaved` · `saving` · `offline` · `error` — what the header's status line says.                                               |
| `save()`                       | A scratch pattern, or someone else's: **creates** a row (a copy, for theirs). Your own: the autosave, now.                                           |
| `saveAs(title)`                | A new pattern of yours from the stage. The provider's `saveAs` renames the stage only once the copy exists.                                          |
| `detach({ discard? })`         | A different pattern is about to replace this one. Its last edit is saved on the way out, unless the prompt was answered Don't save.                  |
| `attach(id, mine, details?)`   | A saved pattern was opened in place (history, shelves, the Patterns drawer) rather than by its address.                                              |
| `needsPrompt`                  | Letting go would lose edits: someone else's pattern, edited; or yours, with edits the server does not have.                                          |
| `details`, `saveDetails(next)` | The description and links (task 4.11). Not autosaved with the notes — sent when the Details form is submitted. A copy carries them into its new row. |

The rules, with the reasons in the module comment:

- **Autosave** — one `PATCH` `AUTOSAVE_MS` (2s) after the last edit, never
  two in flight: saves are chained, because two PATCHes landing out of order
  would put the older one on the server.
- **Offline is not an error.** The save waits, the header says
  `Offline — will retry`, and it retries on the `online` event and every
  `RETRY_MS` (15s).
- **A refused save waits for an edit**, not a timer: resending what the
  server refused gets the same answer.
- **Deleted elsewhere** (a 404 on save): the stage becomes scratch rather than
  vanishing; Save puts it back.
- **Scratch survives a reload** in `localStorage` (`bb.scratch`,
  `lib/app/breaks/scratch.ts`), written on every change of the serialised
  pattern.
- **One create at a time**, and a create that answers after the stage has
  moved on does not bind the new pattern to the row it made.

The unsaved-changes prompt is `components/app/studio/leave-dialog.tsx`, driven
by the provider's `leaving` / `resolveLeave`. Copy is in
[`planning/site-copy.md`](./planning/site-copy.md) §6.

## Opening a pattern

- **By its address** — `app/(studio)/studio/[id]/page.tsx` reads it
  server-side through `openSavedBreak` (the same read as
  `GET /api/v1/breaks/:id`) and hands it to the provider as `initial`
  (`InitialPattern`: id, title, payload, `mine`, `details`). The console mounts
  on it; it never rolls a fresh pattern first. A miss is the not-found page.
- **In place** — `useStudio().open(target)` fetches through
  `fetchSavedPattern` (`use-practice-history.ts`), loads it with
  `loadPayload` and calls `attach`, so undo and the Back trail survive. The
  history, the shelves, the Patterns drawer and Home's library-entry deep link
  (`/studio?entry=<id>`) all go through it.
- **On a drawer** — `/studio?drawer=<tool>&tab=<tab>` opens the Studio with
  that drawer showing, and for the Patterns drawer on that tab. Home's
  first-run _Browse the famous grooves_ is `?drawer=patterns&tab=libraries`.
  See [`shell.md`](./shell.md) § Opening on a drawer.

## Where each piece lives

| Task | What                                       | Code                                                                                                              | Docs                                                   |
| ---- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 4.1  | `level`, `description`, `links` on `Break` | `prisma/schema/app.prisma`, migration `break_your_patterns`                                                       | [`breaks.md`](./breaks.md) § `/api/v1/breaks`          |
| 4.2  | Reference links                            | `lib/app/breaks/links.ts` (`parseReferenceLink`, `readStoredLinks`, `storedLinkSchema`, `LINK_RULE`, `MAX_LINKS`) | [`breaks.md`](./breaks.md) § Reference links           |
| 4.3  | `q`, `sort=updated\|created`, bulk POST    | `app/api/v1/breaks/route.ts`, `lib/validations/breaks.ts`                                                         | [`breaks.md`](./breaks.md) § `/api/v1/breaks`          |
| 4.4  | `/studio/[id]`                             | `app/(studio)/studio/[id]/page.tsx`                                                                               | [`shell.md`](./shell.md) § The route group             |
| 4.5  | The document model                         | `components/app/studio/use-pattern-document.ts`, `leave-dialog.tsx`, the header's Save                            | this page                                              |
| 4.6  | Practice shelves                           | `Pin`, `/api/v1/pins`, `lib/app/breaks/saved/pins.ts`, `use-pins.ts`, `pin-button.tsx`                            | [`breaks.md`](./breaks.md) § `/api/v1/pins`            |
| 4.7  | Practice history, Back / Forward           | `PracticeVisit`, `/api/v1/history`, `lib/app/breaks/saved/history.ts`, `use-practice-history.ts`                  | [`breaks.md`](./breaks.md) § `/api/v1/history`         |
| 4.8  | Patterns drawer                            | `components/app/studio/panels/patterns-panel.tsx`                                                                 | [`breaks.md`](./breaks.md) § The Patterns drawer       |
| 4.9  | Home                                       | `/api/v1/home`, `lib/app/breaks/saved/home.ts`, `components/app/home/`                                            | [`breaks.md`](./breaks.md) § `/api/v1/home`            |
| 4.10 | `bb.favs` import                           | `components/app/studio/use-favs-import.ts`                                                                        | [`breaks.md`](./breaks.md) § Browser favourites import |
| 4.11 | Details and link chips                     | `components/app/studio/details-form.tsx`, `LinkChips` in `stage.tsx`                                              | below                                                  |

## Details and link chips (task 4.11)

`DetailsForm` sits at the top of the **Export** drawer (`panels/export-panel.tsx`):
**Name**, **Description** and up to four **Links**, each with a `<FieldHelp>`.
React Hook Form with a Zod schema that runs the same `parseReferenceLink` the
API does, so the form refuses what the server would — `javascript:`, `http:`,
a look-alike host, a userinfo trick — with `LINK_RULE`, which names what is
accepted. **Add a link** stops at four and says so.

- **Name** can be changed on anything: it is the pattern's own, rides in the
  document, and autosaves with it (`rename`).
- **Description and links** belong to a row, so they are editable only on a
  saved pattern of yours. On scratch the fieldset is disabled with "Save the
  pattern to give it a description and links"; on someone else's pattern it
  shows theirs, read-only — a copy keeps them.
- **Save details** sends `{ description, links }` through
  `doc.saveDetails` — one PATCH, without the document. The form resets to what
  the server answered, so it shows the canonical URLs, not what was typed.
- **Save a copy** (yours only) is Save As: a new pattern under the name in the
  field, with this one's _saved_ description and links. Until 4.11 Save As had
  no control of its own.

**Chips.** `LinkChips` (in `stage.tsx`) draws `▶ Video` / `♫ Song` (or the
link's label) beside the title, from `doc.details.links`. Each opens in a new
tab with `rel="noopener noreferrer"`, and each `href` is re-parsed on the way
to the screen: a stored link that no longer passes is not drawn. An in-Studio
player is in the plan's §10.

Tests: `tests/unit/components/app/studio/details-form.test.tsx` (every refusal,
the save, scratch and someone-else's, Save a copy, the chips);
`use-pattern-document.test.ts` § details; `panels/patterns-panel.test.tsx`
(links arrive with a pattern opened in place).

## Left as it is

- **`Take` is dormant (D8).** The model exists — a video of you playing a
  pattern, `videoKey` into storage, cascading from both `User` and `Break` —
  and nothing creates, lists or plays one. Storage, a consent line and
  moderation are a product of their own; reference links cover "here is a
  video of this pattern" without hosting any video. It stays in the account
  export (`takes`) and in erasure, so a row that somehow exists is still
  handled. Decide it after launch.
- **Settings stay in the browser.** Kit tuning, mixer defaults and chart
  preferences (`bb.level`, `bb.view`, and the rest) are `localStorage`, per
  device. Moving them to the account is in the plan's §10.
- **Not yet looked at in a browser.** The header's save status, Save / Save a
  copy / Retry, the prompt, and now the Details form and chips are covered by
  component tests over the real console, but nobody has seen them on screen.
  That is Phase 5's first job.
