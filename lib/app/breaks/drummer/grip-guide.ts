import { Quaternion, Vector3 } from 'three';

import { type GripChoice, type Grips, gripsFor } from '@/lib/app/breaks/drummer/grips';
import { solveTwoBone } from '@/lib/app/breaks/drummer/ik';
import { BODY, type Hand } from '@/lib/app/breaks/drummer/kit-layout';
import { type ArmPose, poseAt } from '@/lib/app/breaks/drummer/pose';
import { StrokeTimeline } from '@/lib/app/breaks/drummer/timeline';
import { meterOf } from '@/lib/app/breaks/meter';
import { emptyBar } from '@/lib/app/breaks/pattern';

/**
 * The grip guide (experiment: the drummer view): how to hold the sticks, a
 * grip at a time, as a short film of two arms, their hands and a snare.
 *
 * Each lesson follows the steps of wikiHow's "How to Hold a Drumstick"
 * (rephrased): American, German and French matched grip, and traditional
 * grip. The hands are the drummer's own — every pose is the stroke planner's
 * (`poseAt`) with the grip being taught, taken apart and put back together a
 * finger at a time — so the guide holds the sticks exactly as the drummer at
 * the kit does, and the last step of each lesson is the drummer playing.
 */

export type GuideGrip = 'american' | 'german' | 'french' | 'traditional';

export const GUIDE_GRIPS: readonly GuideGrip[] = ['american', 'german', 'french', 'traditional'];

export interface GuideStep {
  /** A few words, for the step's place in the list. */
  title: string;
  /** What to do, shown under the film while the step plays. */
  caption: string;
  /** How long the step plays, seconds. */
  seconds: number;
}

interface Step extends GuideStep {
  /** Both arms `u` (0–1) of the way through the step. */
  pose: (u: number) => Record<Hand, ArmPose>;
}

export interface Lesson {
  grip: GuideGrip;
  title: string;
  /** One line on what the grip is for. */
  blurb: string;
  steps: readonly GuideStep[];
}

export interface GuideFrame {
  arms: Record<Hand, ArmPose>;
  /** Which step is playing, and how far into it, 0–1. */
  step: number;
  progress: number;
}

const UP = new Vector3(0, 1, 0);
const NONE = new Quaternion();

/** Smoothly from 0 at `a` to 1 at `b`. */
function ease(a: number, b: number, u: number): number {
  const x = Math.min(1, Math.max(0, (u - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

/** Two arm poses mixed, `k` of the way from `a` to `b`: the elbow solved for the wrist between. */
function mixArm(a: ArmPose, b: ArmPose, k: number): ArmPose {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const wrist = a.wrist.clone().lerp(b.wrist, k);
  const shoulder = a.shoulder.clone().lerp(b.shoulder, k);
  const bend = a.elbow.clone().lerp(b.elbow, k).sub(shoulder.clone().lerp(wrist, 0.5));
  const { joint, end } = solveTwoBone(shoulder, wrist, BODY.upperArm, BODY.forearm, bend);
  return {
    ...b,
    shoulder,
    elbow: joint,
    wrist: end,
    hand: a.hand.clone().slerp(b.hand, k),
    grip: a.grip.clone().lerp(b.grip, k),
    stick: a.stick.clone().lerp(b.stick, k).normalize(),
    tip: a.tip.clone().lerp(b.tip, k),
    curl: a.curl + (b.curl - a.curl) * k,
    held: k < 0.5 ? a.held : b.held,
  };
}

/** An arm with its hand moved by `offset` and turned by `turn` about the wrist, the stick going with it. */
function moved(a: ArmPose, offset: Vector3, turn: Quaternion = NONE): ArmPose {
  const wrist = a.wrist.clone().add(offset);
  const carry = (p: Vector3) => p.clone().sub(a.wrist).applyQuaternion(turn).add(wrist);
  const bend = a.elbow.clone().sub(a.shoulder.clone().lerp(a.wrist, 0.5));
  const { joint, end } = solveTwoBone(a.shoulder, wrist, BODY.upperArm, BODY.forearm, bend);
  const shift = end.clone().sub(wrist);
  return {
    ...a,
    elbow: joint,
    wrist: end,
    hand: turn.clone().multiply(a.hand),
    grip: carry(a.grip).add(shift),
    tip: carry(a.tip).add(shift),
    stick: a.stick.clone().applyQuaternion(turn),
  };
}

/** The stick slid `s` metres along itself in the hand, toward its tip: finding the balance point, or not in the hand yet. */
function slid(a: ArmPose, s: number): ArmPose {
  return { ...a, tip: a.tip.clone().addScaledVector(a.stick, s) };
}

/** The stick turned `angle` radians up about the fulcrum, the hand still: a stroke in the fingers, or a bounce. */
function tipped(a: ArmPose, angle: number): ArmPose {
  const reach = a.tip.distanceTo(a.grip);
  const axis = new Vector3().crossVectors(a.stick, UP);
  if (axis.lengthSq() < 1e-9) return a;
  const stick = a.stick.clone().applyAxisAngle(axis.normalize(), angle);
  return {
    ...a,
    stick,
    tip: a.grip.clone().addScaledVector(stick, reach),
    lift: Math.max(0, angle),
  };
}

/** Each finger (first to little) and the thumb this far still from holding, toward `to`. */
function unheld(
  a: ArmPose,
  to: 'flat' | 'pocket',
  by: [number, number, number, number, number]
): ArmPose {
  return by.every((x) => x <= 0) ? a : { ...a, unheld: { to, by } };
}

/** How far a dropped stick's tip is up, as an angle at the fulcrum: a full stroke, then the bounces dying away. */
function bounces(u: number): number {
  const drop = 0.18;
  if (u < drop) return 0.55 * (1 - ease(0, drop, u));
  const x = (u - drop) / (1 - drop);
  // seven bounces, each lower and quicker than the one before
  const n = 7;
  const k = Math.min(n - 1, Math.floor(Math.sqrt(x) * n));
  const a = (k / n) ** 2;
  const b = ((k + 1) / n) ** 2;
  const height = 0.3 * (1 - k / n) ** 2;
  return height * Math.sin(Math.PI * Math.min(1, (x - a) / (b - a)));
}

/** Seconds a sixteenth at the guide's tempo, 100 bpm. */
const DUR = 0.15;

/**
 * A snare part for the playing steps — eighths, hand to hand, the backbeat a
 * little louder — fed to a stroke timeline the way playback feeds it: the
 * steps around `t` (a timeline keeps only the last strokes it was given), at
 * their own times, so the part runs on as long as it is played.
 */
function snareAround(t: number): StrokeTimeline {
  const meter = meterOf('4/4');
  const bar = emptyBar(16);
  for (let i = 0; i < 16; i += 2) bar.s[i] = i === 4 || i === 12 ? 3 : 2;
  const tl = new StrokeTimeline();
  const from = Math.max(0, Math.floor((t - FED_BEFORE) / DUR));
  const to = Math.ceil((t + FED_AFTER) / DUR);
  for (let k = from; k <= to; k++) {
    const at = k * DUR;
    const slot = k % 16;
    const v = bar.s[slot];
    tl.ingest({
      t: at,
      dur: DUR,
      slot,
      meter,
      bar,
      next: bar,
      notes: v
        ? [{ voice: { lane: 's', note: 38, velocity: v === 3 ? 1 : 0.75, offset: 0 }, when: at }]
        : [],
    });
  }
  return tl;
}
/** How much of the part either side of the moment drawn is fed, seconds. */
const FED_BEFORE = 1.8;
const FED_AFTER = 0.6;
/** Where the playing starts in the part: a bar in, the hands already in it. */
const PLAY_FROM = 16 * DUR;

const EMPTY = new StrokeTimeline();

/** Both arms at rest over the snare, holding their sticks in `grips`: the drummer waiting to play. */
function home(grips: Grips): Record<Hand, ArmPose> {
  const key = `${grips.lead}/${grips.other}`;
  let arms = homes.get(key);
  if (!arms) {
    arms = poseAt(EMPTY, 0, 1, grips).arms;
    homes.set(key, arms);
  }
  return arms;
}
const homes = new Map<string, Record<Hand, ArmPose>>();

/** Both arms `u` of the way through `seconds` of playing the snare in `grips`. */
function playing(grips: Grips, seconds: number, u: number) {
  const t = PLAY_FROM + u * seconds;
  const play = poseAt(snareAround(t), t, 1, grips).arms;
  // eased in from the hands at rest, where the step before left them
  return between(home(grips), play, ease(0, PLAY_IN / seconds, u));
}
/** How long the hands take to go from rest into the playing, seconds. */
const PLAY_IN = 0.5;

/** The hand held up a little off the drum to work on, its stick not in it yet. */
const PRESENT = new Vector3(0, 0.05, -0.02);
/** How far out of the hand the stick waits before it is slid in, metres. */
const OUT = 0.3;

/**
 * Taking the stick a finger at a time (`u` 0–1), the American way: the
 * pocket made, the stick slid into it and along it to its balance point and
 * bounced, then the thumb along its side and the back fingers round it.
 */
function takeAmerican(
  rest: ArmPose,
  u: number,
  stage: 'pocket' | 'slide' | 'balance' | 'thumb' | 'back'
): ArmPose {
  const up = moved(rest, PRESENT);
  switch (stage) {
    case 'pocket': {
      // flat, then the first finger bent into its pocket
      const k = ease(0.15, 0.85, u);
      return {
        ...slid(up, OUT),
        unheld: { to: 'flat', by: [1, 1, 1, 1, 1] },
        shape: k > 0 ? { kind: 'pocket', amount: k } : undefined,
      };
    }
    case 'slide':
      // the stick in under the first finger, which wraps it like a trigger
      return {
        ...slid(up, OUT * (1 - ease(0, 0.8, u))),
        unheld: { to: 'pocket', by: [1 - ease(0.6, 1, u), 1, 1, 1, 1] },
      };
    case 'balance': {
      // slid back and forth to its balance point, a third of the way up, then let bounce
      const slide = u < 0.45 ? 0.035 * Math.sin((u / 0.45) * 3 * Math.PI) * (1 - u / 0.45) : 0;
      const bounce = u >= 0.45 ? bounces((u - 0.45) / 0.55) : 0;
      return tipped({ ...slid(up, slide), unheld: { to: 'pocket', by: [0, 1, 1, 1, 1] } }, bounce);
    }
    case 'thumb': {
      const down = moved(rest, PRESENT.clone().multiplyScalar(1 - ease(0, 1, u)));
      return { ...down, unheld: { to: 'pocket', by: [0, 1, 1, 1, 1 - ease(0.2, 0.9, u)] } };
    }
    case 'back': {
      const k = 1 - ease(0.1, 0.9, u);
      return unheld(rest, 'pocket', [0, k, k, k, 0]);
    }
  }
}

/** Both hands: `hand` working, the other at rest. */
function oneHand(rest: Record<Hand, ArmPose>, hand: Hand, a: ArmPose): Record<Hand, ArmPose> {
  return hand === 'lead' ? { lead: a, other: rest.other } : { lead: rest.lead, other: a };
}

/** The lead hand plays from `from`'s rest into `to`'s, both hands, `k` of the way. */
function between(from: Record<Hand, ArmPose>, to: Record<Hand, ArmPose>, k: number) {
  return { lead: mixArm(from.lead, to.lead, k), other: mixArm(from.other, to.other, k) };
}

function american(): Step[] {
  const grips = gripsFor('american');
  const rest = home(grips);
  const take = (stage: Parameters<typeof takeAmerican>[2], hand: Hand) => (u: number) =>
    oneHand(rest, hand, takeAmerican(rest[hand], u, stage));
  return [
    {
      title: 'Make a pocket',
      caption:
        'Hold your hand out an inch or two over the drum, palm down, first finger pointing ahead. Bend that finger at its two end knuckles so its tip meets the edge of your palm: the pocket the stick will pivot in.',
      seconds: 4.5,
      pose: take('pocket', 'lead'),
    },
    {
      title: 'Stick under the first finger',
      caption:
        'Slide the stick into the pocket, under your first finger, and let the finger wrap round it as if it were on a trigger.',
      seconds: 4,
      pose: take('slide', 'lead'),
    },
    {
      title: 'Find the balance point',
      caption:
        'Slide the stick back and forth until it bounces most: let it fall onto the head and it should come back six to eight times on its own. That point is about a third of the way up from the butt.',
      seconds: 6,
      pose: take('balance', 'lead'),
    },
    {
      title: 'Thumb along the side',
      caption:
        'Turn your palm toward the floor again and lay your thumb along the side of the stick — the side, not the top. It only steadies the stick; it barely presses.',
      seconds: 4,
      pose: take('thumb', 'lead'),
    },
    {
      title: 'Curl the back fingers',
      caption:
        'Wrap your middle, ring and little fingers loosely round underneath. They support the stick without squeezing it, so it can still bounce.',
      seconds: 4,
      pose: take('back', 'lead'),
    },
    {
      title: 'The other hand the same',
      caption:
        'Hold the other stick exactly the same way. Both hands alike: that is why it is called a matched grip.',
      seconds: 5,
      // the other hand lets its stick go and takes it again the same way, finger by finger
      pose: (u) => {
        const open = ease(0, 0.25, u);
        const first = open * (1 - ease(0.35, 0.5, u));
        const thumb = open * (1 - ease(0.5, 0.7, u));
        const back = open * (1 - ease(0.7, 0.95, u));
        return oneHand(
          rest,
          'other',
          unheld(rest.other, 'pocket', [first, back, back, back, thumb])
        );
      },
    },
    {
      title: 'Play from the wrist',
      caption:
        'Strike by bending the wrist, the fingers helping, palms near flat to the drum. Keep your shoulders, arms and elbows loose and let the stick bounce back up.',
      seconds: 6,
      pose: (u) => playing(grips, 6, u),
    },
  ];
}

/** A lesson that starts from American grip and turns into another matched grip. */
function turnedFrom(
  choice: 'german' | 'french',
  steps: {
    title: string;
    caption: string;
    seconds: number;
    pose: 'grab' | 'turn' | 'fingers' | 'elbows' | 'play';
  }[]
): Step[] {
  const fromRest = home(gripsFor('american'));
  const grips = gripsFor(choice);
  const rest = home(grips);
  return steps.map((s) => ({
    ...s,
    pose: (u: number) => {
      switch (s.pose) {
        case 'grab':
          return {
            lead: takeAmerican(fromRest.lead, u, 'back'),
            other: takeAmerican(fromRest.other, u, 'back'),
          };
        case 'turn':
          return between(fromRest, rest, ease(0.1, 0.9, u));
        case 'fingers': {
          // the back fingers ease off and settle back on
          const k = Math.sin(Math.PI * ease(0, 1, u)) * (choice === 'german' ? 0.5 : 0.35);
          const by: [number, number, number, number, number] = [
            0,
            choice === 'german' ? 0 : k,
            k,
            k,
            0,
          ];
          return { lead: unheld(rest.lead, 'flat', by), other: unheld(rest.other, 'flat', by) };
        }
        case 'elbows':
          return rest;
        case 'play':
          return playing(grips, s.seconds, u);
      }
    },
  }));
}

function german(): Step[] {
  return turnedFrom('german', [
    {
      title: 'Grab the balance point',
      caption:
        'Take each stick at its balance point between thumb and first finger, just as for American grip.',
      seconds: 4,
      pose: 'grab',
    },
    {
      title: 'Palms flat to the head',
      caption:
        'Turn your hands until your palms face the drumhead — flat to it, the backs of your hands to the ceiling.',
      seconds: 4.5,
      pose: 'turn',
    },
    {
      title: 'The middle finger carries it',
      caption:
        'Let the stick rest on your middle finger, curled under it. The ring and little fingers matter less here: wrap them round or let them fold loosely underneath.',
      seconds: 4.5,
      pose: 'fingers',
    },
    {
      title: 'Elbows out',
      caption:
        'With the palms down your elbows will want to bend out a little. Let them: it gives German grip its power.',
      seconds: 3.5,
      pose: 'elbows',
    },
    {
      title: 'Strike from the wrist',
      caption:
        'Play by turning the wrist down, not the arm, shoulders or fingers. Loud, ringing strokes come easily; quick, delicate ones are harder.',
      seconds: 6,
      pose: 'play',
    },
  ]);
}

function french(): Step[] {
  return turnedFrom('french', [
    {
      title: 'Grab the balance point',
      caption:
        'Take each stick at its balance point between the thumb and the first knuckle of the first finger, about a third of the way up the stick.',
      seconds: 4,
      pose: 'grab',
    },
    {
      title: 'Palms facing each other',
      caption:
        'Turn your hands until the palms face each other, thumbs on top — about a foot apart, whatever feels natural.',
      seconds: 4.5,
      pose: 'turn',
    },
    {
      title: 'Back fingers underneath',
      caption:
        'Curl the middle, ring and little fingers under each stick. French grip leans on the fingers, so they do more of the work here than in any other grip.',
      seconds: 4.5,
      pose: 'fingers',
    },
    {
      title: 'Elbows in',
      caption:
        'With the palms facing, your elbows drop to your sides. Let them hang an inch or so from the body rather than bending out.',
      seconds: 3.5,
      pose: 'elbows',
    },
    {
      title: 'Strike with the fingers',
      caption:
        'Turn the wrists a little and let the fingers drive the stroke. It gives finesse and speed for jazz and quick, light playing, if less power.',
      seconds: 6,
      pose: 'play',
    },
  ]);
}

function traditional(): Step[] {
  const grips = gripsFor('traditional');
  const rest = home(grips);
  const off = rest.other;
  const offUp = moved(off, PRESENT);
  const at = (a: ArmPose) => ({ lead: rest.lead, other: a });
  const by = (index: number, middle: number, back: number, thumb: number) =>
    [index, middle, back, back, thumb] as [number, number, number, number, number];
  return [
    {
      title: 'Off hand palm up',
      caption:
        'Raise your off hand — the one away from the hi-hat — in front of you and turn it palm up. This grip is not matched: each hand holds its stick differently.',
      seconds: 4,
      pose: (u) =>
        at(unheld(slid(mixArm(off, offUp, ease(0, 0.6, u)), OUT), 'flat', by(1, 1, 1, 1))),
    },
    {
      title: 'Stick in the crook',
      caption:
        'Lay the stick in the fleshy crook between your thumb and first finger, and slide it until the hand holds it at about its balance point.',
      seconds: 4.5,
      pose: (u) => at(unheld(slid(offUp, OUT * (1 - ease(0, 0.85, u))), 'flat', by(1, 1, 1, 1))),
    },
    {
      title: 'Thumb and first finger over',
      caption:
        'Bend your thumb over the top of the stick and lay your first finger over it too, its inside on the stick. The pad of the thumb rests on the first finger’s first knuckle.',
      seconds: 4.5,
      pose: (u) => at(unheld(offUp, 'flat', by(1 - ease(0.4, 0.9, u), 1, 1, 1 - ease(0, 0.5, u)))),
    },
    {
      title: 'Middle finger on the side',
      caption:
        'Bring the middle finger along the outer side of the stick, touching it near its second knuckle.',
      seconds: 3.5,
      pose: (u) => at(unheld(offUp, 'flat', by(0, 1 - ease(0.1, 0.9, u), 1, 0))),
    },
    {
      title: 'Ring and little underneath',
      caption:
        'Curl the ring and little fingers under the stick: it rests on the cuticle of the ring finger, the little finger tucked under that one to support it.',
      seconds: 4,
      pose: (u) =>
        at(unheld(mixArm(offUp, off, ease(0.5, 1, u)), 'flat', by(0, 0, 1 - ease(0, 0.6, u), 0))),
    },
    {
      title: 'Overhand in the other',
      caption:
        'Hold the other stick overhand, in any of the matched grips — most players use American.',
      seconds: 3.5,
      pose: () => rest,
    },
    {
      title: 'Strike by turning',
      caption:
        'The off hand plays by turning the forearm, like turning a doorknob, the wrist going with it; both hands still come down the same way.',
      seconds: 6,
      pose: (u) => playing(grips, 6, u),
    },
  ];
}

const META: Record<GuideGrip, { title: string; blurb: string }> = {
  american: {
    title: 'American grip',
    blurb: 'Matched, the palms at about 45° to the drum: power and control, for almost anything.',
  },
  german: {
    title: 'German grip',
    blurb: 'Matched, the palms flat to the drum and the elbows out: power, from the wrist.',
  },
  french: {
    title: 'French grip',
    blurb: 'Matched, the palms facing and the thumbs on top: finesse and speed, from the fingers.',
  },
  traditional: {
    title: 'Traditional grip',
    blurb:
      'The off hand palm up, the stick in the crook of the thumb: jazz and the marching snare.',
  },
};

const BUILD: Record<GuideGrip, () => Step[]> = { american, german, french, traditional };

/** Which choice in the drummer view's Grip menu a lesson's last step plays in. */
export const GUIDE_CHOICE: Record<GuideGrip, GripChoice> = {
  american: 'american',
  german: 'german',
  french: 'french',
  traditional: 'traditional',
};

/** The grip a choice in the Grip menu is taught by. */
export function guideFor(choice: GripChoice): GuideGrip {
  return choice === 'traditionalBoth' ? 'traditional' : choice;
}

const built = new Map<GuideGrip, Step[]>();

function stepsOf(grip: GuideGrip): Step[] {
  let steps = built.get(grip);
  if (!steps) {
    steps = BUILD[grip]();
    built.set(grip, steps);
  }
  return steps;
}

/** A grip's lesson: its title, a line on it, and its steps. */
export function lessonOf(grip: GuideGrip): Lesson {
  const steps = stepsOf(grip).map(({ title, caption, seconds }) => ({ title, caption, seconds }));
  return { grip, ...META[grip], steps };
}

/** How long a lesson plays, seconds. */
export function lessonLength(grip: GuideGrip): number {
  return stepsOf(grip).reduce((sum, s) => sum + s.seconds, 0);
}

/** When step `index` of a lesson starts, seconds. */
export function stepStart(grip: GuideGrip, index: number): number {
  return stepsOf(grip)
    .slice(0, index)
    .reduce((sum, s) => sum + s.seconds, 0);
}

/** The lesson `t` seconds in (looping): both arms, and which step is playing. */
export function guideAt(grip: GuideGrip, t: number): GuideFrame {
  const steps = stepsOf(grip);
  const total = lessonLength(grip);
  let at = ((t % total) + total) % total;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (at < s.seconds || i === steps.length - 1) {
      const progress = Math.min(1, at / s.seconds);
      return { arms: s.pose(progress), step: i, progress };
    }
    at -= s.seconds;
  }
  /* v8 ignore next */
  throw new Error('unreachable');
}
