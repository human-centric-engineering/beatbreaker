'use client';

import { useState } from 'react';

import { NumberField } from '@/components/app/practice/number-field';
import { StudioHelp } from '@/components/app/studio/studio-help';
import { SelectMenu } from '@/components/app/ui/select-menu';
import { METERS, METER_KEYS, meterKey, meterOf } from '@/lib/app/breaks/meter';

/** The time signature menu's way out of its list. */
const OTHER = 'other';

const DENS = ['2', '4', '8', '16', '32'] as const;
const GRIDS = [
  { value: '16', label: 'Sixteenths' },
  { value: '8', label: 'Eighths' },
  { value: '32', label: '32nds' },
  { value: '6', label: 'Sextuplets' },
] as const;
type Grid = (typeof GRIDS)[number]['value'];

function isGrid(v: string): v is Grid {
  return GRIDS.some((g) => g.value === v);
}

/** The grid a key is in: the one after its dash, else its default. */
function gridOf(key: string): Grid {
  const named = key.split('-')[1];
  if (named && isGrid(named)) return named;
  return meterOf(key).den === 32 ? '32' : '16';
}

/**
 * The Studio's time signature (D83): the meters with a name in a menu, and
 * any other a record has built from its beats, its beat's note value and the
 * grid its steps are on — 13/8, 17/16, 7/4 in 32nds.
 */
export function MeterField({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  const listed = METER_KEYS.includes(value);
  const [other, setOther] = useState(!listed);
  const [problem, setProblem] = useState<string | null>(null);
  const showOther = other || !listed;
  const m = meterOf(value);

  const build = (num: number, den: number, grid: Grid) => {
    const key = meterKey(num, den, grid);
    if (!key) {
      const g = GRIDS.find((x) => x.value === grid)?.label.toLowerCase();
      setProblem(`${num}/${den} in ${g} is not a bar the grid can hold.`);
      return;
    }
    setProblem(null);
    onChange(key);
  };

  return (
    <>
      <SelectMenu
        id="bb-meter"
        value={showOther ? OTHER : value}
        onValueChange={(v) => {
          if (v === OTHER) return setOther(true);
          setOther(false);
          setProblem(null);
          onChange(v);
        }}
        options={[
          ...METER_KEYS.map((k) => ({ value: k, label: METERS[k].label })),
          { value: OTHER, label: 'Another…' },
        ]}
      />
      {showOther ? (
        <div className="meterbuild">
          <label htmlFor="bb-meter-num">Beats</label>
          <NumberField
            id="bb-meter-num"
            value={m.num}
            min={1}
            max={64}
            onCommit={(n) => n !== null && build(n, m.den, gridOf(value))}
          />
          <span aria-hidden="true">/</span>
          <SelectMenu
            aria-label="Beat value"
            value={String(m.den)}
            onValueChange={(d) => build(m.num, Number(d), gridOf(value))}
            options={DENS.map((d) => ({ value: d, label: d }))}
          />
          <SelectMenu
            aria-label="Grid"
            value={gridOf(value)}
            onValueChange={(g) => isGrid(g) && build(m.num, m.den, g)}
            options={GRIDS.map((g) => ({ value: g.value, label: g.label }))}
          />
          <StudioHelp title="Another time signature">
            Any time signature a record has: the beats in a bar, over the note that is the beat (2,
            4, 8, 16 or 32), and the grid its steps are on. 13/8 is thirteen eighths, grouped in
            threes with the twos at the end. A bar of 32nds holds twice the steps of one in
            sixteenths: 7/4 in 32nds is 56. Sextuplets are for quarter-note beats only.
          </StudioHelp>
        </div>
      ) : null}
      {problem ? (
        <div className="hint" role="alert">
          {problem}
        </div>
      ) : null}
    </>
  );
}
