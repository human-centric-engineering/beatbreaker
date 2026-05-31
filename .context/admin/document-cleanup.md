# Document Clean Up

Interactive preprocessing for knowledge-base documents. Lives at `/admin/orchestration/knowledge/[id]/cleanup`, reached by ticking **Clean up before chunking** on the upload form. Powered by a seeded `cleanup-agent` and eleven cleanup capabilities.

## When to use

- Raw transcripts (YouTube, meeting recordings, podcasts) with timestamps, speaker labels, and filler words.
- Web-scraped articles with boilerplate (cookie banners, "subscribe" CTAs, navigation breadcrumbs).
- Long-form text where verbose intros, repetition, or trailing footers would dilute chunk-level search.
- Any document where the chunker + embedder will produce noticeably better results from cleaner input.

## When not to use

- CSV uploads — the upload route refuses with `CLEANUP_UNSUPPORTED_FORMAT` because each row is already an atomic chunk.
- Whole books (~100k+ tokens). The deterministic capabilities still work but `rewrite_with_llm` refuses at that size — use `rewrite_section_with_llm` per chapter, or split the file before upload.
- Docs that are already clean and well-structured — skip the cleanup checkbox and let them flow straight into chunking.

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
| `strip_lines_matching`  | `{ regex, flags? }`                                                   | Removes whole lines where the regex matches. Returns `invalid_regex` on malformed pattern.                                     |
| `strip_matches`         | `{ regex, flags? }`                                                   | Removes inline regex matches; forces `g` flag.                                                                                 |
| `strip_timestamps`      | `{ formats?: ('hh_mm'\|'hh_mm_ss'\|'bracketed'\|'parenthesised')[] }` | Removes timestamp markers in the named formats; default removes all four.                                                      |
| `strip_speaker_labels`  | `{ format?: 'colon'\|'bracketed'\|'both' }`                           | Removes `Name:` and/or `[Name]` at line start. Multi-word names up to 4 words supported. Non-capitalised speakers not matched. |
| `collapse_whitespace`   | `{ keepBlankLines?: boolean }`                                        | Collapses runs of spaces/tabs to one space, trims trailing whitespace, collapses or removes blank lines.                       |
| `dedupe_lines`          | `{ consecutiveOnly?: boolean }`                                       | Removes duplicate lines (adjacent or doc-wide).                                                                                |
| `normalise_punctuation` | none                                                                  | Smart quotes → straight, en/em dashes → `-`/`--`, ellipsis char → `...`, non-breaking space → space.                           |
| `preview_diff`          | none                                                                  | Read-only — reports `charsOriginal`, `charsCurrent`, `linesOriginal`, `linesCurrent`, `reductionPct` for the agent to narrate. |

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

## Code map

| Purpose                                                                    | Path                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cleanup page                                                               | `app/admin/orchestration/knowledge/[id]/cleanup/page.tsx`                                                                                                                                                                                                                                      |
| Cleanup view (client)                                                      | `components/admin/orchestration/knowledge/cleanup-view.tsx`                                                                                                                                                                                                                                    |
| Finalise endpoint                                                          | `app/api/v1/admin/orchestration/knowledge/documents/[id]/cleanup/finalise/route.ts`                                                                                                                                                                                                            |
| `createDocumentForCleanup`, `transitionToCleanup`, `commitCleanupAndChunk` | `lib/orchestration/knowledge/document-manager.ts`                                                                                                                                                                                                                                              |
| Size report helper                                                         | `lib/orchestration/knowledge/size-report.ts`                                                                                                                                                                                                                                                   |
| Confirmation email helper                                                  | `lib/orchestration/knowledge/cleanup-email.ts`                                                                                                                                                                                                                                                 |
| Email template                                                             | `emails/cleanup-ready.tsx`                                                                                                                                                                                                                                                                     |
| Cleanup capabilities                                                       | `lib/orchestration/capabilities/built-in/document-cleanup/*.ts`                                                                                                                                                                                                                                |
| Agent + capability seeds                                                   | `prisma/seeds/020-cleanup-agent.ts`, `prisma/seeds/019-cleanup-capabilities.ts`                                                                                                                                                                                                                |
| Tests                                                                      | `tests/unit/lib/orchestration/capabilities/built-in/document-cleanup/`, `tests/unit/lib/orchestration/knowledge/`, `tests/unit/components/admin/orchestration/knowledge/cleanup-view.test.tsx`, `tests/integration/api/v1/admin/orchestration/knowledge.documents.id.cleanup.finalise.test.ts` |
