import type { FrontHead } from '@/lib/app/breaks/drummer/personas';

/**
 * A cathedral's rose window, as on Nicko McBrain's bass drum (from a
 * photograph the owner supplied, 2026-10-27): a gold rosette at the middle,
 * rings of petals and arched lights round it in reds, blues, teal and violet,
 * and a band of roundels round the edge, every pane leaded in `head.ink`.
 * Drawn in its own colours on a `size` square canvas, the head the circle
 * inside it; `head.ground` shows between the outer lights.
 */
export function paintRoseWindow(
  ctx: CanvasRenderingContext2D,
  size: number,
  head: FrontHead
): void {
  const c = size / 2;
  const u = size / 1000;
  const gold = '#f2c230';
  const orange = '#e8762a';
  const red = '#c8302a';
  const blue = '#2f6fd0';
  const sky = '#5fb4e8';
  const teal = '#2aa198';
  const violet = '#7a3fa0';
  const lead = 6 * u;

  ctx.fillStyle = head.ground;
  ctx.fillRect(0, 0, size, size);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = head.ink;

  const pane = (fill: string, draw: () => void, width = lead) => {
    ctx.beginPath();
    draw();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = width;
    ctx.stroke();
  };
  const disc = (x: number, y: number, r: number) => () => ctx.arc(x, y, r, 0, Math.PI * 2);
  const at = (a: number, r: number): [number, number] => [
    c + Math.cos(a) * r * u,
    c + Math.sin(a) * r * u,
  ];

  // the band round the edge: roundels on blue, red and gold by turns
  pane(blue, disc(c, c, 492 * u));
  pane(head.ground, disc(c, c, 438 * u));
  for (let i = 0; i < 28; i++) {
    const [x, y] = at((i / 28) * Math.PI * 2, 465);
    pane(i % 2 ? gold : red, disc(x, y, 19 * u));
  }

  // the arched lights: sixteen, each a wedge capped by an arch, blue and red by turns
  const lights = 16;
  for (let i = 0; i < lights; i++) {
    const a = (i / lights) * Math.PI * 2;
    const half = (Math.PI / lights) * 0.8;
    pane(i % 2 ? red : blue, () => {
      ctx.moveTo(...at(a - half, 290));
      ctx.lineTo(...at(a - half, 380));
      // the arch, a semicircle over the wedge's outer end
      const [x, y] = at(a, 380);
      ctx.arc(x, y, Math.sin(half) * 380 * u, a - Math.PI / 2, a + Math.PI / 2);
      ctx.lineTo(...at(a + half, 290));
      ctx.arc(c, c, 290 * u, a + half, a - half, true);
      ctx.closePath();
    });
    const [x, y] = at(a, 360);
    pane(i % 2 ? sky : gold, disc(x, y, 20 * u));
  }

  // the petals: sixteen teal and violet, then twelve red and orange
  const petals = (
    n: number,
    r0: number,
    r1: number,
    width: number,
    colours: string[],
    turn = 0
  ) => {
    for (let i = 0; i < n; i++) {
      const a = ((i + turn) / n) * Math.PI * 2;
      const [x, y] = at(a, (r0 + r1) / 2);
      pane(colours[i % colours.length], () =>
        ctx.ellipse(x, y, ((r1 - r0) / 2) * u, width * u, a, 0, Math.PI * 2)
      );
    }
  };
  pane(violet, disc(c, c, 285 * u));
  petals(16, 170, 282, 34, [teal, violet], 0.5);
  pane(orange, disc(c, c, 168 * u));
  petals(12, 78, 165, 30, [red, gold]);

  // the rosette at the middle: rings of gold round a blue eye
  pane(gold, disc(c, c, 76 * u));
  pane(orange, disc(c, c, 52 * u));
  pane(gold, disc(c, c, 34 * u));
  pane(blue, disc(c, c, 16 * u));
}
