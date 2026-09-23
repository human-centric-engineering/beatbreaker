'use client';

/**
 * The Studio's error boundary.
 *
 * Same shape as `(protected)`'s, including the session check — the Studio needs
 * a session, so an expired one is a likely cause of anything that lands here.
 * The way out is the site's landing route rather than the Studio itself, because
 * whatever failed would fail again.
 */

import { LayoutDashboard } from 'lucide-react';

import { RouteErrorBoundary } from '@/components/errors/route-error-boundary';
import { AUTH_LANDING_LABEL, AUTH_LANDING_ROUTE } from '@/lib/auth-landing/route';

export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  return (
    <RouteErrorBoundary
      error={error}
      reset={reset}
      boundaryName="StudioError"
      tag="studio"
      title="The Studio could not open"
      description="Something went wrong loading the Studio. This has been logged."
      checkSession
      fallback={{
        label: AUTH_LANDING_LABEL,
        href: AUTH_LANDING_ROUTE,
        icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      }}
    />
  );
}
