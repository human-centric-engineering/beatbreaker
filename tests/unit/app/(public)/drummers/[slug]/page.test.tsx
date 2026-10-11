// @vitest-environment happy-dom

/**
 * `/drummers/[slug]` — one person in the lineage (Phase 11-b). Public.
 *
 * `getLineageProfile` is mocked at its own seam; `readDrummerRecord` and
 * `relationsOf` run for real, because what the page does with a stored record
 * (read it through Zod, hide a masked performer's name, keep what reads) and
 * with the edges (sort them into who taught whom) is the thing under test.
 *
 * The records are trimmed from `john-bonham.json` and `klek-de-poitrine.json`
 * in the drummer model, keeping their real shape — `persona: null` on a
 * named drummer, `born: null` on a masked one.
 *
 * @see app/(public)/drummers/[slug]/page.tsx
 */

import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/lineage/data', () => ({ getLineageProfile: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

import DrummerPage, { generateMetadata } from '@/app/(public)/drummers/[slug]/page';
import { getLineageProfile, type LineageProfile } from '@/lib/app/lineage/data';
import type { LineageNode } from '@/lib/app/lineage/types';
import { lineageEdge, lineageNode } from '@/tests/helpers/lineage-graph';

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

async function show(slug: string) {
  render(await DrummerPage(params(slug)));
}

function profile(overrides: Partial<LineageProfile> & { node: LineageNode }): LineageProfile {
  return { record: null, edges: [], neighbours: [], recordings: [], ...overrides };
}

/** John Bonham, as the model holds him (trimmed). */
function bonhamRecord(): Record<string, unknown> {
  return {
    meta: { id: 'drummer:john-bonham', record_status: 'draft', completeness: 0.55 },
    identity: {
      name: 'John Bonham',
      full_name: 'John Henry Bonham',
      pseudonymous: null,
      persona: null,
      born: { date: '1948-05-31', place: 'Redditch, Worcestershire, England' },
      active: { from: 1962, to: 1980 },
      roles: ['band_member', 'touring'],
      nationality: ['British'],
      home_scenes: ['Birmingham and the West Midlands beat and blues scene'],
      summary: 'The heavy right foot and the swing under it.',
    },
    eras: [
      {
        id: 'era:bonham-midlands',
        label: 'Midlands bands',
        years: { from: 1962, to: 1968 },
        context: 'Terry Webb and the Spiders, the Senators.',
      },
    ],
    style_profile: { descriptors: ['powerful', 'behind the beat'], genres: [] },
    feel_profile: { descriptors: ['powerful', 'laid back'] },
    technique_profile: {
      grip: ['matched_american'],
      hand_techniques: [
        { name: 'Bonham triplets', description: 'Sextuplets, hand hand foot.', weight: 1 },
      ],
      foot_techniques: [{ name: 'Fast single pedal', description: 'No double kick.' }],
    },
    signature_traits: [
      {
        id: 'trait:bonham-triplet',
        label: 'The Bonham triplet',
        category: 'fill',
        description: 'Sextuplet fills moved round the kit.',
        evidence: { confidence: 'widely_reported', source_ids: ['src:x'] },
      },
      { label: 'Room sound', evidence: {} },
    ],
  };
}

/** Klek de Poitrine, a masked performer (trimmed). */
function klekRecord(): Record<string, unknown> {
  return {
    meta: { id: 'drummer:klek-de-poitrine', record_status: 'draft' },
    identity: {
      name: 'Klek de Poitrine',
      full_name: null,
      pseudonymous: true,
      persona: {
        stage_name: 'Klek de Poitrine',
        description: "One of two 'space-time voyagers' who arrived in a pyramid-shaped craft.",
        real_identity_policy: 'private_do_not_research',
      },
      born: null,
      active: { from: 2019, ongoing: true },
      roles: ['band_member', 'composer'],
      nationality: ['Canadian'],
      home_scenes: ['Saguenay, Quebec'],
    },
    eras: [],
    style_profile: { descriptors: ['math rock'] },
    signature_traits: [],
  };
}

const BONHAM = lineageNode('john-bonham', {
  label: 'John Bonham',
  styleKey: 'bonham',
  activeFrom: 1962,
  summary: 'The heavy right foot.',
});

beforeEach(() => {
  vi.mocked(getLineageProfile).mockReset();
});

describe('which slugs are looked up', () => {
  it('is the not-found page when nobody has the slug', async () => {
    vi.mocked(getLineageProfile).mockResolvedValue(null);
    await expect(DrummerPage(params('no-such-drummer'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getLineageProfile).toHaveBeenCalledWith('no-such-drummer');
  });

  it('is the not-found page for a genre, which is a node but not a person', async () => {
    vi.mocked(getLineageProfile).mockResolvedValue(
      profile({ node: lineageNode('funk', { kind: 'style', slug: 'style-funk', modelled: true }) })
    );
    await expect(DrummerPage(params('style-funk'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(await generateMetadata(params('style-funk'))).toEqual({ title: 'Not found' });
  });

  it('never asks the database about a slug over 120 characters', async () => {
    await expect(DrummerPage(params('a'.repeat(121)))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getLineageProfile).not.toHaveBeenCalled(); // test-review:accept no_arg_called — an over-long slug never reaches the database
  });

  it('never asks about an empty slug either', async () => {
    await expect(DrummerPage(params(''))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getLineageProfile).not.toHaveBeenCalled(); // test-review:accept no_arg_called — an empty slug never reaches the database
  });

  it('does ask about a slug of exactly 120', async () => {
    vi.mocked(getLineageProfile).mockResolvedValue(null);
    const slug = 'a'.repeat(120);
    await expect(DrummerPage(params(slug))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getLineageProfile).toHaveBeenCalledWith(slug);
  });
});

describe('Play in their style', () => {
  it('links a drummer whose style the Studio has to /studio?style=<key>', async () => {
    vi.mocked(getLineageProfile).mockResolvedValue(
      profile({ node: BONHAM, record: bonhamRecord() })
    );
    await show('john-bonham');
    expect(screen.getByRole('link', { name: 'Play in their style' }).getAttribute('href')).toBe(
      '/studio?style=bonham'
    );
    expect(screen.queryByText(/not in the Studio yet/)).toBeNull();
  });

  it('says so when a modelled drummer’s style is not in the Studio, and offers no Play', async () => {
    vi.mocked(getLineageProfile).mockResolvedValue(
      profile({ node: { ...BONHAM, styleKey: null }, record: bonhamRecord() })
    );
    await show('john-bonham');
    expect(screen.getByText('Their style is not in the Studio yet.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Play in their style' })).toBeNull();
  });

  it('always links back to their place on the map', async () => {
    vi.mocked(getLineageProfile).mockResolvedValue(
      profile({ node: BONHAM, record: bonhamRecord() })
    );
    await show('john-bonham');
    expect(screen.getByRole('link', { name: 'See them on the map' }).getAttribute('href')).toBe(
      '/drummers?trace=john-bonham'
    );
    expect(screen.getByRole('link', { name: 'Drummers' }).getAttribute('href')).toBe('/drummers');
  });
});

describe('a stub', () => {
  const echo = lineageNode('echo', { modelled: false, activeFrom: null, genres: [] });
  const alpha = lineageNode('alpha');
  const gamma = lineageNode('gamma');

  beforeEach(() => {
    vi.mocked(getLineageProfile).mockResolvedValue(
      profile({
        node: echo,
        neighbours: [alpha, gamma],
        edges: [
          lineageEdge('e1', 'alpha', 'echo', { confidence: 'inferred' }),
          lineageEdge('e2', 'echo', 'gamma', { kind: 'teacher', confidence: 'likely' }),
        ],
      })
    );
  });

  it('says they have no record of their own yet', async () => {
    await show('echo');
    expect(screen.getByRole('heading', { level: 1, name: 'Echo' })).toBeTruthy();
    expect(
      screen.getByText(
        'Echo has no record of their own yet. They are here because the records below name them.'
      )
    ).toBeTruthy();
  });

  it('shows the links that name them, and offers nothing to play', async () => {
    await show('echo');
    const from = screen.getByRole('heading', { name: 'Learned from' }).closest('section');
    const to = screen.getByRole('heading', { name: 'Passed on to' }).closest('section');
    expect(within(from as HTMLElement).getByRole('link', { name: 'Alpha' })).toBeTruthy();
    expect(within(to as HTMLElement).getByRole('link', { name: 'Gamma' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Play in their style' })).toBeNull();
    // a stub is not "modelled", so there is no "not in the Studio yet" either
    expect(screen.queryByText(/not in the Studio yet/)).toBeNull();
    expect(screen.queryByText(/could not be read/)).toBeNull();
  });

  it('links to their place on the map, since a link to a person puts them there', async () => {
    await show('echo');
    expect(screen.getByRole('link', { name: 'See them on the map' }).getAttribute('href')).toBe(
      '/drummers?trace=echo'
    );
  });

  it('offers no map link when they are linked to nobody the map places', async () => {
    vi.mocked(getLineageProfile).mockResolvedValue(
      profile({
        node: echo,
        neighbours: [lineageNode('funk', { kind: 'style', slug: 'style-funk' })],
        // only a genre at the other end: the map leaves genres off
        edges: [lineageEdge('e3', 'echo', 'funk', { kind: 'peer', directed: false })],
      })
    );
    await show('echo');
    expect(screen.queryByRole('link', { name: 'See them on the map' })).toBeNull();
  });
});

describe('a named drummer’s record', () => {
  beforeEach(() => {
    vi.mocked(getLineageProfile).mockResolvedValue(
      profile({
        node: BONHAM,
        record: bonhamRecord(),
        recordings: [
          {
            id: 'rec:led-zeppelin-iv',
            title: 'Led Zeppelin IV',
            artist: 'Led Zeppelin',
            year: 1971,
            record: {},
          },
        ],
      })
    );
  });

  it('shows who they are, how long they were active and where from', async () => {
    await show('john-bonham');
    expect(screen.getByRole('heading', { level: 1, name: 'John Bonham' })).toBeTruthy();
    // the full name, because it differs from the label
    expect(screen.getByText('John Henry Bonham')).toBeTruthy();
    expect(
      screen.getByText(
        'Active 1962–1980 · Birmingham and the West Midlands beat and blues scene, British · band member, touring'
      )
    ).toBeTruthy();
    expect(screen.getByText('The heavy right foot and the swing under it.')).toBeTruthy();
    // a drummer with `persona: null` is not a masked performer
    expect(screen.queryByText(/masked character/)).toBeNull();
  });

  it('lists how they play once, with a descriptor the style and feel profiles share', async () => {
    await show('john-bonham');
    const how = screen.getByRole('list', { name: 'How they play' });
    expect(
      within(how)
        .getAllByRole('listitem')
        .map((li) => li.textContent)
    ).toEqual(['powerful', 'behind the beat', 'laid back']);
  });

  it('lists what marks their playing with how sure each claim is', async () => {
    await show('john-bonham');
    const section = screen
      .getByRole('heading', { name: 'What marks their playing' })
      .closest('section') as HTMLElement;
    const items = within(section).getAllByRole('listitem');
    expect(items[0].textContent).toBe(
      'The Bonham triplet · Widely reportedSextuplet fills moved round the kit.'
    );
    // a trait with no description or confidence is just its name
    expect(items[1].textContent).toBe('Room sound');
  });

  it('lists hand and foot techniques, eras with their years, and recordings', async () => {
    await show('john-bonham');
    const technique = screen
      .getByRole('heading', { name: 'Technique' })
      .closest('section') as HTMLElement;
    expect(
      within(technique)
        .getAllByRole('listitem')
        .map((li) => li.textContent)
    ).toEqual([
      'Bonham triplets — Sextuplets, hand hand foot.',
      'Fast single pedal — No double kick.',
    ]);
    const eras = screen.getByRole('heading', { name: 'Eras' }).closest('section') as HTMLElement;
    expect(eras.textContent).toContain('Midlands bands · 1962–1968');
    expect(eras.textContent).toContain('Terry Webb and the Spiders, the Senators.');
    const recordings = screen
      .getByRole('heading', { name: 'Recordings' })
      .closest('section') as HTMLElement;
    expect(recordings.textContent).toContain('Led Zeppelin IV — Led Zeppelin, 1971');
  });

  it('says how far the record itself has been checked', async () => {
    await show('john-bonham');
    expect(screen.getByText(/This record is draft\./)).toBeTruthy();
  });

  it('shows no full name when it is the label', async () => {
    const record = bonhamRecord();
    (record.identity as Record<string, unknown>).full_name = 'John Bonham';
    vi.mocked(getLineageProfile).mockResolvedValue(profile({ node: BONHAM, record }));
    await show('john-bonham');
    expect(screen.getAllByText('John Bonham')).toHaveLength(1); // the heading only
  });
});

describe('a masked performer', () => {
  const klek = lineageNode('klek-de-poitrine', {
    label: 'Klek de Poitrine',
    activeFrom: 2019,
    styleKey: null,
  });

  it('shows the persona, and says the real identity is not part of the record', async () => {
    vi.mocked(getLineageProfile).mockResolvedValue(profile({ node: klek, record: klekRecord() }));
    await show('klek-de-poitrine');
    expect(
      screen.getByText(/Performs as a masked character: One of two 'space-time voyagers'/)
    ).toBeTruthy();
    expect(screen.getByText(/Their real identity is not part of the record\./)).toBeTruthy();
    // ongoing: an open-ended range
    expect(screen.getByText(/Active 2019– ·/)).toBeTruthy();
  });

  it.each([
    ['pseudonymous and with a persona', { pseudonymous: true }],
    ['with a persona only', { pseudonymous: null }],
  ])(
    'never prints the full name or birth date of one %s, even when the JSON holds them',
    async (_, flags) => {
      const record = klekRecord();
      Object.assign(record.identity as Record<string, unknown>, {
        ...flags,
        full_name: 'Jean-Pierre Tremblay',
        born: { date: '1987-03-14', place: 'Chicoutimi' },
        died: { date: '2090-01-01' },
      });
      vi.mocked(getLineageProfile).mockResolvedValue(profile({ node: klek, record }));
      await show('klek-de-poitrine');

      const text = document.body.textContent ?? '';
      expect(text).not.toContain('Jean-Pierre');
      expect(text).not.toContain('Tremblay');
      expect(text).not.toContain('1987');
      expect(text).not.toContain('Chicoutimi');
      expect(text).toContain('Performs as a masked character');
    }
  );

  it('hides the full name of a pseudonymous record that gives no persona, and shows no persona line', async () => {
    const record = klekRecord();
    Object.assign(record.identity as Record<string, unknown>, {
      persona: undefined,
      full_name: 'Jean-Pierre Tremblay',
    });
    vi.mocked(getLineageProfile).mockResolvedValue(profile({ node: klek, record }));
    await show('klek-de-poitrine');
    expect(document.body.textContent).not.toContain('Tremblay');
    expect(screen.queryByText(/masked character/)).toBeNull();
  });
});

describe('a record with a field that does not read', () => {
  it('still shows the rest when signature_traits is not an array', async () => {
    const record = { ...bonhamRecord(), signature_traits: 'The Bonham triplet' };
    vi.mocked(getLineageProfile).mockResolvedValue(profile({ node: BONHAM, record }));
    await show('john-bonham');
    expect(screen.queryByRole('heading', { name: 'What marks their playing' })).toBeNull();
    // everything else is still on the page
    expect(screen.getByText('The heavy right foot and the swing under it.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Technique' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Eras' })).toBeTruthy();
    expect(screen.queryByText(/could not be read/)).toBeNull();
  });

  it('drops only the era that does not read', async () => {
    const record = {
      ...bonhamRecord(),
      eras: [
        { label: 'Midlands bands', years: { from: 1962, to: 1968 } },
        { years: { from: 1968, to: 1980 }, context: 'No label, so not an era.' },
        { label: 'Zeppelin', years: { from: 'late sixties' } },
      ],
    };
    vi.mocked(getLineageProfile).mockResolvedValue(profile({ node: BONHAM, record }));
    await show('john-bonham');
    const eras = screen.getByRole('heading', { name: 'Eras' }).closest('section') as HTMLElement;
    const items = within(eras).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('Midlands bands · 1962–1968');
    // its years are bad, so it has none to show; the era itself is kept
    expect(items[1].textContent).toBe('Zeppelin');
    expect(eras.textContent).not.toContain('No label');
  });

  it('says the record could not be read when it has not even a name', async () => {
    const record = { identity: { full_name: 'Nobody' } };
    vi.mocked(getLineageProfile).mockResolvedValue(profile({ node: BONHAM, record }));
    await show('john-bonham');
    expect(screen.getByText('This record could not be read.')).toBeTruthy();
    // the page still has the person and the way back to the map
    expect(screen.getByRole('heading', { level: 1, name: 'John Bonham' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'See them on the map' })).toBeTruthy();
    expect(document.body.textContent).not.toContain('Nobody');
  });
});

describe('who they learned from, passed on to, and played with', () => {
  const alpha = lineageNode('alpha');
  const zed = lineageNode('zed');
  const gamma = lineageNode('gamma');
  const delta = lineageNode('delta');
  const echo = lineageNode('echo', { modelled: false });
  const beta = lineageNode('beta', { activeFrom: 1960 });

  beforeEach(() => {
    vi.mocked(getLineageProfile).mockResolvedValue(
      profile({
        node: beta,
        record: { identity: { name: 'Beta' } },
        neighbours: [alpha, zed, gamma, delta, echo],
        edges: [
          lineageEdge('e1', 'zed', 'beta', { kind: 'teacher', confidence: 'verified' }),
          lineageEdge('e2', 'alpha', 'beta', { kind: 'influence', confidence: 'likely' }),
          lineageEdge('e3', 'beta', 'gamma', { kind: 'teacher', confidence: 'widely_reported' }),
          lineageEdge('e4', 'beta', 'delta', {
            kind: 'peer',
            directed: false,
            confidence: 'needs_verification',
          }),
          lineageEdge('e5', 'echo', 'beta', {
            kind: 'succession',
            confidence: null,
            scope: 'band',
          }),
        ],
      })
    );
  });

  const rows = (heading: string) => {
    const section = screen
      .getByRole('heading', { name: heading })
      .closest('section') as HTMLElement;
    return within(section)
      .getAllByRole('listitem')
      .map((li) => ({
        text: li.textContent?.replace(/\s+/g, ' ').trim(),
        href: within(li).getByRole('link').getAttribute('href'),
      }));
  };

  it('lists whom they learned from, by name, with the kind and how sure', async () => {
    await show('beta');
    expect(rows('Learned from')).toEqual([
      { text: 'Alpha · Influence · Likely', href: '/drummers/alpha' },
      { text: 'Zed · Teacher · Verified', href: '/drummers/zed' },
    ]);
  });

  it('lists whom they passed it on to', async () => {
    await show('beta');
    expect(rows('Passed on to')).toEqual([
      { text: 'Gamma · Teacher · Widely reported', href: '/drummers/gamma' },
    ]);
  });

  it('lists the rest as around them: peers, and the chair, with the band and no confidence', async () => {
    await show('beta');
    expect(rows('Around them')).toEqual([
      { text: 'Delta · Played together · Needs checking', href: '/drummers/delta' },
      // a succession is not a lineage edge; its scope and missing confidence are shown as they are
      { text: 'Echo · Took the chair (through the band)', href: '/drummers/echo' },
    ]);
  });

  it('leaves out a list with no one in it', async () => {
    vi.mocked(getLineageProfile).mockResolvedValue(
      profile({ node: beta, record: { identity: { name: 'Beta' } }, neighbours: [], edges: [] })
    );
    await show('beta');
    for (const heading of ['Learned from', 'Passed on to', 'Around them']) {
      expect(screen.queryByRole('heading', { name: heading })).toBeNull();
    }
  });

  it('skips an edge whose other end the profile did not bring', async () => {
    vi.mocked(getLineageProfile).mockResolvedValue(
      profile({
        node: beta,
        record: { identity: { name: 'Beta' } },
        neighbours: [alpha],
        edges: [lineageEdge('e1', 'alpha', 'beta'), lineageEdge('e2', 'missing', 'beta')],
      })
    );
    await show('beta');
    expect(rows('Learned from')).toHaveLength(1);
  });
});

describe('generateMetadata', () => {
  it('titles the page with the label and makes the slug canonical', async () => {
    vi.mocked(getLineageProfile).mockResolvedValue(profile({ node: BONHAM }));
    const meta = await generateMetadata(params('john-bonham'));
    expect(meta).toEqual({
      title: 'John Bonham',
      description: 'The heavy right foot.',
      alternates: { canonical: '/drummers/john-bonham' },
    });
  });

  it('describes a person with no summary by what the page is for', async () => {
    vi.mocked(getLineageProfile).mockResolvedValue(
      profile({ node: lineageNode('echo', { label: 'Echo', modelled: false, summary: null }) })
    );
    const meta = await generateMetadata(params('echo'));
    expect(meta.description).toBe(
      "Echo in BeatBreaker's drummer lineage: who they learned from and who learned from them."
    );
  });

  it('uses the stored slug for the canonical, not the one asked for', async () => {
    vi.mocked(getLineageProfile).mockResolvedValue(
      profile({ node: lineageNode('john-bonham', { label: 'John Bonham' }) })
    );
    const meta = await generateMetadata(params('JOHN-BONHAM'));
    expect(meta.alternates?.canonical).toBe('/drummers/john-bonham');
  });

  it('is "Not found" when nobody has the slug', async () => {
    vi.mocked(getLineageProfile).mockResolvedValue(null);
    expect(await generateMetadata(params('nobody'))).toEqual({ title: 'Not found' });
  });

  it('is "Not found" for an over-long slug, without asking the database', async () => {
    expect(await generateMetadata(params('a'.repeat(121)))).toEqual({ title: 'Not found' });
    expect(getLineageProfile).not.toHaveBeenCalled(); // test-review:accept no_arg_called — an over-long slug never reaches the database
  });
});
