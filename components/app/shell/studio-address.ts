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

export const STUDIO_TOOLS = [
  'gen',
  'doctor',
  'patterns',
  'kit',
  'practice',
  'export',
  'buddy',
] as const;
export type StudioTool = (typeof STUDIO_TOOLS)[number];

export const PATTERNS_TABS = [
  'practising',
  'later',
  'recent',
  'all',
  'libraries',
  'community',
] as const;
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

/**
 * A style to open the Studio on — `/studio?style=funk` writes a new break in
 * it, as picking it in Generate does. How a drummer's page plays them (11-b).
 * Only the shape is checked here; the page checks the key is in the catalogue.
 */
const styleSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/);

/** Read `?style=` — a well-formed key, or nothing. */
export function readStudioStyle(query: { style?: unknown }): string | undefined {
  const style = styleSchema.safeParse(query.style);
  return style.success ? style.data : undefined;
}

/** A song key's shape (`Style.songs[].key`): `how-soon-is-now`. */
const songSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);

/**
 * Read `?song=` with its style — a well-formed key, or nothing. A song means
 * something only in a style, so without `?style=` there is none.
 */
export function readStudioSong(query: { style?: unknown; song?: unknown }): string | undefined {
  if (!readStudioStyle(query)) return undefined;
  const song = songSchema.safeParse(query.song);
  return song.success ? song.data : undefined;
}

/**
 * The address that opens the Studio on a style, or on one of its songs — how
 * a drummer's song table plays a scored song (15-c).
 */
export function studioStyleHref(style: string, song?: string): string {
  const q = new URLSearchParams({ style });
  if (song) q.set('song', song);
  return `/studio?${q.toString()}`;
}
