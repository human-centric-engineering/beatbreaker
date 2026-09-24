'use client';

import { useState } from 'react';

import { useStudio } from '@/components/app/studio/studio-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { type PinTarget, SHELVES, type Shelf } from '@/lib/validations/pins';

/** What each shelf is called on screen. */
export const SHELF_LABEL: Record<Shelf, string> = {
  practising: 'Practising',
  later: 'Later',
};

const NONE = 'none';

/**
 * ★ — put this on a practice shelf, move it to the other, or take it off (D17).
 *
 * A menu rather than a toggle because there are two shelves: a single click
 * cannot say which. Filled when pinned, hollow when not, and the accessible
 * name says which shelf, so the state is not carried by the glyph alone.
 *
 * With no target — a scratch pattern that was never saved — it is disabled and
 * says why: there is nothing with an identity to pin until it is saved.
 */
export function PinButton({
  target,
  label,
  className,
}: {
  target: PinTarget | null;
  /** What is being pinned, for the accessible name — its title. */
  label: string;
  className?: string;
}) {
  const { pins, say } = useStudio();
  const [busy, setBusy] = useState(false);
  const shelf = target ? pins.shelfOf(target) : null;

  if (!target) {
    return (
      <button
        type="button"
        className={cn('pin', className)}
        disabled
        aria-label="Save this pattern to pin it"
        title="Save this pattern to pin it"
      >
        ☆
      </button>
    );
  }

  const name = shelf ? `${label} — on ${SHELF_LABEL[shelf]}` : `Pin ${label}`;

  async function choose(value: string) {
    if (!target) return;
    const next = value === NONE ? null : SHELVES.find((s) => s === value);
    if (next === undefined || next === shelf) return;
    setBusy(true);
    const ok = await pins.setPin(target, next);
    setBusy(false);
    if (ok) say(next ? `Pinned to ${SHELF_LABEL[next]}` : 'Unpinned');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn('pin', shelf && 'on', className)}
          aria-label={name}
          title={name}
          disabled={busy}
        >
          {shelf ? '★' : '☆'}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Practice shelf</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={shelf ?? NONE} onValueChange={(v) => void choose(v)}>
          {SHELVES.map((s) => (
            <DropdownMenuRadioItem key={s} value={s}>
              {SHELF_LABEL[s]}
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuRadioItem value={NONE}>Not pinned</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
