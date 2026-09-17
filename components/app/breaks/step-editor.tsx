'use client';

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

export function StepEditor({ view, stored, onCycle, cursor }: StepEditorProps) {
  const m = meterOfPat(view);
  const labels = countLabelsOf(m);
  const lanes = activeLanes(view.lanes);
  const steps = view.bars[0]?.k.length ?? 16;

  return (
    <div className="gridwrap">
      {view.bars.map((bar, bi) => (
        <div className="grid" key={bi}>
          <div className="gridhead">
            <span className="rowlab">bar {bi + 1}</span>
            {Array.from({ length: steps }, (_, i) => (
              <span key={i} className={cn('slotlab', isGroupStart(m, i) && 'strong')}>
                {labels[i] ?? ''}
              </span>
            ))}
          </div>

          {lanes.map((lane) => (
            <div className="row" key={lane}>
              <span className="rowlab" style={{ color: LANE_DEFS[lane].color }}>
                {laneName(lane, view.perc)}
              </span>
              {Array.from({ length: steps }, (_, i) => {
                const v = bar[lane][i];
                const pinned = stored.pins?.[bi]?.[lane]?.[i] ?? 0;
                return (
                  <button
                    key={i}
                    type="button"
                    className={cn(
                      'cell',
                      v && 'on',
                      pinned && 'pinned',
                      cursor === bi * steps + i && 'cursor',
                      isGroupStart(m, i) && 'beat'
                    )}
                    style={v ? { background: LANE_DEFS[lane].color } : undefined}
                    data-bar={bi}
                    data-slot={i}
                    data-on={v ? 1 : 0}
                    // Shift steps back through the values rather than forward —
                    // five clicks to get round a snare cell is a long way to go
                    // for the value you have just passed.
                    onClick={(e) => onCycle(bi, lane, i, e.shiftKey)}
                    aria-label={`${laneName(lane, view.perc)}, step ${i + 1}: ${
                      v ? (LANE_VALUES[lane][v - 1] ?? String(v)) : 'empty'
                    }${pinned ? `, pinned at layer ${pinned}` : ''}`}
                  >
                    {LANE_DEFS[lane].glyph[v] ?? ''}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
