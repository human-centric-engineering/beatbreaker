'use client';

import { useId } from 'react';

import { useStudio } from '@/components/app/studio/studio-provider';
import { cn } from '@/lib/utils';
import { SLOTS } from '@/lib/app/breaks/kit';

/**
 * The controls more than one panel is built from.
 *
 * They came out of the console with the panels and live beside them rather than
 * in `components/ui/`: these are the paper-and-brass console's own controls,
 * styled by `breaks.css`, not the shadcn set the rest of the site uses.
 */

/**
 * A critic bar is read at a glance, so it is coloured rather than measured:
 * green is fine, brass is worth a look, red is the thing costing you the score.
 */
export function meterHue(v: number): string {
  if (v > 0.7) return 'var(--ok)';
  return v > 0.4 ? 'var(--brass)' : 'var(--bad)';
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step,
  suffix = '',
  format,
  hint,
  onCommit,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  /** Overrides the plain number readout — hertz, seconds, a multiplier. */
  format?: (n: number) => string;
  hint?: string;
  /** Fired when the drag ends, so tuning a voice can play it back to you. */
  onCommit?: () => void;
}) {
  /* The id used to be derived from the label, which was fine while every
     slider on the page had a different one. The kit panel has a master Room
     and a per-voice Room, and two `id="bb-room"` inputs mean the second
     label points at the first input — clicking it focuses the wrong slider.
     `useId` is unique per instance by construction. */
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="row">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerUp={onCommit}
          onKeyUp={onCommit}
        />
        <span className="val mono">{format ? format(value) : `${value}${suffix}`}</span>
      </div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

/**
 * Your own one-shots, slot by slot.
 *
 * A hidden file input per slot rather than one shared input driven by a ref:
 * the label *is* the button, so the click reaches the input with no script at
 * all, and there is no "which slot was I filling?" state to get wrong.
 */
export function SampleSlots() {
  const c = useStudio();
  const { say } = c;
  return (
    <div className="field">
      <span className="fieldlab">Samples</span>
      <div className="slots">
        {SLOTS.map((slot) => {
          const name = c.userNames[slot.id];
          return (
            <div key={slot.id} className={cn('slot', name && 'filled')}>
              <b>
                {slot.label}
                {slot.opt ? <span className="opt">optional</span> : null}
              </b>
              <span className="fn mono">{name ?? '—'}</span>
              <label className="mini">
                {name ? 'Replace' : 'Load'}
                <input
                  type="file"
                  accept="audio/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    void c.addSample(slot.id, file).then((err) => {
                      say(err || `${slot.label}: ${file.name}`);
                    });
                  }}
                />
              </label>
              {name ? (
                <button
                  type="button"
                  className="mini ghost"
                  aria-label={`Clear ${slot.label}`}
                  onClick={() => void c.removeSample(slot.id)}
                >
                  ✕
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="hint">
        Nothing is uploaded — the files stay in this browser. A slot you leave empty falls through
        to the synthesised voice, so a half-loaded kit still plays.
      </div>
    </div>
  );
}

/** What the knobs under each engine actually are. */
export const VOICE_HINTS: Record<string, string> = {
  synth:
    'Cymbals are built from an inharmonic partial cluster plus a stick attack, not from filtered noise — Size shifts the whole cluster, Bright moves the filter it speaks through. An open hat is choked the moment the next hat lands, same as closing the pedal.',
  pack: 'A recording has no filter cutoff to offer, so what is left is how fast it plays back and how loud. Room is still per-lane, because the reverb send sits after every engine.',
  user: 'Your own recordings: speed, level and how much room they are sent to. Everything else was decided when the file was made.',
  aux: 'Toms and percussion are synthesised on every kit — no pack ships tom samples and neither machine has a cowbell worth having — so these are hertz and seconds whichever engine the rest of the kit is running.',
};
