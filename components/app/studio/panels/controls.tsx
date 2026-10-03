'use client';

import { useId } from 'react';

import { StudioHelp } from '@/components/app/studio/studio-help';

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
  help,
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
  /** Behind an ⓘ beside the label — the why, where `hint` is the what (E14). */
  help?: React.ReactNode;
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
      {help ? (
        /* The ⓘ sits beside the label, not in it: a button inside a <label>
           would be labelled by it too, and share the slider's name. */
        <div className="fieldhead">
          <label htmlFor={id}>{label}</label>
          <StudioHelp title={label}>{help}</StudioHelp>
        </div>
      ) : (
        <label htmlFor={id}>{label}</label>
      )}
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

/** What the knobs under each engine actually are. */
export const VOICE_HINTS: Record<string, string> = {
  synth:
    'Cymbals are built from an inharmonic partial cluster plus a stick attack, not from filtered noise — Size shifts the whole cluster, Bright moves the filter it speaks through. An open hat is choked the moment the next hat lands, same as closing the pedal.',
  pack: 'A recording has no filter cutoff to offer, so what is left is how fast it plays back and how loud. Room is still per-lane, because the reverb send sits after every engine.',
  user: 'Your own recordings: speed, level and how much room they are sent to. Everything else was decided when the file was made.',
  aux: 'These knobs tune the synthesised toms and percussion, in hertz and seconds, whichever engine the rest of the kit runs. Where a kit has its own tom recordings (the jazz and brush kits), or the percussion is recorded, only Room acts on those; a lane with no recording plays the synthesised voice these knobs shape.',
};
