/**
 * `?drawer=&tab=` — read from the URL, so every value is checked and anything
 * that is not a tool or a tab is dropped rather than trusted.
 *
 * @see components/app/shell/studio-address.ts
 */

import { describe, expect, it } from 'vitest';

import { readStudioDrawer, studioDrawerHref } from '@/components/app/shell/studio-address';

describe('readStudioDrawer', () => {
  it('reads a tool, and a Patterns tab with it', () => {
    expect(readStudioDrawer({ drawer: 'kit' })).toEqual({ tool: 'kit' });
    expect(readStudioDrawer({ drawer: 'patterns', tab: 'libraries' })).toEqual({
      tool: 'patterns',
      tab: 'libraries',
    });
  });

  it('keeps the drawer and drops a tab that is not one', () => {
    expect(readStudioDrawer({ drawer: 'patterns', tab: 'secret' })).toEqual({ tool: 'patterns' });
  });

  it('drops a tab on any drawer but Patterns — only that drawer has tabs', () => {
    expect(readStudioDrawer({ drawer: 'kit', tab: 'libraries' })).toEqual({ tool: 'kit' });
  });

  it.each([
    ['nothing', {}],
    ['not a tool', { drawer: 'admin' }],
    ['repeated', { drawer: ['patterns', 'kit'] }],
    ['a tool name in the wrong case', { drawer: 'Patterns' }],
  ])('opens no drawer for %s', (_, query) => {
    expect(readStudioDrawer(query)).toBeUndefined();
  });
});

describe('studioDrawerHref', () => {
  it('builds the address the page reads back', () => {
    const href = studioDrawerHref({ tool: 'patterns', tab: 'libraries' });
    expect(href).toBe('/studio?drawer=patterns&tab=libraries');
    const q = new URL(href, 'https://x.test').searchParams;
    expect(readStudioDrawer({ drawer: q.get('drawer'), tab: q.get('tab') })).toEqual({
      tool: 'patterns',
      tab: 'libraries',
    });
  });

  it('leaves a tab off a drawer that has none', () => {
    expect(studioDrawerHref({ tool: 'kit', tab: 'libraries' })).toBe('/studio?drawer=kit');
  });
});
