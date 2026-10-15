import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getServerSession } from '@/lib/auth/utils';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import { InFlightExecutionBanner } from '@/components/admin/orchestration/in-flight-execution-banner';
import { BRAND } from '@/lib/brand';
import { AUTH_LANDING_ROUTE } from '@/lib/auth-landing/route';
import { canAdminister, type AuthorizationPrincipal } from '@/lib/auth/authorization';
import {
  ADMIN_PATHNAME_HEADER,
  adminPageTier,
  type AdminTier,
  type AdminViewerTier,
} from '@/lib/auth/admin-tier';
import type { AuthSession } from '@/lib/auth/guards';
import { enterSessionOrg, isOrgRefusal } from '@/lib/tenancy/entry';
import { TENANT_HEADER_NAME } from '@/lib/tenancy/resolver';
import { AdminTierGate } from '@/components/admin/admin-tier-gate';
import { getSharedSettingsAccess } from '@/lib/tenancy/shared-settings-access';
import { SharedSettingsAccessProvider } from '@/components/admin/shared-settings-access';

export const metadata: Metadata = {
  title: {
    template: `%s - Admin - ${BRAND.name}`,
    default: `Admin - ${BRAND.name}`,
  },
  description: `Admin dashboard for ${BRAND.name}`,
};

/**
 * Who this session is to the admin console on this page: `'platform'` (every
 * surface), `'org'` (the org-tier ones), or `null` (none of this one).
 *
 * The principal carries the org the guards would enter for this request —
 * the same `enterSessionOrg` call, resolver header first — and the caller's
 * verified role in it, so a policy answers the layout exactly as it answers
 * the routes the page calls. A refused entry (not a member, a suspended org,
 * no org at `multi`) carries no org facts: the platform question is still
 * asked, as it always was, and the org tier has nothing to admit.
 */
async function adminViewerTier(
  session: AuthSession,
  headerOrgId: string | null,
  pageTier: AdminTier | null
): Promise<AdminViewerTier | null> {
  const entry = await enterSessionOrg(
    { id: session.user.id, role: session.user.role },
    session.session.activeOrgId ?? null,
    headerOrgId
  );
  const entered = isOrgRefusal(entry) ? null : entry;
  const principal: AuthorizationPrincipal = {
    userId: session.user.id,
    role: session.user.role,
    credential: 'session',
    ...(entered ? { orgId: entered.orgId, orgRole: entered.role } : {}),
  };
  const scope = entered ? { org: entered.orgId } : {};

  if (await canAdminister(principal, null, scope)) return 'platform';
  if (pageTier === 'org' && (await canAdminister(principal, null, { ...scope, tier: 'org' }))) {
    return 'org';
  }
  return null;
}

/**
 * Admin Layout (Phase 4.4)
 *
 * Layout for all admin routes.
 * Admits whoever the authorization policy says may use the page: a platform
 * admin anywhere, an org OWNER/ADMIN on an org-tier page (§111 t-810).
 * Everyone else is redirected to the landing route; unauthenticated users to
 * login.
 */
export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login');
  }

  // Shared settings are read-only outside the install org at `multi` (§107
  // t-753); every page below asks the provider rather than working it out.
  // Started now so its one membership read runs alongside the policy's
  // instead of after it. It never throws.
  const sharedSettingsRead = getSharedSettingsAccess(session);

  // Redirect to the landing route if the authorization policy says this
  // principal may not use this page. The third of the places Sunrise asks the
  // question — the guards cover the API, this covers the admin tree's own
  // shell. A cookie session is the only way to reach a layout, so the
  // credential is not in doubt here.
  //
  // Asked once for the platform tier and, for whoever that refuses, once for
  // the org tier (§111 t-810): an org OWNER/ADMIN may open a page listed in
  // `ORG_TIER_ADMIN_PAGES`, and no other. The page comes from the proxy's
  // header, because a layout is not handed a pathname; no header is no page,
  // and no page is the platform's. This runs on a full load only — Next.js
  // does not re-render a layout on in-app navigation — so `AdminTierGate`
  // below re-checks each navigation for the reader, and every API route the
  // page calls checks for itself.
  const requestHeaders = await headers();
  const viewerTier = await adminViewerTier(
    session,
    requestHeaders.get(TENANT_HEADER_NAME) || null,
    adminPageTier(requestHeaders.get(ADMIN_PATHNAME_HEADER))
  );
  if (!viewerTier) {
    redirect(AUTH_LANDING_ROUTE);
  }

  const sharedSettings = await sharedSettingsRead;

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <AdminSidebar viewerTier={viewerTier} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <InFlightExecutionBanner />
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-6">
            <SharedSettingsAccessProvider
              readOnly={sharedSettings.readOnly}
              canSwitch={sharedSettings.canSwitch}
              installOrgMember={sharedSettings.installOrgMember}
              isInstallOrg={sharedSettings.isInstallOrg}
            >
              <AdminTierGate viewerTier={viewerTier}>{children}</AdminTierGate>
            </SharedSettingsAccessProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
