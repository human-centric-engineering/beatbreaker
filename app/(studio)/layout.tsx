import type { Metadata } from 'next';
import { Anton, Chivo, IBM_Plex_Mono } from 'next/font/google';

import { MaintenanceWrapperWithAdminNotice } from '@/components/maintenance-wrapper';
import { BRAND } from '@/lib/brand';

/**
 * The Studio's own frame.
 *
 * A route group of its own because the Studio is not a page in the site's
 * centred column — it is a full-window app view with its own header, footer and
 * drawers. `(protected)` wraps everything in `container mx-auto px-4 py-8`, and
 * a nested layout cannot escape its parent, which is why the console used to
 * reach *up* out of it with `main:has(.bb)` in its own stylesheet. That hatch is
 * gone: the Studio has its own group, so it has its own layout.
 *
 * Maintenance mode still applies — an app view is no more exempt from it than a
 * page is.
 */

/*
 * Self-hosted through `next/font`, not a <link> to Google: no third-party
 * request per visit and no flash of fallback text. They live in the layout
 * rather than the page so that every Studio route gets them, including the
 * loading and error states.
 */
const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--bb-display',
  display: 'swap',
});
const chivo = Chivo({ subsets: ['latin'], variable: '--bb-body', display: 'swap' });
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--bb-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: `%s - ${BRAND.name}`,
    default: `Studio - ${BRAND.name}`,
  },
  description: BRAND.description,
};

export default function StudioLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <MaintenanceWrapperWithAdminNotice>
      <div className={`${anton.variable} ${chivo.variable} ${plexMono.variable}`}>{children}</div>
    </MaintenanceWrapperWithAdminNotice>
  );
}
