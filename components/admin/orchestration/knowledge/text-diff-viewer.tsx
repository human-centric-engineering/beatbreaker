'use client';

// Line-oriented text diff renderer for the Document Clean Up revision
// drawer. No external library — the codebase has no `diff` package and
// LCS-based unified diff is small enough to inline. Modelled on the JSON
// diff component at workflows/version-diff-viewer.tsx.

interface TextDiffViewerProps {
  before: string;
  after: string;
}

type Op = { type: 'equal' | 'add' | 'del'; line: string };

// Cap on the changed span each side may contribute to the LCS table. The
// table is (m+1)·(n+1) numbers, so an uncapped whole-document diff on a
// cleanup-sized doc (up to ~100k tokens ≈ 5–10k lines) allocates tens of
// millions of slots and hangs or OOMs the tab. Past this we say so instead.
const MAX_DIFF_LINES = 1_500;

// Classic LCS-based line diff, bounded. Returns null when the changed span
// is too large to diff inline — the caller renders a notice instead.
function diffLines(before: string, after: string): Op[] | null {
  const a = before.split('\n');
  const b = after.split('\n');

  // Identical input: the revision drawer's preview deliberately passes the
  // same string on both sides, and there is no point building a table to
  // discover every line is unchanged.
  if (before === after) return a.map((line): Op => ({ type: 'equal', line }));

  // Trim the common prefix and suffix before building the table. A section
  // rewrite changes a handful of lines in an otherwise untouched document,
  // so this collapses a whole-document table into one over the changed span.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  if (midA.length > MAX_DIFF_LINES || midB.length > MAX_DIFF_LINES) return null;

  const m = midA.length;
  const n = midB.length;

  // LCS table over the changed span only
  const lcs: number[][] = Array.from({ length: m + 1 }, (): number[] =>
    new Array<number>(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      lcs[i][j] =
        midA[i - 1] === midB[j - 1]
          ? lcs[i - 1][j - 1] + 1
          : Math.max(lcs[i - 1][j], lcs[i][j - 1]);
    }
  }

  // Backtrack to produce ops
  const ops: Op[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (midA[i - 1] === midB[j - 1]) {
      ops.unshift({ type: 'equal', line: midA[i - 1] });
      i--;
      j--;
    } else if (lcs[i - 1][j] >= lcs[i][j - 1]) {
      ops.unshift({ type: 'del', line: midA[i - 1] });
      i--;
    } else {
      ops.unshift({ type: 'add', line: midB[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    ops.unshift({ type: 'del', line: midA[i - 1] });
    i--;
  }
  while (j > 0) {
    ops.unshift({ type: 'add', line: midB[j - 1] });
    j--;
  }

  // Re-attach the untouched prefix / suffix as equal context.
  for (let k = start - 1; k >= 0; k--) ops.unshift({ type: 'equal', line: a[k] });
  for (let k = endA; k < a.length; k++) ops.push({ type: 'equal', line: a[k] });
  return ops;
}

export function TextDiffViewer({ before, after }: TextDiffViewerProps) {
  const ops = diffLines(before, after);
  if (ops === null) {
    const beforeLines = before.split('\n').length;
    const afterLines = after.split('\n').length;
    return (
      <div className="bg-muted/20 text-muted-foreground rounded-md border p-3 text-xs">
        <p className="text-foreground font-medium">Too much changed to diff inline.</p>
        <p className="mt-1">
          {beforeLines.toLocaleString()} lines before, {afterLines.toLocaleString()} after — more
          than {MAX_DIFF_LINES.toLocaleString()} changed lines on one side. Accept or reject on the
          instructions above, or refine section by section so each change stays reviewable.
        </p>
      </div>
    );
  }
  return (
    <pre className="bg-muted/20 overflow-auto rounded-md border p-3 font-mono text-xs leading-relaxed">
      {ops.map((op, idx) => {
        const prefix = op.type === 'add' ? '+ ' : op.type === 'del' ? '- ' : '  ';
        const cls =
          op.type === 'add'
            ? 'bg-emerald-100/60 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200'
            : op.type === 'del'
              ? 'bg-red-100/60 text-red-900 dark:bg-red-900/30 dark:text-red-200'
              : 'text-muted-foreground';
        return (
          <div key={idx} className={`whitespace-pre-wrap ${cls}`}>
            {prefix}
            {op.line || ' '}
          </div>
        );
      })}
    </pre>
  );
}
