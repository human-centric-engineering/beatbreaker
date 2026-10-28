/**
 * Tests: lib/app/ seams ship as no-op defaults
 *
 * Every `lib/app/*` file is a fork-owned scaffold that Sunrise ships EMPTY. This
 * file exercises the REAL defaults to lock in that contract — a stray default
 * registration would silently apply to every install (a lint rule every fork
 * inherits, an auth email swapped out, a restricted agent's document access
 * widened).
 *
 * ---------------------------------------------------------------------------
 * FORK NOTE — filling a seam is EXPECTED to fail a row here
 * ---------------------------------------------------------------------------
 * This test asserts a property every fork is expected to violate: the seams
 * exist precisely so you fill them. When you fill one, **pin the new value**
 * rather than deleting the row:
 *
 *     // BEFORE (Sunrise default)
 *     assert: () => expect(appEslintConfig).toEqual([]),
 *     // AFTER  (fork spreads its own tier config)
 *     assert: () => expect(appEslintConfig).toEqual(frameworkEslintConfig),
 *
 * Pinning keeps the protection for the seams you have NOT filled; deleting the
 * row loses it silently. The table below is the whole surface — one row per
 * seam — so a fork's diff here is a line, not a rewrite. See CUSTOMIZATION.md §4.
 *
 * @see lib/app/ · CUSTOMIZATION.md §4
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ownModuleProblems, scaffoldsOnDisk, unlistedSeams } from '@/tests/helpers/app-scaffolds';
import { registerAppRateLimits } from '@/lib/app/rate-limit';
import { registerAppTenantResolver } from '@/lib/app/tenant-resolver';
import { hasTenantResolver } from '@/lib/tenancy/resolver';
import { initAppCapabilities } from '@/lib/app/capabilities';
import {
  hasProviderCredentialResolver,
  resetProviderCredentialResolver,
  resolveProviderCredential,
} from '@/lib/orchestration/llm/provider-credentials';
import { initAppContextContributors } from '@/lib/app/context-contributors';
import { initAppNav } from '@/lib/app/admin-nav';
import { publicNavItems, footerNavItems, footerLegalItems } from '@/lib/app/public-nav';
import { protectedNavItems } from '@/lib/app/protected-nav';
import { appAuthLandingRoute, appAuthLandingLabel } from '@/lib/app/auth-landing';
import { initApp } from '@/lib/app/bootstrap';
import { initAppKnowledgeAccessContributors } from '@/lib/app/knowledge-access-contributors';
import { initAppGuardFloorContributors } from '@/lib/app/guard-floor-contributors';
import { initAppGuardEventContributors } from '@/lib/app/guard-event-contributors';
import { appAgentFields } from '@/lib/app/agent-fields';
import { appProtectedRoutes } from '@/lib/app/protected-routes';
import { appCredentialPaths } from '@/lib/app/credential-paths';
import { appEnvSchema } from '@/lib/app/env';
import { footerCopyright } from '@/lib/app/footer';
import { APP_API_KEY_SCOPES } from '@/lib/app/api-key-scopes';
import { listValidApiKeyScopes, CORE_API_KEY_SCOPES } from '@/lib/auth/api-key-scopes';
import appEslintConfig from '@/lib/app/eslint.config.mjs';
import { appFrameSrc } from '@/lib/app/csp';
import {
  appCoverageExclusions,
  appAlwaysRunTests,
  appOwnerlessSurfaceExceptions,
} from '@/lib/app/ci';
import { occupiedTiers } from '@/lib/app/reserved-tiers';
import { appOwnModules } from '@/lib/app/own-modules';
import { APP_CAPABILITY_PAIRS, APP_UNCHECKED_SEEDS } from '@/lib/app/capability-seed-pairs';
import { initAppUserCreatedHooks } from '@/lib/app/user-created';
import {
  getAppSubjectSources,
  getAppExcludedSubjectSources,
  __resetAppSubjectSourceRegistryForTests,
} from '@/lib/privacy/subject-source-registry';
import {
  getAppOrgSources,
  getAppExcludedOrgSources,
  appOrgDeclarationsFailed,
  __resetAppOrgSourceRegistryForTests,
} from '@/lib/privacy/org-source-registry';
import { getAppJobs, __resetAppJobsForTests } from '@/lib/orchestration/maintenance/app-jobs';
import {
  getErasureCleanupHooks,
  __resetErasureCleanupHooksForTests,
} from '@/lib/privacy/erasure-hooks';
import { getEffectiveRateLimitPolicy, RATE_LIMIT_POLICY } from '@/lib/security/rate-limit-policy';
import {
  hasProviderEligibilityResolver,
  resolveEligibleProviders,
} from '@/lib/orchestration/llm/provider-eligibility';
import { getRegisteredNavSections, __resetNavRegistryForTests } from '@/lib/admin-nav/registry';
import {
  listAppMcpResourceTypes,
  listAllowedMcpResourceUriSchemes,
  __resetAppMcpResourcesForTests,
} from '@/lib/orchestration/mcp/resource-registry';
import {
  listGraders,
  __resetGraderRegistryForTests,
} from '@/lib/orchestration/evaluations/graders/registry';
import {
  CORE_PLATFORM_AGENTS,
  listPlatformAgents,
  __resetPlatformAgentsForTests,
} from '@/lib/orchestration/agents/platform-agents';
import {
  ACCOUNT_SURFACES,
  getRegisteredAccountSections,
  __resetAccountSectionRegistryForTests,
} from '@/lib/account-sections/registry';
import { initAppAuthorizationPolicy } from '@/lib/app/authorization';
import { ORG_TIER_ADMIN_PAGES, adminPageTier } from '@/lib/auth/admin-tier';
import { APP_ORG_TIER_ADMIN_ROUTES } from '@/lib/app/admin-tier-routes';
import { appOrgAdminLandingRoute } from '@/lib/app/admin-landing';
import { orgAdminLanding } from '@/lib/auth/admin-landing';
import {
  getAppOrgTierAdminPages,
  orgTierAdminPages,
  __resetAppOrgTierAdminPagesForTests,
  closedCoreOrgTierSections,
} from '@/lib/auth/org-tier-admin-pages';
import {
  appOwnerClassifications,
  __resetAppOwnerClassificationForTests,
} from '@/lib/db/owner-classification';
import {
  DEFAULT_AUTHORIZATION_POLICY,
  getAuthorizationPolicy,
  hasAppAuthorizationPolicy,
  __resetAuthorizationPolicyForTests,
} from '@/lib/auth/authorization';

/**
 * One row per `lib/app/*` seam.
 *
 * - `seam` — the file a fork edits, and the test name.
 * - `risk` — what a stray default here would do to every install. This is the
 *   reason the row exists; keep it accurate if you pin a fork value.
 * - `assert` — runs the REAL default and asserts it registers/overrides nothing.
 *   May be async.
 */
interface SeamDefault {
  seam: string;
  risk: string;
  assert: () => void | Promise<void>;
}

/**
 * Seam files deliberately absent from the table below, with the reason. The
 * drift guard at the bottom of this file allows exactly these two.
 */
/** This file's own repo-relative path — the one place importActual is allowed. */
const THIS_FILE = path.join('tests', 'unit', 'lib', 'app', 'defaults.test.ts');

const UNASSERTED_SEAMS = new Set([
  // Asserted behaviourally instead — see tests/unit/lib/db/drift-probes.test.ts.
  'lib/app/db-drift.ts',
  // The one seam that ships real logic (a classifier) rather than an empty
  // value, so "registers nothing" is not the contract. Covered by its own tests.
  'lib/app/surface.ts',
]);

const SEAM_DEFAULTS: SeamDefault[] = [
  {
    seam: 'lib/app/authorization.ts',
    risk: 'a stray policy would replace the authorization decision at every guarded request and every admin page — the one seam whose default registration would change who can reach what, on every install',
    assert: () => {
      initAppAuthorizationPolicy();
      expect(hasAppAuthorizationPolicy()).toBe(false);
      // BY IDENTITY: what runs must be Sunrise's own object, not something
      // equivalent-looking. `getAuthorizationPolicy()` also runs the fork gate,
      // so this covers the wiring as well as the value.
      expect(getAuthorizationPolicy()).toBe(DEFAULT_AUTHORIZATION_POLICY);
    },
  },
  {
    seam: 'lib/app/llm-providers.ts',
    risk: 'a stray eligibility rule would silently drop provider fallbacks on every install',
    assert: async () => {
      // `importActual`, NOT a plain import: tests/setup.ts pins this seam for
      // every other file, and asserting the pin would prove nothing about what
      // Sunrise actually ships. This is the file that must see the real one.
      const seam =
        await vi.importActual<typeof import('@/lib/app/llm-providers')>('@/lib/app/llm-providers');
      await seam.registerAppProviderEligibility();
      expect(hasProviderEligibilityResolver()).toBe(false);
      // BY IDENTITY, not by deep equality: the default has to be the input
      // array itself, which is what makes "byte-identical at single" a fact
      // rather than a claim about equivalent-looking output.
      const candidates = ['anthropic', 'openai'];
      await expect(
        resolveEligibleProviders(candidates, {
          task: 'chat',
          source: 'system',
          primarySlug: 'anthropic',
        })
      ).resolves.toBe(candidates);
    },
  },
  {
    seam: 'lib/app/rate-limit.ts',
    risk: 'a stray tier or rule would re-cap every install',
    // FORK (BeatBreaker): re-pointed, not deleted — see the brand row above.
    // Phase 2 filled this seam with one rule, for the public catalogue reads;
    // Phase 6 adds one for the community library.
    // The pin is now "exactly that rule and nothing else", which is the same
    // guarantee the empty version gave: the risk is a rule nobody decided
    // about, not a rule existing.
    assert: () => {
      registerAppRateLimits();
      const effective = getEffectiveRateLimitPolicy();
      const added = effective.filter((rule) => !RATE_LIMIT_POLICY.includes(rule));
      // Phase 6 adds the second: the community library and shared patterns.
      expect(added.map((r) => [String(r.match), r.tier, r.key])).toEqual([
        /* Keyed on IP, not on the session user: both answer signed-out callers
           (D2), so session keying would collapse every anonymous reader onto
           their IP anyway — this says so rather than implying it. */
        [String(/^\/api\/v1\/catalogue\//), 'catalogue', 'ip'],
        [String(/^\/api\/v1\/public\//), 'public', 'ip'],
      ]);
      /* And the base policy is still in there, by identity, in order: an app
         rule must ADD to Sunrise's caps, never replace or reorder one. */
      expect(effective.filter((rule) => RATE_LIMIT_POLICY.includes(rule))).toEqual([
        ...RATE_LIMIT_POLICY,
      ]);
    },
  },
  {
    seam: 'lib/app/tenant-resolver.ts',
    risk: 'a stray resolver would pick an org for every request on every install',
    assert: () => {
      registerAppTenantResolver();
      // No resolver → the proxy strips the org header on every request.
      expect(hasTenantResolver()).toBe(false);
    },
  },
  {
    seam: 'lib/app/capabilities.ts',
    risk: 'a stray capability would be dispatchable on every install',
    // Behavioural reach into the dispatcher is covered by bootstrap-wiring.test.ts.
    assert: () => expect(initAppCapabilities()).toBeUndefined(),
  },
  {
    seam: 'lib/app/context-contributors.ts',
    risk: 'a stray contributor would inject prompt context into every chat turn',
    // Behavioural reach into buildContext is covered by context-builder.test.ts.
    assert: () => expect(initAppContextContributors()).toBeUndefined(),
  },
  {
    seam: 'lib/app/admin-nav.ts',
    risk: 'a stray section would appear in every install’s admin sidebar',
    // FORK (BeatBreaker): re-pointed, not deleted — see the brand row above.
    // Phase 2 adds one section with one item, for the catalogue. Pinned to the
    // href rather than the label so a rename is free and a link quietly
    // pointing somewhere else is not.
    assert: () => {
      __resetNavRegistryForTests();
      initAppNav();
      const sections = getRegisteredNavSections();
      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('BeatBreaker');
      // Phase 6 adds the moderation queue
      expect(sections[0].items?.map((i) => i.href)).toEqual([
        '/admin/catalogue',
        '/admin/patterns',
      ]);
      // Registration is idempotent by title, and the sidebar imports this at
      // module load — under HMR it runs more than once.
      initAppNav();
      expect(getRegisteredNavSections()).toHaveLength(1);
    },
  },
  {
    seam: 'lib/app/public-nav.ts',
    risk: 'a stray non-null list would silently REPLACE the marketing nav',
    // FORK (BeatBreaker): re-pointed, not deleted. Phase 6 adds Explore, the
    // community library, to the header. Phase 8 (8.7) adds Help to the
    // footer, with the platform's three. Phase 11-b adds Drummers, the
    // lineage map.
    assert: () => {
      expect(publicNavItems?.map((i) => i.href)).toEqual([
        '/',
        '/explore',
        '/drummers',
        '/about',
        '/contact',
      ]);
      expect(footerNavItems?.map((i) => i.href)).toEqual(['/', '/about', '/help', '/contact']);
      expect(footerLegalItems).toBeNull();
    },
  },
  {
    seam: 'lib/app/protected-nav.ts',
    risk: 'a stray non-null list would silently REPLACE the authenticated nav',
    // FORK (BeatBreaker): re-pointed, not deleted — see the brand row above.
    // The nav a signed-in drummer sees. Pinned by href so that a rename is free
    // and a route quietly disappearing from the header is not.
    assert: () => {
      // '/explore' since Phase 6 built it; '/practice' since Phase 7D
      expect(protectedNavItems?.map((i) => i.href)).toEqual([
        '/dashboard',
        '/studio',
        '/practice',
        '/explore',
        '/admin',
      ]);
      // Profile and Settings live in UserButton; listing them twice was the bug
      expect(protectedNavItems?.some((i) => i.href === '/profile')).toBe(false);
    },
  },
  {
    seam: 'lib/app/auth-landing.ts',
    risk: 'a stray value would send every install somewhere else after login',
    // FORK (BeatBreaker): re-pointed, not deleted — see the brand row above.
    // The route is deliberately Sunrise's own, so nothing in the platform moves;
    // only the label does.
    assert: () => {
      expect(appAuthLandingRoute).toBe('/dashboard');
      expect(appAuthLandingLabel).toBe('Home');
    },
  },
  {
    seam: 'lib/app/footer.ts',
    risk: 'a stray value would rewrite — or silently remove — the attribution line on every install, on both the public and authenticated footers',
    assert: () => expect(footerCopyright).toBeNull(),
  },
  {
    seam: 'lib/app/emails.ts',
    risk: 'a stray override would swap an auth email for every install',
    assert: async () => {
      // `importActual`, NOT a plain import: tests/setup.ts pins this seam to
      // `{}` for every other file (#895), so a plain import would assert the pin.
      const seam = await vi.importActual<typeof import('@/lib/app/emails')>('@/lib/app/emails');
      expect(seam.emailOverrides).toEqual({});
    },
  },
  {
    seam: 'lib/app/data-export.ts',
    risk: 'a stray collector would leak app rows into every install’s subject-access export, and a stray declaration would pre-account for a table nobody decided about',
    // FORK (BeatBreaker): re-pointed, not deleted — see the brand row above.
    // The collector now hits the database, so the shape is asserted rather than
    // the (empty) result: what matters is that EVERY declared section comes back
    // as a key even with no rows, because a bundle short by a section reads
    // exactly like a complete answer.
    //
    // Phase 2 added the three catalogue tables. Every row in them is a system
    // row today (`ownerId` null), so those sections come back empty for
    // everybody — and they are declared anyway, so that the day D16 ships
    // user-authored styles the export does not quietly stop being complete.
    // StyleVersion and LibraryEntry are excluded with reasons rather than
    // undeclared: they are exported inside their parent. Phase 4 (task 4.6)
    // added Pin — the practice shelves, personal data like Break — and task
    // 4.7 PracticeVisit, the practice history. Phase 4A (task 4A.1) added
    // StudioSettings, how you set up the Studio, and 4A.7 Sample, your own
    // drum samples. Phase 6 (task 6.2) added DrummerProfile, the username you
    // publish under, and excluded ReservedUsername, a released name with no
    // user id on it. Phase 6-iii (task 6.10) added BreakReport, the reports
    // you filed — not those about your own patterns. Phase 7 (task 7.8) added
    // BuddyWorkspace, the pattern BeatBuddy last saw. Phase 7D (task 7D.2)
    // added PracticeSession, with its items inside it, and PracticeRun.
    // Phase 9-v (task 9.16) excluded KitPiece, catalogue data with no owner.
    // Phase 11-a excluded the three lineage tables, the same.
    assert: async () => {
      __resetAppSubjectSourceRegistryForTests();
      expect(
        getAppSubjectSources()
          .map((s) => s.model)
          .sort()
      ).toEqual([
        'Break',
        'BreakReport',
        'BuddyWorkspace',
        'DrummerAbout',
        'DrummerProfile',
        'DrummerReport',
        'Kit',
        'PatternLibrary',
        'Pin',
        'PracticeRun',
        'PracticeSession',
        'PracticeVisit',
        'Sample',
        'SpeedRecord',
        'SpeedReport',
        'StudioSettings',
        'Style',
        'Take',
      ]);
      expect(
        getAppSubjectSources()
          .map((s) => s.section)
          .sort()
      ).toEqual([
        'about',
        'breaks',
        'buddyWorkspace',
        'drummerProfile',
        'kits',
        'libraries',
        'pins',
        'practiceHistory',
        'practiceRuns',
        'practiceSessions',
        'profileReportsFiled',
        'reportsFiled',
        'samples',
        'speedRecords',
        'speedReportsFiled',
        'studioSettings',
        'styles',
        'takes',
      ]);
      expect(
        getAppExcludedSubjectSources()
          .map((s) => s.model)
          .sort()
      ).toEqual([
        'KitPiece',
        'LibraryEntry',
        'LineageEdge',
        'LineageNode',
        'LineageRecording',
        'PracticeSessionItem',
        'ReservedUsername',
        'StyleVersion',
      ]);
      // An exclusion without a reason is a table nobody decided about.
      for (const excluded of getAppExcludedSubjectSources()) {
        expect(excluded.reason.length).toBeGreaterThan(20);
      }
    },
  },
  {
    seam: 'lib/app/org-export.ts',
    risk: 'a stray source would read a table into every install\u2019s org export \u2014 and pre-account for an orgId model nobody decided about, silencing the org-manifest coverage rule for it',
    assert: () => {
      __resetAppOrgSourceRegistryForTests();
      // The reads trigger the lazy init, so this exercises the REAL file.
      expect(getAppOrgSources()).toEqual([]);
      expect(getAppExcludedOrgSources()).toEqual([]);
      expect(appOrgDeclarationsFailed()).toBe(false);
    },
  },
  {
    seam: 'lib/app/owner-classification.ts',
    risk: 'a stray classification would switch the data layer’s owner check on for a model nobody decided was private — refusing reads the product means to allow — or pre-classify a fork model nobody looked at, silencing the coverage guard for it',
    assert: () => {
      __resetAppOwnerClassificationForTests();
      // The read triggers the lazy init, so this exercises the REAL file.
      // FORK (BeatBreaker): re-pointed, not deleted. The app classifies its own
      // user-linked models (0.15.0, §115) and enforces none of them. Pinned by
      // model and kind, so a model moving between personal and not-personal —
      // or appearing unannounced — fails here.
      const classified = appOwnerClassifications();
      const byKind = (kind: string) =>
        Object.entries(classified)
          .filter(([, c]) => c.kind === kind)
          .map(([model]) => model)
          .sort();
      expect(byKind('personal')).toEqual([
        'BuddyWorkspace',
        'Pin',
        'PracticeRun',
        'PracticeVisit',
        'Sample',
        'StudioSettings',
        'Take',
      ]);
      expect(byKind('not-personal')).toEqual([
        'Break',
        'BreakReport',
        'DrummerAbout',
        'DrummerProfile',
        'DrummerReport',
        'Kit',
        'PatternLibrary',
        'PracticeSession',
        'SpeedRecord',
        'SpeedReport',
        'Style',
        'StyleVersion',
      ]);
      expect(Object.values(classified).filter((c) => 'enforced' in c)).toEqual([]);
    },
  },
  {
    seam: 'lib/app/bootstrap.ts',
    risk: 'a stray default would run one-time work on every install boot',
    // That instrumentation calls this in all envs, try/catch-isolated, is
    // covered by tests/unit/instrumentation.test.ts.
    // FORK (BeatBreaker): the samples erasure hook used to be registered
    // here; it moved to lib/app/erasure.ts so an erasure run outside the
    // booted server reaches it too; boot has no work left.
    assert: async () => {
      await expect(initApp()).resolves.toBeUndefined();
    },
  },
  {
    seam: 'lib/app/knowledge-access-contributors.ts',
    risk: 'a stray contributor would widen every restricted agent’s document access',
    // Behavioural reach into the resolver is covered by resolveAgentDocumentAccess.test.ts.
    assert: () => expect(initAppKnowledgeAccessContributors()).toBeUndefined(),
  },
  {
    seam: 'lib/app/guard-floor-contributors.ts',
    risk: 'a stray contributor would raise the guard floor on every install',
    assert: () => expect(initAppGuardFloorContributors()).toBeUndefined(),
  },
  {
    seam: 'lib/app/guard-event-contributors.ts',
    risk: 'a stray observer would receive every install’s inline-chat guard events',
    assert: () => expect(initAppGuardEventContributors()).toBeUndefined(),
  },
  {
    seam: 'lib/app/agent-fields.ts',
    risk: 'a stray descriptor would add a field to every install’s agent form',
    assert: () => expect(appAgentFields).toEqual([]),
  },
  {
    seam: 'lib/app/protected-routes.ts',
    risk: 'a stray path would put a public route behind auth on every install',
    // FORK (BeatBreaker): re-pointed, not deleted — see the brand row above.
    // '/practice' (Phase 7D) and nothing else, and this row is what holds it
    // there. /studio gates itself in its page, and /breaks only redirects to
    // it, because the edge redirect loses the `#b=` fragment a shared link
    // carries (H5) — so adding either one here would break every shared link
    // already handed out without breaking anything else.
    assert: () => expect(appProtectedRoutes).toEqual(['/practice']),
  },
  {
    seam: 'lib/app/credential-paths.ts',
    risk: 'a stray pattern would blank a route word out of every install’s logs and analytics',
    assert: () => expect(appCredentialPaths).toEqual([]),
  },
  {
    seam: 'lib/app/env.ts',
    risk: 'a stray key would make an unset env var fail boot on every install',
    // FORK (BeatBreaker): re-pointed, not deleted. Phase 4A (task 4A.7) adds
    // the sample allowance (D20). Both keys have defaults, so an install that
    // sets neither still boots — which is the risk this row guards — and gets
    // the decided allowance. Phase 8 (8.1) adds BeatBuddy's daily turns (D4),
    // defaulted the same way.
    assert: () =>
      expect(appEnvSchema.parse({})).toEqual({
        SAMPLES_MAX_COUNT: 150,
        SAMPLES_MAX_BYTES: 50 * 1024 * 1024,
        BUDDY_DAILY_TURNS: 30,
      }),
  },
  {
    seam: 'lib/app/eslint.config.mjs',
    risk: 'a stray flat-config block would apply lint rules to every fork',
    // The root eslint.config.mjs spreads this array last; that spread itself is
    // exercised by every `npm run lint` run.
    assert: () => expect(appEslintConfig).toEqual([]),
  },
  {
    seam: 'lib/app/jobs.ts',
    risk: 'a stray job would run on every install\u2019s maintenance tick',
    assert: () => {
      __resetAppJobsForTests();
      // getAppJobs() triggers the lazy init, so this exercises the REAL seam.
      expect(getAppJobs()).toEqual([]);
    },
  },
  {
    seam: 'lib/app/erasure.ts',
    risk: 'a stray hook would run inside every account erasure on every install \u2014 deleting external data, or scrubbing rows, that the install never asked it to touch',
    // FORK (BeatBreaker): re-pointed, not deleted. The one hook removes your
    // samples' files (D20); what it deletes is covered by sample-erasure.test.ts.
    // tests/setup.ts pins this seam empty for the suite, so the real file is
    // read with `importActual` and run against the real registry.
    assert: async () => {
      __resetErasureCleanupHooksForTests();
      const seam = await vi.importActual<typeof import('@/lib/app/erasure')>('@/lib/app/erasure');
      // synchronous, as the registry's init gate requires: a promise here is refused
      expect(seam.initAppErasureHooks()).toBeUndefined();
      expect(getErasureCleanupHooks().map((h) => h.name)).toEqual(['beatbreaker-samples']);
      // leave the shared registry as the suite-wide pin has it
      __resetErasureCleanupHooksForTests();
    },
  },
  {
    seam: 'lib/app/user-created.ts',
    risk: 'a stray hook would run on every signup on every install',
    assert: () => expect(initAppUserCreatedHooks()).toBeUndefined(),
  },
  {
    seam: 'lib/app/mcp-resources.ts',
    risk: 'a stray handler would expose app data over MCP to every install\u2019s connected clients',
    assert: () => {
      __resetAppMcpResourcesForTests();
      // Both readers trigger the lazy init, so this exercises the REAL seam.
      expect(listAppMcpResourceTypes()).toEqual([]);
      // Core's own scheme, and nothing else.
      expect(listAllowedMcpResourceUriSchemes()).toEqual(['sunrise']);
    },
  },
  {
    seam: 'lib/app/platform-agents.ts',
    risk: 'a stray definition would be materialised as an agent in every org on every install \u2014 and, on a slug core already uses, would replace the prompt of an agent every org runs',
    assert: () => {
      __resetPlatformAgentsForTests();
      // The read triggers the lazy init, so this exercises the REAL file:
      // exactly core's definitions, the same objects, in the same order.
      expect(listPlatformAgents()).toEqual(CORE_PLATFORM_AGENTS);
      listPlatformAgents().forEach((definition, i) =>
        expect(definition).toBe(CORE_PLATFORM_AGENTS[i])
      );
    },
  },
  {
    seam: 'lib/app/provider-credentials.ts',
    risk: 'a stray credential resolver would send every install\u2019s provider calls out on a key that is not the one its rows name',
    assert: async () => {
      resetProviderCredentialResolver();
      // The read triggers the lazy init, so this exercises the REAL file.
      expect(hasProviderCredentialResolver()).toBe(false);
      // And the default is exactly the env var, on the shared identity.
      process.env.SHIPS_EMPTY_TEST_KEY = 'from-env';
      await expect(
        resolveProviderCredential({
          id: 'p1',
          slug: 'p1',
          name: 'P1',
          providerType: 'anthropic',
          apiKeyEnvVar: 'SHIPS_EMPTY_TEST_KEY',
          isLocal: false,
        })
      ).resolves.toEqual({ apiKey: 'from-env', identity: '' });
      delete process.env.SHIPS_EMPTY_TEST_KEY;
    },
  },
  {
    seam: 'lib/app/evaluations.ts',
    risk: 'a stray grader would appear in every install\u2019s metric picker \u2014 and, on a slug core already uses, would silently rescore every run',
    assert: () => {
      // The registry module is driven directly, so core's barrel has not
      // side-effect-registered anything: whatever listGraders() returns here
      // came from the seam. The read triggers the lazy init, so this exercises
      // the REAL file.
      __resetGraderRegistryForTests();
      expect(listGraders()).toEqual([]);
    },
  },
  {
    seam: 'lib/app/account-sections.ts',
    risk: 'a stray section would appear on every install\u2019s /profile and /settings',
    // FORK (BeatBreaker): re-pointed, not deleted. Phase 6 adds the Drummer
    // profile to /settings and nothing to /profile; Phase 7B adds About you
    // beside it, and 8.9 Your data (the download the policy promises) —
    // pinned by id per surface, so an accidental addition on
    // either still fails.
    assert: () => {
      __resetAccountSectionRegistryForTests();
      // The read triggers the lazy init, so this exercises the REAL seam.
      const ids = Object.fromEntries(
        ACCOUNT_SURFACES.map((surface) => [
          surface,
          getRegisteredAccountSections(surface).map((s) => s.id),
        ])
      );
      expect(ids).toEqual({ profile: [], settings: ['drummer-profile', 'about-you', 'your-data'] });
    },
  },
  {
    seam: 'lib/app/admin-tier.ts',
    risk: 'a stray pattern would open that admin page to every org OWNER/ADMIN on every install — the page only, since its API routes declare their own tier, but a page core meant for platform admins alone; a stray closeCoreOrgTierSection() would shut orchestration to every org admin on every install',
    assert: () => {
      __resetAppOrgTierAdminPagesForTests();
      // The read triggers the lazy init, so this exercises the REAL seam.
      expect(getAppOrgTierAdminPages()).toEqual([]);
      // …and the roster the layout reads and hands the gate is exactly core's.
      expect(orgTierAdminPages()).toEqual(ORG_TIER_ADMIN_PAGES);
      expect(adminPageTier('/admin/users', orgTierAdminPages())).toBeNull();
      // …and it closes none of core's sections (t-929), so the routes keep
      // the tier they declare.
      expect(closedCoreOrgTierSections()).toEqual([]);
    },
  },
  {
    seam: 'lib/app/admin-tier-routes.ts',
    risk: "a stray entry would let a route declaring tier 'org' pass the roster test without core's list naming it — it opens nothing by itself, but the opening would no longer show in the diff a reviewer reads",
    assert: () => expect(APP_ORG_TIER_ADMIN_ROUTES).toEqual([]),
  },
  {
    seam: 'lib/app/admin-landing.ts',
    risk: 'a stray route would send every org OWNER/ADMIN on every install somewhere other than their orchestration dashboard when they open the console',
    assert: () => {
      expect(appOrgAdminLandingRoute).toBeNull();
      // …and /admin sends an org admin exactly where it did before the seam.
      expect(orgAdminLanding()).toBe('/admin/orchestration');
    },
  },
  {
    seam: 'lib/app/api-key-scopes.ts',
    risk: 'a stray scope would be mintable on every install \u2014 and a name colliding with a core scope would change what an existing key satisfies',
    assert: () => {
      expect(APP_API_KEY_SCOPES).toEqual([]);
      // …and the union it feeds is exactly core, by value not just by length.
      expect(listValidApiKeyScopes()).toEqual([...CORE_API_KEY_SCOPES]);
    },
  },
  {
    seam: 'lib/app/reserved-tiers.ts',
    risk: 'a stray entry would switch OFF the guard that keeps a reserved tier empty — and it is upstream, where core is the only thing that could put a file there, that the guard is the promise rather than a formality',
    // FORK (BeatBreaker): re-pointed, not deleted — see the brand row above.
    // components/app/breaks/ is the console and .context/app/ is the fork's own
    // docs. The other reserved tiers are still asserted empty, which is the
    // point of declaring only what we occupy.
    assert: () => expect(occupiedTiers).toEqual(['components/app', '.context/app']),
  },
  {
    seam: 'lib/app/own-modules.ts',
    risk: 'a stray entry would exempt a lib/app/ entry from the version contract, the fork guide and this table on every install, so a real seam could ship with no breaking-change announcement',
    // Not pinned to []: a leaf fork that declares its modules would otherwise
    // edit this row, in a Sunrise file, which is the cost #847 removes. What
    // it asserts still fails on a stray upstream entry, because every seam
    // Sunrise ships has a row here or in UNASSERTED_SEAMS, and an entry with
    // a row is refused. Upstream, that leaves no declarable entry at all.
    assert: () =>
      expect(
        ownModuleProblems(appOwnModules, scaffoldsOnDisk(), {
          SEAM_DEFAULTS: SEAM_DEFAULTS.map((s) => s.seam),
          UNASSERTED_SEAMS: [...UNASSERTED_SEAMS],
        }),
        'lib/app/own-modules.ts declares entries that cannot be honoured (see each message)'
      ).toEqual([]),
  },
  {
    seam: 'lib/app/capability-seed-pairs.ts',
    risk: 'a stray pair fails the capability parity test on every install (for a slug no seed writes it is a pair nothing wrote, for a slug core already pairs a duplicate), and a stray unchecked seed switches the parity checks off for that seed',
    // FORK (BeatBreaker): re-pointed, not deleted. BeatBuddy's tools are paired
    // from the list 003-beatbuddy seeds them from; no seed goes unchecked.
    assert: () => {
      // Pinned by value: the pairs are built from BEATBUDDY_CAPABILITIES, so
      // comparing the two could never fail.
      expect(APP_CAPABILITY_PAIRS.map((p) => p.slug)).toEqual([
        'get_pattern',
        'list_styles',
        'generate_pattern',
        'write_bars',
        'apply_doctor_move',
        'make_cross_rhythm',
        'tidy_pattern',
        'set_playback',
        'explain_difficulty',
        'find_patterns',
        'open_pattern',
        'save_pattern',
        'suggest_title',
        'find_drummers',
        'get_drummer',
      ]);
      expect(APP_UNCHECKED_SEEDS).toEqual({});
    },
  },
  {
    seam: 'lib/app/brand.ts',
    risk: 'a stray value would rebrand every install — page titles, both footers’ copyright line, the root meta description and every transactional email — and the legal-entity field is a legal-attribution surface, not a cosmetic one',
    // `importActual`, NOT a plain import: tests/setup.ts pins this seam to null
    // for the whole suite so that no core test reads a fork's brand. Importing
    // it normally here would therefore assert the MOCK ships null, which is true
    // by construction and would keep passing in a fork that had filled the real
    // file — turning the one row that tells a fork to pin its value into a row
    // that can never fail.
    // FORK (BeatBreaker): upstream asserts these ship null, which is Sunrise's
    // promise to a fork rather than a fork's promise to itself. Filling the seam
    // is the point of forking, so the row is re-pointed at OUR values instead of
    // deleted — it still fails if the brand changes by accident, which is what
    // the guard was for. Expect this row to conflict on a Sunrise sync; keep
    // ours.
    assert: async () => {
      const seam = await vi.importActual<typeof import('@/lib/app/brand')>('@/lib/app/brand');
      expect(seam.appBrandName).toBe('BeatBreaker');
      expect(seam.appBrandLegalName).toBe('Human-Centric Engineering');
      expect(seam.appBrandDescription).toBe(
        'Generate a drum break, read it as notation, and practise it against a click.'
      );
    },
  },
  {
    seam: 'lib/app/csp.ts',
    risk: 'a stray origin would widen the iframe policy on every install',
    // These values are spliced straight into a response header, so an
    // accidental default here is a security change, not a cosmetic one.
    // FORK (BeatBreaker): re-pointed, not deleted. Phase 6 (task 6.7) allows
    // exactly the three embed hosts `parseReferenceLink` builds on — pinned by
    // value, so anything broader fails here.
    assert: () =>
      expect(appFrameSrc).toEqual([
        'https://www.youtube-nocookie.com',
        'https://player.vimeo.com',
        'https://open.spotify.com',
      ]),
  },
  {
    seam: 'lib/app/ci.ts',
    risk: 'a stray coverage exclusion would switch the per-file 80% floor OFF for that path on every install, a stray always-run entry would make every scoped run load a test whose file the install may not even have, and a stray ownerless-surface exception would let a route read rows nobody owns without the policy being asked — the first silences a gate, the second breaks the gate that replaced it, the third exempts a file from the authorization seam',
    // Filled by BeatBreaker: its whole-tree greps are always-run (Phase 5), and
    // BeatBuddy's allowance counts the owner's own turns outside the access
    // helpers (Phase 7). Re-pointed at our entries rather than deleted, so an
    // accidental addition still fails. Expect this row to conflict on a Sunrise sync; keep ours.
    assert: () => {
      expect(appCoverageExclusions).toEqual([]);
      expect(appAlwaysRunTests.map((t) => t.path)).toEqual([
        'tests/unit/components/app/shell/studio-names.test.ts',
        'tests/unit/components/app/shell/studio-controls.test.ts',
        'tests/unit/lib/app/breaks/browser-keys.test.ts',
        'tests/unit/lib/app/breaks/no-content-imports.test.ts',
        'tests/unit/lib/app/breaks/audio/performance-consistency.test.ts',
      ]);
      expect(appOwnerlessSurfaceExceptions.map((e) => [e.path, e.disposition])).toEqual([
        ['lib/app/breaks/buddy/allowance.ts', 'by-design'],
      ]);
    },
  },
];

afterEach(() => {
  __resetNavRegistryForTests();
  __resetAccountSectionRegistryForTests();
  __resetAppOrgTierAdminPagesForTests();
  __resetAuthorizationPolicyForTests();
});

describe('lib/app/ seams ship empty', () => {
  it.each(SEAM_DEFAULTS)('$seam registers nothing by default', async ({ assert }) => {
    await assert();
  });

  it.each([
    ['brand', 'brand'],
    ['emails', 'email-override'],
  ])('nothing but this file escapes the suite-wide %s-seam pin', (seam, label) => {
    // tests/setup.ts mocks `@/lib/app/brand` to null for EVERY test file, so
    // that no core test can read a fork's brand and fail for a reason the fork
    // cannot fix (#660/#661). That guarantee holds across all ~1095 test files
    // by construction, but only while nothing escapes the mock.
    //
    // `vi.importActual` is legitimate here and nowhere else: it is what makes
    // the brand row above assert the REAL scaffold rather than the mock, which
    // is what keeps "seams ship empty" able to fail in a fork.
    //
    // `vi.doUnmock` is never right. It REMOVES the pin instead of restoring it,
    // so every later case in that file sees the real seam. That is not
    // hypothetical: it shipped twice during this change — once in this suite's
    // own brand tests (13 cases failed against a filled seam) and once in
    // layout-metadata, where it was invisible only because every remaining case
    // happened to re-stub first. To go back to the null default mid-file,
    // re-`doMock` it; do not unmock it.
    //
    // Matched by REGEX over vitest's whole unmocking surface, not by two string
    // literals. The literal version missed `vi.unmock` — a third escape route —
    // and was also defeated by double quotes or a line-wrapped call. That is the
    // enumerating-guard failure mode this repo keeps meeting: it fails one
    // instance per round. vitest exposes exactly `unmock` and `doUnmock` for
    // removing a mock, so anchoring on `(?:do)?unmock` is exhaustive over the API
    // rather than over the spellings someone happened to think of.
    // The emails pin (#895) is the same shape and the same hazard, so both
    // seams share the guard.
    const seamPath = String.raw`['"\`]@/lib/app/` + seam + String.raw`['"\`]`;
    const unmockRe = new RegExp(String.raw`\bvi\s*\.\s*(?:do)?[Uu]nmock\s*\(\s*` + seamPath);
    const actualRe = new RegExp(String.raw`importActual[\s\S]{0,80}?` + seamPath);

    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name)) continue;
        const src = readFileSync(full, 'utf8');
        const rel = path.relative(process.cwd(), full);
        if (unmockRe.test(src)) {
          offenders.push(`${rel}: unmocks the pin instead of restoring it`);
        }
        if (actualRe.test(src) && rel !== THIS_FILE) {
          offenders.push(`${rel}: reads the real seam past the pin`);
        }
      }
    };
    walk(path.join(process.cwd(), 'tests'));

    expect(
      offenders,
      `These test files escape the ${label}-seam pin in tests/setup.ts. A fork that ` +
        `fills lib/app/${seam}.ts would see its own values here and fail a core test ` +
        'it cannot fix — the exact class #660 is about. Re-doMock the pinned values ' +
        'instead of unmocking, and leave importActual to this file.'
    ).toEqual([]);
  });

  it('has a row for every seam file in lib/app/', () => {
    // Drift guard: adding a `lib/app/*` seam without adding a row above would
    // leave it silently unprotected. Reads the directory rather than trusting
    // the table to be complete, through the classifier the VERSIONING.md guard
    // uses (#734): a nested `lib/app/<name>/` seam is owed a row keyed
    // `lib/app/<name>/`, and a file of any extension is owed one too.
    const onDisk = scaffoldsOnDisk();

    // A leaf fork's own modules (lib/app/own-modules.ts) are not seams and owe
    // no row (#847).
    const covered = new Set(SEAM_DEFAULTS.map((s) => s.seam));
    const missing = unlistedSeams([...covered, ...UNASSERTED_SEAMS]);
    const stale = [...covered].filter((f) => !onDisk.includes(f));

    expect(missing, 'lib/app/ seam with no row in SEAM_DEFAULTS').toEqual([]);
    expect(stale, 'SEAM_DEFAULTS row for a file that no longer exists').toEqual([]);
  });
});
