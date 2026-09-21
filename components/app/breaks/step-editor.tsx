'use client';

import { Fragment } from 'react';

import { LANE_DEFS, LANE_VALUES, activeLanes, laneName } from '@/lib/app/breaks/lanes';
import { countLabelsOf, isGroupStart } from '@/lib/app/breaks/meter';
import { meterOfPat } from '@/lib/app/breaks/pattern';
import type { LaneKey, Pattern } from '@/lib/app/breaks/types';
import { cn } from '@/lib/utils';

/**
 * The step grid.
 *
 * **It draws the layer you are on**, not the stored break. That distinction was
 * a real bug: the grid used to draw the full pattern while the chart and the
 * playback drew the reduced one, so at L2 you could see a note nothing was
 * playing, toggling layers changed the notation and left the grid alone, and an
 * open hat added down there vanished the moment it was derived. Three
 * complaints, one cause.
 *
 * A note placed here is pinned to the layer it was placed at — marked with a
 * dot — so the reduction stops taking it back out.
 *
 * **One lane is one row, however many bars there are.** A drummer reads a lane
 * straight across; cutting the grid into a stack of per-bar blocks put a lane's
 * name in front of you five times and broke the line you were following. The
 * bars are separated by a gap in the same row instead, and the count runs along
 * the top once.
 */

interface StepEditorProps {
  /** The pattern as it sounds at the current layer. */
  view: Pattern;
  /** The stored break, for reading pins. */
  stored: Pattern;
  onCycle: (bar: number, lane: LaneKey, step: number, back: boolean) => void;
  /** Step under the playhead, as `barIdx * steps + slot`. */
  cursor: number | null;
}

/**
 * A ghost note is the one value that reads as *quieter* rather than different,
 * so it is drawn as a wash of the lane's colour rather than the colour itself —
 * the same 40% the chart legend uses. Everything else is the lane, solid.
 */
function fill(lane: LaneKey, v: number): string {
  const color = LANE_DEFS[lane].color;
  return soft(lane, v) ? `color-mix(in srgb,${color} 40%, transparent)` : color;
}

function soft(lane: LaneKey, v: number): boolean {
  return lane === 's' && v === 1;
}

export function StepEditor({ view, stored, onCycle, cursor }: StepEditorProps) {
  const m = meterOfPat(view);
  const labels = countLabelsOf(m);
  const lanes = activeLanes(view.lanes);
  const steps = view.bars[0]?.k.length ?? 16;
  const bars = view.bars.length;

  const barIdx = Array.from({ length: bars }, (_, b) => b);
  const slotIdx = Array.from({ length: steps }, (_, i) => i);

  return (
    <div className="gridwrap">
      <div className="gridtable">
        <div className="countrow" aria-hidden="true">
          {barIdx.map((b) => (
            <Fragment key={b}>
              {slotIdx.map((i) => (
                <span key={i} className={cn(isGroupStart(m, i) && 'beat')}>
                  {labels[i] ?? ''}
                </span>
              ))}
              {b < bars - 1 ? <div className="gap" /> : null}
            </Fragment>
          ))}
        </div>

        {lanes.map((lane) => {
          const def = LANE_DEFS[lane];
          const name = laneName(lane, view.perc);
          return (
            <div className="gridrow" key={lane}>
              <div className="gridlabel">
                <i style={{ background: def.color }} />
                {name}
              </div>
              <div className="cells">
                {barIdx.map((b) => (
                  <Fragment key={b}>
                    {slotIdx.map((i) => {
                      const v = view.bars[b][lane][i];
                      const pinned = stored.pins?.[b]?.[lane]?.[i] ?? 0;
                      return (
                        <button
                          key={i}
                          type="button"
                          className={cn(
                            'cell',
                            isGroupStart(m, i) && 'beat',
                            pinned && 'pinned',
                            cursor === b * steps + i && 'cursor'
                          )}
                          style={v ? { background: fill(lane, v) } : undefined}
                          data-bar={b}
                          data-lane={lane}
                          data-slot={i}
                          data-on={v}
                          // Shift steps back through the values rather than
                          // forward — five clicks to get round a snare cell is a
                          // long way to go for the value you have just passed.
                          onClick={(e) => onCycle(b, lane, i, e.shiftKey)}
                          aria-label={`${name}, bar ${b + 1} step ${i + 1}: ${
                            v ? (LANE_VALUES[lane][v - 1] ?? String(v)) : 'empty'
                          }${pinned ? `, pinned at layer ${pinned}` : ''}`}
                        >
                          {v ? (
                            <b style={soft(lane, v) ? { color: 'var(--ink)' } : undefined}>
                              {def.glyph[v] ?? ''}
                            </b>
                          ) : null}
                        </button>
                      );
                    })}
                    {b < bars - 1 ? <div className="gap" /> : null}
                  </Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Every value each lane can hold, in the order clicking a cell gets you
          there. Without it a cross-stick is five clicks round a snare cell and
          nothing on the page says so — which is the same as not having it. */}
      <div className="gridkey">
        {lanes.map((lane) => (
          <div className="keygroup" key={lane}>
            <b style={{ color: LANE_DEFS[lane].color }}>{laneName(lane, view.perc)}</b>
            {LANE_VALUES[lane].map((label, n) => {
              const v = n + 1;
              return (
                <span key={label}>
                  <i
                    style={{
                      background: fill(lane, v),
                      color: soft(lane, v) ? 'var(--ink)' : '#fff',
                    }}
                  >
                    {LANE_DEFS[lane].glyph[v] ?? ''}
                  </i>
                  {label}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
