import type { Engraving, SvgNode } from '@/lib/app/breaks/engrave';

/**
 * An engraving as a standalone SVG document (Phase 6, task 6.6) — what the
 * Open Graph image of a pattern embeds, where there is no page stylesheet.
 *
 * The engraver paints with CSS variables (`--ink`, `--faint`, `--f-mono`,
 * `--f-body`) that the Studio and the pages define. A standalone SVG has
 * nothing to resolve them against, so they are replaced here with the values
 * given. Text and attribute values are escaped: a pattern's name is user
 * content and ends up inside this markup.
 */
export type SvgVars = Record<'ink' | 'faint' | 'f-mono' | 'f-body', string>;

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/* A tag or attribute name from the engraver is always a plain SVG name; this
   refuses anything else rather than trusting that it stays so. */
const NAME = /^[a-zA-Z][a-zA-Z0-9:-]*$/;

function withVars(value: string | number, vars: SvgVars): string {
  return String(value).replace(
    /var\(--(ink|faint|f-mono|f-body)\)/g,
    (_, name: keyof SvgVars) => vars[name]
  );
}

function node(n: SvgNode, vars: SvgVars): string {
  if (!NAME.test(n.tag)) return '';
  const attrs = Object.entries(n.attrs)
    .filter(([name]) => NAME.test(name))
    .map(([name, value]) => ` ${name}="${escapeXml(withVars(value, vars))}"`)
    .join('');
  const inner = n.children?.length
    ? n.children.map((c) => node(c, vars)).join('')
    : escapeXml(n.text ?? '');
  return `<${n.tag}${attrs}>${inner}</${n.tag}>`;
}

export function svgMarkup(engraving: Engraving, vars: SvgVars, background?: string): string {
  const { width, height } = engraving;
  const bg = background
    ? `<rect x="0" y="0" width="${width}" height="${height}" fill="${escapeXml(background)}"/>`
    : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    bg +
    engraving.nodes.map((n) => node(n, vars)).join('') +
    '</svg>'
  );
}
