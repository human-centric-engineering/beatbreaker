/** Fixtures for BeatBuddy's tools and workspace (Phase 7). */

import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import type { CapabilityResult } from '@/lib/orchestration/capabilities/types';
import { resolveLanes } from '@/lib/app/breaks/pattern';
import type { SharePayload } from '@/lib/app/breaks/schema';
import { breakPayload } from '@/lib/app/breaks/share';
import { styleIn } from '@/lib/app/breaks/styles';
import { testStyle } from '@/tests/helpers/catalogue';

/** A real funk break as a workspace document: seeded, so every run gets the same notes. */
export function funkPayload(seed = 424242): SharePayload {
  const funk = testStyle('funk');
  const roster = resolveLanes(styleIn(funk.params, '4/4'), null);
  const A = generatePattern({
    style: funk,
    meter: '4/4',
    bars: 2,
    density: 55,
    ghosts: 60,
    seed,
    lanes: roster.lanes,
    perc: roster.perc,
  });
  return breakPayload({
    bpm: 94,
    swing: 0,
    level: 5,
    arrangement: ['A', 'A', 'B', 'A'],
    A,
    B: deriveB(A, funk.params),
  });
}

interface WorkspaceRow {
  userId: string;
  doc: unknown;
  rev: number;
}

/**
 * An in-memory `prisma.buddyWorkspace` that applies `where.userId` and
 * `where.rev` the way the database would. A `mockResolvedValue(row)` would hand
 * back the row whoever asked, so a test that one user never sees another's
 * workspace would pass with the owner filter deleted; this one would not.
 */
export type FakeWorkspaceTable = ReturnType<typeof fakeWorkspaceTable>;

export function fakeWorkspaceTable(rows: WorkspaceRow[] = []) {
  const table = new Map(rows.map((r) => [r.userId, { ...r }]));
  return {
    rows: table,
    findUnique: async ({ where }: { where: { userId: string } }) => {
      const row = table.get(where.userId);
      return row ? { doc: row.doc, rev: row.rev } : null;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { userId: string; rev: number };
      data: { doc: unknown; rev: { increment: number } };
    }) => {
      const row = table.get(where.userId);
      if (!row || row.rev !== where.rev) return { count: 0 };
      row.doc = data.doc;
      row.rev += data.rev.increment;
      return { count: 1 };
    },
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { userId: string };
      create: { userId: string; doc: unknown };
      update: { doc: unknown; rev: { increment: number } };
    }) => {
      const row = table.get(where.userId);
      if (!row) {
        table.set(create.userId, { userId: create.userId, doc: create.doc, rev: 0 });
        return { rev: 0 };
      }
      row.doc = update.doc;
      row.rev += update.rev.increment;
      return { rev: row.rev };
    },
  };
}

/** One message in a fake transcript: who sent it, to which agent, when. */
export interface MessageRow {
  userId: string;
  agentSlug: string;
  role: 'user' | 'assistant' | 'tool';
  createdAt: Date;
}

type MessageCountWhere = {
  role: string;
  createdAt: { gte: Date };
  conversation: { userId: string; agent: { slug: string } };
};

/**
 * An in-memory `prisma.aiMessage.count` that applies the allowance query's
 * filters the way the database would — owner, agent, role and day — so a test
 * that another person's turns, another agent's turns or yesterday's turns are
 * not counted fails if the filter goes.
 */
export function fakeMessageTable(rows: MessageRow[]) {
  return {
    rows,
    count: async ({ where }: { where: MessageCountWhere }) =>
      rows.filter(
        (m) =>
          m.role === where.role &&
          m.createdAt >= where.createdAt.gte &&
          m.userId === where.conversation.userId &&
          m.agentSlug === where.conversation.agent.slug
      ).length,
  };
}

/** `n` BeatBuddy turns by `userId`, a minute apart, starting at `from`. */
export function buddyTurns(userId: string, n: number, from: Date): MessageRow[] {
  return Array.from({ length: n }, (_, i) => ({
    userId,
    agentSlug: 'beatbuddy',
    role: 'user' as const,
    createdAt: new Date(from.getTime() + i * 60_000),
  }));
}

/** A tool result's data, or a thrown error naming the failure — so a test reads the data without narrowing. */
export function dataOf<T>(result: CapabilityResult<T>): T {
  if (!result.success || result.data === undefined) {
    throw new Error(`expected success, got ${JSON.stringify(result.error)}`);
  }
  return result.data;
}

/** One saved pattern in a fake `Break` table. */
export interface BreakRow {
  id: string;
  userId: string;
  title: string;
  style: string;
  meter: string;
  bpm: number;
  visibility: 'private' | 'link' | 'published';
  slug: string | null;
  doc: unknown;
  updatedAt: Date;
}

type Where = Record<string, unknown>;

/** Does `row` satisfy a Prisma-style `where` — equality, `in`, `contains`, `not`, `OR`? */
function matchesWhere(row: Record<string, unknown>, where: Where): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return (cond as Where[]).some((w) => matchesWhere(row, w));
    const value = row[key];
    if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
      const c = cond as { in?: unknown[]; contains?: string; not?: unknown };
      if (c.in) return c.in.includes(value);
      if (c.contains !== undefined)
        return String(value).toLowerCase().includes(c.contains.toLowerCase());
      if ('not' in c) return value !== c.not;
      return true;
    }
    return value === cond;
  });
}

function pick(row: Record<string, unknown>, select?: Record<string, unknown>) {
  if (!select) return { ...row };
  return Object.fromEntries(Object.keys(select).map((k) => [k, row[k]]));
}

/**
 * An in-memory `prisma.break` that applies `where` the way the database
 * would — owner, visibility, slug, title search — so a test that one user
 * cannot reach another's private pattern fails if the filter goes.
 */
export function fakeBreakTable(rows: BreakRow[] = []) {
  const table = rows.map((r) => ({ ...r }));
  let next = table.length;
  return {
    rows: table,
    findMany: async ({
      where,
      select,
      take,
    }: {
      where: Where;
      select?: Record<string, unknown>;
      take?: number;
    }) =>
      table
        .filter((r) => matchesWhere(r as unknown as Record<string, unknown>, where))
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, take ?? table.length)
        .map((r) => pick(r as unknown as Record<string, unknown>, select)),
    findFirst: async ({
      where,
      select,
      include,
    }: {
      where: Where;
      select?: Record<string, unknown>;
      include?: Record<string, unknown>;
    }) => {
      const row = table.find((r) => matchesWhere(r as unknown as Record<string, unknown>, where));
      if (!row) return null;
      const out = pick(row, select);
      return include?.takes ? { ...out, takes: [] } : out;
    },
    create: async ({
      data,
      select,
    }: {
      data: Record<string, unknown>;
      select?: Record<string, unknown>;
    }) => {
      const row = { id: `break-${++next}`, updatedAt: new Date(), slug: null, ...data };
      table.push(row as unknown as BreakRow);
      return pick(row, select);
    },
  };
}
