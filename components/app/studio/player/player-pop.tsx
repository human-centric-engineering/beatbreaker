'use client';

import * as Popover from '@radix-ui/react-popover';
import { createContext, useContext } from 'react';

import { cn } from '@/lib/utils';

/**
 * Where the player's popovers open into: the player itself, so they come
 * with it into full screen, and so they sit inside the Studio's `.bb` tokens
 * rather than on the bare body.
 */
export const PlayerPortal = createContext<HTMLElement | null>(null);

/**
 * One of the player's tool buttons — Mixer, Sound, the drummer's settings —
 * and the panel it opens above the bar.
 *
 * A Radix popover, so it is non-modal with focus moved in and back, Escape
 * and a click outside close it, and the Studio's key handler leaves it alone
 * (it skips anything inside `[data-radix-popper-content-wrapper]`): you can
 * move a fader with the arrow keys without changing the layer.
 */
export function PlayerPop({
  label,
  icon,
  title,
  children,
  className,
  wide,
  face,
}: {
  /** The button's accessible name, and the panel's. */
  label: string;
  icon: React.ReactNode;
  /** The panel's heading. */
  title: string;
  children: React.ReactNode;
  className?: string;
  /** A wider panel: the mixer's channel strips. */
  wide?: boolean;
  /** A word beside the icon, where the bar has room for it. */
  face?: string;
}) {
  const container = useContext(PlayerPortal);
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn('player-tool', className)}
          aria-label={label}
          title={label}
        >
          {icon}
          {face ? <span className="player-tool-face">{face}</span> : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal container={container}>
        <Popover.Content
          className={cn('player-pop', wide && 'wide')}
          side="top"
          align="end"
          sideOffset={10}
          collisionPadding={12}
          aria-label={label}
        >
          <div className="player-pop-hd">
            <span>{title}</span>
          </div>
          <div className="player-pop-bd">{children}</div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
