# Drummer batches

The scripts behind Phase 15-d: rank the 15-a candidates, pick the next
batches, and merge a fork's built drummer into the repo. The method is in
`.context/app/planning/drumming-research.md`, section DC; the fork brief is in
`.context/app/planning/drummer-batches.md`.

Run each from the repo root. They read the repo and write only where noted.

| Script       | Run                                                                                        | What it does                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `rank.py`    | `python3 -I scripts/lineage/batch/rank.py <out.json> [top]`                                | Scores every candidate out of 100, writes them best first to `<out.json>`, prints the top rows.                                           |
| `batches.py` | `python3 -I scripts/lineage/batch/batches.py <out.json> [n]`                               | Adds family, rank and batch to `rank.py`'s output and prints the next `n` batches (default 4).                                            |
| `merge.py`   | `python3 -I scripts/lineage/batch/merge.py [--check] . <drummers> <key> <CONST> '<group>'` | Merges a fork's hand-over from `<drummers>/<key>/`. Checks everything first and writes nothing if any check fails; `--check` only checks. |

Write `<out.json>` to a scratchpad, not the repo. Re-rank after each batch is
merged: the merged drummers drop out, and new songs and influence edges move
the rest.

`polls.json` holds the poll and hall-of-fame lists `rank.py` reads, as read on
2026-10-22: Rolling Stone's 100 (2016), Modern Drummer's Hall of Fame and
Readers Poll wins (1979–2017), and the DownBeat Jazz Hall of Fame. Update it
only when a list itself changes, and note the date.
