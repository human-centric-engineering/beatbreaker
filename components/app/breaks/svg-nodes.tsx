import type { ReactElement, ReactNode } from 'react';

import type { SvgNode } from '@/lib/app/breaks/engrave';

/**
 * The engraver's node tree as React elements.
 *
 * No `'use client'`: the Studio's stave renders through this in the browser,
 * and Home's thumbnails render through it on the server. One translation, so
 * the two cannot draw the same engraving differently.
 */

export function renderSvgNode(node: SvgNode, key: number): ReactElement {
  const { tag, attrs, text, children } = node;
  const props = reactAttrs(attrs);
  if (children?.length) {
    return renderTag(
      tag,
      key,
      props,
      children.map((c, i) => renderSvgNode(c, i))
    );
  }
  return renderTag(tag, key, props, text);
}

/**
 * The engraver names attributes the way SVG does — `stroke-width`,
 * `text-anchor` — because that spelling is what a serialised `.svg` or a
 * server-rendered PDF needs, and it is what the engraver's tests read. React
 * wants its own camelCase spelling for every SVG attribute it knows, and warns
 * on the hyphenated one, so the translation happens here, at the boundary
 * where React is the consumer, rather than being baked into the node tree.
 *
 * `data-` and `aria-` keep their hyphens: those React passes through as-is.
 */
function reactAttrs(attrs: Record<string, string | number>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(attrs)) {
    out[camelCache.get(name) ?? cacheCamel(name)] = value;
  }
  return out;
}

const camelCache = new Map<string, string>();

function cacheCamel(name: string): string {
  const camel =
    name.includes('-') && !name.startsWith('data-') && !name.startsWith('aria-')
      ? name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
      : name;
  camelCache.set(name, camel);
  return camel;
}

/**
 * `key` is a React directive, not an attribute: it is taken separately and put
 * on the element directly, because spreading it in warns and, in a future
 * React, would stop reaching the reconciler at all.
 */
function renderTag(
  tag: string,
  key: number,
  props: Record<string, unknown>,
  children: ReactNode
): ReactElement {
  const El = tag as 'g';
  return (
    <El key={key} {...props}>
      {children}
    </El>
  );
}
