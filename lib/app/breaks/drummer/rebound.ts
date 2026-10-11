import { STICK } from '@/lib/app/breaks/drummer/kit-layout';
import type { Hit } from '@/lib/app/breaks/drummer/timeline';

/**
 * A stick bouncing in a hand (experiment: the drummer view).
 *
 * The stroke planner (`strokes.ts`) says where a drummer *means* the tip to be:
 * up to the next note's height, waiting, thrown. This is what the stick does
 * about it. It is a rigid rod pivoting at the fulcrum — the pinch of thumb and
 * first finger — in a hand that turns at the wrist:
 *
 * - **The head throws it back.** The tip leaves the head at `e` of the speed it
 *   met it with (`restitution`: a snare gives back more than a floor tom, a
 *   crash hardly any). The fulcrum sits a third of the way up the stick, which
 *   for a rod is the conjugate of the tip's centre of percussion: a blow at the
 *   tip turns the stick about the fulcrum and does not jolt the hand. So the
 *   rebound is the stick's alone — it leaps up in the fingers while the hand is
 *   still where it struck.
 * - **The fingers let it fly, then catch it.** Above where the fingers hold it
 *   there is slack — the back fingers open, the butt swings away from the palm —
 *   and in the slack the stick flies on its own, slowing under its weight. Past
 *   it the back fingers take it like a spring. A downstroke closes the slack and
 *   stiffens the spring: the stick is stopped low. With the next note close
 *   behind, the fingers hardly open at all: they keep the stick near and meter
 *   its bounce, so fast notes stay low.
 * - **The hand follows the stick.** The wrist is a soft servo on the plan, and
 *   the fingers' catch pushes back on it, so a rebound lifts the hand on its way
 *   to the next note's height ("your hands follow your sticks"). A free stroke
 *   is the stick doing the lifting; an upstroke is the hand adding what the
 *   rebound did not give.
 * - **The throw lands on time.** A drummer meets the note, not near it: the
 *   last stretch before each note is thrown, from wherever the hand and stick
 *   are, to the head at the instant it sounds and at the speed the stroke's
 *   height gives. The wrist starts the throw a moment before the stick, which
 *   lags in the fingers — the whip.
 *
 * Everything here is planar and in two angles: the hand's turn at the wrist
 * (`phi`) and the stick's turn in the fingers (`psi`), both 0 with the tip on
 * the head. The tip's height is `R_HAND·phi + R_TIP·psi`. The numbers and their
 * sources are in `.context/app/planning/rebound-research.md`.
 */

/** The stick as a rigid body: a 5A-class hickory stick. */
export const STICK_BODY = {
  /** Mass, kg. */
  mass: 0.053,
  /** Centre of mass from the butt, metres: behind the middle, the shoulder and tip being thinner. */
  com: 0.176,
} as const;

const G = 9.81;
/** Fulcrum to tip, and wrist to tip (wrist to fulcrum plus that), metres. */
export const R_TIP = STICK.length - STICK.grip;
const R_WRIST = 0.13;
export const R_HAND = R_WRIST + R_TIP;
/** The stick's moment of inertia about the fulcrum, kg·m²: a rod's about its centre, moved over. */
const D_COM = STICK_BODY.com - STICK.grip;
const I_STICK =
  (STICK_BODY.mass * STICK.length * STICK.length) / 12 + STICK_BODY.mass * D_COM * D_COM;
/** Its weight's turn about the fulcrum, N·m: tip down. */
const WEIGHT = STICK_BODY.mass * G * D_COM;
/** The hand's moment of inertia about the wrist, kg·m². */
const I_HAND = 0.0035;

/**
 * How far the stick turns up in open fingers before the back fingers take it,
 * radians: 20°, the tip some ten centimetres — the top of the 10–20° the back
 * fingers open at the top of a free stroke, and inside push-pull's 10–25°
 * (`grip-research.md` §2.2, §1.5). Less, and the back fingers catch the stick
 * so soon that it lifts the hand with it off the head. Closed for a downstroke.
 */
const SLACK = 0.35;
/** Between notes this close, seconds, the fingers do not open for the rebound; this far apart, all the way. */
const OPEN_GAP = [0.1, 0.35] as const;

/** How long the fingers take to close on the stick again once the hand has caught it up, seconds. */
const REGRIP = 0.06;

/**
 * The grip as a spring about the fulcrum, N·m/rad: the thumb and first finger
 * holding the stick where the hand means it, loose and closed; and the back
 * fingers and palm taking it past the slack, a firmer stop.
 */
const GRIP_LOOSE = 2;
const GRIP_TIGHT = 7;
const CATCH = 8;
/** Its damping, as a share of critical. */
const GRIP_DAMP_LOOSE = 0.6;
const GRIP_DAMP_TIGHT = 0.9;
/** How soon the grip closes on a downstroke's rebound, seconds. */
const CLOSE = 0.012;
/**
 * A grip closed at the head: how much less of the blow it gives back, and how
 * much of it goes into the hand rather than the stick turning in the fingers
 * (Dahl & Altenmüller: a controlled stroke is shorter on the head, and
 * rebounds less).
 */
const CLOSED_GIVES = 0.3;
const CLOSED_TAKES = 0.25;
/** How far below where the fingers hold it the stick sits before they carry all its weight, radians. */
const CARRY = 0.01;
/** The wrist as a servo on the plan, natural frequency rad/s: relaxed, and set to hold a downstroke. */
const WRIST_SOFT = 2 * Math.PI * 4;
const WRIST_FIRM = 2 * Math.PI * 9;
const WRIST_DAMP = 0.75;

/** The step results are kept at, seconds, and how many integration steps each is. */
const STEP = 0.001;
const SUB = 2;
const DT = STEP / SUB;

/** How long a rebound is simulated before the plan takes over, seconds: it has settled by then. */
export const SIM_MAX = 1.2;
/** The last stretch of it over which it hands over to the plan, seconds. */
const HANDOVER = 0.2;
/**
 * How far the wrist runs ahead of the stick, as a share of the time between
 * the notes, and at most, seconds. The hand comes up first with the stick
 * lagging tip down, turns down while the stick is still rising, and throws it
 * like the end of a whip; at a fast tempo the lead all but goes, the hand and
 * stick moving nearly in anti-phase (Dahl). Dahl measures 10–20% of a slow
 * cycle; held to 35 ms here, since a longer lead swings the stick further in
 * the fingers than the wrist's range leaves room for.
 */
const LEAD_SHARE = 0.12;
const LEAD_MAX = 0.035;

/** How far the wrist runs ahead of the stick between notes `gap` seconds apart. */
export function wristLead(gap: number): number {
  return Number.isFinite(gap) ? Math.min(LEAD_MAX, LEAD_SHARE * gap) : 0;
}

/** How lively a piece is under a stick: the restitution of a slow stroke, and how fast it falls off with speed. */
interface Surface {
  e: number;
  /** Per m/s of impact speed (a harder blow loses more in the head). */
  fade: number;
}

/**
 * The one measured figure is a tom's: 0.73 at 6.3 m/s from a stick-weight arm
 * with no hand (Yamaha, US8916759B2). The rest are set against it — a snare
 * tuned tighter gives back more, a floor tom slacker less, a cymbal swings
 * away from the stick — with `fade` set so a tom gives that 0.73 at 6.3 m/s.
 */
const SURFACE: Record<Hit['piece'], Surface> = {
  snare: { e: 0.92, fade: 0.025 },
  tom1: { e: 0.87, fade: 0.026 },
  tom2: { e: 0.84, fade: 0.028 },
  floor: { e: 0.75, fade: 0.032 },
  kick: { e: 0.6, fade: 0.035 },
  hat: { e: 0.7, fade: 0.03 },
  ride: { e: 0.78, fade: 0.025 },
  crash: { e: 0.55, fade: 0.03 },
  perc1: { e: 0.75, fade: 0.03 },
  perc2: { e: 0.75, fade: 0.03 },
  sticks: { e: 0.5, fade: 0.03 },
};
/** An open hat gives under the stick, its cymbals apart; the rim rings the stick, which takes it. */
const OPEN_HAT = 0.4;
const RIM = 0.45;

/** The restitution of a stroke at `speed` m/s on the piece it is played on, 0–1. */
export function restitution(hit: Hit, speed: number): number {
  const s = SURFACE[hit.piece];
  let e = s.e;
  if (hit.piece === 'hat' && hit.hat === 'open') e = OPEN_HAT;
  else if (hit.contact === 'rim') e = RIM;
  return Math.max(0.1, e * (1 - s.fade * speed));
}

/**
 * How hard a stroke is thrown, m/s² at the tip: the stick accelerated evenly
 * from where it waits, about 3½ g — so a forte stroke from a foot meets the
 * head at some 4.5 m/s, inside the 4–6 m/s measured for forte (Dahl et al.
 * 2011), and a ghost from an inch at about 1 m/s.
 */
const THROW = 34;

/**
 * The tip's speed into the head, m/s, for a stroke thrown from `height`. Not
 * from how long the throw has: a fast note is played from low, and so softly,
 * not slammed down in the time there is — which would send it back up higher
 * than there is time for.
 */
export function impactSpeed(height: number): number {
  return Math.sqrt(2 * THROW * Math.max(0, height));
}

/** How fast a tip flying loose slows, m/s²: its weight about the fulcrum, felt at the tip. */
const DECEL = (WEIGHT / I_STICK) * R_TIP;

/** How high a tip leaving the head at `speed` m/s would fly, loose in open fingers, metres. */
export function flight(speed: number): number {
  return (speed * speed) / (2 * DECEL);
}

/**
 * How long a tip leaving the head at `speed` m/s takes to fly to `height`,
 * seconds — or to the top of its flight, if that is lower.
 */
export function flightTime(speed: number, height: number): number {
  const d = speed * speed - 2 * DECEL * height;
  return d > 0 ? (speed - Math.sqrt(d)) / DECEL : speed / DECEL;
}

/** A stretch of a hand's playing between two notes (or after the last), worked out once. */
export interface ReboundSpec {
  /** When the stroke just played met the head. */
  t0: number;
  /** Its speed into the head, m/s, and how much of it was the fingers' (0–1). */
  v0: number;
  f0: number;
  /** The head's restitution for it. */
  e: number;
  /** The plan: where the tip is meant to be at `t`, metres. */
  plan: (t: number) => number;
  /** How much of the plan's height is the stick held up in the fingers rather than the hand turned, at `t`. */
  fingers: (t: number) => number;
  /** When the hand has come up after the stick: from then on it runs ahead of it. */
  caught: number;
  /** 0–1: how hard the grip closes on this rebound — 1 for a downstroke. */
  tight: number;
  /** The note coming, to be thrown onto: when, over how long, how fast and how much in the fingers. */
  next?: { t1: number; fall: number; v1: number; f1: number };
}

/** A stretch's motion: tip and hand heights, and how closed the grip is, sampled from `start`. */
export interface Rebound {
  start: number;
  step: number;
  /** The tip's height, metres. */
  lift: Float32Array;
  /** The height the hand's turn alone gives the tip, metres: `lift` less what the fingers add. */
  hand: Float32Array;
  /** 0–1: how closed the grip is. */
  grip: Float32Array;
  /** The throw's own samples, when the wait between was left to the plan. */
  throwAt?: Rebound;
  spec: ReboundSpec;
  /** How far the wrist runs ahead of the stick, seconds (see `wristLead`). */
  lead: number;
}

/** A cubic from `(x0, v0)` at 0 to `(x1, v1)` at `T`: position, speed and acceleration at `u` seconds in. */
function hermite(x0: number, v0: number, x1: number, v1: number, T: number, u: number) {
  const s = u / T;
  const h00 = 2 * s ** 3 - 3 * s * s + 1;
  const h10 = s ** 3 - 2 * s * s + s;
  const h01 = -2 * s ** 3 + 3 * s * s;
  const h11 = s ** 3 - s * s;
  const x = h00 * x0 + h10 * T * v0 + h01 * x1 + h11 * T * v1;
  const d00 = (6 * s * s - 6 * s) / T;
  const d10 = 3 * s * s - 4 * s + 1;
  const d01 = (-6 * s * s + 6 * s) / T;
  const d11 = 3 * s * s - 2 * s;
  const v = d00 * x0 + d10 * v0 + d01 * x1 + d11 * v1;
  const a00 = (12 * s - 6) / (T * T);
  const a10 = (6 * s - 4) / T;
  const a01 = (-12 * s + 6) / (T * T);
  const a11 = (6 * s - 2) / T;
  const a = a00 * x0 + a10 * v0 + a01 * x1 + a11 * v1;
  return { x, v, a };
}

interface State {
  phi: number;
  dphi: number;
  psi: number;
  dpsi: number;
}

/** The hand and stick as the plan alone would have them at `t`, and how fast they are moving. */
function planned(spec: ReboundSpec, t: number, lead: number): State {
  const at = (u: number) => {
    const ahead = u + leadAt(spec, lead, u);
    const phi = (spec.plan(ahead) * (1 - spec.fingers(ahead))) / R_HAND;
    return { phi, psi: (spec.plan(u) - R_HAND * phi) / R_TIP };
  };
  const h = 0.002;
  const a = at(t - h);
  const b = at(t + h);
  const m = at(t);
  return {
    phi: m.phi,
    psi: m.psi,
    dphi: (b.phi - a.phi) / (2 * h),
    dpsi: (b.psi - a.psi) / (2 * h),
  };
}

/**
 * How far ahead of the plan the hand is at `t`: not at all coming off the
 * head, where the stick leads, and the whole of `lead` once it has caught the
 * stick up and prepares the next stroke.
 */
function leadAt(spec: ReboundSpec, lead: number, t: number): number {
  return lead * smoothstep(spec.caught, spec.caught + lead, t);
}

function smoothstep(a: number, b: number, x: number): number {
  if (b <= a) return x >= b ? 1 : 0;
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
}

/** Where the plan has the hand at `t`, radians, and how fast and how hard it is turning. */
function handPlan(spec: ReboundSpec, t: number): { x: number; v: number; a: number } {
  const at = (u: number) => (spec.plan(u) * (1 - spec.fingers(u))) / R_HAND;
  const h = 0.002;
  const a = at(t - h);
  const m = at(t);
  const b = at(t + h);
  return { x: m, v: (b - a) / (2 * h), a: (b - 2 * m + a) / (h * h) };
}

/**
 * How fast the wrist is still turning as the tip lands, as a share of the turn
 * that would carry the tip at its speed: the end of a whip. The hand slows
 * before the head and the stick, swung ahead of it, carries the speed in.
 */
const WRIST_AT_HEAD = 0.3;

/** The hand's and stick's speeds into the head for a stroke at `v` m/s, `f` of it the fingers'. */
function strikeRates(v: number, f: number) {
  const dphi = (-(1 - f) * WRIST_AT_HEAD * v) / R_HAND;
  // the tip's speed is the hand's turn at the whole reach plus the stick's in the fingers
  const dpsi = (-v - R_HAND * dphi) / R_TIP;
  return { dphi, dpsi };
}

/**
 * Work a stretch out: from the stroke at `t0` — through its rebound, the
 * fingers catching it and the hand following it up, the wait — to the throw
 * onto the next note, if there is one.
 */
export function simulate(spec: ReboundSpec): Rebound {
  const { t0, next } = spec;
  const end = next ? next.t1 : t0 + SIM_MAX;
  // the throw: the wrist starts it, the stick follows a moment later
  const fall = next ? Math.min(next.fall, next.t1 - t0) : 0;
  const tStick = next ? next.t1 - fall : Infinity;
  const lead = next ? wristLead(next.t1 - t0) : 0;
  const tHand = next ? Math.max(t0, tStick - Math.min(lead, (tStick - t0) * 0.5)) : Infinity;
  // a long wait is the plan's: simulate the rebound, and then the throw from where the plan has it
  const long = next !== undefined && tHand - t0 > SIM_MAX;
  const simEnd = long ? t0 + SIM_MAX : end;
  const out = run(spec, t0, simEnd, impactState(spec), tHand, tStick, lead);
  if (long && next) {
    const from = planned(spec, tHand, lead);
    out.throwAt = run(spec, tHand, next.t1, from, tHand, tStick, lead);
  }
  return out;
}

/** Just off the head after the stroke at `t0`: the hand as it struck, the stick thrown back up in the fingers. */
function impactState(spec: ReboundSpec): State {
  const before = strikeRates(spec.v0, spec.f0);
  // a closed grip takes some of the blow into the hand, and gives less of it back
  const e = spec.e * (1 - CLOSED_GIVES * spec.tight);
  const kick = ((1 + e) * spec.v0) / R_TIP;
  const taken = CLOSED_TAKES * spec.tight;
  return {
    phi: 0,
    dphi: before.dphi + (kick * taken * R_TIP) / R_HAND,
    psi: 0,
    dpsi: before.dpsi + kick * (1 - taken),
  };
}

function run(
  spec: ReboundSpec,
  from: number,
  to: number,
  s0: State,
  tHand: number,
  tStick: number,
  lead: number
): Rebound {
  const count = Math.max(2, Math.ceil((to - from) / STEP) + 1);
  const out: Rebound = {
    start: from,
    step: STEP,
    lift: new Float32Array(count),
    hand: new Float32Array(count),
    grip: new Float32Array(count),
    spec,
    lead,
  };
  const { next, tight } = spec;
  // how far the fingers open for the rebound: wide with time to let it fly, hardly at all
  // with the next note close behind, where they keep the stick near and meter its bounce
  const open = next ? smoothstep(...OPEN_GAP, next.t1 - spec.t0) : 1;
  let { phi, dphi, psi, dpsi } = s0;
  // where the throws start from, fixed when they start
  let handFrom: { x: number; v: number } | undefined;
  let stickFrom: { x: number; v: number } | undefined;
  const into = next ? strikeRates(next.v1, next.f1) : { dphi: 0, dpsi: 0 };
  const t1 = next?.t1 ?? Infinity;

  for (let k = 0; k < count; k++) {
    const closedAt = (t: number) => tight * Math.min(1, (t - spec.t0) / CLOSE);
    out.lift[k] = Math.max(0, R_HAND * phi + R_TIP * psi);
    out.hand[k] = R_HAND * phi;
    out.grip[k] = closedAt(from + k * STEP);
    // the plan, read once a sample: it is smooth over a millisecond
    const at = from + k * STEP;
    const y = spec.plan(at);
    const want = handPlan(spec, at + leadAt(spec, lead, at));
    for (let j = 0; j < SUB; j++) {
      const t = from + k * STEP + j * DT;
      // the grip: open with slack for a free stroke; closed and stiff, a moment after the
      // head, for a downstroke
      const closed = closedAt(t);
      // (once the hand has the stick back, the fingers are closed on it for the next stroke)
      const slack =
        SLACK * open * (1 - closed) * (1 - smoothstep(spec.caught, spec.caught + REGRIP, t));
      const stiff = GRIP_LOOSE + (GRIP_TIGHT - GRIP_LOOSE) * closed;
      const zeta = GRIP_DAMP_LOOSE + (GRIP_DAMP_TIGHT - GRIP_DAMP_LOOSE) * closed;
      // the fingers hold the stick where the plan has the tip, from where it has the hand —
      // a moment ahead, so the stick lags it — and carry its weight there; above that, in
      // the slack, it flies loose; past the slack the back fingers take it. (Damped only
      // where the fingers are on it.)
      const rel = psi - (y - R_HAND * want.x) / R_TIP;
      const damp = -2 * zeta * Math.sqrt(stiff * I_STICK) * dpsi;
      let grip = 0;
      if (rel < 0) grip = -stiff * rel + WEIGHT * Math.min(1, -rel / CARRY) + damp;
      else if (rel > slack) grip = -Math.max(CATCH, stiff) * (rel - slack) + damp;

      // the stick's own turn, which the hand's does not change but through the grip
      const dtheta0 = dphi + dpsi;
      // the wrist: a soft servo on the plan, pushed back on by the grip — or throwing
      const u = t + DT;
      if (u >= tHand) {
        handFrom ??= { x: phi, v: dphi };
        const h = hermite(handFrom.x, handFrom.v, 0, into.dphi, t1 - tHand, u - tHand);
        dphi = h.v;
        phi = h.x;
      } else {
        // (it moves as the plan does, and is pulled back to it as a spring)
        const w = WRIST_SOFT + (WRIST_FIRM - WRIST_SOFT) * closed;
        const ddphi =
          want.a + w * w * (want.x - phi) + 2 * WRIST_DAMP * w * (want.v - dphi) - grip / I_HAND;
        dphi += ddphi * DT;
        phi += dphi * DT;
      }

      if (u >= tStick) {
        // the stick's throw: the whole of it, to the head on the note at the stroke's speed
        stickFrom ??= { x: phi + psi, v: dphi + dpsi };
        const h = hermite(
          stickFrom.x,
          stickFrom.v,
          0,
          into.dphi + into.dpsi,
          t1 - tStick,
          u - tStick
        );
        psi = h.x - phi;
        dpsi = h.v - dphi;
        continue;
      }
      // the stick turns about the fulcrum under the grip and its weight; what the hand
      // does it feels only through the grip
      const ddtheta = (grip - WEIGHT) / I_STICK;
      const dtheta = dtheta0 + ddtheta * DT;
      dpsi = dtheta - dphi;
      psi += dpsi * DT;
      // the head: a tip that comes back down onto it bounces again
      const tip = R_HAND * phi + R_TIP * psi;
      const rate = R_HAND * dphi + R_TIP * dpsi;
      if (tip < 0 && rate < 0) {
        psi -= tip / R_TIP;
        dpsi += ((1 + spec.e) * -rate) / R_TIP;
      }
    }
  }
  return out;
}

/** Where a stretch has the tip and the hand at `t`, and how closed the grip is. */
export function reboundAt(r: Rebound, t: number): { lift: number; hand: number; grip: number } {
  const { spec } = r;
  if (r.throwAt && t >= r.throwAt.start) return sample(r.throwAt, t);
  const simEnd = r.start + (r.lift.length - 1) * r.step;
  if (t <= simEnd) {
    const got = sample(r, t);
    if (spec.next || t < simEnd - HANDOVER) return got;
    // nothing coming: hand over to the plan as the stretch ends
    return blend(got, plannedAt(r, t), (t - (simEnd - HANDOVER)) / HANDOVER);
  }
  if (r.throwAt) {
    // the wait between: the plan's, eased in from where the rebound left off
    const got = plannedAt(r, t);
    const last = sample(r, simEnd);
    return blend(last, got, Math.min(1, (t - simEnd) / HANDOVER));
  }
  return plannedAt(r, t);
}

function plannedAt(r: Rebound, t: number) {
  const { spec } = r;
  const ahead = t + leadAt(spec, r.lead, t);
  return { lift: spec.plan(t), hand: spec.plan(ahead) * (1 - spec.fingers(ahead)), grip: 0 };
}

function blend(
  a: { lift: number; hand: number; grip: number },
  b: { lift: number; hand: number; grip: number },
  k: number
) {
  const u = Math.max(0, Math.min(1, k));
  return {
    lift: a.lift + (b.lift - a.lift) * u,
    hand: a.hand + (b.hand - a.hand) * u,
    grip: a.grip + (b.grip - a.grip) * u,
  };
}

function sample(r: Rebound, t: number) {
  const x = Math.max(0, (t - r.start) / r.step);
  const i = Math.min(r.lift.length - 2, Math.floor(x));
  const u = Math.min(1, x - i);
  const lerp = (a: Float32Array) => a[i] + (a[i + 1] - a[i]) * u;
  return { lift: lerp(r.lift), hand: lerp(r.hand), grip: lerp(r.grip) };
}
