/**
 * `svgMarkup` — an engraving as a standalone SVG document (Phase 6, task
 * 6.6): what the Open Graph image embeds, where there is no page stylesheet
 * to resolve `var(--ink)` and friends against.
 *
 * A pattern's name is user content and ends up inside this markup, so the
 * escaping here is a real security surface, not decoration — tested with
 * both hand-built fixtures and a real `engrave()` output.
 *
 * @see lib/app/breaks/community/svg-markup.ts
 */

import { describe, expect, it } from 'vitest';

import { escapeXml, svgMarkup, type SvgVars } from '@/lib/app/breaks/community/svg-markup';
import { deriveB, generatePattern } from '@/lib/app/breaks/generate';
import { engrave } from '@/lib/app/breaks/engrave';
import type { Engraving, SvgNode } from '@/lib/app/breaks/engrave';
import { testStyle } from '@/tests/helpers/catalogue';

const VARS: SvgVars = { ink: '#111111', faint: '#888888', 'f-mono': 'monospace', 'f-body': 'sans' };

function engraving(nodes: SvgNode[], overrides: Partial<Engraving> = {}): Engraving {
  return { nodes, map: [], width: 400, height: 200, steps: 16, label: 'A break', ...overrides };
}

describe('escapeXml', () => {
  it('escapes the five XML special characters', () => {
    expect(escapeXml(`<script>&"'</script>`)).toBe('&lt;script&gt;&amp;&quot;&#39;&lt;/script&gt;');
  });
});

describe('svgMarkup', () => {
  it('resolves every var(--*) reference to the given value', () => {
    const node: SvgNode = { tag: 'rect', attrs: { fill: 'var(--ink)', stroke: 'var(--faint)' } };
    const out = svgMarkup(engraving([node]), VARS);
    expect(out).toContain('fill="#111111"');
    expect(out).toContain('stroke="#888888"');
    expect(out).not.toContain('var(--');
  });

  it('resolves the font vars too', () => {
    const node: SvgNode = { tag: 'text', attrs: { 'font-family': 'var(--f-mono)' }, text: 'A' };
    const out = svgMarkup(engraving([node]), VARS);
    expect(out).toContain('font-family="monospace"');
  });

  it('escapes text content — a hostile pattern name cannot inject a tag', () => {
    const node: SvgNode = { tag: 'text', attrs: {}, text: '<script>alert(1)</script>' };
    const out = svgMarkup(engraving([node]), VARS);
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes attribute values — a quote cannot break out of the attribute', () => {
    const node: SvgNode = { tag: 'text', attrs: { 'data-label': 'a "quoted" name' }, text: 'x' };
    const out = svgMarkup(engraving([node]), VARS);
    expect(out).toContain('data-label="a &quot;quoted&quot; name"');
    // the raw quote must never appear unescaped inside the attribute value
    expect(out).not.toMatch(/data-label="a "quoted/);
  });

  it('drops a node whose tag name is not a plain SVG name', () => {
    const hostile: SvgNode = { tag: 'svg onload=alert(1)', attrs: {}, text: 'gone' };
    const out = svgMarkup(engraving([hostile]), VARS);
    expect(out).not.toContain('onload');
    expect(out).not.toContain('gone');
  });

  it('drops an attribute whose name is not a plain name, keeping a well-formed sibling', () => {
    const node: SvgNode = {
      tag: 'rect',
      attrs: { 'width height': '10', width: '10', height: '20' },
    };
    const out = svgMarkup(engraving([node]), VARS);
    expect(out).not.toContain('width height');
    expect(out).toContain('width="10"');
    expect(out).toContain('height="20"');
  });

  it('adds a background rect sized to the engraving when given a background color', () => {
    const out = svgMarkup(engraving([], { width: 500, height: 300 }), VARS, '#f6f1e7');
    expect(out).toContain('<rect x="0" y="0" width="500" height="300" fill="#f6f1e7"/>');
  });

  it('omits the background rect when none is given', () => {
    const out = svgMarkup(engraving([]), VARS);
    expect(out).not.toContain('<rect');
  });

  it('renders nested children recursively', () => {
    const child: SvgNode = { tag: 'tspan', attrs: {}, text: 'inner' };
    const parent: SvgNode = { tag: 'text', attrs: {}, children: [child] };
    const out = svgMarkup(engraving([parent]), VARS);
    expect(out).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">' +
        '<text><tspan>inner</tspan></text></svg>'
    );
  });

  it('resolves every CSS variable a real engrave() output actually emits', () => {
    const funk = testStyle('funk');
    const A = generatePattern({
      style: funk,
      meter: '4/4',
      seed: 3,
      bars: 2,
      density: 50,
      ghosts: 50,
    });
    deriveB(A, funk.params); // exercised for parity with other fixtures; A alone is engraved below
    const real = engrave(A, null, { scale: 1, perSystem: 2, guides: true });
    const out = svgMarkup(real, VARS, '#f6f1e7');
    expect(out.startsWith('<svg')).toBe(true);
    expect(out.endsWith('</svg>')).toBe(true);
    expect(out).not.toContain('var(--');
  });
});
