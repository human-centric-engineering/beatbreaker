# Document Clean Up

Interactive preprocessing for knowledge-base documents. Lives at `/admin/orchestration/knowledge/[id]/cleanup`, reached by ticking **Clean up before chunking** on the upload form. Powered by a seeded `cleanup-agent` and eleven cleanup capabilities.

## When to use

- Raw transcripts (YouTube, meeting recordings, podcasts) with timestamps, speaker labels, and filler words.
- Web-scraped articles with boilerplate (cookie banners, "subscribe" CTAs, navigation breadcrumbs).
- Long-form text where verbose intros, repetition, or trailing footers would dilute chunk-level search.
- Any document where the chunker + embedder will produce noticeably better results from cleaner input.

## When not to use

- CSV uploads — the upload route refuses with `CLEANUP_UNSUPPORTED_FORMAT` because each row is already an atomic chunk.
- Docs that are already clean and well-structured — skip the cleanup checkbox and let them flow straight into chunking.

Book-sized docs (>100k tokens) are supported but degrade in a known way: deterministic capabilities work as normal, whole-doc `rewrite_with_llm` refuses with `document_too_large`, and per-section refines are gated by the section-size guard (see [Refine with agent](#refine-with-agent-from-the-editor)). The UI virtualises the section list so a 200-section doc loads without stalling. If a single section still exceeds the model context window, split it manually before refining or switch to a larger-context model.

## Flow

1. Admin uploads a file with **Clean up before chunking** ticked.
2. Server creates an `AiKnowledgeDocument` with `status='cleaning'`, populates `originalContent`, and creates an `AiConversation` bound to the cleanup agent (`contextType='knowledge_document'`, `contextId=<docId>`).
3. Server sends a confirmation email to the uploader with a deep link to the cleanup page (fire-and-forget; email failure does not abort the session).
4. Browser navigates to `/admin/orchestration/knowledge/<docId>/cleanup`. The cleanup chat opens with the configured starter prompts.
5. Admin and agent converse. Each capability call mutates `processedContent` on the doc row in-place; the preview pane re-fetches and updates after every chat stream event.
6. Admin clicks **Mark cleaned** → finalise endpoint chunks + embeds `processedContent`, sets status to `ready`, and clears both `originalContent` and `processedContent` to reclaim storage.
   - OR **Use original** → same pipeline against the untouched `originalContent`.
   - OR **Discard & delete** → hard-deletes the doc + the cleanup conversation in one transaction.

If the admin navigates away mid-session, the doc stays in `cleaning` status and appears in the **Cleaning** filter on the KB list. The per-row **Continue cleanup** action returns to the chat page where the conversation resumes server-side.

## PDF flow

PDFs go through the existing preview modal first (so coverage warnings are visible) and only land in `cleaning` after the admin confirms the extracted text. The upload writes `metadata.runCleanup: true` onto the preview doc; the confirm endpoint reads it and calls `transitionToCleanup()` instead of `confirmPreview()`.

## Cleanup Agent

| Field                 | Value                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------- |
| `slug`                | `cleanup-agent`                                                                         |
| `name`                | Document Clean Up Assistant                                                             |
| `visibility`          | `internal`                                                                              |
| `isSystem`            | `true` (seeded by `prisma/seeds/020-cleanup-agent.ts`)                                  |
| Default model         | Resolved at runtime via `agent-resolver.ts` (admin can pin a cheaper Haiku-class model) |
| Temperature           | `0.2` — cleanup is procedural, not creative                                             |
| `knowledgeAccessMode` | `restricted` — cleanup never searches the wider KB                                      |

The seeded system prompt instructs the agent to prefer deterministic capabilities, summarise changes before and after, call `estimate_size` early, ask for clarification on vague instructions, and remind the admin to click **Mark cleaned** when satisfied. Admins can edit the prompt in the standard agent admin UI; re-seeding only sets `isSystem: true` so customisations survive.

## Capabilities reference

All eleven capabilities resolve the active document via the chat session's `contextType` + `contextId`. They error with `not_cleanup_session` if invoked outside a cleanup conversation.

### Deterministic (no LLM cost)

| Slug                    | Args                                                                  | What it does                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `strip_lines_matching`  | `{ regex, flags? }`                                                   | Removes whole lines where the regex matches. Returns `invalid_regex` on a malformed or unsafe pattern (see below).             |
| `strip_matches`         | `{ regex, flags? }`                                                   | Removes inline regex matches; forces `g` flag. Same `invalid_regex` rejection as `strip_lines_matching`.                       |
| `strip_timestamps`      | `{ formats?: ('hh_mm'\|'hh_mm_ss'\|'bracketed'\|'parenthesised')[] }` | Removes timestamp markers in the named formats; default removes all four.                                                      |
| `strip_speaker_labels`  | `{ format?: 'colon'\|'bracketed'\|'both' }`                           | Removes `Name:` and/or `[Name]` at line start. Multi-word names up to 4 words supported. Non-capitalised speakers not matched. |
| `collapse_whitespace`   | `{ keepBlankLines?: boolean }`                                        | Collapses runs of spaces/tabs to one space, trims trailing whitespace, collapses or removes blank lines.                       |
| `dedupe_lines`          | `{ consecutiveOnly?: boolean }`                                       | Removes duplicate lines (adjacent or doc-wide).                                                                                |
| `normalise_punctuation` | none                                                                  | Smart quotes → straight, en/em dashes → `-`/`--`, ellipsis char → `...`, non-breaking space → space.                           |
| `preview_diff`          | none                                                                  | Read-only — reports `charsOriginal`, `charsCurrent`, `linesOriginal`, `linesCurrent`, `reductionPct` for the agent to narrate. |

**Regex safety.** The cleanup agent picks `regex`/`flags` itself from natural-language instructions, so `strip_lines_matching` and `strip_matches` run every pattern through `compileSafeRegex()` (`lib/orchestration/capabilities/built-in/document-cleanup/context.ts`) before compiling it — a `safe-regex2` check that rejects patterns vulnerable to catastrophic backtracking (e.g. `(a+)+$`) with `invalid_regex`, alongside the existing syntax-error check. Node's `RegExp` engine has no built-in timeout, so this runs _before_ the pattern is ever executed rather than trying to recover from a hang afterward.

### LLM-backed (size-permitting)

| Slug                       | Args                              | What it does                                                                                                                                      |
| -------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rewrite_with_llm`         | `{ instructions }`                | Whole-doc rewrite per natural-language instructions. Refuses with `document_too_large` when the size class is `too-large`.                        |
| `rewrite_section_with_llm` | `{ sectionMarker, instructions }` | Per-section rewrite — finds the section by marker text in a heading or standalone line, sends only that body to the LLM. Works at any total size. |

### Utility

| Slug            | Args | What it does                                                                                                   |
| --------------- | ---- | -------------------------------------------------------------------------------------------------------------- |
| `estimate_size` | none | Read-only — returns `tokenCount`, `sizeClass` (`small`/`medium`/`large`/`too-large`), and `llmRewriteAllowed`. |

## Size class behaviour

Set at upload time by `getDocumentSizeReport()` in `lib/orchestration/knowledge/size-report.ts` and persisted on `metadata.sizeClass`, `metadata.sizeTokens`, `metadata.llmRewriteAllowed`:

| Class       | Token band | Whole-doc LLM rewrite | Notes                                                        |
| ----------- | ---------- | --------------------- | ------------------------------------------------------------ |
| `small`     | ≤ 8,000    | allowed               | Cheap, fast rewrites                                         |
| `medium`    | ≤ 32,000   | allowed               | Affordable but noticeable cost                               |
| `large`     | ≤ 100,000  | allowed               | Expensive; admin should consider per-section rewrites first  |
| `too-large` | > 100,000  | **refused**           | Use deterministic capabilities or `rewrite_section_with_llm` |

The agent reads the class from its session context and self-restricts. The cleanup page header shows a warning callout when `llmRewriteAllowed=false`.

## Storage model

| Field                                                                     | Type      | Lifecycle                                                                                                                                 |
| ------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `originalContent`                                                         | `Text?`   | Populated once at upload; never mutated. Cleared on finalise (commit OR use-original) to reclaim storage.                                 |
| `processedContent`                                                        | `Text?`   | Mutated in-place by deterministic + LLM capabilities across the cleanup chat. Cleared on finalise.                                        |
| `metadata.sizeClass`, `metadata.sizeTokens`, `metadata.llmRewriteAllowed` | JSON      | Written at upload time; read by the agent's session prompt and the cleanup page header.                                                   |
| `metadata.runCleanup`                                                     | JSON bool | Written on PDF preview docs to signal that the confirm endpoint should branch into `transitionToCleanup()` instead of `confirmPreview()`. |
| `metadata.cleanupCommittedMode`                                           | JSON      | Written on finalise — `'commit'` or `'use-original'` so audit / diagnostics can tell which path produced the chunks.                      |

## API surface

| Method | Path                                                                    | Purpose                                                                                                                          |
| ------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/admin/orchestration/knowledge/documents`                       | Existing upload route. Accepts `runCleanup=true` in formData; returns `{ document, redirectTo }` when cleanup is requested.      |
| POST   | `/api/v1/admin/orchestration/knowledge/documents/[id]/confirm`          | Existing PDF preview-confirm route. Reads `metadata.runCleanup`; if set, returns `{ document, redirectTo }` instead of chunking. |
| POST   | `/api/v1/admin/orchestration/knowledge/documents/[id]/cleanup/finalise` | New. Body `{ action: 'commit' \| 'use-original' \| 'delete' }`. See route file for behaviour per action.                         |

## Troubleshooting

**The doc is stuck in `cleaning` status.**
The cleanup session is intentionally durable. Filter the KB list to `Cleaning` and click **Continue cleanup** to return to the chat, or open the cleanup page directly via the URL. The session resumes server-side.

**The agent says "not_cleanup_session" mid-conversation.**
This means the doc's status is no longer `cleaning` (probably finalised or deleted in another tab). Refresh the cleanup page; you'll be redirected back to the KB list.

**`rewrite_with_llm` refuses with `document_too_large`.**
The doc is over 100k tokens. Either run deterministic strips first then re-check size with `estimate_size`, or use `rewrite_section_with_llm` on individual sections.

**The cleanup email didn't arrive.**
The send is fire-and-forget — failures log at `warn` level but don't surface in the UI. Check the server logs for "cleanup-ready email failed". The session is still usable from the KB list's **Cleaning** tab regardless.

**Re-seed wiped my custom cleanup agent prompt.**
It shouldn't — `prisma/seeds/020-cleanup-agent.ts` uses `update: { isSystem: true }` so re-seeding only sets the system flag. Edits to `systemInstructions`, `model`, `provider`, `temperature`, and capability bindings survive.

## Inline editing

In addition to the chat-driven flow, the cleanup page supports **inline human editing** of the document being cleaned. Hover any section, click the pencil, edit the body in a textarea, click Save. The change is committed to `processedContent` and written to the revision history alongside capability mutations.

### Section detection

The doc is broken into editable sections by a layered detector (`lib/orchestration/knowledge/section-detection.ts`). Detectors run in priority order; the first one that finds ≥2 sections wins:

1. **Markdown headings** (`#` through `######`)
2. **Speaker turns** — every change of speaker (`Name:` or `[Name]` at line start) is a boundary; back-to-back turns from the same speaker stay grouped
3. **Title Case lines followed by a blank line** — informal section breaks
4. **Paragraph runs (fallback)** — groups every N paragraphs (default 5); always produces a result

Section ids are content-hashed (FNV-1a of marker + index) so small body edits don't shift ids — the editor can address the same logical section across re-fetches.

Under 50 sections the list renders directly. At or above 50 it virtualises via `react-window` (`components/admin/orchestration/knowledge/section-list.tsx`) so only on-screen rows mount — keeps the DOM bounded and reconciliation fast for book-sized docs. Trade-off: browser Ctrl-F won't match text inside un-rendered sections — scroll the doc to surface them first if you need an in-page find.

### Edit lock

A cooperative single-writer lock coordinates the agent and the human. While ANY section is being edited:

- The local admin acquires a server-side lock via `POST /cleanup/lock` (5-minute TTL).
- The chat input is disabled with a "Paused: document is being edited" overlay so a capability call can't race the in-progress save.
- Every cleanup capability calls `requireEditableTarget()` before mutating; if the lock is held by a different admin, the capability returns `target_locked`.

Lock-held-by-other-admin is surfaced in a banner at the top of the page; the editor and chat are both paused until the holder releases or the TTL expires.

### Conflict resolution

Every section edit POST carries an `expectedFingerprint` — SHA-256 of the section body the editor opened against. On a mismatch (e.g. a capability landed despite the lock), the server returns 409 with the current section body. The UI shows a "Section changed since you started editing" panel with **Keep mine** (re-saves the local draft over the server's update) and **Take theirs** (replaces the textarea content with the server's current body for manual merge).

### Revision history

Every mutation — capability call, human edit, restore, finalise — writes a row to `AiKnowledgeDocumentRevision`. The cleanup page's History button opens a drawer listing revisions newest-first with source label (e.g. "Agent: strip_timestamps", "You: section edit", "Finalise: commit"). Clicking Restore writes a NEW revision with `source: 'restore'` — never destructive.

**Retention is bounded.** Each revision row stores the document's full content (no diff storage), so an unbounded history scales linearly with edit count × document size. After each write, `writeRevision()` prunes everything beyond the most recent N rows per document. Default N = 50; configurable via `KB_REVISION_RETENTION` env (clamped to `[10, 500]`). When the drawer is at capacity the UI shows a "Showing latest 50 revisions — older entries have been pruned" hint so the cap is visible. The shared constant lives at `lib/orchestration/knowledge/revision-retention.ts` so the server's prune and the client's hint don't drift.

### Diff-card review for LLM rewrites

The two LLM-backed capabilities (`rewrite_with_llm`, `rewrite_section_with_llm`) **do not auto-apply**. They write a row to `AiKnowledgeDocumentPendingChange` and return a `pendingChangeId`. The chat surface intercepts the capability result, opens a side-by-side diff modal, and waits for the admin to Accept or Reject:

- **Accept** → applies `afterContent` to `processedContent`, writes a `capability:<slug>` revision, deletes the pending row.
- **Reject** → just deletes the pending row; doc unchanged, no revision.

The cleanup agent's system prompt knows this contract — it says "I've proposed a rewrite for your review" instead of claiming the rewrite is done.

Deterministic capabilities (`strip_*`, `collapse_whitespace`, `dedupe_lines`, `normalise_punctuation`) keep their auto-apply behaviour — admins don't want to click Accept on a 200-line timestamp strip.

### Refine with agent (from the editor)

Inside the section editor, a **Refine with agent** button opens an instructions input. Submitting calls `POST /cleanup/section/refine` which wraps the same LLM-rewrite logic as `rewrite_section_with_llm` but invokable directly from the editor (no chat round-trip). The result emerges as a pending change handled by the same diff modal — unified Accept/Reject UX whether the rewrite came from chat or the editor button.

**Per-section size guard.** Each section shows a token-count badge tinted by ratio to the bound model's context window — amber at ≥80%, red at ≥100% (treating the 4096-token response reserve as part of the budget). When red, the **Refine with agent** button is disabled with a tooltip explaining the limit. The badge estimate is client-side (`chars / 4`); the server-side guard is authoritative. The cleanup page resolves the active agent's context window once at load via `resolveCleanupAgentContextWindow()` (`lib/orchestration/knowledge/cleanup-agent.ts`); when no cleanup conversation exists yet (initial load before any chat), it falls back to 128k.

`POST /cleanup/section/refine` enforces the same budget server-side and returns `413 SECTION_TOO_LARGE` with `{ promptTokens, contextWindow, responseBudget, suggestion }` in `error.details` when the estimated prompt plus the 4096-token response reserve would exceed the model's window. The LLM is not invoked when the guard fires.

### API summary (inline editing)

| Method | Path                                  | Purpose                                                           |
| ------ | ------------------------------------- | ----------------------------------------------------------------- |
| GET    | `/cleanup/lock`                       | Current lock state                                                |
| POST   | `/cleanup/lock`                       | Acquire / refresh lock (423 LOCK_HELD when another admin owns it) |
| DELETE | `/cleanup/lock`                       | Release lock                                                      |
| POST   | `/cleanup/content`                    | Whole-document inline edit                                        |
| POST   | `/cleanup/section`                    | Per-section inline edit                                           |
| POST   | `/cleanup/section/refine`             | LLM refine of a section without chat                              |
| GET    | `/cleanup/revisions`                  | List revisions (newest first, paginated)                          |
| POST   | `/cleanup/revisions/:version/restore` | Restore prior revision (writes a new `source: 'restore'` row)     |
| POST   | `/cleanup/changes/:changeId/accept`   | Accept a pending LLM rewrite                                      |
| POST   | `/cleanup/changes/:changeId/reject`   | Reject a pending LLM rewrite                                      |

## Code map

| Purpose                                                                    | Path                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cleanup page                                                               | `app/admin/orchestration/knowledge/[id]/cleanup/page.tsx`                                                                                                                                                                                                                                      |
| Cleanup view (client)                                                      | `components/admin/orchestration/knowledge/cleanup-view.tsx`                                                                                                                                                                                                                                    |
| Adaptive section list (direct ↔ react-window)                              | `components/admin/orchestration/knowledge/section-list.tsx`                                                                                                                                                                                                                                    |
| Editable section (badge, refine gating)                                    | `components/admin/orchestration/knowledge/editable-section.tsx`                                                                                                                                                                                                                                |
| Finalise endpoint                                                          | `app/api/v1/admin/orchestration/knowledge/documents/[id]/cleanup/finalise/route.ts`                                                                                                                                                                                                            |
| `createDocumentForCleanup`, `transitionToCleanup`, `commitCleanupAndChunk` | `lib/orchestration/knowledge/document-manager.ts`                                                                                                                                                                                                                                              |
| Size report helper (whole-doc)                                             | `lib/orchestration/knowledge/size-report.ts`                                                                                                                                                                                                                                                   |
| Cleanup-agent context-window resolver                                      | `lib/orchestration/knowledge/cleanup-agent.ts`                                                                                                                                                                                                                                                 |
| Revision retention constant (shared server/client)                         | `lib/orchestration/knowledge/revision-retention.ts`                                                                                                                                                                                                                                            |
| Revisions writer + prune                                                   | `lib/orchestration/knowledge/revisions.ts`                                                                                                                                                                                                                                                     |
| Confirmation email helper                                                  | `lib/orchestration/knowledge/cleanup-email.ts`                                                                                                                                                                                                                                                 |
| Email template                                                             | `emails/cleanup-ready.tsx`                                                                                                                                                                                                                                                                     |
| Cleanup capabilities                                                       | `lib/orchestration/capabilities/built-in/document-cleanup/*.ts`                                                                                                                                                                                                                                |
| Agent + capability seeds                                                   | `prisma/seeds/020-cleanup-agent.ts`, `prisma/seeds/019-cleanup-capabilities.ts`                                                                                                                                                                                                                |
| Tests                                                                      | `tests/unit/lib/orchestration/capabilities/built-in/document-cleanup/`, `tests/unit/lib/orchestration/knowledge/`, `tests/unit/components/admin/orchestration/knowledge/cleanup-view.test.tsx`, `tests/integration/api/v1/admin/orchestration/knowledge.documents.id.cleanup.finalise.test.ts` |
