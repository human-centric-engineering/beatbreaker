'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { StudioHelp } from '@/components/app/studio/studio-help';
import type { TempoPoint } from '@/lib/app/breaks/tempo-map';

/** Where the picker opens, and what the bar holds now. */
export interface TempoPickerAt {
  bar: number;
  x: number;
  y: number;
  /** The section's tempo at ×1 of its map: what a ratio is read and written as. */
  bpm: number;
  /** The bar's point, where it has one. */
  point: TempoPoint | null;
  /** The ratio the bar starts at without a point of its own: what a new point starts from. */
  before: number;
}

/** A tempo a person types, to a tenth: a record's map is 97.5 as often as 98. */
function shown(bpm: number): string {
  return String(Math.round(bpm * 10) / 10);
}

/**
 * The Tempo row's picker (16-b-ii, D82): the tempo the section plays at from
 * this bar, and, where the record speeds up or slows down, the tempo it gets
 * to by the next point or the section's end. In beats a minute at the
 * break's tempo; the map keeps them as ratios, so the slider still moves the
 * whole song. Escape, or a press outside, closes it.
 */
export function TempoPicker({
  at,
  onSet,
  onClose,
}: {
  at: TempoPickerAt;
  /** A reason, and nothing set, when the map would not play. */
  onSet: (point: Omit<TempoPoint, 'bar'> | null) => string | null;
  onClose: () => void;
}) {
  const box = useRef<HTMLFormElement>(null);
  const start = at.point?.ratio ?? at.before;
  const [from, setFrom] = useState(shown(at.bpm * start));
  const [ramp, setRamp] = useState(at.point?.to !== undefined);
  const [to, setTo] = useState(shown(at.bpm * (at.point?.to ?? start)));
  const [error, setError] = useState<string | null>(null);

  /* The latest close, read by the listener, as the grid's pickers do: the
     grid re-renders with the playhead. */
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const form = box.current;
    form?.querySelector<HTMLInputElement>('input')?.focus();
    const away = (e: PointerEvent) => {
      if (e.target instanceof Node && !form?.contains(e.target)) close.current();
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      close.current();
    };
    document.addEventListener('pointerdown', away);
    form?.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', away);
      form?.removeEventListener('keydown', escape);
    };
  }, []);

  const set = (point: Omit<TempoPoint, 'bar'> | null) => {
    const why = onSet(point);
    if (why) setError(why);
    else onClose();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const a = Number(from);
    const b = Number(to);
    if (!Number.isFinite(a) || a <= 0 || (ramp && (!Number.isFinite(b) || b <= 0))) {
      setError('A tempo is a number of beats a minute');
      return;
    }
    set(ramp ? { ratio: a / at.bpm, to: b / at.bpm } : { ratio: a / at.bpm });
  };

  return (
    <form
      ref={box}
      className="cellpick tempopick"
      role="dialog"
      aria-label={`Tempo, bar ${at.bar + 1}`}
      style={{ left: at.x, top: at.y }}
      onSubmit={submit}
    >
      <label className="tempofield">
        <span className="lbl">
          From bar {at.bar + 1}
          <StudioHelp title="The tempo from this bar">
            The tempo the section plays at from the start of this bar, in beats a minute at the
            break&apos;s tempo. It holds until the next bar with a tempo of its own, or the end of
            the section. Move the tempo slider and this moves with it: it is kept as a share of the
            section&apos;s tempo.
          </StudioHelp>
        </span>
        <input
          type="number"
          inputMode="decimal"
          min={1}
          step="any"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </label>
      <label className="tempofield check">
        <input type="checkbox" checked={ramp} onChange={(e) => setRamp(e.target.checked)} />
        <span className="lbl">
          Speeds up or slows down
          <StudioHelp title="Speeding up and slowing down">
            An accelerando or a ritardando: the tempo moves evenly, a step at a time, from the tempo
            above to this one, which it reaches on the last step before the next bar with a tempo of
            its own, or the end of the section. The chart writes accel. or rit. over it.
          </StudioHelp>
        </span>
      </label>
      {ramp ? (
        <label className="tempofield">
          <span className="lbl">To</span>
          <input
            type="number"
            inputMode="decimal"
            min={1}
            step="any"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      ) : null}
      {error ? (
        <p className="tempoerr" role="alert">
          {error}
        </p>
      ) : null}
      <div className="tempoacts">
        <button type="submit">Set</button>
        {at.point ? (
          <button type="button" onClick={() => set(null)}>
            Remove
          </button>
        ) : null}
      </div>
    </form>
  );
}
