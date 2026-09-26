import { z } from 'zod';

/**
 * The Studio's addressable parts: which tool a link can open, and which tab of
 * the Patterns drawer. `/studio?drawer=patterns&tab=libraries` opens the
 * Studio with that drawer showing — how Home's first-run "Browse the famous
 * grooves" gets there.
 *
 * A plain module, not a client one, so the server page can validate the query
 * with the same lists the rail and the drawer are built from. Anything that
 * does not match is ignored: a bad `drawer` is no drawer, and a bad `tab` is
 * the drawer on its usual tab.
 */

export const STUDIO_TOOLS = ['gen', 'doctor', 'patterns', 'kit', 'practice', 'export'] as const;
export type StudioTool = (typeof STUDIO_TOOLS)[number];

export const PATTERNS_TABS = ['practising', 'later', 'recent', 'all', 'libraries'] as const;
export type PatternsTab = (typeof PATTERNS_TABS)[number];

/** A drawer to open when the Studio is up. `tab` means something only for `patterns`. */
export interface StudioDrawer {
  tool: StudioTool;
  tab?: PatternsTab;
}

const drawerSchema = z.enum(STUDIO_TOOLS);
const tabSchema = z.enum(PATTERNS_TABS);

/** Read `?drawer=&tab=` — each value from the URL, so checked, never cast. */
export function readStudioDrawer(query: {
  drawer?: unknown;
  tab?: unknown;
}): StudioDrawer | undefined {
  const tool = drawerSchema.safeParse(query.drawer);
  if (!tool.success) return undefined;
  const tab = tool.data === 'patterns' ? tabSchema.safeParse(query.tab) : null;
  return { tool: tool.data, ...(tab?.success ? { tab: tab.data } : {}) };
}

/** The address that opens the Studio on a drawer. */
export function studioDrawerHref({ tool, tab }: StudioDrawer): string {
  const q = new URLSearchParams({ drawer: tool });
  if (tab && tool === 'patterns') q.set('tab', tab);
  return `/studio?${q.toString()}`;
}
