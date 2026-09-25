'use client';

import { useEffect, useRef, useState } from 'react';

import { StudioFooter } from '@/components/app/shell/studio-footer';
import { StudioHeader } from '@/components/app/shell/studio-header';
import { ToolDrawer } from '@/components/app/shell/tool-drawer';
import { ToolRail, type Tool } from '@/components/app/shell/tool-rail';
import { DoctorPanel } from '@/components/app/studio/panels/doctor-panel';
import { ExportPanel } from '@/components/app/studio/panels/export-panel';
import { GeneratePanel } from '@/components/app/studio/panels/generate-panel';
import { KitPanel } from '@/components/app/studio/panels/kit-panel';
import { PatternsPanel, rememberPatternsTab } from '@/components/app/studio/panels/patterns-panel';
import { PracticePanel } from '@/components/app/studio/panels/practice-panel';
import { Stage } from '@/components/app/studio/stage';
import { LeaveDialog } from '@/components/app/studio/leave-dialog';
import { useStudio } from '@/components/app/studio/studio-provider';
import { cn } from '@/lib/utils';

import '@/components/app/breaks/breaks.css';
import '@/components/app/shell/studio.css';

/**
 * The Studio: a full-window app view in the site's frame.
 *
 * Header, stage, tool rail, footer — and every tool in a drawer over the top, so
 * the chart keeps the whole window and nothing it can do moves it. The layout is
 * the stylesheet's job (`studio.css`); this file decides only which component a
 * tool opens *into*, which is the one thing a media query cannot express.
 */

const PANELS: Record<Tool, React.ComponentType> = {
  gen: GeneratePanel,
  doctor: DoctorPanel,
  patterns: PatternsPanel,
  kit: KitPanel,
  practice: PracticePanel,
  export: ExportPanel,
};

/** Matches the 1024px breakpoint in studio.css — a drawer above it, a sheet below. */
const WIDE = '(min-width: 1024px)';

function useWide(): { wide: boolean; measured: boolean } {
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

export function StudioFrame() {
  const c = useStudio();
  const { wide, measured } = useWide();
  const [tool, setTool] = useState<Tool | null>(null);
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const railButtons = useRef<Partial<Record<Tool, HTMLButtonElement | null>>>({});
  const toolsButton = useRef<HTMLButtonElement>(null);
  const lastTool = useRef<Tool>('gen');

  /* A drawer and a sheet are different components; nothing carries across when
     the window crosses the breakpoint. */
  useEffect(() => setTool(null), [wide]);

  /* The drawer the address asked for (`?drawer=`), once, as soon as the width
     is known — a drawer opened before that would be closed by the width
     arriving. Declared after that effect so it runs after it: on a phone
     both fire in the same commit, and the close must not come last. */
  const toOpen = useRef(c.openDrawer);
  useEffect(() => {
    const want = toOpen.current;
    if (!measured || !want) return;
    toOpen.current = undefined;
    /* Asked once: the address stops asking, so a reload — or coming back to
       this history entry — does not open it again over the tab you chose. */
    const url = new URL(window.location.href);
    url.searchParams.delete('drawer');
    url.searchParams.delete('tab');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    if (want.tab) rememberPatternsTab(want.tab);
    lastTool.current = want.tool;
    setTool(want.tool);
  }, [measured]);

  const toggle = (t: Tool) => {
    if (tool !== t) lastTool.current = t;
    setTool((cur) => (cur === t ? null : t));
  };
  const open = (t: Tool) => {
    lastTool.current = t;
    setTool(t);
  };

  /**
   * The Studio from the keyboard.
   *
   * Bound on the document rather than on a focused element: there is no one
   * place to stand. The guard skips anything you could be typing into — and, as
   * of the drawers, anything Space already means something on. A tool panel is
   * full of buttons and sliders, and Space on a focused button presses it
   * (Spike A, finding 2); firing play as well would be a second action the user
   * did not ask for. Keep this list as BeatBuddy's composer arrives.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof HTMLElement ? e.target : null;

      /* Anything you could be typing into takes every key: `b` has to stay a
         letter the moment you paste a break code. */
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;

      /* A control that Space or Enter already activates takes only those. The
         rest of the shortcuts still work with a rail tab or Play focused, which
         is how the console behaved and how you use it one-handed — it is only
         the double action that had to go. */
      if (
        (e.key === ' ' || e.key === 'Enter') &&
        el?.closest('button, [role="slider"], [role="menuitem"], [role="button"]')
      ) {
        return;
      }
      /* Back and Forward through the practice history, the browser's own
         chord for it. Taken from the browser here, where it would otherwise
         leave the Studio. */
      if (
        e.altKey &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      ) {
        e.preventDefault();
        c.history.step(e.key === 'ArrowLeft' ? 'back' : 'forward');
        return;
      }
      if (e.altKey) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) c.redo();
        else c.undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        // the browser's own Save Page is never what you meant in here
        e.preventDefault();
        void c.doc.save();
        return;
      }
      if (e.metaKey || e.ctrlKey) return;

      if (e.key === ' ') {
        e.preventDefault();
        c.togglePlay();
      } else if (e.key === 's' || e.key === 'S') {
        void c.doc.save();
      } else if (e.key === 'n' || e.key === 'N') {
        c.newBreak('both');
      } else if (e.key >= '1' && e.key <= '5') {
        c.setLevel(Number(e.key));
      } else if (e.key === 'g') {
        c.setGuides(!c.guides);
      } else if (e.key === 'a') {
        c.setViewMode('A');
      } else if (e.key === 'b') {
        c.setViewMode('B');
      } else if (e.key === 'v') {
        c.setViewMode('both');
      } else if (e.key === '[') {
        c.setBpm(c.bpm - 2);
      } else if (e.key === ']') {
        c.setBpm(c.bpm + 2);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [c]);

  const Panel = tool ? PANELS[tool] : null;

  return (
    <div className="bb studio-frame" ref={setFrame}>
      <StudioHeader
        onOpenTool={open}
        onNewBreak={() => c.newBreak('both')}
        toolsButtonRef={toolsButton}
        container={frame}
      />

      <div className="studio-body">
        <div className="studio-stage">
          <div className="studio-chart">
            <Stage />
          </div>
        </div>
        <ToolRail
          open={tool}
          onToggle={toggle}
          onNewBreak={() => c.newBreak('both')}
          buttonRef={railButtons}
        />
      </div>

      <StudioFooter />

      <ToolDrawer
        tool={tool}
        wide={wide}
        container={frame}
        onClose={() => setTool(null)}
        onReturnFocus={() =>
          (wide ? railButtons.current[lastTool.current] : toolsButton.current)?.focus()
        }
      >
        {Panel ? <Panel /> : null}
      </ToolDrawer>

      <LeaveDialog />

      <div className={cn('toast', c.toast && 'show')} role="status">
        {c.toast}
      </div>
    </div>
  );
}
