// @vitest-environment happy-dom

/**
 * `/drummers` — the lineage map (Phase 11-b, D49). Public.
 *
 * `getLineageGraph` is mocked at its own seam; the layout, the map and the
 * phone list all run for real over the hand-made graph in
 * `tests/helpers/lineage-graph.ts`, so what is asserted is what the page does
 * with a graph: lay it out, draw it twice, and decide what `?trace=` traces.
 *
 * @see app/(public)/drummers/page.tsx
 */

import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/app/lineage/data', () => ({ getLineageGraph: vi.fn() }));

import DrummersPage, { metadata } from '@/app/(public)/drummers/page';
import { getLineageGraph } from '@/lib/app/lineage/data';
import type { LineageGraph } from '@/lib/app/lineage/types';
import { lineageNode, mapGraph } from '@/tests/helpers/lineage-graph';

const searchParams = (params: Record<string, string | string[] | undefined> = {}) =>
  Promise.resolve(params);

async function show(params: Record<string, string | string[] | undefined> = {}) {
  render(await DrummersPage({ searchParams: searchParams(params) }));
}

/** The map's own dot for a person, by id: not the list's link to them. */
const dot = (id: string) => document.querySelector(`[data-node="${id}"]`);
const litDots = () =>
  [...document.querySelectorAll('[data-node][data-lit="true"]')].map((n) =>
    n.getAttribute('data-node')
  );
const dimmedDots = () =>
  [...document.querySelectorAll('[data-node][data-lit="false"]')].map((n) =>
    n.getAttribute('data-node')
  );

/** The list item for a person with a record, in the phone list. */
function listItem(label: string): HTMLElement {
  const item = screen
    .getAllByRole('listitem')
    .find(
      (li) =>
        within(li).queryAllByRole('link', { name: label })[0]?.closest('p') === li.firstElementChild
    );
  if (!item) throw new Error(`no list item for ${label}`);
  return item;
}

beforeEach(() => {
  vi.mocked(getLineageGraph).mockReset().mockResolvedValue(mapGraph());
});

describe('/drummers', () => {
  it('reads the graph once and says what the page is', async () => {
    await show();
    expect(getLineageGraph).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Drummers' })).toBeTruthy();
    expect(metadata).toMatchObject({
      title: 'Drummers',
      alternates: { canonical: '/drummers' },
    });
  });

  it('draws the map from the laid-out graph, with a link to every person on it', async () => {
    await show();
    const map = screen.getByRole('region', { name: 'Lineage map' });
    const links = within(map)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .sort();
    expect(links).toEqual(
      [
        '/drummers/alpha',
        '/drummers/beta',
        '/drummers/delta',
        '/drummers/echo',
        '/drummers/foxtrot',
        '/drummers/gamma',
      ].sort()
    );
    // the edges the layout kept: all five kinds, none for a genre
    expect(map.querySelectorAll('path[data-kind]')).toHaveLength(5);
  });

  it('leaves a genre off the map even when the graph holds one', async () => {
    const graph: LineageGraph = {
      nodes: [
        ...mapGraph().nodes,
        lineageNode('funk', {
          id: 'style:funk',
          slug: 'style-funk',
          kind: 'style',
          modelled: false,
        }),
      ],
      edges: mapGraph().edges,
    };
    vi.mocked(getLineageGraph).mockResolvedValue(graph);
    await show();
    expect(dot('style:funk')).toBeNull();
    expect(screen.queryByRole('link', { name: /^Funk/ })).toBeNull();
  });

  describe('the phone list', () => {
    it('lists the people with a record under their family, and not a stub', async () => {
      await show();
      expect(screen.getByRole('heading', { level: 2, name: 'Funk and soul' })).toBeTruthy();
      // no other family has anyone in this graph
      expect(screen.queryByRole('heading', { level: 2, name: 'Jazz' })).toBeNull();
      const names = screen
        .getAllByRole('listitem')
        .map((li) => li.firstElementChild?.querySelector('a')?.textContent);
      // by start year, then name, undated last as on the map; Echo is a stub, so not here.
      expect(names).toEqual(['Alpha', 'Beta', 'Delta', 'Gamma', 'Foxtrot']);
    });

    it('shows who each person learned from and passed on to, as links to their pages', async () => {
      await show();
      const beta = listItem('Beta');
      const learned = within(beta).getByText('Learned from:').parentElement as HTMLElement;
      const passed = within(beta).getByText('Passed on to:').parentElement as HTMLElement;
      expect(within(learned).getByRole('link', { name: 'Alpha' }).getAttribute('href')).toBe(
        '/drummers/alpha'
      );
      expect(within(passed).getByRole('link', { name: 'Gamma' }).getAttribute('href')).toBe(
        '/drummers/gamma'
      );
      // a peer is neither
      expect(within(beta).queryByRole('link', { name: 'Delta' })).toBeNull();
    });

    it('says nothing for a direction a person has no one in', async () => {
      await show();
      const alpha = listItem('Alpha');
      expect(within(alpha).queryByText('Learned from:')).toBeNull();
      expect(within(alpha).getByText('Passed on to:')).toBeTruthy();
      const foxtrot = listItem('Foxtrot');
      expect(within(foxtrot).queryByText('Learned from:')).toBeNull();
      expect(within(foxtrot).queryByText('Passed on to:')).toBeNull();
    });
  });

  describe('?trace=', () => {
    it('opens the map with that person traced', async () => {
      await show({ trace: 'beta' });
      expect(litDots().sort()).toEqual(['drummer:alpha', 'drummer:beta', 'drummer:gamma']);
      expect(dimmedDots().sort()).toEqual(['drummer:delta', 'drummer:echo', 'drummer:foxtrot']);
      expect(screen.getByText('Beta: learned from 1, passed on to 1.')).toBeTruthy();
    });

    it('traces a stub the map places, too', async () => {
      await show({ trace: 'echo' });
      expect(dot('drummer:echo')?.getAttribute('data-lit')).toBe('true');
      // Echo's only link is taking Delta's chair, which passes nothing on
      expect(screen.getByText('Echo: learned from 0, passed on to 0.')).toBeTruthy();
      // a stub is not offered in the select, but the one traced is named there
      expect(screen.getByRole('combobox', { name: /Trace a drummer/ }).textContent).toContain(
        'Echo'
      );
    });

    it.each([
      ['a slug that is not on the map', { trace: 'nobody-here' }],
      ['an id rather than a slug', { trace: 'drummer:beta' }],
      ['a genre, which is not placed', { trace: 'style-funk' }],
      ['repeated', { trace: ['beta', 'alpha'] }],
      ['empty', { trace: '' }],
      ['absent', {}],
    ])('traces nothing for %s', async (_, params) => {
      await show(params);
      expect(document.querySelectorAll('[data-node]').length).toBeGreaterThan(0);
      expect(litDots()).toEqual([]);
      expect(dimmedDots()).toEqual([]);
      expect(screen.getByText(/^Point at a drummer/)).toBeTruthy();
    });
  });
});
