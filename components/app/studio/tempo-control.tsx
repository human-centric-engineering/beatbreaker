'use client';

import { Minus, Plus } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useStudio } from '@/components/app/studio/studio-provider';
import { cn } from '@/lib/utils';

/** How long a stepper is held before it starts repeating, and how fast it then goes. */
export const HOLD_DELAY_MS = 400;
export const HOLD_EVERY_MS = 70;

/**
 * A button that steps once when pressed and keeps stepping while held.
 *
 * The step runs on pointer-down, so a tap is one step with no wait, and the
 * click that follows it is ignored; a click from the keyboard (Enter, Space),
 * which has no pointer-down, steps once on its own. The latest `step` is read
 * on every repeat, so a hold follows the tempo it is changing.
 */
function useHoldRepeat(step: () => void) {
  const latest = useRef(step);
  useLayoutEffect(() => {
    latest.current = step;
  });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stop = () => clearTimeout(timer.current);
  useEffect(() => stop, []);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      stop();
      latest.current();
      const again = (after: number) => {
        timer.current = setTimeout(() => {
          latest.current();
          again(HOLD_EVERY_MS);
        }, after);
      };
      again(HOLD_DELAY_MS);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onClick: (e: React.MouseEvent) => {
      if (e.detail === 0) latest.current();
    },
  };
}

/**
 * Tempo, the same way at every width (E4): a number you can type, − and +
 * that step by one and repeat while held, and — where there is room — the
 * slider for the big moves.
 *
 * A typed tempo is clamped as it is set, to 50 and the meter's ceiling, so
 * typing 300 lands on the fastest the meter allows rather than being refused.
 */
export function TempoControl({
  slider = false,
  className,
}: {
  /** The slider as well as the stepper; the phone footer has no room for it. */
  slider?: boolean;
  className?: string;
}) {
  const c = useStudio();
  const [draft, setDraft] = useState<string | null>(null);
  /* Escape blurs to leave, and the blur must not then set what was typed. */
  const cancelled = useRef(false);
  /* A hold counts from its own last step, not from the last render: steps can
     land faster than the Studio re-renders, and each would otherwise add one
     to the same number. Clamped here, or holding + at the ceiling would count
     on past it and − would then take a dozen presses to come back. */
  const now = useRef(c.bpm);
  useLayoutEffect(() => {
    now.current = c.bpm;
  });
  const nudge = (by: number) => {
    now.current = Math.min(Math.max(Math.round(now.current) + by, 50), c.bpmCeiling);
    c.setBpm(now.current);
  };
  const slower = useHoldRepeat(() => nudge(-1));
  const faster = useHoldRepeat(() => nudge(1));

  const commit = () => {
    if (!cancelled.current && draft !== null && draft !== '') c.setBpm(Number(draft));
    cancelled.current = false;
    setDraft(null);
  };

  return (
    <div className={cn('tempo', className)} role="group" aria-label="Tempo controls">
      <button type="button" className="studio-step" aria-label="Slower" {...slower}>
        <Minus size={16} />
      </button>
      <span className="tempo-read">
        <input
          className="tempo-num mono"
          type="text"
          inputMode="numeric"
          aria-label="Tempo in bpm"
          aria-keyshortcuts="[ ]"
          value={draft ?? String(Math.round(c.bpm))}
          onFocus={(e) => {
            setDraft(String(Math.round(c.bpm)));
            e.currentTarget.select();
          }}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            else if (e.key === 'Escape') {
              cancelled.current = true;
              e.currentTarget.blur();
            }
          }}
        />
        <span className="tempo-unit" aria-hidden="true">
          bpm
        </span>
      </span>
      <button type="button" className="studio-step" aria-label="Faster" {...faster}>
        <Plus size={16} />
      </button>
      {slider ? (
        <input
          type="range"
          min={50}
          max={c.bpmCeiling}
          value={c.bpm}
          onChange={(e) => c.setBpm(Number(e.target.value))}
          aria-label="Tempo"
        />
      ) : null}
    </div>
  );
}
