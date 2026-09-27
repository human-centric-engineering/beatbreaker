import { ImageResponse } from 'next/og';

import { getPublicPattern } from '@/lib/app/breaks/community/public';
import { svgMarkup } from '@/lib/app/breaks/community/svg-markup';
import { slugSchema } from '@/lib/app/breaks/community/visibility';
import { engrave } from '@/lib/app/breaks/engrave';
import { breakDocFromPayload } from '@/lib/app/breaks/share';
import { BRAND } from '@/lib/brand';

/**
 * The link preview for a shared pattern (Phase 6, task 6.6): its notation,
 * so a `/p/` link pasted into a chat app shows the groove, not a logo.
 *
 * The engraving is serialised to a standalone SVG (`svgMarkup`, which fills
 * in the colours and faces the page's stylesheet would) and drawn as an image.
 * The first two bars of section A — what fits a card and reads at a glance.
 * A private or missing pattern gets the site's name and nothing else, so the
 * image cannot be used to probe addresses either.
 */

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Drum notation for a pattern on BeatBreaker';

/* UTF-8 bytes, base64'd — a title can hold any character, and btoa takes Latin-1 only. */
function toBase64(text: string): string {
  let bin = '';
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin);
}

const PAPER = '#f6f1e7';
const INK = '#1d1b18';
const FAINT = '#8a8278';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const slug = slugSchema.safeParse((await params).slug);
  const pattern = slug.success ? await getPublicPattern(slug.data) : null;

  if (!pattern) {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: PAPER,
          color: INK,
          fontSize: 72,
        }}
      >
        {BRAND.name}
      </div>,
      size
    );
  }

  const doc = breakDocFromPayload(pattern.doc);
  const A = { ...doc.A, bars: doc.A.bars.slice(0, 2) };
  const engraving = engrave(A, null, { scale: 1.6, perSystem: 2, guides: true });
  const svg = svgMarkup(engraving, {
    ink: INK,
    faint: FAINT,
    'f-mono': 'monospace',
    'f-body': 'sans-serif',
  });
  const src = `data:image/svg+xml;base64,${toBase64(svg)}`;
  const scale = Math.min(1100 / engraving.width, 400 / engraving.height);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: PAPER,
        color: INK,
        padding: 48,
      }}
    >
      <div style={{ display: 'flex', fontSize: 52, fontWeight: 700 }}>{pattern.title}</div>
      <div style={{ display: 'flex', fontSize: 28, color: FAINT, marginTop: 8 }}>
        {pattern.author ? `@${pattern.author} · ` : ''}
        {pattern.meter} · {pattern.bpm} bpm · {BRAND.name}
      </div>
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <img
          src={src}
          width={Math.round(engraving.width * scale)}
          height={Math.round(engraving.height * scale)}
          alt=""
        />
      </div>
    </div>,
    size
  );
}
