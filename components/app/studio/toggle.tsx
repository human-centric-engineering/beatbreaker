'use client';

import { cn } from '@/lib/utils';

/**
 * The Studio's one on/off button (E19).
 *
 * Its label is fixed and its state is `aria-pressed` and the lit `on` style —
 * never the words. The console had "Click on" / "Click off", "On" / "Off",
 * "Muted" / "Mute", and a screen reader heard "Click off, toggle button, not
 * pressed": the state twice, disagreeing. A label that stays put says what the
 * button does; the pressed state says whether it is doing it.
 *
 * The one exception is Play, whose face is ▶ or ■ because a drummer reads that
 * across a room. Its accessible name stays fixed all the same.
 */
export function Toggle({
  pressed,
  onPressedChange,
  children,
  className = 'mini',
  label,
  keyshortcuts,
  title,
  disabled,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  /** What is on the button. Fixed: it must not change with `pressed`. */
  children: React.ReactNode;
  className?: string;
  /**
   * An accessible name longer than the face — "Mute Snare" on a button that
   * reads Mute in a row that already says Snare. Must contain the face's words.
   */
  label?: string;
  keyshortcuts?: string;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(className, pressed && 'on')}
      aria-pressed={pressed}
      aria-label={label}
      aria-keyshortcuts={keyshortcuts}
      title={title}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
    >
      {children}
    </button>
  );
}
