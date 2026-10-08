'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Stave, type StaveHandle } from '@/components/app/breaks/stave';
import { useStudio } from '@/components/app/studio/studio-provider';
import type { SectionLetter } from '@/lib/app/breaks/audio/transport';
import {
  CHART_SCALE,
  centreOf,
  firstSection,
  nextSection,
  pageShift,
  withPreview,
} from '@/lib/app/breaks/drummer/corner-chart';
import { type Engraving, engrave } from '@/lib/app/breaks/engrave';
import { meterOfPat } from '@/lib/app/breaks/pattern';
import { cn } from '@/lib/utils';

/** Where the strip was left: by which engraving, at which step, and where the step after it was on screen. */
interface Placed {
  engraving: Engraving | null;
  index: number;
  shift: number;
  /** Where the playhead sat in the window. */
  here: number;
  /** Where the step after it sat: where the line carries on from. */
  ahead: number;
}

/**
 * The chart in the corner of the drummer view: the section playing on one
 * long line, then the first bars of the section after it, with the section's
 * letter and the beat of the bar — so what the drummer plays can be read
 * against the music while it is played. Hidden on a phone by the stylesheet,
 * where the corner is most of the kit.
 *
 * The line stays still while the playhead walks across it, and moves on — a
 * quick slide, like a page turned — when the playhead nears the right edge.
 * When the next section comes in, its first bar is put where its preview
 * was, so the music carries straight on, then the line slides back to the
 * section's start. The strip is moved imperatively, like
 * the stage's playhead: the staff is memoised, and a step re-renders the
 * counter beside it, not the notes.
 */
export function DrummerChart() {
  const c = useStudio();
  const pos = c.position;
  const has = (l: SectionLetter) => !!c.view[l];
  const eligible = (l: SectionLetter) => (c.viewMode === 'both' || l === c.viewMode) && has(l);
  const first = firstSection(c.arrangement, c.viewMode, has);
  const letter: SectionLetter = (!pos?.count && pos?.letter) || first;
  const secIdx = pos && !pos.count ? pos.secIdx : c.arrangement.findIndex(eligible);
  const nextLetter = nextSection(c.arrangement, c.viewMode, secIdx, letter, has);
  const current = c.view[letter];
  const following = c.view[nextLetter];

  const windowRef = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const stave = useRef<StaveHandle>(null);
  const [room, setRoom] = useState(0);

  const shown = !!current;
  useEffect(() => {
    const el = windowRef.current;
    if (!el) return;
    setRoom(el.clientWidth);
    if (typeof ResizeObserver !== 'function') return;
    const watch = new ResizeObserver(() => setRoom(el.clientWidth));
    watch.observe(el);
    return () => watch.disconnect();
  }, [shown]);

  const engraving = useMemo(() => {
    if (!current) return null;
    const pat = withPreview(current, following);
    return engrave(pat, null, {
      scale: CHART_SCALE,
      perSystem: Math.max(1, pat.bars.length),
      guides: false,
      sticking: false,
    });
  }, [current, following]);

  const index =
    engraving && pos && !pos.count && pos.letter === letter && pos.barIdx != null
      ? pos.barIdx * engraving.steps + pos.slot
      : null;

  const placed = useRef<Placed>({ engraving: null, index: -1, shift: 0, here: 0, ahead: 0 });
  useEffect(() => {
    const el = strip.current;
    const anchor = engraving && index != null ? engraving.map[index] : undefined;
    if (anchor) stave.current?.moveTo(anchor);
    else stave.current?.clear();
    if (!el || !engraving) return;
    const move = (shift: number, glide: boolean) => {
      el.style.transition = glide ? '' : 'none';
      el.style.transform = `translateX(${shift}px)`;
    };
    if (!anchor || index == null) {
      // stopped, or counting in: the top of the line, the clef at the left
      move(0, false);
      placed.current = {
        engraving,
        index: -1,
        shift: 0,
        here: 0,
        ahead: engraving.map[0] ? centreOf(engraving.map[0]) : 0,
      };
      return;
    }
    const x = centreOf(anchor);
    const was = placed.current;
    let shift = was.shift;
    if (was.engraving !== engraving || index < was.index) {
      // a new section, or this one again: its first step goes where the preview of it was.
      // The same step redrawn (an edit while it plays) stays where it was
      shift = (index === was.index ? was.here : was.ahead) - x;
      move(shift, false);
      // the jump has to land before a turn can glide on from it
      void el.getBoundingClientRect();
    }
    const next = pageShift(room, x, shift);
    if (next !== shift) move(next, true);
    const after = engraving.map[index + 1];
    placed.current = {
      engraving,
      index,
      shift: next,
      here: x + next,
      ahead: (after ? centreOf(after) : x) + next,
    };
  }, [engraving, index, room]);

  if (!current || !engraving) return null;

  const meter = pos?.count && pos.meter ? pos.meter : meterOfPat(current);
  const counting = !!pos && (pos.count || pos.letter === letter);
  const beat = counting && pos ? Math.floor(pos.slot / meter.sub) : -1;
  const previewAt = engraving.map[current.bars.length * engraving.steps];

  return (
    <div className="drummer-chart" aria-hidden="true">
      <div className="drummer-chart-hd">
        <span className="drummer-chart-letter">{pos?.count ? 'In' : letter}</span>
        <ol className="drummer-chart-count">
          {Array.from({ length: meter.num }, (_, n) => (
            <li key={n} className={cn(n === beat && 'now', n === beat && n === 0 && 'one')}>
              {n + 1}
            </li>
          ))}
        </ol>
      </div>
      <div className="drummer-chart-window" ref={windowRef}>
        <div className="drummer-chart-strip" ref={strip}>
          <Stave ref={stave} engraving={engraving} />
          {previewAt ? (
            <div className="drummer-chart-next" style={{ left: previewAt.x - 8 * CHART_SCALE }}>
              <span>Next: {nextLetter}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
