import { METERS, meterOf, pulseInfo } from '@/lib/app/breaks/meter';
import { YOUR_STYLES_GROUP } from '@/lib/app/breaks/catalogue/prefer';
import { withSong } from '@/lib/app/breaks/songs';
import type { CatalogueKit, CatalogueStyle } from '@/lib/app/breaks/catalogue/types';
import type { Style } from '@/lib/app/breaks/types';

/**
 * What the Studio's picker shows and searches, built from the catalogue.
 *
 * The picker itself (`components/app/studio/style-picker.tsx`) knows nothing
 * about styles: it shows sections of grouped entries. Styles are the first
 * section and the famous drummers the second — a drummer is a style marked as
 * one, so picking either is picking a style. Pure, so the search is tested
 * without a browser.
 */

export interface PickerEntry {
  key: string;
  label: string;
  group: string;
  /** The first sentence of its description, for the card. */
  blurb: string;
  /** Short facts for the card, in order: meter, tempo, feel, kit. */
  meta: string[];
  /** Everything a search may match, lower-cased. */
  haystack: string;
}

export interface PickerSection {
  id: string;
  /** The tab's name, plural: "Styles". */
  label: string;
  /** One of them, for counts and the search placeholder: "style". */
  noun: string;
  /** Example searches for the placeholder, things this tab's entries match. */
  searchHint: string;
  groups: Array<[string, PickerEntry[]]>;
}

/** The first sentence of a description: up to the first full stop that ends one. */
export function firstSentence(text: string): string {
  const at = text.search(/[.!?](\s|$)/);
  return at < 0 ? text.trim() : text.slice(0, at + 1).trim();
}

/** How a style moves, in a word or two: triplets, a swing or shuffle range, or straight. */
export function feelLabel(st: Style): string {
  if (pulseInfo(meterOf(st.meter ?? '4/4'))?.steps === 6) return 'triplets';
  const kind = st.swingUnit === 8 ? 'shuffle' : 'swing';
  if (st.swingRange) {
    const [lo, hi] = st.swingRange;
    if (hi === 0) return 'straight';
    return lo === hi ? `${kind} ${lo}%` : `${kind} ${lo}–${hi}%`;
  }
  return st.swing > 0 ? `${kind} ${st.swing}%` : 'straight';
}

function meterLabel(st: Style): string {
  return METERS[st.meter ?? '4/4']?.label ?? st.meter ?? '4/4';
}

/**
 * The card's facts for a style with songs: every meter its songs are in, the
 * tempo from its slowest song to its fastest, how many songs, and the feel
 * when they all share one.
 */
function songsMeta(st: Style): string[] {
  const songs = (st.songs ?? []).map((sg) => withSong(st, sg.key));
  const meters = [...new Set(songs.map(meterLabel))];
  const lo = Math.min(...songs.map((sg) => sg.bpm[0]));
  const hi = Math.max(...songs.map((sg) => sg.bpm[1]));
  const feels = [...new Set(songs.map(feelLabel))];
  return [
    meters.join(', '),
    `${lo}–${hi} bpm`,
    `${songs.length} songs`,
    feels.length === 1 ? feels[0] : 'straight to swung',
  ];
}

/** The styles, as the picker's first section, in the catalogue's own groups and order. */
export function styleSection(
  styles: Record<string, CatalogueStyle>,
  styleGroups: Array<[string, string[]]>,
  kits: Record<string, CatalogueKit>
): PickerSection {
  return {
    id: 'styles',
    label: 'Styles',
    noun: 'style',
    searchHint: 'shuffle, 12/8, brushes, clave',
    groups: entryGroups(styles, styleGroups, kits, false),
  };
}

/**
 * The famous drummers, as the picker's second section: the styles marked
 * {@link Style.drummer}, which the Styles tab leaves out. Null when the
 * catalogue has none, so the picker shows no tab for them.
 */
export function drummerSection(
  styles: Record<string, CatalogueStyle>,
  styleGroups: Array<[string, string[]]>,
  kits: Record<string, CatalogueKit>
): PickerSection | null {
  const groups = entryGroups(styles, styleGroups, kits, true);
  return groups.length
    ? {
        id: 'drummers',
        label: 'Drummers',
        noun: 'drummer',
        searchHint: 'Bonham, Miles, funk',
        groups,
      }
    : null;
}

/** Every section the picker shows, in tab order. */
export function pickerSections(
  styles: Record<string, CatalogueStyle>,
  styleGroups: Array<[string, string[]]>,
  kits: Record<string, CatalogueKit>
): PickerSection[] {
  const drummers = drummerSection(styles, styleGroups, kits);
  return [styleSection(styles, styleGroups, kits), ...(drummers ? [drummers] : [])];
}

/** A `STYLE_GROUPS` heading that files drummers: "Rock drummers", "Jazz drummers". */
const DRUMMER_GROUP = /\bdrummers$/i;

/** The style-worded headings a drummer can land under, as the Drummers tab says them. */
const DRUMMER_HEADINGS: Record<string, string> = {
  [YOUR_STYLES_GROUP]: 'Your drummers',
  // the seed's heading for a style left out of STYLE_GROUPS
  Other: 'Other drummers',
};

/** The entries in each group, the drummers or everything else; an emptied group is left out. */
function entryGroups(
  styles: Record<string, CatalogueStyle>,
  styleGroups: Array<[string, string[]]>,
  kits: Record<string, CatalogueKit>,
  drummers: boolean
): Array<[string, PickerEntry[]]> {
  const groups: Array<[string, PickerEntry[]]> = [];
  for (const [heading, keys] of styleGroups) {
    const group = drummers ? (DRUMMER_HEADINGS[heading] ?? heading) : heading;
    const entries: PickerEntry[] = [];
    for (const key of keys) {
      const row = styles[key];
      // a row that did not load is a drummer by the group it was filed in
      const isDrummer = row ? (row.params.drummer ?? false) : DRUMMER_GROUP.test(heading);
      if (isDrummer !== drummers) continue;
      if (!row) {
        // grouped but not loaded: still there to pick, under its key, as the old list had it
        entries.push({ key, label: key, group, blurb: '', meta: [], haystack: key.toLowerCase() });
        continue;
      }
      const st = row.params;
      const kit = st.kit ? kits[st.kit]?.label : undefined;
      const meta = st.songs
        ? songsMeta(st)
        : [meterLabel(st), `${st.bpm[0]}–${st.bpm[1]} bpm`, feelLabel(st)];
      if (kit) meta.push(kit);
      const songs = (st.songs ?? []).map((sg) => sg.title);
      entries.push({
        key,
        label: st.label,
        group,
        blurb: firstSentence(st.hint),
        meta,
        haystack: [st.label, key, group, st.hint, ...meta, ...songs].join(' ').toLowerCase(),
      });
    }
    if (entries.length) groups.push([group, entries]);
  }
  return groups;
}

/** How many entries a section holds. */
export function entryCount(section: PickerSection): number {
  return section.groups.reduce((n, [, entries]) => n + entries.length, 0);
}

/**
 * The entries a search leaves, still in their groups. Every word typed has to
 * appear somewhere in an entry; within a group, a name that starts with the
 * search comes first, then one that contains it, then the rest, each in the
 * catalogue's order. An empty search leaves everything as it was.
 */
export function searchSection(section: PickerSection, query: string): PickerSection {
  const q = query.trim().toLowerCase();
  if (!q) return section;
  const words = q.split(/\s+/);
  const rank = (e: PickerEntry): number => {
    const name = e.label.toLowerCase();
    if (name.startsWith(q)) return 0;
    if (name.includes(q)) return 1;
    return 2;
  };
  const groups: Array<[string, PickerEntry[]]> = [];
  for (const [group, entries] of section.groups) {
    const hits = entries
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => words.every((w) => e.haystack.includes(w)))
      .sort((a, b) => rank(a.e) - rank(b.e) || a.i - b.i)
      .map(({ e }) => e);
    if (hits.length) groups.push([group, hits]);
  }
  return { ...section, groups };
}

/** The spine colour a group's entries wear, from the Studio's own palette — the same group, the same colour, every time. */
const SPINES = ['brass', 'rust', 'steel', 'teal', 'plum', 'ok', 'warn'] as const;
export function spineOf(group: string): (typeof SPINES)[number] {
  let h = 0;
  for (const ch of group) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SPINES[h % SPINES.length];
}
