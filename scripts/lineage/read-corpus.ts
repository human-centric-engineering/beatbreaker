/**
 * Read the drummer model's files from disk.
 *
 * Kept out of `lib/app` so no app code can import the content (D13; the
 * `no-content-imports` test). The seed and the tests are the only readers.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

import { type Corpus, parseCorpus } from '@/lib/app/lineage/corpus';

/** The model's folder, from the repo root. */
export const DRUMMER_MODEL_DIR = join(
  'prisma',
  'seeds',
  'app-beatbreaker',
  'data',
  'drummer-model'
);

/** The folders a corpus is read from, in the order they are read. */
export const CORPUS_FOLDERS = ['drummers', 'recordings', 'styles', 'sources'] as const;

/** Every JSON file in the model, relative to `dir`, sorted — what the seed hashes. */
export function corpusFiles(dir: string): string[] {
  return CORPUS_FOLDERS.flatMap((folder) =>
    readdirSync(join(dir, folder))
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f) => `${folder}/${f}`)
  );
}

/** Each file in one folder, parsed as JSON but not yet checked. */
export function readFolder(dir: string, folder: string): { file: string; json: unknown }[] {
  return readdirSync(join(dir, folder))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const file = `${folder}/${f}`;
      const json: unknown = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
      return { file, json };
    });
}

/** Read and parse the whole model. */
export function readCorpus(dir: string): Corpus {
  return parseCorpus({
    drummers: readFolder(dir, 'drummers'),
    recordings: readFolder(dir, 'recordings'),
    styles: readFolder(dir, 'styles'),
    sources: readFolder(dir, 'sources'),
  });
}
