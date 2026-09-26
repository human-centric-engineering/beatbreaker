/**
 * An in-memory `sample` and `kit` table for the your-sounds route tests (D20).
 *
 * The routes' data layers (`lib/app/breaks/samples/data.ts`, `kits.ts`) run
 * for real over this, because what is under test is what the tables END UP
 * holding — the quota counted against the rows that are there, a slot cleared
 * when its sample goes, a failed write leaving no row. A stub returning canned
 * rows would only assert itself.
 *
 * It models the `where` shapes those two files use and nothing more; a query
 * it does not understand throws, so a change to the data layer fails loudly
 * here rather than quietly matching everything. `$transaction` runs the
 * callback against the same store and does not roll back — no code under test
 * relies on a rollback, because a refused upload throws before it writes.
 *
 * Use it from `vi.mock('@/lib/db/client', ...)` via {@link fakePrisma}, and
 * call {@link resetYourSoundsDb} in `beforeEach`.
 */

import { vi } from 'vitest';

export interface SampleRecord {
  id: string;
  userId: string;
  name: string;
  slot: string;
  bytes: number;
  durationMs: number;
  storageKey: string;
  createdAt: Date;
}

export interface KitRecord {
  id: string;
  key: string;
  ownerId: string | null;
  engine: string;
  label: string;
  hint: string;
  group: string;
  params: unknown;
  samples: unknown;
  visibility: string;
  createdAt: Date;
}

export const db = { samples: [] as SampleRecord[], kits: [] as KitRecord[] };

let seq = 0;
/** A CUID-shaped id, distinct per call, so the routes' id schema accepts it. */
export function nextId(): string {
  seq += 1;
  return `c${seq.toString(36).padStart(8, '0')}000000000000000`.slice(0, 25);
}

export function resetYourSoundsDb(): void {
  db.samples = [];
  db.kits = [];
}

function pick<T extends object>(row: T, select?: Record<string, boolean>): Partial<T> {
  if (!select) return { ...row };
  const out: Partial<T> = {};
  for (const [k, on] of Object.entries(select)) {
    if (on) (out as Record<string, unknown>)[k] = (row as Record<string, unknown>)[k];
  }
  return out;
}

type Where = Record<string, unknown>;

function matches(row: object, where: Where = {}): boolean {
  const r = row as Record<string, unknown>;
  for (const [k, cond] of Object.entries(where)) {
    if (cond && typeof cond === 'object' && 'in' in cond) {
      if (!(cond as { in: unknown[] }).in.includes(r[k])) return false;
    } else if (cond && typeof cond === 'object') {
      throw new Error(`your-sounds-db: unsupported where on ${k}: ${JSON.stringify(cond)}`);
    } else if (r[k] !== cond) return false;
  }
  return true;
}

function byCreated<T extends { createdAt: Date }>(rows: T[], orderBy?: unknown): T[] {
  const dir = (orderBy as { createdAt?: 'asc' | 'desc' } | undefined)?.createdAt;
  if (!dir) return rows;
  return [...rows].sort((a, b) =>
    dir === 'asc'
      ? a.createdAt.getTime() - b.createdAt.getTime()
      : b.createdAt.getTime() - a.createdAt.getTime()
  );
}

let tick = 0;
function now(): Date {
  tick += 1;
  return new Date(Date.UTC(2026, 8, 26, 12, 0, tick));
}

type Args = { where?: Where; select?: Record<string, boolean>; orderBy?: unknown; data?: object };

export const fakePrisma = {
  sample: {
    aggregate: vi.fn(async ({ where }: Args) => {
      const rows = db.samples.filter((s) => matches(s, where));
      return {
        _count: { _all: rows.length },
        _sum: { bytes: rows.length ? rows.reduce((n, s) => n + s.bytes, 0) : null },
      };
    }),
    findMany: vi.fn(async ({ where, select, orderBy }: Args) =>
      byCreated(
        db.samples.filter((s) => matches(s, where)),
        orderBy
      ).map((s) => pick(s, select))
    ),
    findFirst: vi.fn(async ({ where, select }: Args) => {
      const row = db.samples.find((s) => matches(s, where));
      return row ? pick(row, select) : null;
    }),
    create: vi.fn(async ({ data, select }: Args) => {
      const row = { id: nextId(), createdAt: now(), ...data } as SampleRecord;
      db.samples.push(row);
      return pick(row, select);
    }),
    delete: vi.fn(async ({ where }: Args) => {
      const i = db.samples.findIndex((s) => matches(s, where));
      if (i < 0) throw new Error('your-sounds-db: delete of a missing sample');
      return db.samples.splice(i, 1)[0];
    }),
  },
  kit: {
    findMany: vi.fn(async ({ where, select, orderBy }: Args) =>
      byCreated(
        db.kits.filter((k) => matches(k, where)),
        orderBy
      ).map((k) => pick(k, select))
    ),
    findFirst: vi.fn(async ({ where, select }: Args) => {
      const row = db.kits.find((k) => matches(k, where));
      return row ? pick(row, select) : null;
    }),
    count: vi.fn(async ({ where }: Args) => db.kits.filter((k) => matches(k, where)).length),
    create: vi.fn(async ({ data, select }: Args) => {
      const row = { id: nextId(), createdAt: now(), ...data } as KitRecord;
      db.kits.push(row);
      return pick(row, select);
    }),
    update: vi.fn(async ({ where, data, select }: Args) => {
      const row = db.kits.find((k) => matches(k, where));
      if (!row) throw new Error('your-sounds-db: update of a missing kit');
      Object.assign(row, data);
      return pick(row, select);
    }),
    deleteMany: vi.fn(async ({ where }: Args) => {
      const before = db.kits.length;
      db.kits = db.kits.filter((k) => !matches(k, where));
      return { count: before - db.kits.length };
    }),
  },
  $executeRaw: vi.fn(async () => 1),
  $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(fakePrisma)),
};

/** A sample row, as if uploaded earlier. */
export function seedSample(userId: string, over: Partial<SampleRecord> = {}): SampleRecord {
  const id = over.id ?? nextId();
  const row: SampleRecord = {
    id,
    userId,
    name: 'kick.wav',
    slot: 'k',
    bytes: 1000,
    durationMs: 500,
    storageKey: `samples/${userId}/${id}.wav`,
    createdAt: now(),
    ...over,
  };
  db.samples.push(row);
  return row;
}

/** A kit of someone's, as if created earlier; `slots` is slot → sample id. */
export function seedKit(
  ownerId: string,
  slots: Record<string, string> = {},
  over: Partial<KitRecord> = {}
): KitRecord {
  const id = over.id ?? nextId();
  const row: KitRecord = {
    id,
    key: `yours-${id}`,
    ownerId,
    engine: 'user',
    label: 'My kit',
    hint: '',
    group: 'Your kits',
    params: {},
    samples: {
      slots: Object.fromEntries(
        Object.entries(slots).map(([slot, sid]) => [slot, { v: null, files: [sid] }])
      ),
    },
    visibility: 'private',
    createdAt: now(),
    ...over,
  };
  db.kits.push(row);
  return row;
}
