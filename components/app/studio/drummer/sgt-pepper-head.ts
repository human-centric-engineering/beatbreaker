import type { FrontHead } from '@/lib/app/breaks/drummer/personas';

/**
 * The bass drum on the cover of Sgt. Pepper's Lonely Hearts Club Band (1967),
 * painted by Joe Ephgrave: a cream head ringed in blue, "SGT PEPPERS" arched
 * over the top and "CLUB BAND" under the bottom in fairground letters (yellow,
 * shaded deep red, outlined), "LONELY HEARTS" across the middle between two
 * red rules, and a scrolling ornament of green and yellow leaves above and
 * below it. Drawn in its own colours on a `size` square canvas, the head the
 * circle inside it; `head.ink` is the outlines, `head.ground` the cream.
 */
export function paintSgtPepper(ctx: CanvasRenderingContext2D, size: number, head: FrontHead): void {
  const c = size / 2;
  const u = size / 1000;
  const yellow = '#f3c42f';
  const red = '#c3322a';
  const green = '#3d8a3a';
  const olive = '#a88f2f';
  const blue = '#2f4f8f';
  const sky = '#9cc7e6';

  ctx.fillStyle = head.ground;
  ctx.fillRect(0, 0, size, size);

  // the ring round the edge, in blue, with a dot at each quarter inside it
  ctx.strokeStyle = blue;
  ctx.lineWidth = 7 * u;
  ctx.beginPath();
  ctx.arc(c, c, 452 * u, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3 * u;
  ctx.beginPath();
  ctx.arc(c, c, 468 * u, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = head.ink;
  for (const a of [Math.PI * 0.22, Math.PI * 0.78, Math.PI * 1.22, Math.PI * 1.78]) {
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * 430 * u, c + Math.sin(a) * 430 * u, 6 * u, 0, Math.PI * 2);
    ctx.fill();
  }

  const font = (px: number) =>
    `bold ${px * u}px "Rockwell Extra Bold", Rockwell, "Clarendon", "Georgia", serif`;

  /** One fairground letter at the origin: shaded down and right in red, outlined, faced. */
  const letter = (ch: string, px: number, face: string) => {
    ctx.font = font(px);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    // the shading, a block stepped out behind the face
    ctx.fillStyle = red;
    for (let k = 1; k <= 7; k++) ctx.fillText(ch, k * 0.9 * u, k * 0.9 * u);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5 * u;
    ctx.strokeStyle = head.ink;
    ctx.strokeText(ch, 0, 0);
    ctx.fillStyle = face;
    ctx.fillText(ch, 0, 0);
  };

  /**
   * Letters set round an arc of `radius`: over the top, read clockwise and
   * standing out from the middle; under the bottom, read the other way round,
   * still upright.
   */
  const arc = (
    parts: { ch: string; px: number; lift?: number }[],
    radius: number,
    over: boolean
  ) => {
    const gapOf = (p: { ch: string; px: number }) => {
      ctx.font = font(p.px);
      return ctx.measureText(p.ch).width + 6 * u;
    };
    const widths = parts.map(gapOf);
    const total = widths.reduce((a, b) => a + b, 0);
    let at = -total / 2;
    parts.forEach((p, i) => {
      const mid = at + widths[i] / 2;
      at += widths[i];
      const theta = mid / radius;
      ctx.save();
      if (over) {
        const a = -Math.PI / 2 + theta;
        ctx.translate(c + Math.cos(a) * radius, c + Math.sin(a) * radius);
        ctx.rotate(a + Math.PI / 2);
      } else {
        const a = Math.PI / 2 - theta;
        ctx.translate(c + Math.cos(a) * radius, c + Math.sin(a) * radius);
        ctx.rotate(a - Math.PI / 2);
      }
      ctx.translate(0, -(p.lift ?? 0) * u);
      letter(p.ch, p.px, yellow);
      ctx.restore();
    });
  };

  // "SGT" as the drum writes it, a great S with a small "gt" raised beside it
  arc(
    [
      { ch: 'S', px: 112 },
      { ch: 'g', px: 52, lift: 40 },
      { ch: 't', px: 52, lift: 40 },
      { ch: ' ', px: 30 },
      ...[...'PEPPERS'].map((ch) => ({ ch, px: 104 })),
    ],
    330 * u,
    true
  );
  arc(
    [...'CLUB BAND'].map((ch) => ({ ch: ch === ' ' ? ' ' : ch, px: ch === ' ' ? 40 : 104 })),
    388 * u,
    false
  );

  // the red rules across the middle, each with a lozenge at its centre
  for (const y of [c - 66 * u, c + 66 * u]) {
    ctx.fillStyle = red;
    ctx.fillRect(c - 300 * u, y - 5 * u, 600 * u, 10 * u);
    ctx.beginPath();
    ctx.ellipse(c, y, 46 * u, 14 * u, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // "LONELY HEARTS", tall and narrow, olive gold edged in the ink
  ctx.save();
  ctx.translate(c, c + 30 * u);
  ctx.scale(0.86, 1.12);
  ctx.font = font(92);
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4 * u;
  ctx.strokeStyle = head.ink;
  ctx.strokeText('LONELY HEARTS', 0, 0);
  ctx.fillStyle = olive;
  ctx.fillText('LONELY HEARTS', 0, 0);
  ctx.restore();

  /**
   * The ornament over the upper rule (`dir` -1) or under the lower (`dir` 1):
   * a spike up the middle against a pale burst, and on each side two leaves
   * curling out and back, green edged in yellow, their tips red.
   */
  const ornament = (dir: number) => {
    const base = c + dir * 80 * u;
    ctx.save();
    ctx.translate(c, base);
    ctx.scale(1, -dir);
    // the pale burst behind
    ctx.fillStyle = sky;
    ctx.beginPath();
    for (let k = 0; k <= 12; k++) {
      const a = Math.PI + (k / 12) * Math.PI;
      const r = (k % 2 ? 70 : 120) * u;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.9);
    }
    ctx.closePath();
    ctx.fill();
    for (const side of [-1, 1]) {
      for (const [reach, rise, curl] of [
        [250, 70, 1],
        [170, 120, 0.8],
      ] as const) {
        const x1 = side * reach * u;
        const y1 = -rise * u;
        ctx.beginPath();
        ctx.moveTo(side * 14 * u, -8 * u);
        ctx.bezierCurveTo(side * reach * 0.45 * u, -rise * 1.5 * u, x1, y1 - 40 * u * curl, x1, y1);
        ctx.bezierCurveTo(
          x1 - side * 30 * u,
          y1 + 26 * u,
          side * reach * 0.4 * u,
          -rise * 0.35 * u,
          side * 14 * u,
          8 * u
        );
        ctx.closePath();
        ctx.fillStyle = green;
        ctx.fill();
        ctx.lineWidth = 7 * u;
        ctx.strokeStyle = yellow;
        ctx.stroke();
        ctx.lineWidth = 2.5 * u;
        ctx.strokeStyle = head.ink;
        ctx.stroke();
        // the curled tip
        ctx.beginPath();
        ctx.arc(x1 - side * 10 * u, y1 + 6 * u, 13 * u, 0, Math.PI * 2);
        ctx.fillStyle = red;
        ctx.fill();
        ctx.stroke();
      }
    }
    // the spike up the middle
    ctx.beginPath();
    ctx.moveTo(-24 * u, 0);
    ctx.quadraticCurveTo(-10 * u, -90 * u, 0, -170 * u);
    ctx.quadraticCurveTo(10 * u, -90 * u, 24 * u, 0);
    ctx.closePath();
    ctx.fillStyle = green;
    ctx.fill();
    ctx.lineWidth = 6 * u;
    ctx.strokeStyle = yellow;
    ctx.stroke();
    ctx.lineWidth = 2.5 * u;
    ctx.strokeStyle = head.ink;
    ctx.stroke();
    ctx.restore();
  };
  ornament(-1);
  ornament(1);
}
