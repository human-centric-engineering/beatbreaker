/**
 * The drummer model itself — every record in `data/drummer-model/` — held to
 * the standard (D47).
 *
 * This is the test that replaced the model's `tools/validate.py`. It reads the
 * real files, so a record that breaks a rule fails here, in the gates, rather
 * than in a seed run on a deploy:
 *
 * 1. Every file fits its JSON Schema (Ajv, draft 2020-12). The schemas are the
 *    standard the owner brought; the app's Zod schemas only read a slice.
 * 2. Every record is at the current schema version.
 * 3. The rules a schema cannot say (`checkCorpus`) all hold.
 * 4. **Each drummer is both a record and a style.** Every drummer style in the
 *    catalogue has exactly one record naming it, and every record's
 *    `style_key` names a drummer style. Without this the map and the Studio
 *    drift apart one drummer at a time.
 * 5. The graph the records draw has no loose ends.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

import { buildLineage } from '@/lib/app/lineage/build';
import { checkCorpus } from '@/lib/app/lineage/check';
import { STYLES } from '@/prisma/seeds/app-beatbreaker/data/styles';
import { DRUMMER_MODEL_DIR, readCorpus, readFolder } from '@/scripts/lineage/read-corpus';

const SCHEMA_DIR = join(DRUMMER_MODEL_DIR, 'schema');

function ajv(): Ajv2020 {
  const a = new Ajv2020({ allErrors: true, strict: false });
  addFormats(a);
  for (const f of readdirSync(SCHEMA_DIR)) {
    const schema: unknown = JSON.parse(readFileSync(join(SCHEMA_DIR, f), 'utf-8'));
    a.addSchema(schema as object);
  }
  return a;
}

const SCHEMA_FOR = {
  drummers: 'https://beatbreaker.app/schema/drummer.schema.json',
  recordings: 'https://beatbreaker.app/schema/recording.schema.json',
  styles: 'https://beatbreaker.app/schema/style.schema.json',
  sources: 'https://beatbreaker.app/schema/sources.schema.json',
} as const;

const corpus = readCorpus(DRUMMER_MODEL_DIR);

describe('the drummer model', () => {
  it.each(Object.entries(SCHEMA_FOR))('every file in %s fits its schema', (folder, id) => {
    const validate = ajv().getSchema(id);
    expect(validate, `schema ${id} loaded`).toBeDefined();
    const failures = readFolder(DRUMMER_MODEL_DIR, folder).flatMap(({ file, json }) =>
      validate!(json)
        ? []
        : (validate!.errors ?? []).map((e) => `${file} ${e.instancePath}: ${e.message}`)
    );
    expect(failures).toEqual([]);
  });

  it('holds every record at schema 1.4.0', () => {
    const behind = corpus.drummers
      .filter(({ record }) => record.meta.schema_version !== '1.4.0')
      .map(({ file }) => file);
    expect(behind).toEqual([]);
  });

  it('breaks none of the rules a schema cannot state', () => {
    expect(checkCorpus(corpus)).toEqual([]);
  });

  it('has a record for every drummer style, and a drummer style for every record', () => {
    const drummerStyles = Object.entries(STYLES)
      .filter(([, s]) => s.drummer)
      .map(([key]) => key)
      .sort();
    const named = corpus.drummers.flatMap(({ record }) => record.beatbreaker?.style_key ?? []);

    // sorted, so a style two records claim shows up twice
    expect(named.sort()).toEqual(drummerStyles);
  });

  it('names the drummers the catalogue plays', () => {
    const playable = corpus.drummers
      .filter(({ record }) => record.beatbreaker?.style_key)
      .map(({ record }) => record.meta.id)
      .sort();
    expect(playable).toEqual([
      'drummer:clyde-stubblefield',
      'drummer:john-bonham',
      'drummer:mitch-mitchell',
      'drummer:ringo-starr',
      'drummer:stewart-copeland',
      'drummer:tony-allen',
      'drummer:tony-williams',
      'drummer:yussef-dayes',
    ]);
  });

  describe('the graph it draws', () => {
    const graph = buildLineage(corpus);
    const ids = new Set(graph.nodes.map((n) => n.id));

    it('has a node at both ends of every edge', () => {
      const loose = graph.edges.filter((e) => !ids.has(e.from) || !ids.has(e.to));
      expect(loose).toEqual([]);
    });

    it('has one node per person, and a slug for each', () => {
      const labels = graph.nodes.map(
        (n) => `${n.kind === 'style' ? 'style ' : ''}${n.label.toLowerCase()}`
      );
      const twice = labels.filter((l, i) => labels.indexOf(l) !== i);
      expect(twice).toEqual([]);
      expect(new Set(graph.nodes.map((n) => n.slug)).size).toBe(graph.nodes.length);
    });

    it('marks every modelled drummer as modelled, with the years they were active', () => {
      const modelled = graph.nodes.filter((n) => n.kind === 'drummer' && n.modelled);
      expect(modelled).toHaveLength(corpus.drummers.length);
      expect(modelled.filter((n) => n.activeFrom === null).map((n) => n.id)).toEqual([]);
    });
  });
});
