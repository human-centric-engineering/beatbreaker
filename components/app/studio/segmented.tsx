'use client';

import { useRef } from 'react';

import { cn } from '@/lib/utils';

/** One choice in a `Segmented`. */
export interface Segment<T> {
  value: T;
  /** What is on the segment. */
  face: React.ReactNode;
  keyshortcuts?: string;
  title?: string;
}

/**
 * The Studio's one "pick one of these" control (E19).
 *
 * A radio group drawn as joined buttons: `role="radiogroup"` named for what is
 * being chosen, each segment a `radio` with `aria-checked`, one tab stop for the
 * whole group and the arrow keys moving the choice, as a set of radios does.
 * The console drew the same thing four ways — pressed buttons, lit `mini`s, a
 * label that changed, a digit that cycled — and only some said which was on.
 *
 * Space and Enter on a segment are its own; the Studio's key handler leaves
 * them alone on anything that is a button, which a segment is.
 */
export function Segmented<T extends string | number | boolean>({
  label,
  options,
  value,
  onChange,
  small,
  className,
}: {
  /** The accessible name of the group — what is being chosen. */
  label: string;
  options: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  small?: boolean;
  className?: string;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const at = options.findIndex((o) => o.value === value);
  /* With nothing chosen the first segment takes the tab stop, or the group
     could not be reached from the keyboard at all. */
  const stop = at >= 0 ? at : 0;

  const move = (from: number, by: number) => {
    const to = (from + by + options.length) % options.length;
    buttons.current[to]?.focus();
    onChange(options[to].value);
  };

  return (
    <div className={cn('seg', small && 'small', className)} role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button
          key={String(o.value)}
          ref={(el) => {
            buttons.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={i === stop ? 0 : -1}
          aria-keyshortcuts={o.keyshortcuts}
          title={o.title}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            /* ⌥← and ⌥→ are Back and Forward through the history, not a move. */
            if (e.altKey || e.metaKey || e.ctrlKey) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(i, 1);
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(i, -1);
            else if (e.key === 'Home') move(0, 0);
            else if (e.key === 'End') move(options.length - 1, 0);
            else return;
            e.preventDefault();
          }}
        >
          {o.face}
        </button>
      ))}
    </div>
  );
}
