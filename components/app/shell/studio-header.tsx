'use client';

import Link from 'next/link';

import { StudioTransport } from '@/components/app/shell/studio-transport';
import { ToolMenu, type Tool } from '@/components/app/shell/tool-rail';
import { useStudio } from '@/components/app/studio/studio-provider';
import { BrandMark } from '@/components/brand/brand-mark';
import { HeaderActions } from '@/components/layouts/header-actions';
import { AUTH_LANDING_ROUTE } from '@/lib/auth-landing/route';

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
