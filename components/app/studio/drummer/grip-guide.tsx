'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo, useRef, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GUIDE_GRIPS,
  type GuideGrip,
  lessonLength,
  lessonOf,
  stepStart,
} from '@/lib/app/breaks/drummer/grip-guide';

const GripGuideCanvas = dynamic(() => import('@/components/app/studio/drummer/grip-guide-canvas'), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

/**
 * How to hold the sticks (experiment: the drummer view): a modal with a film
 * for each grip — two arms, their hands and a snare — playing the grip's
 * steps (wikiHow's "How to Hold a Drumstick", rephrased), the step's
 * instruction under it as it plays. The hands are the drummer's, so the grip
 * taught is the grip the drummer at the kit plays with.
 */
export function GripGuide({
  open,
  onOpenChange,
  grip: initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The grip to open on: the one the drummer is playing. */
  grip: GuideGrip;
}) {
  const [grip, setGrip] = useState<GuideGrip>(initial);
  const [opened, setOpened] = useState(open);
  // opening again starts from the drummer's grip, wherever the guide was left
  if (open !== opened) {
    setOpened(open);
    if (open) setGrip(initial);
  }
  const lesson = useMemo(() => lessonOf(grip), [grip]);
  const [playing, setPlaying] = useState(true);
  const [step, setStep] = useState(0);
  const [seek, setSeek] = useState({ to: 0, seq: 0 });
  const bar = useRef<HTMLDivElement>(null);

  const starts = useMemo(() => lesson.steps.map((_, i) => stepStart(grip, i)), [lesson, grip]);
  const onTime = useCallback(
    (t: number) => {
      let at = 0;
      for (let i = 0; i < starts.length; i++) if (t >= starts[i]) at = i;
      setStep((s) => (s === at ? s : at));
      const start = starts[at];
      const end = starts[at + 1] ?? lessonLength(grip);
      if (bar.current)
        bar.current.style.width = `${Math.min(100, ((t - start) / (end - start)) * 100)}%`;
    },
    [starts, grip]
  );
  const goTo = (i: number) => {
    const n = lesson.steps.length;
    const to = ((i % n) + n) % n;
    setStep(to);
    setSeek((s) => ({ to: starts[to], seq: s.seq + 1 }));
  };

  const current = lesson.steps[step];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>How to hold the sticks</DialogTitle>
          <DialogDescription>
            The drummer&rsquo;s own hands, a step at a time. Drag the picture to turn round them.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={grip}
          onValueChange={(v) => {
            const next = GUIDE_GRIPS.find((g) => g === v);
            if (!next) return;
            setGrip(next);
            setStep(0);
            setSeek((s) => ({ to: 0, seq: s.seq + 1 }));
          }}
        >
          <TabsList aria-label="Grip">
            {GUIDE_GRIPS.map((g) => (
              <TabsTrigger key={g} value={g}>
                {lessonOf(g).title.replace(' grip', '')}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="text-muted-foreground text-sm">{lesson.blurb}</p>
        <figure className="relative overflow-hidden rounded-md bg-[#1d1f25]">
          <div className="aspect-video w-full">
            {open ? (
              <GripGuideCanvas
                grip={grip}
                playing={playing}
                seekTo={seek.to}
                seekSeq={seek.seq}
                onTime={onTime}
              />
            ) : null}
          </div>
          <figcaption
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/60 to-transparent px-4 pt-8 pb-3 text-white"
            aria-live="polite"
          >
            <p className="text-xs tracking-wide text-white/70 uppercase">
              Step {step + 1} of {lesson.steps.length}: {current.title}
            </p>
            <p className="mt-1 text-sm leading-snug">{current.caption}</p>
            <div className="mt-2 h-0.5 w-full bg-white/20" aria-hidden="true">
              <div ref={bar} className="h-full bg-white/80" style={{ width: '0%' }} />
            </div>
          </figcaption>
        </figure>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={() => goTo(step - 1)}
          >
            Previous step
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={() => goTo(step + 1)}
          >
            Next step
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={() => goTo(0)}
          >
            From the start
          </button>
        </div>
        <ol className="text-muted-foreground grid gap-1 text-sm sm:grid-cols-2" aria-label="Steps">
          {lesson.steps.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                className={i === step ? 'text-foreground font-medium' : 'hover:text-foreground'}
                aria-current={i === step ? 'step' : undefined}
                onClick={() => goTo(i)}
              >
                {i + 1}. {s.title}
              </button>
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground text-xs">
          Steps after wikiHow&rsquo;s &ldquo;How to Hold a Drumstick&rdquo;, in our own words.
        </p>
      </DialogContent>
    </Dialog>
  );
}
