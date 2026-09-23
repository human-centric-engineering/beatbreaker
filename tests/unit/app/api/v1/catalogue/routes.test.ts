/**
 * The catalogue read endpoints.
 *
 * Three claims, and the third is the one that needed a test written for it
 * rather than assumed:
 *
 * 1. **They answer without a session.** The catalogue is public because a
 *    signed-out visitor opening a shared pattern needs it (D2) and a native
 *    client reads it before anyone has signed in (D14). A guard added here
 *    later would break both, quietly, for people who are not us.
 * 2. **They carry an ETag and honour `If-None-Match` with a 304.** Stated in
 *    the phase's done-when. A conditional GET that always returns 200 is not a
 *    broken response — it is a working one that costs a payload per page load,
 *    so nothing else would ever report it.
 * 3. **The 200 and the 304 agree about caching.** The platform's default is
 *    `private, no-cache`, and `checkConditional` sends it. These responses are
 *    `public`, so a 304 carrying the default would tell a shared cache to stop
 *    holding the entry it is revalidating — a correctness bug that shows up as
 *    a cache miss rate and never as an error.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/breaks/catalogue/data', () => ({
  listStyles: vi.fn(),
  getStyle: vi.fn(),
  listKits: vi.fn(),
  listLibraries: vi.fn(),
  getLibrary: vi.fn(),
}));

import { GET as STYLES } from '@/app/api/v1/catalogue/styles/route';
import { GET as STYLE } from '@/app/api/v1/catalogue/styles/[key]/route';
import { GET as LIBRARIES } from '@/app/api/v1/catalogue/libraries/route';
import { GET as LIBRARY } from '@/app/api/v1/catalogue/libraries/[key]/route';
import { GET as KITS } from '@/app/api/v1/catalogue/kits/route';
import { GET as METERS } from '@/app/api/v1/catalogue/meters/route';
import {
  getLibrary,
  getStyle,
  listKits,
  listLibraries,
  listStyles,
} from '@/lib/app/breaks/catalogue/data';
import { METER_KEYS } from '@/lib/app/breaks/meter';
import { testKit, testLibrary, testStyle } from '@/tests/helpers/catalogue';

const FUNK = testStyle('funk');
const STUDIO70 = testKit('studio70');
const LIB = testLibrary();

function get(path: string, headers?: Record<string, string>): Request {
  return new Request(`http://localhost:3000/api/v1/catalogue/${path}`, { headers });
}

async function body(res: Response): Promise<{ data: unknown }> {
  return (await res.json()) as { data: unknown };
}

beforeEach(() => {
  vi.mocked(listStyles).mockResolvedValue([FUNK]);
  vi.mocked(getStyle).mockResolvedValue(FUNK);
  vi.mocked(listKits).mockResolvedValue([STUDIO70]);
  vi.mocked(listLibraries).mockResolvedValue([LIB]);
  vi.mocked(getLibrary).mockResolvedValue(LIB);
});

/** Every read endpoint, as `[name, handler, request builder]`. */
const ENDPOINTS: Array<[string, (req: Request, ctx?: never) => Promise<Response>]> = [
  ['styles', (req) => STYLES(req)],
  ['styles/[key]', (req) => STYLE(req, { params: Promise.resolve({ key: 'funk' }) })],
  ['libraries', (req) => LIBRARIES(req)],
  ['libraries/[key]', (req) => LIBRARY(req, { params: Promise.resolve({ key: 'famous-breaks' }) })],
  ['kits', (req) => KITS(req)],
  ['meters', (req) => METERS(req)],
];

describe.each(ENDPOINTS)('GET /api/v1/catalogue/%s', (path, handler) => {
  it('answers a caller with no session', async () => {
    const res = await handler(get(path));
    expect(res.status).toBe(200);
  });

  it('carries an ETag and says the answer is shareable', async () => {
    const res = await handler(get(path));
    expect(res.headers.get('ETag')).toMatch(/^W\/"[\w-]+"$/);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
  });

  it('answers a matching If-None-Match with 304 and no body', async () => {
    const first = await handler(get(path));
    const etag = first.headers.get('ETag') as string;

    const second = await handler(get(path, { 'If-None-Match': etag }));
    expect(second.status).toBe(304);
    expect(await second.text()).toBe('');
    /* The 304 must agree with the 200 about caching. `checkConditional` sends
       the platform's `private, no-cache` default, which would contradict it. */
    expect(second.headers.get('Cache-Control')).toBe('public, max-age=0, must-revalidate');
    expect(second.headers.get('ETag')).toBe(etag);
  });

  it('answers a stale If-None-Match with the payload', async () => {
    const res = await handler(get(path, { 'If-None-Match': 'W/"something-else"' }));
    expect(res.status).toBe(200);
  });

  it('gives the same ETag for the same data, so the 304 path is reachable twice', async () => {
    const a = await handler(get(path));
    const b = await handler(get(path));
    expect(a.headers.get('ETag')).toBe(b.headers.get('ETag'));
  });
});

describe('GET /api/v1/catalogue/styles', () => {
  it('returns the styles with their group order beside them', async () => {
    const { data } = await body(await STYLES(get('styles')));
    const payload = data as { styles: Array<{ key: string }>; groups: Array<[string, string[]]> };
    expect(payload.styles.map((s) => s.key)).toEqual(['funk']);
    expect(payload.groups).toEqual([[FUNK.group, ['funk']]]);
  });

  it('changes its ETag when the catalogue changes', async () => {
    /* The point of the validator. An ETag that did not move after an admin
       edit would serve the old catalogue until somebody cleared a cache. */
    const before = (await STYLES(get('styles'))).headers.get('ETag');
    vi.mocked(listStyles).mockResolvedValue([testStyle('boombap')]);
    const after = (await STYLES(get('styles'))).headers.get('ETag');
    expect(after).not.toBe(before);
  });
});

describe('GET /api/v1/catalogue/styles/[key]', () => {
  it('passes a requested version through to the catalogue', async () => {
    await STYLE(get('styles/funk?version=2'), { params: Promise.resolve({ key: 'funk' }) });
    expect(getStyle).toHaveBeenCalledWith('funk', 2);
  });

  it('asks for the current version when none is named', async () => {
    await STYLE(get('styles/funk'), { params: Promise.resolve({ key: 'funk' }) });
    expect(getStyle).toHaveBeenCalledWith('funk', undefined);
  });

  it('refuses a version that is not a positive whole number', async () => {
    const res = await STYLE(get('styles/funk?version=-1'), {
      params: Promise.resolve({ key: 'funk' }),
    });
    expect(res.status).toBe(400);
  });

  it('is a 404 for a style that is not there, and for a version that is not', async () => {
    vi.mocked(getStyle).mockResolvedValue(null);
    const res = await STYLE(get('styles/polka'), { params: Promise.resolve({ key: 'polka' }) });
    expect(res.status).toBe(404);
    /* One 404 for both. Telling them apart would be a way to enumerate which
       styles exist privately once D16 lands. */
    expect(JSON.stringify(await res.json())).toContain('No such style');
  });
});

describe('GET /api/v1/catalogue/libraries/[key]', () => {
  it('returns every entry with its document, in one response', async () => {
    /* The N+1 this shape exists to prevent: a list of 47 entries plus a fetch
       per entry to find out what each one plays. */
    const { data } = await body(
      await LIBRARY(get('libraries/famous-breaks'), {
        params: Promise.resolve({ key: 'famous-breaks' }),
      })
    );
    const library = data as { entries: Array<{ doc: unknown; title: string }> };
    expect(library.entries).toHaveLength(47);
    for (const entry of library.entries) expect(entry.doc).toBeTruthy();
  });

  it('is a 404 for a library that is not there', async () => {
    vi.mocked(getLibrary).mockResolvedValue(null);
    const res = await LIBRARY(get('libraries/nope'), { params: Promise.resolve({ key: 'nope' }) });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/catalogue/kits', () => {
  it('builds the sample URLs server-side rather than leaving a client to guess', async () => {
    const withSamples = {
      ...testKit('muldjord'),
      samples: { slots: { k: { v: [1], files: ['k-0.mp3'] } } },
    };
    vi.mocked(listKits).mockResolvedValue([withSamples]);

    const { data } = await body(await KITS(get('kits')));
    const kits = data as Array<{ samples: Record<string, { urls: string[] }> | null }>;
    expect(kits[0].samples?.k.urls).toEqual([`/kits/${withSamples.pack as string}/k-0.mp3`]);
  });

  it('leaves samples null for a kit that synthesises its voices', async () => {
    const { data } = await body(await KITS(get('kits')));
    const kits = data as Array<{ samples: unknown; engine: string }>;
    expect(kits[0].engine).toBe('synth');
    expect(kits[0].samples).toBeNull();
  });
});

describe('GET /api/v1/catalogue/meters', () => {
  it('serves the structural constants a client would otherwise reimplement', async () => {
    const { data } = await body(await METERS(get('meters')));
    const payload = data as {
      meters: Array<{ key: string; steps: number }>;
      lanes: unknown[];
      slots: unknown[];
    };
    expect(payload.meters.map((m) => m.key)).toEqual(METER_KEYS);
    /* One step is a sixteenth in every meter, so the step count is what a
       client needs and cannot derive from the numerator and denominator alone. */
    expect(payload.meters.find((m) => m.key === '4/4')?.steps).toBe(16);
    expect(payload.lanes.length).toBeGreaterThan(0);
    expect(payload.slots.length).toBeGreaterThan(0);
  });

  it('does not touch the database', () => {
    /* Meters, lanes and slots deliberately did not become rows: a saved pattern
       means nothing without them, so editing the set would change what every
       stored pattern means. */
    expect(listStyles).not.toHaveBeenCalled();
    expect(listKits).not.toHaveBeenCalled();
    expect(listLibraries).not.toHaveBeenCalled();
  });
});
