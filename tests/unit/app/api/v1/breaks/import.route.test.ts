/**
 * POST /api/v1/breaks/import. The readers have their own tests; what these
 * assert is the route's contract — every source comes back as a document that
 * passes the wire schema, what cannot be read is a 422 with a sentence, an
 * over-size body is refused before it is read, and no URL is ever fetched.
 */

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { patternFromLibrary } from '@/lib/app/breaks/library';
import { buildMidi } from '@/lib/app/breaks/midi';
import { sharePayloadSchema } from '@/lib/app/breaks/schema';
import { encodeBreak } from '@/lib/app/breaks/share';
import { MAX_IMPORT_BODY_BYTES } from '@/lib/validations/break-operations';
import { LIBRARY } from '@/prisma/seeds/app-beatbreaker/data/library';
import { mockAuthenticatedUser } from '@/tests/helpers/auth';
import { testStyle } from '@/tests/helpers/catalogue';

vi.mock('@/lib/auth/config', () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock('@/lib/app/breaks/catalogue/data', () => ({
  listStyles: vi.fn(),
  styleLookup: vi.fn(() => () => undefined),
}));

import { auth } from '@/lib/auth/config';
import { listStyles } from '@/lib/app/breaks/catalogue/data';

import { POST } from '@/app/api/v1/breaks/import/route';

function post(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/breaks/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

interface Envelope {
  success: boolean;
  data?: { source: string; doc: unknown; notes: string[] };
  error?: { code: string; message: string };
}

async function json(res: Response): Promise<Envelope> {
  return (await res.json()) as Envelope;
}

const FUNKY = patternFromLibrary(LIBRARY[0], 0, testStyle(LIBRARY[0].style));

const fetchSpy = vi.fn();

beforeEach(() => {
  vi.mocked(auth.api.getSession).mockReset();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAuthenticatedUser());
  vi.mocked(listStyles).mockResolvedValue([]);
  fetchSpy.mockReset();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /api/v1/breaks/import', () => {
  it('reads a MIDI file into a valid document, titled from the file name', async () => {
    const file = buildMidi(
      FUNKY.bars.map((_, barIdx) => ({ pattern: FUNKY, barIdx })),
      { bpm: 101, swing: 0, feel: 0, hats: 0 }
    );
    const res = await POST(
      post({ kind: 'midi', data: file.base64, fileName: 'C:\\grooves\\funky_drummer.mid' })
    );
    expect(res.status).toBe(200);
    const { data } = await json(res);
    expect(data?.source).toBe('midi');
    const doc = sharePayloadSchema.parse(data?.doc);
    expect(doc.bpm).toBe(101);
    expect(doc.A.n).toBe('funky drummer');
    expect(doc.A.st).toBe('rock');
    expect(doc.arr).toEqual(['A']);
  });

  it('reads a BeatBreaker code, and the same code inside a link', async () => {
    const code = encodeBreak({
      bpm: 94,
      swing: 12,
      level: 5,
      arrangement: ['A', 'A', 'B', 'A'],
      A: FUNKY,
      B: FUNKY,
    });
    for (const text of [code, `https://beatbreaker.app/studio#b=${encodeURIComponent(code)}`]) {
      const res = await POST(post({ kind: 'text', text }));
      expect(res.status, text.slice(0, 30)).toBe(200);
      const { data } = await json(res);
      expect(data?.source).toBe('beatbreaker');
      expect(sharePayloadSchema.parse(data?.doc)).toMatchObject({
        bpm: 94,
        sw: 12,
        arr: ['A', 'A', 'B', 'A'],
      });
      expect(data?.notes).toEqual([]);
    }
  });

  it('reads a Groove Scribe link without fetching it, and passes on what it left out', async () => {
    const link =
      'https://www.mikeslessons.com/groove/?TimeSig=4/4&Div=16&Title=Flam%20groove&Tempo=88' +
      '&H=|x-x-x-x-x-x-x-x-|&S=|----f-------O---|&K=|o-------o-------|';
    const res = await POST(post({ kind: 'text', text: link }));
    expect(res.status).toBe(200);
    const { data } = await json(res);
    expect(data?.source).toBe('groove-scribe');
    expect(sharePayloadSchema.parse(data?.doc)).toMatchObject({ bpm: 88, A: { n: 'Flam groove' } });
    expect(data?.notes).toEqual(['The flams on the snare were read as plain hits.']);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses any other web address with what it can read, and never fetches it', async () => {
    const res = await POST(
      post({ kind: 'text', text: 'http://169.254.169.254/latest/meta-data/' })
    );
    expect(res.status).toBe(422);
    const body = await json(res);
    expect(body.error).toEqual({
      code: 'IMPORT_UNREADABLE',
      message:
        'BeatBreaker reads its own codes and links, Groove Scribe links and MIDI files. It does not open other web pages.',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses text that is not a code, and a file that is not MIDI, with a sentence each', async () => {
    const words = await json(await POST(post({ kind: 'text', text: 'my favourite groove' })));
    expect(words.error?.message).toMatch(
      /^That is not a BeatBreaker code or a Groove Scribe link\./
    );
    const notMidi = await POST(
      post({ kind: 'midi', data: Buffer.from('hello world').toString('base64') })
    );
    expect(notMidi.status).toBe(422);
    expect((await json(notMidi)).error?.message).toBe('that is not a MIDI file');
  });

  it('refuses a body over the cap from its Content-Length, before reading it', async () => {
    const res = await POST(
      post({ kind: 'text', text: 'x' }, { 'Content-Length': String(MAX_IMPORT_BODY_BYTES + 1) })
    );
    expect(res.status).toBe(413);
    expect((await json(res)).error?.code).toBe('FILE_TOO_LARGE');
  });

  it('refuses a malformed body with a validation error', async () => {
    const res = await POST(post({ kind: 'midi', data: 'not base64!' }));
    expect(res.status).toBe(400);
    expect((await json(await POST(post({ kind: 'pdf' })))).success).toBe(false);
  });

  it('needs a signed-in user', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const res = await POST(post({ kind: 'text', text: 'x' }));
    expect(res.status).toBe(401);
  });
});
