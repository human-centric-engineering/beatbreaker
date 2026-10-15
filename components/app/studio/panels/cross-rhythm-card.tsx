'use client';

import { useState } from 'react';

import { StudioHelp } from '@/components/app/studio/studio-help';
import { useStudio } from '@/components/app/studio/studio-provider';
import { SelectMenu } from '@/components/app/ui/select-menu';
import { cycleChoices } from '@/lib/app/breaks/cross-rhythm';
import { FOOT_LANE, laneName } from '@/lib/app/breaks/lanes';
import { meterOfPat } from '@/lib/app/breaks/pattern';
import { MAX_TUPLET, MIN_TUPLET } from '@/lib/app/breaks/tuplets';
import type { LaneKey } from '@/lib/app/breaks/types';

/** The counts either side of a ratio may be. */
const COUNTS = Array.from({ length: MAX_TUPLET - MIN_TUPLET + 1 }, (_, i) => MIN_TUPLET + i);

/** The lanes a stream may be played on: the kit's own, the percussion slots aside. */
const STREAM_LANES: LaneKey[] = ['s', 't1', 't2', 't3', 'h', 'r', 'k', FOOT_LANE];

/** Lanes a hand plays, which a handing can name. */
const isHandLane = (L: LaneKey) => L !== 'k' && L !== FOOT_LANE;

/**
 * "Make this a 3:2" (13-b): a cross-rhythm from its ratio, its two lanes and
 * one cycle's length, written as a study of the whole section or as a fill
 * at the end of a bar. See `crossRhythm` for what each writes.
 */
export function CrossRhythmCard() {
  const c = useStudio();
  const { say } = c;
  const pat = c.view[c.editing];
  const [cross, setCross] = useState(3);
  const [pulse, setPulse] = useState(2);
  const [crossLane, setCrossLane] = useState<LaneKey>('s');
  const [pulseLane, setPulseLane] = useState<LaneKey>('k');
  const [cycleKey, setCycleKey] = useState('half');
  const [hand, setHand] = useState<'R' | 'L' | ''>('R');
  const [bar, setBar] = useState(0);

  if (!pat) return null;
  const cycles = cycleChoices(meterOfPat(pat));
  const cycle = (cycles.find((x) => x.key === cycleKey) ?? cycles[cycles.length - 1]).steps;
  const bars = pat.bars.length;
  const fillBar = Math.min(bar, bars - 1);
  const handed = isHandLane(crossLane) && hand;
  const hands: Partial<Record<LaneKey, 'R' | 'L'>> | undefined = handed
    ? {
        [crossLane]: hand,
        ...(isHandLane(pulseLane) ? { [pulseLane]: hand === 'R' ? 'L' : 'R' } : {}),
      }
    : undefined;
  const ratio = `${cross}:${pulse}`;
  const lanes = STREAM_LANES.map((L) => ({ value: L, label: laneName(L) }));

  const write = (as: 'study' | 'fill') => {
    const reason = c.writeCrossRhythm({
      cross,
      pulse,
      crossLane,
      pulseLane,
      cycle,
      ...(hands ? { hands } : {}),
      as,
      ...(as === 'fill' ? { bar: fillBar } : {}),
    });
    if (reason) say(`Not written: ${reason}`, { error: true });
    else
      say(
        as === 'study'
          ? `Section ${c.editing} is a ${ratio} study — undo brings the old one back`
          : `A ${ratio} fills the end of bar ${fillBar + 1} — undo brings the old one back`
      );
  };

  return (
    <div className="card">
      <div className="card-hd">
        <h3>Cross-rhythm</h3>
      </div>
      <div className="card-bd">
        <div className="hint" style={{ marginBottom: 12 }}>
          Write a {ratio} into section <b>{c.editing}</b>.{' '}
          <StudioHelp title="Cross-rhythm">
            Two rhythms at once: the first count is the cross-rhythm, the second the pulse you
            count, landing together at the start of every cycle. Where the grid cannot hold the
            cross-rhythm, it is written as a tuplet. A study makes the whole section the exercise,
            learnt a stream a layer like a Polyrhythms entry; a fill puts it at the end of one bar
            of the groove, up to the bar line, and the layers play it from 4.
          </StudioHelp>
        </div>
        <div className="field">
          <span className="fieldlab" id="bb-xr-ratio">
            Ratio{' '}
            <StudioHelp title="Ratio">
              The cross-rhythm&apos;s notes against the pulse&apos;s, in the same time: 3:2 is three
              even notes against two. The pulse has to fall on the grid, so it divides the cycle;
              the cross-rhythm may not, and is then a tuplet.
            </StudioHelp>
          </span>
          <div className="btnrow">
            <SelectMenu
              aria-label="Cross-rhythm notes"
              value={String(cross)}
              onValueChange={(v) => setCross(Number(v))}
              options={COUNTS.map((n) => ({ value: String(n), label: String(n) }))}
            />
            <span aria-hidden="true">:</span>
            <SelectMenu
              aria-label="Pulse notes"
              value={String(pulse)}
              onValueChange={(v) => setPulse(Number(v))}
              options={COUNTS.map((n) => ({ value: String(n), label: String(n) }))}
            />
          </div>
        </div>
        <div className="field">
          <span className="fieldlab" id="bb-xr-cross-label">
            The {cross} on{' '}
            <StudioHelp title="Cross-rhythm lane">
              The drum or cymbal the cross-rhythm is played on.
            </StudioHelp>
          </span>
          <SelectMenu
            id="bb-xr-cross"
            aria-label="Cross-rhythm lane"
            value={crossLane}
            onValueChange={(v) => setCrossLane(v as LaneKey)}
            options={lanes}
          />
        </div>
        <div className="field">
          <span className="fieldlab" id="bb-xr-pulse-label">
            The {pulse} on{' '}
            <StudioHelp title="Pulse lane">
              The drum or cymbal the pulse is played on. In a fill it replaces what that lane played
              there; the groove&apos;s other feet keep going.
            </StudioHelp>
          </span>
          <SelectMenu
            id="bb-xr-pulse"
            aria-label="Pulse lane"
            value={pulseLane}
            onValueChange={(v) => setPulseLane(v as LaneKey)}
            options={lanes}
          />
        </div>
        <div className="field">
          <span className="fieldlab" id="bb-xr-cycle-label">
            One cycle{' '}
            <StudioHelp title="Cycle">
              How long the figure takes to come round: both rhythms start together at the start of
              each cycle. A fill is one cycle, ending on the bar line.
            </StudioHelp>
          </span>
          <SelectMenu
            id="bb-xr-cycle"
            aria-label="Cycle"
            value={cycleKey}
            onValueChange={setCycleKey}
            options={cycles.map((x) => ({ value: x.key, label: x.label }))}
          />
        </div>
        {isHandLane(crossLane) ? (
          <div className="field">
            <span className="fieldlab" id="bb-xr-hand-label">
              Hands{' '}
              <StudioHelp title="Hands">
                The hand the cross-rhythm is played with; a pulse on a drum or cymbal gets the
                other. The drummer plays them so and the chart labels them. Swap them for the other
                handing, the next exercise.
              </StudioHelp>
            </span>
            <SelectMenu
              id="bb-xr-hand"
              aria-label="Hands"
              value={hand || 'none'}
              onValueChange={(v) => setHand(v === 'none' ? '' : (v as 'R' | 'L'))}
              options={[
                { value: 'R', label: `The ${cross} in the right hand` },
                { value: 'L', label: `The ${cross} in the left hand` },
                { value: 'none', label: 'Let the drummer choose' },
              ]}
            />
          </div>
        ) : null}
        <div className="btnrow">
          <button type="button" className="mini" onClick={() => write('study')}>
            Write a study
          </button>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <span className="fieldlab" id="bb-xr-bar-label">
            Or as a fill, at the end of
          </span>
          <div className="btnrow">
            <SelectMenu
              id="bb-xr-bar"
              aria-label="Fill bar"
              value={String(fillBar)}
              onValueChange={(v) => setBar(Number(v))}
              options={pat.bars.map((_, i) => ({ value: String(i), label: `bar ${i + 1}` }))}
            />
            <button type="button" className="mini" onClick={() => write('fill')}>
              Write the fill
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
