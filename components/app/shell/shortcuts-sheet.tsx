'use client';

import Link from 'next/link';

import { ShortcutsTable } from '@/components/app/shell/shortcuts-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * The `?` sheet: every key the Studio answers to, drawn from the same table the
 * key handler reads, so nothing here can be listed and not work (E15).
 */
export function ShortcutsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>None of them fire while you are typing in a field.</DialogDescription>
        </DialogHeader>
        <ShortcutsTable />
        <p className="text-muted-foreground text-sm">
          What each drawer is for is on the{' '}
          <Link
            href="/help"
            target="_blank"
            className="text-primary underline-offset-4 hover:underline"
          >
            Help page
          </Link>
          .
        </p>
      </DialogContent>
    </Dialog>
  );
}
