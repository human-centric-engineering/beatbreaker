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

// Classic LCS-based line diff. O(n*m) memory + time — fine for typical
// cleanup-doc sizes (a few hundred lines). For very large docs the drawer
// is paginated; this only renders the diff for one selected revision at a
// time.
function diffLines(before: string, after: string): Op[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const m = a.length;
  const n = b.length;

  // LCS table
  const lcs: number[][] = Array.from({ length: m + 1 }, (): number[] =>
    new Array<number>(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      lcs[i][j] =
        a[i - 1] === b[j - 1] ? lcs[i - 1][j - 1] + 1 : Math.max(lcs[i - 1][j], lcs[i][j - 1]);
    }
  }

  // Backtrack to produce ops
  const ops: Op[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      ops.unshift({ type: 'equal', line: a[i - 1] });
      i--;
      j--;
    } else if (lcs[i - 1][j] >= lcs[i][j - 1]) {
      ops.unshift({ type: 'del', line: a[i - 1] });
      i--;
    } else {
      ops.unshift({ type: 'add', line: b[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    ops.unshift({ type: 'del', line: a[i - 1] });
    i--;
  }
  while (j > 0) {
    ops.unshift({ type: 'add', line: b[j - 1] });
    j--;
  }
  return ops;
}

export function TextDiffViewer({ before, after }: TextDiffViewerProps) {
  const ops = diffLines(before, after);
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
