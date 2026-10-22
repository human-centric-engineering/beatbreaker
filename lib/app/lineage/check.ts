/**
 * The model's rules beyond its JSON Schemas — the checks `tools/validate.py`
 * made, as a pure function the tests and the seed both call.
 *
 * Shape is the schemas' job (Ajv, in the test). This is what a schema cannot
 * say: that ids are unique and resolve, that a recording a drummer lists has
 * them on it, that a pattern's lanes fit its grid, that a masked performer's
 * real identity is not stored, that every rhythmic device cites a source,
 * that a song on a recording is played by someone on it.
 */

import { parseReferenceLink } from '@/lib/app/breaks/links';
import { RELATIONSHIPS } from '@/lib/app/lineage/build';
import type { Corpus } from '@/lib/app/lineage/corpus';
import type { LineageGraph } from '@/lib/app/lineage/types';

const ID = /^(drummer|rec|style|pattern|src|kit|era|trait|lick):[a-z0-9][a-z0-9-]*$/;

/** Strings anywhere in a value that look like model ids. */
function* idsIn(value: unknown): Generator<string> {
  if (typeof value === 'string') {
    if (ID.test(value)) yield value;
  } else if (Array.isArray(value)) {
    for (const v of value) yield* idsIn(v);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) yield* idsIn(v);
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function list(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** The patterns a record defines: a drummer's vocabulary, a style's archetypes. */
function patternsOf(record: Record<string, unknown>): Record<string, unknown>[] {
  const vocab = isRecord(record.vocabulary) ? record.vocabulary : {};
  return [...list(vocab.patterns), ...list(record.archetype_patterns)].filter(isRecord);
}

/**
 * Every rule broken, as messages naming the file. Empty means the corpus is
 * sound.
 */
export function checkCorpus(corpus: Corpus): string[] {
  const errors: string[] = [];
  const defined = new Map<string, string>();
  const define = (id: unknown, file: string) => {
    if (typeof id !== 'string') return;
    const before = defined.get(id);
    if (before) errors.push(`duplicate id ${id} in ${file} and ${before}`);
    defined.set(id, file);
  };

  for (const { file, record } of corpus.drummers) {
    define(record.meta.id, file);
    const vocab = isRecord(record.vocabulary) ? record.vocabulary : {};
    for (const p of list(vocab.patterns)) if (isRecord(p)) define(p.id, file);
    for (const l of list(vocab.licks_described)) if (isRecord(l)) define(l.id, file);
    for (const key of ['equipment', 'eras', 'signature_traits'] as const) {
      for (const x of list(record[key])) if (isRecord(x)) define(x.id, file);
    }
  }
  for (const { file, record } of corpus.recordings) define(record.id, file);
  for (const { file, record } of corpus.styles) {
    define(record.id, file);
    for (const p of list(record.archetype_patterns)) if (isRecord(p)) define(p.id, file);
  }
  for (const { file, record } of corpus.sources) define(record.id, file);

  /* A reference to a drummer nobody has modelled yet is allowed: it becomes a
     stub on the map, and the list of them is the to-do list. Anything else
     must resolve. */
  const all = [...corpus.drummers, ...corpus.recordings, ...corpus.styles];
  for (const { file, record } of all) {
    for (const ref of idsIn(record)) {
      if (!defined.has(ref) && !ref.startsWith('drummer:')) {
        errors.push(`${file}: unresolved reference ${ref}`);
      }
    }
  }

  const recordings = new Map(corpus.recordings.map(({ record }) => [record.id, record]));
  for (const { file, record } of corpus.drummers) {
    for (const rid of record.key_recording_ids ?? []) {
      const rec = recordings.get(rid);
      if (rec && !rec.drum_performances.some((p) => p.drummer_id === record.meta.id)) {
        errors.push(`${file}: ${rid} has no drum_performance for ${record.meta.id}`);
      }
    }
  }

  /* The builder skips a relationship type it has no direction for, so one the
     schema gains before `RELATIONSHIPS` does would vanish from the map. */
  for (const { file, record } of corpus.drummers) {
    for (const r of record.relationships ?? []) {
      if (!(r.type in RELATIONSHIPS)) {
        errors.push(`${file}: relationship type ${r.type} has no entry in RELATIONSHIPS`);
      }
    }
  }

  for (const { file, record } of corpus.drummers) {
    const identity: Record<string, unknown> = record.identity;
    const persona = isRecord(identity.persona) ? identity.persona : {};
    if (persona.real_identity_policy === 'private_do_not_research') {
      for (const f of ['full_name', 'born', 'died']) {
        if (f in identity)
          errors.push(`${file}: identity.${f} must not be stored for a private persona`);
      }
    }
  }

  const sources = new Set(corpus.sources.map(({ record }) => record.id));
  /* A device is a claim about how someone plays: it cites a source (D56), and
     a cross-rhythm says which one. That it resolves is the reference rule's. */
  for (const { file, record } of corpus.drummers) {
    const devices = record.technique_profile?.coordination?.devices ?? [];
    for (const [i, d] of devices.entries()) {
      const name = `${file} devices[${i}] (${d.kind})`;
      const cited = d.evidence?.source_ids ?? [];
      if (cited.length === 0) errors.push(`${name}: cites no source`);
      /* The builder resolves these against the registry alone, so a pattern
         or recording id here would resolve, then vanish from the citation. */
      for (const id of cited) {
        if (!sources.has(id)) errors.push(`${name}: ${id} is not in the source registry`);
      }
      if ((d.kind === 'cross-rhythm' || d.kind === 'hemiola') && !d.ratio) {
        errors.push(`${name}: a ${d.kind} needs its ratio`);
      }
    }
  }

  /* What puts a drummer on the long list is a sourced contribution (D72). A
     candidate must have one, and its sources must be ones the registry can
     cite; an id that resolves to nothing is already named above. */
  for (const { file, record } of corpus.drummers) {
    const cited = record.legacy?.contribution?.evidence?.source_ids ?? [];
    if (record.meta.record_status === 'candidate' && cited.length === 0) {
      errors.push(`${file}: a candidate needs a contribution that cites a source`);
    }
    for (const id of cited) {
      if (defined.has(id) && !sources.has(id)) {
        errors.push(`${file} contribution: ${id} is not in the source registry`);
      }
    }
  }

  /* A song on the index (15-b, D73): played by someone on the record, a line
     on its drums that cites the registry, and links stored as the provider's
     own address rebuilt from the id, the shape `parseReferenceLink` gives. */
  const styleKeys = new Map(
    corpus.drummers.flatMap(({ record }) =>
      record.beatbreaker?.style_key ? [[record.meta.id, record.beatbreaker.style_key]] : []
    )
  );
  for (const { file, record } of corpus.recordings) {
    const playing = new Set(record.drum_performances.map((p) => p.drummer_id));
    const titles = new Set<string>();
    for (const t of record.tracks ?? []) {
      const name = `${file} track "${t.title}"`;
      const folded = t.title.toLowerCase();
      if (titles.has(folded)) errors.push(`${name}: listed twice`);
      titles.add(folded);
      for (const d of t.drummer_ids) {
        if (!playing.has(d)) errors.push(`${name}: ${d} has no drum_performance on the recording`);
      }
      const cited = t.drums.evidence?.source_ids ?? [];
      if (cited.length === 0) errors.push(`${name}: the line on the drums cites no source`);
      for (const id of cited) {
        if (!sources.has(id)) errors.push(`${name}: ${id} is not in the source registry`);
      }
      for (const [provider, url] of [
        ['spotify', t.spotify],
        ['youtube', t.youtube],
      ] as const) {
        if (url === undefined) continue;
        const link = parseReferenceLink(url);
        if (link?.provider !== provider || link.canonicalUrl !== url) {
          errors.push(`${name}: ${provider} link ${url} is not one parseReferenceLink rebuilds`);
        }
      }
      if (t.song_key !== undefined) {
        const own = t.drummer_ids.map((d) => styleKeys.get(d));
        if (t.style_key === undefined || !own.includes(t.style_key)) {
          errors.push(`${name}: song_key needs the style_key of a drummer on it`);
        }
      } else if (t.style_key !== undefined || t.also_song_keys !== undefined) {
        errors.push(`${name}: style_key or also_song_keys without a song_key`);
      }
    }
  }

  for (const { file, record } of [...corpus.drummers, ...corpus.styles]) {
    for (const p of patternsOf(record)) errors.push(...checkPattern(file, p));
  }

  return errors;
}

/** A pattern's lanes against its grid, and its clave against its lanes. */
function checkPattern(file: string, p: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const name = `${file} ${String(p.id)}`;
  const ts = isRecord(p.time_signature) ? p.time_signature : {};
  const numerator = typeof ts.numerator === 'number' ? ts.numerator : 0;
  const perBeat = typeof p.steps_per_beat === 'number' ? p.steps_per_beat : 0;
  const bars = typeof p.bars === 'number' ? p.bars : 0;
  const steps = numerator * perBeat;
  const lanes = isRecord(p.lanes) ? p.lanes : {};

  for (const [inst, lane] of Object.entries(lanes)) {
    if (typeof lane !== 'string') continue;
    const split = lane.split('|');
    if (split.length !== bars)
      errors.push(`${name} ${inst}: ${split.length} bars, expected ${bars}`);
    for (const bar of split) {
      if (bar.length !== steps)
        errors.push(`${name} ${inst}: bar length ${bar.length}, expected ${steps}`);
    }
  }
  if (
    typeof p.sticking_lane === 'string' &&
    p.sticking_lane.replace(/\|/g, '').length !== steps * bars
  ) {
    errors.push(`${name}: sticking_lane length mismatch`);
  }

  const clave = isRecord(p.clave) ? p.clave : {};
  const carrier = clave.carried_by;
  if (typeof carrier === 'string' && !(carrier in lanes)) {
    const onEvents = list(p.events).some((e) => isRecord(e) && e.instrument === carrier);
    if (!onEvents) errors.push(`${name}: clave carried_by ${carrier} has no lane or events`);
  }

  const fidelity = typeof p.fidelity === 'string' ? p.fidelity : '';
  const status = isRecord(p.transcription) ? p.transcription.status : undefined;
  if (fidelity.startsWith('transcribed') && status !== 'verified') {
    errors.push(`${name}: fidelity says transcribed but status is ${String(status)}`);
  }
  return errors;
}

/** The longest id or slug the `lineage_*` columns hold. */
const MAX_KEY = 120;

/**
 * What the built graph must be before it is written: every slug unique (the
 * column is), every id and slug short enough for its column, and no edge from
 * a node to itself. Caught here so the seed names the nodes rather than
 * failing on a database constraint mid-transaction.
 */
export function checkGraph(graph: LineageGraph): string[] {
  const errors: string[] = [];
  const bySlug = new Map<string, string>();
  for (const n of graph.nodes) {
    const other = bySlug.get(n.slug);
    if (other) errors.push(`slug ${n.slug} is both ${other} and ${n.id}`);
    bySlug.set(n.slug, n.id);
    if (n.id.length > MAX_KEY || n.slug.length > MAX_KEY) {
      errors.push(`${n.id}: id or slug longer than ${MAX_KEY} characters`);
    }
  }
  for (const e of graph.edges) {
    if (e.from === e.to) errors.push(`${e.from}: an edge (${e.relation}) to itself`);
  }
  return errors;
}
