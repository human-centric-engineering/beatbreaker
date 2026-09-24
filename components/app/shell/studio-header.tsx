'use client';

import Link from 'next/link';

import { StudioTransport } from '@/components/app/shell/studio-transport';
import { ToolMenu, type Tool } from '@/components/app/shell/tool-rail';
import { useStudio } from '@/components/app/studio/studio-provider';
import { BrandMark } from '@/components/brand/brand-mark';
import { HeaderActions } from '@/components/layouts/header-actions';
import { AUTH_LANDING_ROUTE } from '@/lib/auth-landing/route';
import type { SaveStatus } from '@/components/app/studio/use-pattern-document';

/** What the header says about the pattern — the plan's four words, and two more. */
const STATUS_TEXT: Record<SaveStatus, string> = {
  scratch: 'Not saved',
  saved: 'Saved',
  unsaved: 'Unsaved',
  saving: 'Saving…',
  offline: 'Offline — will retry',
  error: 'Not saved — the server refused it',
};

/**
 * Where the pattern stands, and Save when there is something Save would do.
 *
 * A saved pattern of yours has no Save button: it autosaves, and a button that
 * does nothing a second later would teach people to press it. It comes back
 * when a save is stuck, as the way to try again now.
 */
function SaveState() {
  const { doc } = useStudio();
  const stuck = doc.status === 'offline' || doc.status === 'error';
  const showSave = doc.status === 'scratch' || stuck;
  const label = doc.status === 'scratch' && !doc.mine ? 'Save a copy' : stuck ? 'Retry' : 'Save';
  return (
    <>
      <span className="studio-save-state mono" role="status" data-status={doc.status}>
        {doc.status === 'scratch' && !doc.mine ? 'Someone else’s pattern' : STATUS_TEXT[doc.status]}
      </span>
      {showSave ? (
        <button
          type="button"
          className="studio-save"
          onClick={() => void doc.save()}
          aria-keyshortcuts="S Control+S Meta+S"
        >
          {label}
        </button>
      ) : null}
    </>
  );
}

/**
 * The Studio's header: the mark, what you are working on, and the transport.
 *
 * It is not `AppHeader`. That one is a centred container with navigation, which
 * is right for a page you read and wrong for a window you work in — the Studio
 * needs the transport on the same line as the mark and nothing between them. It
 * reuses the two seams that carry identity (`BrandMark`) and the user's own
 * controls (`HeaderActions`) so a fork changing either changes both headers.
 */
export function StudioHeader({
  onOpenTool,
  onNewBreak,
  toolsButtonRef,
  container,
}: {
  onOpenTool: (tool: Tool) => void;
  onNewBreak: () => void;
  toolsButtonRef: React.RefObject<HTMLButtonElement | null>;
  container: HTMLElement | null;
}) {
  const c = useStudio();

  return (
    <header className="studio-header">
      <Link href={AUTH_LANDING_ROUTE} className="studio-brand">
        <BrandMark />
      </Link>
      <span className="studio-title">{c.view.A?.name ?? '…'}</span>
      <SaveState />
      <StudioTransport />
      <span className="studio-spacer" />
      <ToolMenu
        onOpen={onOpenTool}
        onNewBreak={onNewBreak}
        triggerRef={toolsButtonRef}
        container={container}
      />
      <HeaderActions />
    </header>
  );
}
