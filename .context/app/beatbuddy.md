# BeatBuddy

The Studio's assistant (Phase 7, app-plan §6). A drummer asks for something in
words and the chart changes. This page grows as Phase 7 lands. So far it covers
the loop as built in 7.8–7.9, what Spike B (7.10) found when the loop met the
live model, the twelve tools (7.11), and the drawer and apply loop (7.12–7.13).

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

## The tools

All twelve are `BaseCapability` classes in `lib/app/breaks/buddy/`, registered
from `BEATBUDDY_CAPABILITIES` in `lib/app/capabilities.ts`. The seed reads each
tool's `functionDefinition` from its class, so the row and the code cannot
disagree.

| Tool                 | Changes the workspace | Built on                                                        |
| -------------------- | --------------------- | --------------------------------------------------------------- |
| `get_pattern`        | no                    | `toText`, `critique`, `playability`                             |
| `list_styles`        | no                    | the catalogue (`listStyles`)                                    |
| `generate_pattern`   | both sections         | `generateGood`, `deriveB` — what the Generate button runs       |
| `write_bars`         | one section           | `fromText`, `playability`, `tidy`'s physical rules              |
| `apply_doctor_move`  | A, B or both          | `doctor`                                                        |
| `tidy_pattern`       | A, B or both          | `tidy`                                                          |
| `set_playback`       | tempo, swing, layer   | —                                                               |
| `explain_difficulty` | no                    | `critique`, `playability`, run per bar                          |
| `find_patterns`      | no                    | own rows by `userId`, `listLibraries`, `listPublished`          |
| `open_pattern`       | replaces it           | `openSavedBreak`, `openableIdForSlug`, the library picker's way |
| `save_pattern`       | no (writes a `Break`) | `breakCreateData`, as `POST /api/v1/breaks`                     |
| `suggest_title`      | no                    | `critique`, `nameBreak`                                         |

- **Every mutating tool goes through `editWorkspace()`** (`edit.ts`): read the
  workspace, apply the edit, hold the result to `sharePayloadSchema`, write if
  the rev has not moved. A lost write is made again on the newer pattern, up to
  `WRITE_ATTEMPTS` (3), which is Spike B's decision. The edit can therefore run
  more than once, so anything random is drawn before it: `generate_pattern`
  draws its seed outside. Every mutating tool returns `{ doc, rev, summary,
changes, sections }`, which is what the drawer applies.
- **`write_bars` checks each written bar on its own, before anything is
  written.** It applies the critic's hard rules (kick triples, snare runs, a
  backbeat, air), plus the three physical rules `tidy()` knows: one cymbal at
  a time, two hands, no foot chick under an open hat. A refusal names the bar,
  the beat and the rule. Lanes the writer used join the section first, so a
  clash on a new lane is seen. `whole: true` replaces the section and may
  change its meter; the backbeat then moves to where the snare lands in more
  than half the bars. The rule refuses a whole section with no backbeat at all,
  which is a genre-level limit to revisit if the evals find a real groove it
  blocks.
- **Nothing takes a user from its arguments** (`tools.test.ts` checks every
  registered tool). `open_pattern` reads through the same query the Studio's
  `/studio/[id]` uses, so another person's private pattern and an id that was
  never saved are the same `not_found`. `save_pattern` always saves private. No
  tool can share, publish or delete.
- **`set_playback` does not do count-in.** The plan listed it, but count-in is
  a `StudioSettings` field of the person's, not part of a pattern, and every
  other tool edits the pattern. The tempo range is the Studio's: 50 to
  `maxBpm(meter)`.
- **The instructions changed in the seed only.** The seed's agent `update` branch
  leaves an admin's edits alone, so the new line about dependent edits reaches a
  fresh install, not an existing agent row. On an existing install, paste it in
  from `003-beatbuddy.ts` at `/admin/orchestration/agents`.

## The drawer and the apply loop

The drawer is `components/app/buddy/buddy-panel.tsx`, the seventh tool on the
rail (`?drawer=buddy`, 440px wide). The conversation is `useBuddyChat`
(`use-buddy-chat.ts`), held by `StudioFrame` rather than the drawer, so closing
the drawer to look at the chart does not lose it.

- **A turn** posts `{ message, doc, section, conversationId?, attachments? }`
  to `/api/v1/buddy/stream` and reads the SSE through Sunrise's
  `parseChatStreamEvent`. `content` builds the reply, `status` shows under it,
  and `error` and `budget_exceeded_per_turn` end the turn with a line in the
  transcript (`getUserFacingError`). A non-200, including the 429
  `BUDDY_ALLOWANCE_SPENT`, is shown the same way. Nothing outside the drawer
  waits on a turn.
- **Applying** (`lib/app/breaks/buddy/apply.ts`, pure). A tool result counts
  as a change only if it parses, with its document held to
  `sharePayloadSchema` again on the client. Of the changes in a frame, the
  highest rev is applied, and only if it is above every rev seen so far.
  Before applying, the notes on the stage are compared with the turn's
  baseline: the pattern sent, then each document applied. If they differ, the
  drummer edited mid-turn, and the change is dropped and the chip says so.
  Tempo, swing and layer are left out of the comparison, so practising at 80%
  while BeatBuddy works is not an edit.
- **Undo.** `applyAssistant(payload, push)` on the console puts the document
  on the stage. The first change of a turn pushes an undo entry that also
  carries tempo, swing, layer and arrangement. Later changes in the same turn
  replace the stage in place, so one Undo (the chip's, or Ctrl+Z) takes the
  whole turn back. The chip's Undo is enabled only while the stage still shows
  that turn's result.
- **Flash.** The cells a change touched are lit for 1.6s: a ring on the grid
  and a band on the chart's steps (`flash` on the console, `StepEditor` and
  `Stave`). Under reduced motion it is a static highlight for the same time.
- **Attachments.** Photos are downscaled to 1600px JPEG in the browser; PDFs
  up to 5MB go as they are. A MIDI file goes to `POST /api/v1/breaks/import`
  when it is attached and opens on the stage at once, with an undo step. So
  does a BeatBreaker `#b=` or Groove Scribe link in a message, before the
  message is sent. BeatBuddy is told what arrived in a line put ahead of the
  next message (`importNote`). A `/p/` link is left to `open_pattern`.
- **The allowance meter** reads `GET /api/v1/buddy/allowance` when the drawer
  opens and after every turn, and the composer closes at zero.

Not yet: when `open_pattern` opens one of the caller's saved patterns, the
Studio treats it as an edit to the pattern already open rather than switching
to that saved pattern. Saving then saves over the open one, or as new.
Switching needs the pattern-document hook to take an id from a tool result,
and is left for when the evals show people asking for it.
