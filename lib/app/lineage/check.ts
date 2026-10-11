/**
 * The model's rules beyond its JSON Schemas — the checks `tools/validate.py`
 * made, as a pure function the tests and the seed both call.
 *
 * Shape is the schemas' job (Ajv, in the test). This is what a schema cannot
 * say: that ids are unique and resolve, that a recording a drummer lists has
 * them on it, that a pattern's lanes fit its grid, that a masked performer's
 * real identity is not stored.
 */

import type { Corpus } from '@/lib/app/lineage/corpus';

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
