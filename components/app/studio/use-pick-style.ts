'use client';

import { useCallback, useEffect, useState } from 'react';

import { useStudio } from '@/components/app/studio/studio-provider';

/**
 * Picking a style or a drummer, wherever the crate is opened from: it becomes
 * your style, and a new break is written in it — playing, back at the top with
 * a count-in.
 *
 * The break is written once the pick has landed: on a new pattern the style is
 * held as a setting, and a New in the same tick would still read the old one.
 * `onDone` runs after it is written (the Generate drawer closes itself).
 */
export function usePickStyle(onDone?: () => void): (key: string) => void {
  const c = useStudio();
  const [picked, setPicked] = useState<string | null>(null);
  const { newBreak, restartFromTop, setStyle } = c;
  useEffect(() => {
    if (!picked) return;
    // the pick and the style land in one render: anything else is a pick that did not take
    setPicked(null);
    if (c.style !== picked) return;
    // playing, it goes back to the top and counts in to the new groove
    restartFromTop();
    newBreak('both');
    onDone?.();
  }, [picked, c.style, newBreak, restartFromTop, onDone]);

  return useCallback(
    (key: string) => {
      setStyle(key);
      setPicked(key);
    },
    [setStyle]
  );
}
