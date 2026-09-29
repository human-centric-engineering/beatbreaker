# BeatBuddy

The Studio's assistant (Phase 7, app-plan §6). A drummer asks for something in
words and the chart changes. This page grows as Phase 7 lands. So far it covers
the loop as built in 7.8–7.9 and what Spike B (7.10) found when the loop met the
live model.

## The loop

```
Studio ── POST /api/v1/buddy/stream { message, doc } ──► route
          validate doc · check allowance · openWorkspace(user, doc)   rev n
          streamChat(agent 'beatbuddy', contextType 'studio')
            model ─► tool(s) ─► read BuddyWorkspace, write it if rev still n
Studio ◄── SSE: content · capability_result(s) { doc, rev, summary, changes }
```

- **The workspace** (`lib/app/breaks/buddy/workspace.ts`) is one row per user.
  The route writes it at the start of every turn from the document the Studio
  sent, and moves `rev` on. Tools read it and write it; they never take a user
  id from their arguments.
- **A write names the rev it read.** `writeWorkspace()` is one conditional
  update, so of two writers racing from the same rev, one lands and the other
  gets `workspace_changed`.
- **Every mutating tool returns the whole new document and its rev**, plus the
  changed sections as text.

## Spike B — what the live model does

**Run on 2026-09-29** with `gpt-4.1` through Sunrise's `streamChat()`, the dev
database and the two tools that exist (`get_pattern`, `apply_doctor_move`).
Four requests, each on a fresh workspace holding the same funk pattern. The
script was throwaway and is not in the tree.

| Request                                                                 | What the model did                                        | Outcome                                                                                                                |
| ----------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| "Strip the ghost notes from section A."                                 | One `apply_doctor_move`                                   | Right. rev 0→1, ghosts in A 5→0, and a reply naming bars 1 and 2.                                                      |
| "Add ghost notes to section A, then read the pattern back and tell me…" | `apply_doctor_move` **and** `get_pattern` in one response | The read ran alongside the write and returned the old rev. The reply was right anyway, from the move's own `sections`. |
| "Put a crash on 1 in section A and open the hats in section B."         | Two `apply_doctor_move` in one response                   | One lost with `workspace_changed`. The model called it again on its own and it landed (rev 6).                         |
| "In section A, strip the ghosts and push the backbeat."                 | Two `apply_doctor_move` in one response                   | **One lost, the model did not retry, and its reply said it had done both.** Ghosts in A still 5.                       |

### What it means

1. **The round trip works.** The message goes in, the tool runs on the
   server against the document the Studio sent, `capability_result` arrives with
   `{ doc, rev, summary, changes }`, and the model replies. The other half, where
   the chart changes and Undo works, needs the drawer (7.12–7.13) and is tested
   there.
2. **Calls in later steps of a turn see earlier ones.** A tool call made after
   an earlier one has finished reads the row the earlier call wrote. In the
   third request, the retry built on rev 5. The workspace design stands, and
   nothing depends on the model carrying a document between calls.
3. **Calls in the same step do not see each other.** `gpt-4.1` puts several calls
   in one response readily, in three of four requests here, even when the second
   depends on the first. Sunrise runs such a batch concurrently
   (`Promise.allSettled` in `lib/orchestration/chat/streaming-handler.ts`), and
   the result reaches the client as one `capability_results` frame. There is no
   provider-neutral way to switch batching off. OpenAI's `parallel_tool_calls`
   is exactly the provider-specific feature §8 rules out.
4. **So the rev check alone is not enough.** It stops a lost update from being
   silent in the workspace, but the model reads `workspace_changed` and may
   still tell the drummer the change was made.

### Decisions for 7.11 onward

- **A mutating tool that loses the race retries itself.** On
  `workspace_changed` it re-reads the workspace and applies its edit again to
  what is there now, up to three times, before it reports failure. Every
  mutating tool is "make this edit to the pattern as it stands", so applying it
  again to a newer pattern is the right thing, not a workaround. Two edits in
  one batch then both land, in an order nobody promised. `apply_doctor_move` is
  retrofitted in 7.11 with the other tools. A per-user lock would also work,
  but it holds a transaction open across the tool, which the retry avoids.
- **Nothing needs a read-back.** Mutating tools already return the changed
  sections as text. `get_pattern`'s description says not to call it in the same
  step as a change. The instructions say edits that depend on each other go one
  step at a time.
- **The client applies the highest rev it has seen, not the last result.** A
  `capability_results` frame lists results in call order, not the order they
  finished, and a failed call carries no document. 7.13's stale-`rev` rule
  already discards anything older than the Studio's own edits. This is the same
  rule applied within a turn.
- **The eval set (7.14) includes two-edit requests**, including a same-section
  pair. That is where the fourth request's false "done" would show up again.

### Also found

- **PDFs are fine.** `gpt-4.1` carries `vision` and `documents` in the provider
  model table, so the composer can take photos and PDFs (the §8 check).
- **Every turn logged $0.** Sunrise prices a call from its in-memory model
  registry. The chat path never loads it: only admin pages and the cost
  estimators call `refreshFromOpenRouter()` or `hydrateModelRegistryFromDb()`.
  In a fresh process, `gpt-4.1` is unknown and costs nothing, so the agent's
  monthly and per-turn budget caps see no spend until an admin page loads the
  registry. The daily allowance counts turns, not dollars, so it still holds.
  This is a Sunrise platform gap, and it is to be raised upstream before launch
  rather than patched in the fork.
- **Speed.** A turn with one tool call took about 3 s end to end, and a turn
  with a retry about 3.5 s.
