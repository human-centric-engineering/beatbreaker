'use client';

import * as Menu from '@radix-ui/react-dropdown-menu';
import {
  Dices,
  Download,
  Library,
  Menu as MenuIcon,
  SlidersHorizontal,
  Shuffle,
  Stethoscope,
  Timer,
} from 'lucide-react';
import type { ComponentType } from 'react';

import type { StudioTool } from '@/components/app/shell/studio-address';
import { cn } from '@/lib/utils';

/**
 * The Studio's tools, and the two ways into them.
 *
 * From 1024px up they are a tab strip down the right-hand edge: the strip
 * carries the same surface as the header and footer, each tab is labelled in
 * words above its icon, and the open tab paints over the 1px edge between the
 * strip and the drawer, so the two read as one panel (Spike A). Below that the
 * strip is gone and the same tools sit behind one button in the header, which
 * leaves the phone's footer to the transport alone.
 */

/** The list itself is in `studio-address.ts`, where the server can read it too. */
export type Tool = StudioTool;

/**
 * Dice for Generate because a break really is rolled from a seed; a stethoscope
 * for the doctor. Nothing here borrows the sparkle that would imply a model
 * wrote your break — nothing in this phase does.
 */
export const TOOLS: Array<{ id: Tool; label: string; Icon: ComponentType<{ size?: number }> }> = [
  { id: 'gen', label: 'Generate', Icon: Dices },
  { id: 'doctor', label: 'Doctor', Icon: Stethoscope },
  { id: 'patterns', label: 'Patterns', Icon: Library },
  { id: 'kit', label: 'Kit', Icon: SlidersHorizontal },
  { id: 'practice', label: 'Practice', Icon: Timer },
  { id: 'export', label: 'Export', Icon: Download },
];

export function ToolRail({
  open,
  onToggle,
  onNewBreak,
  buttonRef,
}: {
  open: Tool | null;
  onToggle: (tool: Tool) => void;
  onNewBreak: () => void;
  /** So the drawer can put focus back on whatever opened it when it closes. */
  buttonRef: React.RefObject<Partial<Record<Tool, HTMLButtonElement | null>>>;
}) {
  return (
    <nav className="studio-rail" aria-label="Tools">
      {/* It sat above the tabs in the console and stays there: the one action
          that is not a tool, and the one you reach for most. */}
      <button type="button" className="studio-new" onClick={onNewBreak}>
        <span className="studio-rail-label">New break</span>
        <Shuffle size={20} />
      </button>
      {TOOLS.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            buttonRef.current[t.id] = el;
          }}
          type="button"
          className={cn(open === t.id && 'on')}
          aria-expanded={open === t.id}
          aria-controls="studio-drawer"
          onClick={() => onToggle(t.id)}
        >
          <span className="studio-rail-label">{t.label}</span>
          <t.Icon size={20} />
        </button>
      ))}
    </nav>
  );
}

/**
 * The same tools on a phone. Non-modal so the chart stays live behind it and the
 * menu never fights the sheet for the scroll lock.
 */
export function ToolMenu({
  onOpen,
  onNewBreak,
  triggerRef,
  container,
}: {
  onOpen: (tool: Tool) => void;
  onNewBreak: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  /** The frame, so the menu is portalled inside it rather than onto the body. */
  container: HTMLElement | null;
}) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger asChild>
        <button type="button" className="studio-tools-button" ref={triggerRef} aria-label="Tools">
          <MenuIcon size={20} />
        </button>
      </Menu.Trigger>
      <Menu.Portal container={container}>
        <Menu.Content className="studio-menu" align="end" sideOffset={6}>
          {/* There is no rail below 1024px, so the action that lives above it
              comes in here with the tools rather than being lost. */}
          <Menu.Item className="studio-menu-item" onSelect={onNewBreak}>
            <Shuffle size={18} />
            New break
          </Menu.Item>
          {TOOLS.map((t) => (
            <Menu.Item key={t.id} className="studio-menu-item" onSelect={() => onOpen(t.id)}>
              <t.Icon size={18} />
              {t.label}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
