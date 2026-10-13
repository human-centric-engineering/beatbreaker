/**
 * `get_drummer` (11-f): one drummer's record, as the `/drummers/[slug]` page
 * reads it, with what to cite. The data layer is mocked with the real drummer
 * model as the seed writes it (`tests/helpers/lineage-tables.ts`).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dataOf } from '@/tests/helpers/buddy';
import { findSlugInModel, profileFromModel } from '@/tests/helpers/lineage-tables';

vi.mock('@/lib/app/lineage/data', () => ({
  findLineageSlug: vi.fn(),
  getLineageProfile: vi.fn(),
}));

import { GetDrummerCapability } from '@/lib/app/breaks/buddy/get-drummer';
import { findLineageSlug, getLineageProfile } from '@/lib/app/lineage/data';

const context = { userId: 'user-1', agentId: 'agent-1' };

async function get(drummer: string) {
  const cap = new GetDrummerCapability();
  return cap.execute(cap.validate({ drummer }), context);
}

beforeEach(() => {
  vi.mocked(findLineageSlug).mockImplementation(findSlugInModel);
  vi.mocked(getLineageProfile).mockImplementation(profileFromModel);
});

describe('get_drummer', () => {
  it('cites the record by name, status and page', async () => {
    const purdie = dataOf(await get('Bernard Purdie'));
    expect(purdie.cite).toBe(
      "BeatBreaker's record of Bernard Purdie, draft (/drummers/bernard-purdie)"
    );
    expect(purdie).toMatchObject({
      modelled: true,
      page: '/drummers/bernard-purdie',
      style: 'bernardpurdie',
    });
  });

  it('reads the record: summary, traits with their confidence, eras and techniques', async () => {
    const { record } = dataOf(await get('bernard-purdie'));
    expect(record?.summary).toMatch(/session drummer/);
    expect(record?.traits).toContainEqual(
      expect.objectContaining({ label: 'The Purdie shuffle', confidence: 'verified' })
    );
    expect(record?.traits.find((t) => t.label === 'Fusing swing, blues and funk')?.confidence).toBe(
      'widely_reported'
    );
    expect(record).not.toHaveProperty('name');
  });

  it('gives who they learned from and passed it on to, each with how sure the record is', async () => {
    const purdie = dataOf(await get('Bernard Purdie'));
    expect(purdie.learnedFrom).toContain('Leonard Heywood (studied_with, widely_reported)');
    expect(purdie.passedOnTo).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^John Bonham \(/),
        expect.stringMatching(/^Stewart Copeland \(/),
      ])
    );
  });

  it('leaves shared records out of who was around them, and lists the recordings instead', async () => {
    const purdie = dataOf(await get('Bernard Purdie'));
    // Stubblefield and Starks share a record with him; King Curtis was a peer
    expect(purdie.around).toEqual([expect.stringMatching(/^King Curtis \(/)]);
    expect(purdie.recordings.length).toBeGreaterThan(0);
    const years = purdie.recordings.map((r) => r.year);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });

  it("withholds a masked performer's real name and dates, as the page does", async () => {
    const { record } = dataOf(await get('Klek de Poitrine'));
    expect(record).toMatchObject({ fullName: null, born: null, died: null });
    expect(record?.persona).toMatch(/space-time voyagers/);
  });

  it('answers for someone the records only mention: no record, their relations, and says so', async () => {
    const roach = dataOf(await get('Max Roach'));
    expect(roach).toMatchObject({ modelled: false, record: null, style: null });
    expect(roach.cite).toMatch(/no record of Max Roach/);
    expect([...roach.learnedFrom, ...roach.passedOnTo, ...roach.around].length).toBeGreaterThan(0);
  });

  it('refuses a name it has no node for, pointing at find_drummers', async () => {
    const result = await get('Nobody Atall');
    expect(result.success).toBe(false);
    expect(result.error).toMatchObject({ code: 'unknown_drummer' });
    expect(result.error?.message).toMatch(/find_drummers/);
    expect(getLineageProfile).not.toHaveBeenCalled();
  });
});
