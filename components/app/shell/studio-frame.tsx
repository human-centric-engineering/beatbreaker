'use client';

import { useEffect, useRef, useState } from 'react';

import { shortcutFor } from '@/components/app/shell/shortcuts';
import { ShortcutsSheet } from '@/components/app/shell/shortcuts-sheet';
import { StudioFooter } from '@/components/app/shell/studio-footer';
import { SessionBar } from '@/components/app/practice/session-bar';
import { StudioHeader } from '@/components/app/shell/studio-header';
import { ToolDrawer } from '@/components/app/shell/tool-drawer';
import { ToolRail, type Tool } from '@/components/app/shell/tool-rail';
import { useWide } from '@/components/app/shell/use-wide';
import { BuddyPanel } from '@/components/app/buddy/buddy-panel';
import { useBuddyChat } from '@/components/app/buddy/use-buddy-chat';
import { DoctorPanel } from '@/components/app/studio/panels/doctor-panel';
import { ExportPanel } from '@/components/app/studio/panels/export-panel';
import { GeneratePanel } from '@/components/app/studio/panels/generate-panel';
import { KitPanel } from '@/components/app/studio/panels/kit-panel';
import { PatternsPanel, rememberPatternsTab } from '@/components/app/studio/panels/patterns-panel';
import { PracticePanel } from '@/components/app/studio/panels/practice-panel';
import { Stage } from '@/components/app/studio/stage';
import { LeaveDialog } from '@/components/app/studio/leave-dialog';
import { StudioToast } from '@/components/app/studio/studio-toast';
import { useStudio } from '@/components/app/studio/studio-provider';

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

/* A panel may send you to another drawer — Generate names the kit and links to
   Sound, which is where the kit is chosen (E10) — or close its own: picking a
   style makes a new break and gets out of the way of it. */
const PANELS: Record<
  Exclude<Tool, 'buddy'>,
  React.ComponentType<{ onOpenTool?: (tool: Tool) => void; onClose?: () => void }>
> = {
  gen: GeneratePanel,
  doctor: DoctorPanel,
  patterns: PatternsPanel,
  kit: KitPanel,
  practice: PracticePanel,
  export: ExportPanel,
};

export function StudioFrame() {
  const c = useStudio();
  /* Held here rather than in the drawer, which unmounts when it closes: the
     conversation has to survive closing BeatBuddy to look at the chart. */
  const buddy = useBuddyChat(c);
  const { wide, measured } = useWide();
  const [tool, setTool] = useState<Tool | null>(null);
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const railButtons = useRef<Partial<Record<Tool, HTMLButtonElement | null>>>({});
  const toolsButton = useRef<HTMLButtonElement>(null);
  const lastTool = useRef<Tool>('gen');
  const [sheet, setSheet] = useState(false);
  /* Read by the key handler, which is bound once per Studio, not per render. */
  const sheetOpen = useRef(false);
  useEffect(() => {
    sheetOpen.current = sheet;
  }, [sheet]);

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

      /* Nothing reaches the Studio behind a modal — the shortcuts sheet, the
         unsaved-changes prompt, the first-run tour or the style picker — or
         from inside an ⓘ popover, where you are reading, not playing. The
         drawers are dialogs too, but non-modal, and the keys are meant to work
         while one is open. */
      if (
        sheetOpen.current ||
        document.querySelector('[role="alertdialog"], [data-studio-tour], [data-studio-modal]') ||
        el?.closest('[data-radix-popper-content-wrapper]')
      ) {
        return;
      }

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
      /* Everything else is the table (`shortcuts.ts`), which the `?` sheet
         draws — so what works and what is listed cannot drift apart. Alt+←
         is Back through the practice history, taken from the browser here,
         where it would otherwise leave the Studio. */
      const shortcut = shortcutFor(e);
      if (!shortcut) return;
      if (shortcut.preventDefault) e.preventDefault();
      shortcut.run({ studio: c, openTool: open, openSheet: () => setSheet(true) }, e);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [c]);

  const Panel = tool && tool !== 'buddy' ? PANELS[tool] : null;

  return (
    <div className="bb studio-frame" ref={setFrame}>
      <StudioHeader
        onOpenTool={open}
        onNewBreak={() => c.newBreak('both')}
        toolsButtonRef={toolsButton}
        container={frame}
      />

      <SessionBar />

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

      <StudioFooter onShowShortcuts={() => setSheet(true)} />

      <ToolDrawer
        tool={tool}
        wide={wide}
        container={frame}
        onClose={() => setTool(null)}
        onReturnFocus={() =>
          (wide ? railButtons.current[lastTool.current] : toolsButton.current)?.focus()
        }
      >
        {tool === 'buddy' ? (
          <BuddyPanel chat={buddy} />
        ) : Panel ? (
          <Panel onOpenTool={open} onClose={() => setTool(null)} />
        ) : null}
      </ToolDrawer>

      <LeaveDialog />
      <ShortcutsSheet open={sheet} onOpenChange={setSheet} />

      <StudioToast />
    </div>
  );
}
