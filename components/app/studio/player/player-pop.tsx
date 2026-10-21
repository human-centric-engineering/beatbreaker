'use client';

import * as Popover from '@radix-ui/react-popover';
import * as Tooltip from '@radix-ui/react-tooltip';
import { createContext, useContext } from 'react';

import { cn } from '@/lib/utils';

/**
 * Where the player's popovers open into: the player itself, so they come
 * with it into full screen, and so they sit inside the Studio's `.bb` tokens
 * rather than on the bare body.
 */
export const PlayerPortal = createContext<HTMLElement | null>(null);

/** Whether a `PlayerTips` is already round this part of the player. */
const TipsShared = createContext(false);

const TIP_DELAY = { delayDuration: 300, skipDelayDuration: 200 };

/**
 * One tooltip provider for a whole player, so that once one tip has shown, the
 * next button along shows its own at once rather than waiting again. Inside
 * another, it adds nothing.
 */
export function PlayerTips({ children }: { children: React.ReactNode }) {
  const shared = useContext(TipsShared);
  if (shared) return children;
  return (
    <Tooltip.Provider {...TIP_DELAY}>
      <TipsShared.Provider value>{children}</TipsShared.Provider>
    </Tooltip.Provider>
  );
}

/**
 * A tooltip for one of the player's buttons, most of them an icon alone: shown
 * on hover and on keyboard focus, and opened into the player like its panels,
 * so it comes along into full screen. Its trigger takes the props it is given,
 * so the child must pass them to its button; a menu's or a panel's trigger goes
 * outside it, so the open state on the button is the panel's.
 */
export function PlayerTip({
  tip,
  children,
  ...trigger
}: React.ComponentPropsWithRef<typeof Tooltip.Trigger> & {
  tip: string;
  children: React.ReactElement;
}) {
  const container = useContext(PlayerPortal);
  const shared = useContext(TipsShared);
  const root = (
    <Tooltip.Root>
      {/* A menu's or a panel's trigger round it passes its own props through */}
      <Tooltip.Trigger asChild {...trigger}>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal container={container}>
        <Tooltip.Content className="player-tip" side="top" sideOffset={8} collisionPadding={8}>
          {tip}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
  // a button drawn on its own, outside any player, brings its own provider
  return shared ? root : <Tooltip.Provider {...TIP_DELAY}>{root}</Tooltip.Provider>;
}

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
  tip,
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
  /** What the tooltip says the button opens; the label alone if absent. */
  tip?: string;
}) {
  const container = useContext(PlayerPortal);
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <PlayerTip tip={tip ?? label}>
          <button type="button" className={cn('player-tool', className)} aria-label={label}>
            {icon}
            {face ? <span className="player-tool-face">{face}</span> : null}
          </button>
        </PlayerTip>
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
