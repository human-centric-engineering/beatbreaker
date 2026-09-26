'use client';

import { SHORTCUTS } from '@/components/app/shell/shortcuts';
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
        <table className="w-full text-sm">
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.keys} className="border-b last:border-0">
                <th
                  scope="row"
                  className="py-1.5 pr-4 text-left font-mono font-medium whitespace-nowrap"
                >
                  {s.keys}
                </th>
                <td className="text-muted-foreground py-1.5">{s.does}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}
