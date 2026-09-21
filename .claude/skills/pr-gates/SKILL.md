---
name: pr-gates
description: |
  Run the four pre-PR gates on the current branch, in order: `/pre-pr`,
  `/security-review`, `/code-review`, `npm run format`. Use when a branch is
  built and looked at and the user wants it gated before opening a PR — "run
  the gates", "gate this branch", "is this ready for a PR". Stops at the first
  gate that fails rather than reviewing a tree that does not validate.
---

# PR Gates

Runs the gates from CLAUDE.md's **Gates** section, in that order — the three
reviews through the Skill tool, then the formatter. This skill sequences them;
it does not restate them. What each gate checks lives in the gate itself, and
what to do with a finding lives in `flow.gates` and `flow.review-rounds` in
`hub://process/core` — read those if the Hub is reachable.

## Steps

### 1. `/pre-pr`

Invoke the `pre-pr` skill. It runs `npm run validate`, the scoped test run with
per-file coverage, and the anti-pattern scans.

Judge it by **exit codes**, not by piped output. If any check fails, **stop
here**: report the failure and do not run gates 2–4. A security or code review
of a tree that does not type-check or pass its tests is wasted, and its
findings go stale the moment the fix lands.

### 2. `/security-review`

Invoke the `security-review` skill on the pending changes. Record its findings.
Do not stop on findings — carry on to gate 3 so the user sees both reviews
together.

### 3. `/code-review`

Invoke the `code-review` skill against the current branch diff. Pass through any
level or flags the user gave this skill (e.g. `/pr-gates high`); otherwise
invoke it with no arguments.

### 4. `npm run format`

Run `npm run format` and check its exit code. It runs last so it formats the
tree as it will be committed. Then run `git status --short` and report which
files it rewrote, if any — those changes are uncommitted and the user needs to
know they exist before opening the PR.

## Report

End with one short table, then the findings grouped by gate:

| Gate               | Result                                     |
| ------------------ | ------------------------------------------ |
| `/pre-pr`          | pass / fail (what failed)                  |
| `/security-review` | N findings / clean / not run               |
| `/code-review`     | N findings / clean / not run               |
| `npm run format`   | clean / N files rewritten / fail / not run |

A gate that did not run says **not run** and why — never leave it blank or imply
it passed.

## Rules

- **Do not fix findings.** This skill reports. Applying fixes, re-running
  gates, and deciding when review rounds stop are the user's call under
  `flow.review-rounds`. The formatter's own rewrites are the one exception —
  they are the gate.
- **Do not commit or open the PR.** That comes after the gates, and is the
  user's call.
- **Do not amend or skip a gate** to get a clean table.
