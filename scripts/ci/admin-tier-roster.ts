/**
 * Is the org-tier roster what the tree declares? (§111 t-810)
 *
 * `lib/auth/admin-tier.ts` holds one roster of the admin surfaces an org
 * OWNER/ADMIN may use. Pages are declared IN it; API routes are declared at
 * their call site (`withAdminAuth(handler, { tier: 'org' })`) and listed in it.
 * This module checks the two agree, so opening a surface is always a diff to
 * the roster a reviewer can see — ruling 5 on §111. **A library, not a CLI**:
 * the always-run test `tests/unit/scripts/ci/admin-tier-roster.test.ts` runs
 * it over the tree.
 *
 * What it reports:
 *
 * - a route handler declared `tier: 'org'` that the roster does not list, or
 *   one listed that does not declare it;
 * - a `tier` the scanner cannot read as the literal `'org'` — a variable or a
 *   spread hides the declaration from review, which is the thing the roster is for;
 * - an org-tier handler with no `ownership` declaration. An org admin's rows
 *   are narrowed to their own, so the guard demands one the first time it
 *   admits them (refusing under test, logging elsewhere); this says so at
 *   review time instead of at the first request;
 * - a listed page with no `page.tsx` behind it;
 * - a core nav item marked `tier: 'org'` over a page that is not listed —
 *   a link an org admin would follow to a redirect.
 *
 * Uses the TypeScript parser, as `shared-settings-writes.ts` beside it does.
 */
import ts from 'typescript';
import { adminPageTier } from '@/lib/auth/admin-tier';

export interface SourceFile {
  path: string;
  source: string;
}

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

/** One exported handler wrapped in `withAdminAuth` with a `tier` option. */
export interface TierDeclaration {
  /** `path#METHOD`. */
  at: string;
  /** The option is the literal `'org'`; `false` when it is anything else. */
  literal: boolean;
  /** The same options object declares `ownership`. */
  declaresOwnership: boolean;
}

function propertyNamed(
  options: ts.ObjectLiteralExpression,
  name: string
): ts.ObjectLiteralElementLike | undefined {
  return options.properties.find(
    (p) =>
      (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
      p.name.getText() === name
  );
}

/** Every exported handler in a route file that passes `withAdminAuth` a `tier`. */
export function tierDeclarations(file: SourceFile): TierDeclaration[] {
  const sf = ts.createSourceFile(file.path, file.source, ts.ScriptTarget.Latest, true);
  const found: TierDeclaration[] = [];
  for (const statement of sf.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const exported = ts
      .getModifiers(statement)
      ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    for (const decl of statement.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !HTTP_METHODS.has(decl.name.text)) continue;
      const init = decl.initializer;
      if (!init || !ts.isCallExpression(init)) continue;
      if (!ts.isIdentifier(init.expression) || init.expression.text !== 'withAdminAuth') continue;
      const options = init.arguments[1];
      if (!options) continue;
      const at = `${file.path}#${decl.name.text}`;
      if (!ts.isObjectLiteralExpression(options)) {
        // Options built elsewhere could carry a tier the scanner cannot see.
        // Reported when the text mentions one (`ORG_TIER_OPTIONS`), so ordinary
        // shared option constants stay quiet. A constant whose name says
        // nothing of a tier slips past: write the option inline.
        if (/tier/i.test(options.getText())) {
          found.push({ at, literal: false, declaresOwnership: false });
        }
        continue;
      }
      const tier = propertyNamed(options, 'tier');
      const spreads = options.properties.some(ts.isSpreadAssignment);
      if (!tier) {
        if (spreads && /tier/i.test(options.getText())) {
          found.push({ at, literal: false, declaresOwnership: false });
        }
        continue;
      }
      found.push({
        at,
        literal:
          ts.isPropertyAssignment(tier) &&
          ts.isStringLiteralLike(tier.initializer) &&
          tier.initializer.text === 'org',
        declaresOwnership: propertyNamed(options, 'ownership') !== undefined,
      });
    }
  }
  return found;
}

/** A core nav item, as much of it as the check reads. */
export interface NavItemFacts {
  href: string;
  tier?: string;
}

export interface RosterInput {
  /** Every route file under `app/`. */
  routes: readonly SourceFile[];
  /** `ORG_TIER_ADMIN_ROUTES`. */
  listedRoutes: readonly string[];
  /** `ORG_TIER_ADMIN_PAGES`. */
  listedPages: readonly string[];
  /** Every `page.tsx` path under `app/admin`, repo-relative. */
  pageFiles: readonly string[];
  /** Every core sidebar item. */
  navItems: readonly NavItemFacts[];
}

/** Everything about the roster that does not match the tree, one sentence each. */
export function findAdminTierRosterProblems(input: RosterInput): string[] {
  const problems: string[] = [];
  const declarations = input.routes.flatMap(tierDeclarations);
  const declared = new Set(declarations.filter((d) => d.literal).map((d) => d.at));
  const listed = new Set(input.listedRoutes);

  for (const d of declarations) {
    if (!d.literal) {
      problems.push(
        `${d.at}: its \`tier\` is not the literal 'org', so review cannot see what it opens. Write \`tier: 'org'\` in the options object.`
      );
    } else if (!d.declaresOwnership) {
      problems.push(
        `${d.at}: declared tier 'org' with no \`ownership\`. An org admin's rows are narrowed to their own, so the guard demands one when it admits them — declare it.`
      );
    }
  }
  for (const at of declared) {
    if (!listed.has(at)) {
      problems.push(`${at}: declared tier 'org' but not listed in ORG_TIER_ADMIN_ROUTES.`);
    }
  }
  for (const at of listed) {
    if (!declared.has(at)) {
      problems.push(`${at}: listed in ORG_TIER_ADMIN_ROUTES but does not declare tier 'org'.`);
    }
  }

  const pageFiles = new Set(input.pageFiles);
  for (const pattern of input.listedPages) {
    const file = `app${pattern}/page.tsx`;
    if (!pageFiles.has(file)) {
      problems.push(`${pattern}: listed in ORG_TIER_ADMIN_PAGES but ${file} does not exist.`);
    }
  }

  for (const item of input.navItems) {
    if (item.tier === 'org' && adminPageTier(item.href, input.listedPages) !== 'org') {
      problems.push(
        `nav item ${item.href}: marked tier 'org' over a page ORG_TIER_ADMIN_PAGES does not list, so an org admin would follow it to a redirect.`
      );
    }
  }
  return problems;
}
