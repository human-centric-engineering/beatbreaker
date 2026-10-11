// @vitest-environment happy-dom

/**
 * The lineage map (Phase 11-b, D49), driven the way a person drives it: point
 * at someone, pick them from the list, thin the links.
 *
 * The graph is laid out by the real `layoutLineage`, so a node's place, a
 * stub's inferred year and the edges that survive are the page's, not a
 * hand-copy of them. See `tests/helpers/lineage-graph.ts` for the picture.
 *
 * @see components/app/drummers/lineage-map.tsx
 */

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { LineageMap } from '@/components/app/drummers/lineage-map';
import { type LineageLayout, layoutLineage } from '@/lib/app/lineage/layout';
import { mapGraph } from '@/tests/helpers/lineage-graph';
import { menuOf, pickOption } from '@/tests/helpers/select-menu';

const layout = (): LineageLayout => layoutLineage(mapGraph());

function show(initialTrace?: string | null): LineageLayout {
  const l = layout();
  render(<LineageMap layout={l} initialTrace={initialTrace} />);
  return l;
}

/** A person's link on the map, by the name it is announced with. */
const person = (label: string) => screen.getByRole('link', { name: new RegExp(`^${label},`) });
const maybePerson = (label: string) =>
  screen.queryByRole('link', { name: new RegExp(`^${label},`) });
const lit = (label: string) => person(label).getAttribute('data-lit');
const svg = () => screen.getByRole('group', { name: /Who learned from whom/ });
const edge = (kind: string) => svg().querySelector<SVGPathElement>(`path[data-kind="${kind}"]`);
const edgeKinds = () =>
  [...svg().querySelectorAll('path[data-kind]')].map((p) => p.getAttribute('data-kind'));
const status = () => document.querySelector('[aria-live="polite"]')?.textContent;
const tracePicker = () => screen.getByRole('combobox', { name: /^Trace a drummer/ });
const floorPicker = () => screen.getByRole('combobox', { name: /^How sure/ });
const kindBox = (name: string) => screen.getByRole('checkbox', { name });

describe('the people', () => {
  it('draws each person as a link to their page, announced with when they started', () => {
    show();
    expect(person('Alpha').getAttribute('href')).toBe('/drummers/alpha');
    expect(person('Beta').getAttribute('href')).toBe('/drummers/beta');
    expect(person('Alpha').getAttribute('aria-label')).toBe('Alpha, from 1950');
    // a modelled drummer with no start year, and a stub placed by its edge
    expect(person('Foxtrot').getAttribute('aria-label')).toBe('Foxtrot, dates unknown');
    expect(person('Echo').getAttribute('aria-label')).toBe('Echo, around the 1950s');
    expect(screen.getByText('Dates unknown')).toBeTruthy();
  });

  it('draws a record as a larger dot than a stub', () => {
    show();
    const radius = (label: string) =>
      Number(person(label).querySelector('circle')?.getAttribute('r'));
    expect(radius('Beta')).toBe(6);
    expect(radius('Echo')).toBe(4);
  });

  it('puts every person the layout placed on the map, and every edge it kept', () => {
    const l = show();
    expect(screen.getAllByRole('link')).toHaveLength(l.nodes.length);
    expect(svg().querySelectorAll('path[data-kind]')).toHaveLength(l.edges.length);
  });

  it('traces nothing until someone is pointed at', () => {
    show();
    expect(svg().querySelectorAll('[data-lit]')).toHaveLength(0);
    expect(status()).toMatch(/^Point at a drummer/);
  });
});

describe('tracing by pointing', () => {
  it('lights the people someone learned from and passed on to, and dims the rest', async () => {
    const user = userEvent.setup();
    show();
    await user.hover(person('Beta'));

    expect(lit('Alpha')).toBe('true');
    expect(lit('Beta')).toBe('true');
    expect(lit('Gamma')).toBe('true');
    // a peer is not an ancestor or a descendant, and nor is a stub that feeds the peer
    expect(lit('Delta')).toBe('false');
    expect(lit('Echo')).toBe('false');
    expect(lit('Foxtrot')).toBe('false');
  });

  it('lights the directed edges on the path and dims every other', async () => {
    const user = userEvent.setup();
    show();
    await user.hover(person('Beta'));

    expect(edge('influence')?.getAttribute('data-lit')).toBe('true');
    expect(edge('teacher')?.getAttribute('data-lit')).toBe('true');
    // undirected edges never trace, even the one that touches the traced person
    expect(edge('peer')?.getAttribute('data-lit')).toBe('false');
    expect(edge('family')?.getAttribute('data-lit')).toBe('false');
    expect(edge('succession')?.getAttribute('data-lit')).toBe('false');
  });

  it('draws a traced edge heavier and clearer than a dimmed one', async () => {
    const user = userEvent.setup();
    show();
    await user.hover(person('Beta'));
    expect(Number(edge('influence')?.getAttribute('stroke-width'))).toBeGreaterThan(
      Number(edge('peer')?.getAttribute('stroke-width'))
    );
    expect(Number(edge('influence')?.getAttribute('stroke-opacity'))).toBeGreaterThan(
      Number(edge('peer')?.getAttribute('stroke-opacity'))
    );
  });

  it('follows the chain however far back, not only one step', async () => {
    const user = userEvent.setup();
    show();
    await user.hover(person('Gamma'));
    // Gamma's ancestors: Beta (taught) and, through Beta, Alpha
    expect(lit('Alpha')).toBe('true');
    expect(lit('Beta')).toBe('true');
    expect(lit('Delta')).toBe('false');
    expect(status()).toBe('Gamma: learned from 2, passed on to 0.');
  });

  it('names the counts in the status line', async () => {
    const user = userEvent.setup();
    show();
    await user.hover(person('Beta'));
    expect(status()).toBe('Beta: learned from 1, passed on to 1.');
    await user.hover(person('Foxtrot'));
    expect(status()).toBe('Foxtrot: learned from 0, passed on to 0.');
  });

  it('lets go when the pointer leaves', async () => {
    const user = userEvent.setup();
    show();
    await user.hover(person('Beta'));
    expect(lit('Delta')).toBe('false');
    await user.unhover(person('Beta'));
    expect(svg().querySelectorAll('[data-lit]')).toHaveLength(0);
    expect(status()).toMatch(/^Point at a drummer/);
  });

  it('traces on keyboard focus as well, and clears on blur', () => {
    show();
    fireEvent.focus(person('Beta'));
    expect(lit('Alpha')).toBe('true');
    expect(lit('Delta')).toBe('false');
    fireEvent.blur(person('Beta'));
    expect(svg().querySelectorAll('[data-lit]')).toHaveLength(0);
  });

  it('keeps a keyboard trace when the mouse leaves another drummer', async () => {
    const user = userEvent.setup();
    show();
    fireEvent.focus(person('Beta'));
    await user.hover(person('Alpha'));
    await user.unhover(person('Alpha'));
    // Beta still has focus, so Beta is still traced
    expect(lit('Gamma')).toBe('true');
    expect(lit('Delta')).toBe('false');
    expect(status()).toMatch(/^Beta:/);
  });
});

describe('Trace a drummer', () => {
  it('offers only people with a record, by name, after Nobody', async () => {
    const user = userEvent.setup();
    show();
    await user.click(tracePicker());
    const options = [...menuOf(tracePicker()).querySelectorAll('[role="option"]')].map(
      (o) => o.textContent
    );
    // the stub, Echo, is on the map but not a choice
    expect(options).toEqual(['Nobody', 'Alpha', 'Beta', 'Delta', 'Foxtrot', 'Gamma']);
  });

  it('keeps a picked trace with nobody pointed at, until it is cleared', async () => {
    const user = userEvent.setup();
    show();
    await pickOption(user, tracePicker(), 'drummer:beta');

    expect(lit('Alpha')).toBe('true');
    expect(lit('Gamma')).toBe('true');
    expect(lit('Delta')).toBe('false');
    expect(status()).toBe('Beta: learned from 1, passed on to 1.');

    await pickOption(user, tracePicker(), '');
    expect(svg().querySelectorAll('[data-lit]')).toHaveLength(0);
  });

  it('lets pointing at someone else override the pick, and returns to it after', async () => {
    const user = userEvent.setup();
    show();
    await pickOption(user, tracePicker(), 'drummer:beta');
    await user.hover(person('Gamma'));
    expect(status()).toMatch(/^Gamma:/);
    await user.unhover(person('Gamma'));
    expect(status()).toMatch(/^Beta:/);
  });

  it('is let go by Escape', async () => {
    const user = userEvent.setup();
    show();
    await pickOption(user, tracePicker(), 'drummer:beta');
    expect(lit('Alpha')).toBe('true');

    await user.keyboard('{Escape}');
    expect(svg().querySelectorAll('[data-lit]')).toHaveLength(0);
    expect(status()).toMatch(/^Point at a drummer/);
  });

  it('closes an open list on the first Escape and lets go of the trace on the second', async () => {
    const user = userEvent.setup();
    show();
    await pickOption(user, tracePicker(), 'drummer:beta');
    await user.click(tracePicker());
    expect(tracePicker().getAttribute('aria-expanded')).toBe('true');

    await user.keyboard('{Escape}');
    expect(tracePicker().getAttribute('aria-expanded')).toBe('false');
    expect(lit('Alpha')).toBe('true');

    await user.keyboard('{Escape}');
    expect(svg().querySelectorAll('[data-lit]')).toHaveLength(0);
  });

  it('opens already tracing the person it is given', () => {
    show('drummer:beta');
    expect(lit('Alpha')).toBe('true');
    expect(lit('Beta')).toBe('true');
    expect(lit('Gamma')).toBe('true');
    expect(lit('Delta')).toBe('false');
    expect(status()).toBe('Beta: learned from 1, passed on to 1.');
    // and the picker shows who
    expect(tracePicker().textContent).toContain('Beta');
  });

  it('opens untraced when given no one', () => {
    show(null);
    expect(svg().querySelectorAll('[data-lit]')).toHaveLength(0);
  });
});

describe('the links filter', () => {
  it('has a box per kind of link, all on, labelled in words', () => {
    show();
    for (const name of [
      'Influence',
      'Teacher',
      'Took the chair',
      'Played together',
      'Family',
      'Same record',
    ]) {
      expect(kindBox(name)).toBeChecked();
    }
    expect(edgeKinds().sort()).toEqual(['family', 'influence', 'peer', 'succession', 'teacher']);
  });

  it('removes that kind’s edges and no others when its box is cleared', async () => {
    const user = userEvent.setup();
    show();
    await user.click(kindBox('Played together'));
    expect(edgeKinds().sort()).toEqual(['family', 'influence', 'succession', 'teacher']);
    expect(edge('peer')).toBeNull();
  });

  it('brings them back when the box is ticked again', async () => {
    const user = userEvent.setup();
    show();
    await user.click(kindBox('Family'));
    expect(edge('family')).toBeNull();
    await user.click(kindBox('Family'));
    expect(edge('family')).not.toBeNull();
  });

  it('takes a stub off the map when its only edge goes, and keeps a drummer with a record', async () => {
    const user = userEvent.setup();
    show();
    expect(maybePerson('Echo')).not.toBeNull();

    await user.click(kindBox('Took the chair'));

    // Echo was there only for its succession edge
    expect(maybePerson('Echo')).toBeNull();
    // Delta has a record, and still has its peer edge; Foxtrot has neither edge and stays
    expect(maybePerson('Delta')).not.toBeNull();
    expect(maybePerson('Foxtrot')).not.toBeNull();
  });

  it('keeps a modelled drummer on the map when every one of their edges is hidden', async () => {
    const user = userEvent.setup();
    show();
    for (const name of ['Influence', 'Teacher', 'Took the chair', 'Played together', 'Family']) {
      await user.click(kindBox(name));
    }
    expect(edgeKinds()).toEqual([]);
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/drummers/alpha', '/drummers/gamma', '/drummers/foxtrot'])
    );
    expect(maybePerson('Echo')).toBeNull();
  });

  it('traces over the edges that are still drawn', async () => {
    const user = userEvent.setup();
    show();
    // hide the teacher link: Gamma is no longer reachable from Beta through it
    await user.click(kindBox('Teacher'));
    await user.hover(person('Beta'));
    expect(lit('Alpha')).toBe('true');
    expect(lit('Gamma')).toBe('false');
    expect(status()).toBe('Beta: learned from 1, passed on to 0.');
  });
});

describe('How sure', () => {
  it('starts at any claim', () => {
    show();
    expect(floorPicker().textContent).toContain('Any claim');
    expect(edgeKinds()).toHaveLength(5);
  });

  it('Verified only keeps verified edges, dropping a claim with no confidence as the weakest', async () => {
    const user = userEvent.setup();
    show();
    await pickOption(user, floorPicker(), 'verified');
    expect(edgeKinds()).toEqual(['influence']);
    // Echo's only edge was speculative
    expect(maybePerson('Echo')).toBeNull();
    // Alpha and Beta are on it; the modelled rest stay
    expect(maybePerson('Delta')).not.toBeNull();
  });

  it('Widely reported or surer keeps verified and widely reported', async () => {
    const user = userEvent.setup();
    show();
    await pickOption(user, floorPicker(), 'widely_reported');
    expect(edgeKinds().sort()).toEqual(['influence', 'teacher']);
  });

  it('Likely or surer drops the speculative and unstated claims, and the stub they held', async () => {
    const user = userEvent.setup();
    show();
    await pickOption(user, floorPicker(), 'likely');
    expect(edgeKinds().sort()).toEqual(['influence', 'peer', 'teacher']);
    expect(maybePerson('Echo')).toBeNull();
  });

  it('can be loosened again', async () => {
    const user = userEvent.setup();
    show();
    await pickOption(user, floorPicker(), 'verified');
    await pickOption(user, floorPicker(), '');
    expect(edgeKinds()).toHaveLength(5);
    expect(maybePerson('Echo')).not.toBeNull();
  });

  it('combines with the kind filter', async () => {
    const user = userEvent.setup();
    show();
    await pickOption(user, floorPicker(), 'likely');
    await user.click(kindBox('Influence'));
    expect(edgeKinds().sort()).toEqual(['peer', 'teacher']);
  });
});

describe('how an edge is drawn', () => {
  it('dashes a claim weaker than likely and one with no confidence, and no other', () => {
    show();
    // verified, widely reported, likely: solid
    expect(edge('influence')?.hasAttribute('stroke-dasharray')).toBe(false);
    expect(edge('teacher')?.hasAttribute('stroke-dasharray')).toBe(false);
    expect(edge('peer')?.hasAttribute('stroke-dasharray')).toBe(false);
    // speculative, and null
    expect(edge('succession')?.getAttribute('stroke-dasharray')).toBe('4 3');
    expect(edge('family')?.getAttribute('stroke-dasharray')).toBe('4 3');
  });

  it('puts an arrowhead of its own kind on a directed edge, and none on an undirected one', () => {
    show();
    expect(edge('influence')?.getAttribute('marker-end')).toMatch(/^url\(#.+-arrow-influence\)$/);
    expect(edge('teacher')?.getAttribute('marker-end')).toMatch(/^url\(#.+-arrow-teacher\)$/);
    expect(edge('succession')?.getAttribute('marker-end')).toMatch(/-arrow-succession\)$/);
    expect(edge('peer')?.hasAttribute('marker-end')).toBe(false);
    expect(edge('family')?.hasAttribute('marker-end')).toBe(false);
  });

  it('points the arrowhead at a marker that exists', () => {
    show();
    const ref = edge('influence')?.getAttribute('marker-end') ?? '';
    const id = /url\(#(.+)\)/.exec(ref)?.[1] ?? '';
    expect(id).not.toBe('');
    expect(svg().querySelector(`marker[id="${CSS.escape(id)}"]`)).not.toBeNull();
  });

  it('draws each edge from one person’s dot to the other’s', () => {
    const l = show();
    const alpha = l.nodes.find((n) => n.id === 'drummer:alpha');
    const beta = l.nodes.find((n) => n.id === 'drummer:beta');
    const d = edge('influence')?.getAttribute('d') ?? '';
    expect(d.startsWith(`M ${alpha?.x} ${alpha?.y} `)).toBe(true);
    expect(d.endsWith(`${beta?.x} ${beta?.y}`)).toBe(true);
  });
});

describe('zoom', () => {
  const width = () => Number(svg().getAttribute('width'));
  const zoomIn = () => screen.getByRole('button', { name: 'Zoom in' });
  const zoomOut = () => screen.getByRole('button', { name: 'Zoom out' });

  it('starts at the layout’s own size with the reset disabled', () => {
    const l = show();
    expect(width()).toBe(l.width);
    expect(Number(svg().getAttribute('height'))).toBe(l.height);
    expect(svg().getAttribute('viewBox')).toBe(`0 0 ${l.width} ${l.height}`);
    expect(screen.getByRole('button', { name: '100%' }).hasAttribute('disabled')).toBe(true);
  });

  it('scales the drawing without changing what is drawn in it', async () => {
    const user = userEvent.setup();
    const l = show();
    await user.click(zoomIn());
    expect(width()).toBe(l.width * 1.25);
    expect(Number(svg().getAttribute('height'))).toBe(l.height * 1.25);
    // the coordinates the dots are drawn at are the layout's, at any zoom
    expect(svg().getAttribute('viewBox')).toBe(`0 0 ${l.width} ${l.height}`);
    expect(screen.getByRole('button', { name: '125%' })).toBeTruthy();
  });

  it('stops at 150% and at 50%, disabling the button that would go past', async () => {
    const user = userEvent.setup();
    const l = show();

    await user.click(zoomIn());
    await user.click(zoomIn());
    expect(width()).toBe(l.width * 1.5);
    expect(zoomIn().hasAttribute('disabled')).toBe(true);
    expect(zoomOut().hasAttribute('disabled')).toBe(false);

    await user.click(screen.getByRole('button', { name: '150%' }));
    expect(width()).toBe(l.width);

    await user.click(zoomOut());
    await user.click(zoomOut());
    expect(width()).toBe(l.width * 0.5);
    expect(zoomOut().hasAttribute('disabled')).toBe(true);
    expect(zoomIn().hasAttribute('disabled')).toBe(false);
  });
});
