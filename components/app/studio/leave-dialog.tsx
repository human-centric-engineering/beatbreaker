'use client';

import { useStudio } from '@/components/app/studio/studio-provider';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

/**
 * "Save your changes?" — asked only when putting another pattern on the stage
 * would lose edits: an edited copy of someone else's pattern, or edits to your
 * own that could not reach the server. Everything else lets go without asking
 * (see `use-pattern-document.ts`). Copy from `site-copy.md` §6.
 *
 * Save and Don't save are plain buttons rather than `AlertDialogAction`: an
 * action closes the dialog on click, and a save that fails must leave it open
 * with the edits still here.
 */
export function LeaveDialog() {
  const { leaving, resolveLeave, doc } = useStudio();

  return (
    <AlertDialog
      open={leaving !== null}
      onOpenChange={(open) => {
        if (!open) void resolveLeave('cancel');
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Save your changes to &ldquo;{leaving?.title || 'Untitled pattern'}&rdquo;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {doc.mine
              ? 'They have not reached your account yet. If you go on without saving, they are lost.'
              : 'This pattern is someone else’s. Saving keeps a copy of it, with your changes, in your account.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="outline" onClick={() => void resolveLeave('discard')}>
            Don&rsquo;t save
          </Button>
          <Button onClick={() => void resolveLeave('save')} disabled={doc.status === 'saving'}>
            Save
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
