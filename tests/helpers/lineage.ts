/**
 * Small drummer-model fixtures for the lineage tests: just enough record to
 * parse, with the parts a test is about passed in.
 */

import { type Corpus, parseCorpus } from '@/lib/app/lineage/corpus';

export function drummer(
  slug: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    meta: { id: `drummer:${slug}`, schema_version: '1.5.0', record_status: 'draft' },
    identity: { name: slug.replace(/-/g, ' '), active: { from: 1960 } },
    style_profile: { genres: [{ style_id: 'style:funk', weight: 1 }] },
    feel_profile: {},
    vocabulary: { patterns: [] },
    ...extra,
  };
}

export function recording(slug: string, drummers: string[]): Record<string, unknown> {
  return {
    id: `rec:${slug}`,
    title: slug,
    artist: 'Someone',
    year: 1970,
    drum_performances: drummers.map((d) => ({ drummer_id: `drummer:${d}` })),
  };
}

export function corpusOf(parts: {
  drummers?: Record<string, unknown>[];
  recordings?: Record<string, unknown>[];
  styles?: Record<string, unknown>[];
  sources?: Record<string, unknown>[];
}): Corpus {
  const files = (folder: string, items: Record<string, unknown>[] = []) =>
    items.map((json, i) => ({ file: `${folder}/${i}.json`, json }));
  return parseCorpus({
    drummers: files('drummers', parts.drummers),
    recordings: files('recordings', parts.recordings),
    styles: files('styles', parts.styles ?? [{ id: 'style:funk', name: 'Funk' }]),
    sources: [{ file: 'sources/test.json', json: parts.sources ?? [] }],
  });
}
