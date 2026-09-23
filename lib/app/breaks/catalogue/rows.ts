import {
  kitEngineSchema,
  kitParamsSchema,
  kitSamplesSchema,
  styleParamsSchema,
} from '@/lib/app/breaks/catalogue/schemas';
import type {
  CatalogueEntry,
  CatalogueKit,
  CatalogueLibrary,
  CatalogueStyle,
} from '@/lib/app/breaks/catalogue/types';
import { packedPatternSchema } from '@/lib/app/breaks/schema';

/**
 * Database rows, turned into the shapes the domain and the clients use — and
 * **validated on the way out**.
 *
 * Reading through the schema, not just writing through it, is the part that is
 * easy to argue out of. The argument against is that the write path already
 * checked; the answer is that the write path that checked may not be the write
 * path that wrote. A row can predate the current bounds, arrive from a restored
 * backup, or be set by hand at a psql prompt during an incident. Any of those
 * puts an unbounded weight table in front of the generator, which is a hang
 * rather than an error message.
 *
 * A row that fails is **dropped from the list, not thrown**: one bad style
 * should cost you that style, not the whole picker. The caller logs it.
 */

/** The row shape these take, structurally — so tests need no Prisma client. */
export interface StyleRow {
  key: string;
  group: string;
  currentVersion: number;
  versions: Array<{ id: string; version: number; params: unknown }>;
}

export interface KitRow {
  key: string;
  engine: string;
  label: string;
  hint: string;
  group: string;
  credit: string | null;
  params: unknown;
  samples: unknown;
}

export interface LibraryRow {
  key: string;
  title: string;
  description: string;
  entries: Array<{
    id: string;
    group: string;
    title: string;
    artist: string;
    note: string | null;
    bpm: number;
    styleKey: string;
    styleVersionId: string | null;
    meter: string;
    doc: unknown;
  }>;
}

/** What a row was rejected for, so the caller can log something useful. */
export interface RowProblem {
  what: 'style' | 'kit' | 'entry';
  key: string;
  reason: string;
}

export interface Converted<T> {
  rows: T[];
  problems: RowProblem[];
}

/**
 * A style row at one of its versions.
 *
 * Defaults to `currentVersion` — what a new pattern is generated from. A
 * pattern that names an older version resolves against that one instead, which
 * is the whole point of versions being immutable.
 */
export function toStyle(row: StyleRow, version?: number): CatalogueStyle | RowProblem {
  const want = version ?? row.currentVersion;
  const v = row.versions.find((x) => x.version === want);
  if (!v) return { what: 'style', key: row.key, reason: `no version ${want}` };

  const parsed = styleParamsSchema.safeParse(v.params);
  if (!parsed.success) {
    return { what: 'style', key: row.key, reason: issue(parsed.error) };
  }
  return {
    key: row.key,
    group: row.group,
    versionId: v.id,
    version: v.version,
    params: parsed.data,
  };
}

export function toStyles(rows: StyleRow[]): Converted<CatalogueStyle> {
  return partition(rows.map((r) => toStyle(r)));
}

export function toKit(row: KitRow): CatalogueKit | RowProblem {
  const params = kitParamsSchema.safeParse(row.params);
  if (!params.success) return { what: 'kit', key: row.key, reason: issue(params.error) };
  const samples = kitSamplesSchema.safeParse(row.samples ?? {});
  if (!samples.success) return { what: 'kit', key: row.key, reason: issue(samples.error) };

  /* `engine` is a column rather than a database enum, so a value outside the
     four is possible — a hand-written row, or a fork that added an engine and
     then removed it. Anything unrecognised reads as `synth`, which is what a
     kit with no engine named has always meant. */
  const engine = kitEngineSchema.safeParse(row.engine);

  const kit: CatalogueKit = {
    key: row.key,
    label: row.label,
    hint: row.hint,
    group: row.group,
    engine: engine.success ? engine.data : 'synth',
    credit: row.credit ?? undefined,
    samples: samples.data,
    ...params.data,
  };
  return kit;
}

export function toKits(rows: KitRow[]): Converted<CatalogueKit> {
  return partition(rows.map(toKit));
}

export function toLibrary(row: LibraryRow): { library: CatalogueLibrary; problems: RowProblem[] } {
  const problems: RowProblem[] = [];
  const entries: CatalogueEntry[] = [];

  for (const e of row.entries) {
    const doc = packedPatternSchema.safeParse(e.doc);
    if (!doc.success) {
      problems.push({ what: 'entry', key: `${row.key}/${e.title}`, reason: issue(doc.error) });
      continue;
    }
    entries.push({
      id: e.id,
      group: e.group,
      title: e.title,
      artist: e.artist,
      note: e.note,
      bpm: e.bpm,
      styleKey: e.styleKey,
      styleVersionId: e.styleVersionId,
      meter: e.meter,
      doc: doc.data,
    });
  }

  return {
    library: { key: row.key, title: row.title, description: row.description, entries },
    problems,
  };
}

/** The first thing wrong with a row, as one line. */
function issue(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string {
  const first = error.issues[0];
  if (!first) return 'invalid';
  const path = first.path.map(String).join('.');
  return path ? `${path}: ${first.message}` : first.message;
}

function isProblem<T>(v: T | RowProblem): v is RowProblem {
  return typeof v === 'object' && v !== null && 'reason' in v && 'what' in v;
}

function partition<T>(results: Array<T | RowProblem>): Converted<T> {
  const rows: T[] = [];
  const problems: RowProblem[] = [];
  for (const r of results) {
    if (isProblem(r)) problems.push(r);
    else rows.push(r);
  }
  return { rows, problems };
}

/** `[heading, keys]` in row order — what the style picker is built from. */
export function styleGroupsOf(styles: CatalogueStyle[]): Array<[string, string[]]> {
  const out = new Map<string, string[]>();
  for (const s of styles) {
    const list = out.get(s.group);
    if (list) list.push(s.key);
    else out.set(s.group, [s.key]);
  }
  return [...out.entries()];
}
