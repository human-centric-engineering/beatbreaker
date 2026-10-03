'use client';

import { useEffect, useState } from 'react';

/** Matches the 1024px breakpoint in studio.css — a drawer above it, a sheet below. */
const WIDE = '(min-width: 1024px)';

export function useWide(): { wide: boolean; measured: boolean } {
  /* Starts true so the server and the first client render agree; the CSS has
     already laid the frame out for the real width either way, so this only ever
     decides which of the two components mounts once a tool is opened.
     `measured` says the media query has been read — until then `wide` is a
     guess, and a drawer opened on it would be the wrong component on a phone. */
  const [wide, setWide] = useState(true);
  const [measured, setMeasured] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const on = () => setWide(mq.matches);
    on();
    setMeasured(true);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return { wide, measured };
}
