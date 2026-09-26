import type { Tool } from '@/components/app/shell/tool-rail';
import type { Studio } from '@/components/app/studio/studio-provider';

/**
 * Every key the Studio answers to, in one table.
 *
 * The frame's key handler walks this list and the `?` sheet draws it, so a
 * shortcut cannot exist without being listed, or be listed without working
 * (Phase 5, E15). The console had twelve bindings and nothing that said so.
 *
 * `aria` is the `aria-keyshortcuts` value for the control the key stands in
 * for, where there is one.
 */

export interface ShortcutActions {
  studio: Studio;
  openTool: (tool: Tool) => void;
  openSheet: () => void;
}

export interface Shortcut {
  /** As the sheet prints it. */
  keys: string;
  /** What it does, in the sheet's words. */
  does: string;
  aria?: string;
  match: (e: KeyboardEvent) => boolean;
  run: (a: ShortcutActions, e: KeyboardEvent) => void;
  /** Take the key from the browser, whose own meaning is never what you want here. */
  preventDefault?: boolean;
}

const mod = (e: KeyboardEvent) => e.metaKey || e.ctrlKey;
const plain = (e: KeyboardEvent) => !e.metaKey && !e.ctrlKey && !e.altKey;
/** A letter, with Shift or Caps Lock as well as without — none of them means anything else. */
const letter = (k: string) => (e: KeyboardEvent) => plain(e) && e.key.toLowerCase() === k;

export const SHORTCUTS: Shortcut[] = [
  {
    keys: 'Space',
    does: 'Play or stop',
    aria: 'Space',
    match: (e) => plain(e) && e.key === ' ',
    run: ({ studio }) => studio.togglePlay(),
    preventDefault: true,
  },
  {
    keys: '[  ]',
    does: 'Tempo down or up by 2',
    aria: '[ ]',
    match: (e) => plain(e) && (e.key === '[' || e.key === ']'),
    run: ({ studio }, e) => studio.setBpm(studio.bpm + (e.key === '[' ? -2 : 2)),
  },
  {
    keys: '1 – 5',
    does: 'Layer: Skeleton to Full break',
    match: (e) => plain(e) && e.key >= '1' && e.key <= '5',
    run: ({ studio }, e) => studio.setLevel(Number(e.key)),
  },
  {
    keys: 'A  B  V',
    does: 'Show and play A, B, or both',
    match: (e) => plain(e) && ['a', 'b', 'v'].includes(e.key.toLowerCase()),
    run: ({ studio }: ShortcutActions, e: KeyboardEvent): void => {
      const k = e.key.toLowerCase();
      studio.setViewMode(k === 'a' ? 'A' : k === 'b' ? 'B' : 'both');
    },
  },
  {
    keys: 'G',
    does: 'Counting guide on or off',
    aria: 'G',
    match: letter('g'),
    run: ({ studio }) => studio.setGuides(!studio.guides),
  },
  {
    keys: 'N',
    does: 'New break',
    aria: 'N',
    match: letter('n'),
    run: ({ studio }) => studio.newBreak('both'),
  },
  {
    keys: 'P',
    does: 'Open Patterns',
    aria: 'P',
    match: letter('p'),
    run: ({ openTool }) => openTool('patterns'),
  },
  {
    keys: 'S  or  ⌘S',
    does: 'Save',
    aria: 'S Control+S Meta+S',
    match: (e) => e.key.toLowerCase() === 's' && !e.altKey && (plain(e) || (mod(e) && !e.shiftKey)),
    run: ({ studio }) => void studio.doc.save(),
    preventDefault: true,
  },
  {
    keys: '⌘Z',
    does: 'Undo',
    aria: 'Control+Z Meta+Z',
    match: (e) => mod(e) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'z',
    run: ({ studio }) => studio.undo(),
    preventDefault: true,
  },
  {
    keys: '⇧⌘Z',
    does: 'Redo',
    aria: 'Control+Shift+Z Meta+Shift+Z',
    match: (e) => mod(e) && !e.altKey && e.shiftKey && e.key.toLowerCase() === 'z',
    run: ({ studio }) => studio.redo(),
    preventDefault: true,
  },
  {
    keys: '⌥←  ⌥→',
    does: 'Back and forward through what you practised',
    aria: 'Alt+ArrowLeft',
    match: (e) =>
      e.altKey && !mod(e) && !e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'),
    run: ({ studio }, e) => studio.history.step(e.key === 'ArrowLeft' ? 'back' : 'forward'),
    preventDefault: true,
  },
  {
    keys: '?',
    does: 'This list',
    aria: 'Shift+?',
    match: (e) => !mod(e) && !e.altKey && e.key === '?',
    run: ({ openSheet }) => openSheet(),
  },
];

/** The shortcut a key press means, if any. */
export function shortcutFor(e: KeyboardEvent): Shortcut | undefined {
  return SHORTCUTS.find((s) => s.match(e));
}
