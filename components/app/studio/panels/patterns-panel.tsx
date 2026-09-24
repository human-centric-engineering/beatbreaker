'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PinButton, SHELF_LABEL } from '@/components/app/studio/pin-button';
import { useStudio } from '@/components/app/studio/studio-provider';
import { apiClient } from '@/lib/api/client';
import { type CatalogueEntry, libraryGroups } from '@/lib/app/breaks/catalogue/types';
import { DEFAULT_METER, METER_KEYS } from '@/lib/app/breaks/meter';
import { useLocalStorage } from '@/lib/hooks/use-local-storage';
import { logger } from '@/lib/logging';
import { type SavedPatternRow, savedPatternListSchema } from '@/lib/validations/breaks';
import { type PinTarget, type Shelf } from '@/lib/validations/pins';

/**
 * The Patterns drawer (task 4.8): everything you can open, in five tabs.
 *
 * _Practising_ and _Later_ are the shelves (D17) and _Recent_ is the history
 * (D18) — all three arrive with the page and stay current in the provider, so
 * showing them asks the server for nothing. _All_ is your saved patterns, read
 * with **one** `GET /api/v1/breaks` when it is shown; a search or a filter
 * asks again, once it settles. _Libraries_ is the catalogue already in the
 * page, filtered here.
 *
 * Every row opens in place — the provider's `open`, the same path the history
 * takes — so undo and the Back trail survive, and the row for whatever is on
 * the stage is marked `aria-current`.
 */

const TABS = ['practising', 'later', 'recent', 'all', 'libraries'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL: Record<Tab, string> = {
  practising: 'Practising',
  later: 'Later',
  recent: 'Recent',
  all: 'All',
  libraries: 'Libraries',
};

/** The most _All_ asks for at once — the list endpoint's own ceiling. */
const ALL_LIMIT = 100;
/** How long a search waits for the typing to stop. */
const SEARCH_MS = 250;
/** How many of the history show before "Show all". */
const RECENT_SHOWN = 8;

function isTab(value: unknown): value is Tab {
  return typeof value === 'string' && (TABS as readonly string[]).includes(value);
}

function sameTarget(a: PinTarget | null, b: PinTarget): boolean {
  if (!a) return false;
  if ('breakId' in a) return 'breakId' in b && a.breakId === b.breakId;
  return 'libraryEntryId' in b && a.libraryEntryId === b.libraryEntryId;
}

/** Tempo, and the meter beside it only when it is not 4/4. */
function tempo(bpm: number | undefined, meter: string | undefined): string {
  if (bpm === undefined) return '';
  return meter && meter !== DEFAULT_METER ? `${bpm} · ${meter}` : String(bpm);
}

/**
 * One row: open on the left, ★ on the right. Two buttons side by side rather
 * than one inside the other — a menu button inside a button is not valid HTML.
 */
function Row({
  target,
  title,
  sub,
  right,
  hint,
  onOpen,
}: {
  target: PinTarget;
  title: string;
  sub: string;
  right: string;
  hint?: string;
  /** Instead of the provider's `open` — the history steps its own way. */
  onOpen?: () => void;
}) {
  const c = useStudio();
  const current = sameTarget(c.stagePin, target);
  return (
    <div className="pinrow">
      <button
        type="button"
        className="item"
        title={hint}
        aria-current={current ? 'true' : undefined}
        onClick={() => {
          if (current) return;
          if (onOpen) onOpen();
          else void c.open(target);
        }}
      >
        <div className="nm">
          <b>{title}</b>
          <span>{sub}</span>
        </div>
        <span className="bpm">{right}</span>
      </button>
      <PinButton className="item" target={target} label={title} />
    </div>
  );
}

/** Style label, falling back to the key for a style that has since gone. */
function useStyleLabel() {
  const { styles } = useStudio().catalogue;
  return useCallback(
    (key: string | undefined) => (key ? (styles[key]?.params.label ?? key) : ''),
    [styles]
  );
}

/**
 * One practice shelf. Exported for the Practice drawer, which shows
 * _Practising_ too — it is where you are when you are drilling something.
 */
export function ShelfList({ shelf, empty }: { shelf: Shelf; empty: React.ReactNode }) {
  const { pins } = useStudio();
  const styleLabel = useStyleLabel();
  const list = pins.shelves[shelf];
  if (!list.length) return <div className="hint">{empty}</div>;
  return (
    <div className="list">
      {list.map((pin) => {
        const t = pin.target;
        if (t.kind === 'entry') {
          return (
            <Row
              key={pin.id}
              target={{ libraryEntryId: t.id }}
              title={t.title}
              sub={t.artist ?? styleLabel(t.styleKey)}
              right={tempo(t.bpm, t.meter)}
            />
          );
        }
        const who = t.mine ? styleLabel(t.style) || 'Your pattern' : 'Shared with you';
        return (
          <Row
            key={pin.id}
            target={{ breakId: t.id }}
            title={t.title}
            sub={t.level === undefined ? who : `${who} · L${t.level}`}
            right={tempo(t.bpm, t.meter)}
          />
        );
      })}
    </div>
  );
}

function RecentList() {
  const { history } = useStudio();
  const [all, setAll] = useState(false);
  const { items } = history;
  const shown = all ? items : items.slice(0, RECENT_SHOWN);

  if (!items.length) {
    return (
      <div className="hint">
        What you open shows up here, at the layer and tempo you left it — a famous break, or a
        pattern once it is saved. <b>Back</b> in the header (<b>Alt+←</b>) takes you to the one
        before.
      </div>
    );
  }
  return (
    <div className="list">
      {shown.map((item) => (
        <Row
          key={item.id}
          target={
            item.target.kind === 'entry'
              ? { libraryEntryId: item.target.id }
              : { breakId: item.target.id }
          }
          title={item.target.title}
          sub={
            item.target.kind === 'entry'
              ? item.target.artist
              : item.target.mine
                ? 'Your pattern'
                : 'Shared with you'
          }
          right={`L${item.level} · ${item.bpm}`}
          // the history opens at the layer and tempo you left it
          onOpen={() => history.open(item)}
        />
      ))}
      <div className="btnrow">
        {items.length > RECENT_SHOWN ? (
          <button type="button" className="mini" onClick={() => setAll((v) => !v)}>
            {all ? 'Show fewer' : `Show all ${items.length}`}
          </button>
        ) : null}
        <button type="button" className="mini" onClick={() => void history.clear()}>
          Clear history
        </button>
      </div>
    </div>
  );
}

/** Search, style and meter — the same three over your patterns and the libraries. */
interface Filter {
  q: string;
  style: string;
  meter: string;
}

const NO_FILTER: Filter = { q: '', style: '', meter: '' };

function FilterBar({
  filter,
  onChange,
  styles,
  label,
}: {
  filter: Filter;
  onChange: (next: Filter) => void;
  /** The style keys worth offering — the ones that have something under them. */
  styles: string[];
  /** What is being searched, for the search box's name. */
  label: string;
}) {
  const styleLabel = useStyleLabel();
  const options = useMemo(
    () =>
      styles
        .map((key) => ({ key, label: styleLabel(key) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [styles, styleLabel]
  );
  return (
    <div className="filters">
      <input
        type="search"
        aria-label={`Search ${label}`}
        placeholder="Search"
        value={filter.q}
        onChange={(e) => onChange({ ...filter, q: e.target.value })}
      />
      <div className="filters-row">
        <select
          aria-label="Style"
          value={filter.style}
          onChange={(e) => onChange({ ...filter, style: e.target.value })}
        >
          <option value="">Any style</option>
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Time signature"
          value={filter.meter}
          onChange={(e) => onChange({ ...filter, meter: e.target.value })}
        >
          <option value="">Any meter</option>
          {METER_KEYS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/**
 * Your saved patterns. One request when the tab is shown; a search or filter
 * asks again once it has settled, and the server does the searching — so a
 * pattern older than the first hundred is still one search away.
 */
function AllList() {
  const c = useStudio();
  const styleLabel = useStyleLabel();
  const [filter, setFilter] = useState<Filter>(NO_FILTER);
  const [rows, setRows] = useState<SavedPatternRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  /** Bumped to read the list again — after a save puts a new pattern on the stage. */
  const [reload, setReload] = useState(0);

  const filtered = filter.q.trim() !== '' || filter.style !== '' || filter.meter !== '';
  const settled = useRef(false);

  useEffect(() => {
    let live = true;
    const read = async () => {
      try {
        const list = savedPatternListSchema.parse(
          await apiClient.get('/api/v1/breaks', {
            params: {
              sort: 'updated',
              limit: ALL_LIMIT,
              q: filter.q.trim() || undefined,
              style: filter.style || undefined,
              meter: filter.meter || undefined,
            },
          })
        );
        if (!live) return;
        setRows(list);
        setFailed(false);
      } catch (error) {
        if (!live) return;
        logger.warn('BeatBreaker: saved patterns could not be listed', { error });
        setFailed(true);
      }
    };
    /* The first read goes at once — the one request per showing. Only a
       change of filter waits for the typing to stop. */
    if (!settled.current) {
      settled.current = true;
      void read();
      return () => {
        live = false;
      };
    }
    const t = setTimeout(() => void read(), SEARCH_MS);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [filter, reload]);

  /* A pattern saved while the drawer is open is not in what was read. Read
     again when the stage holds one of yours that the list has not got. */
  const { id: docId, mine } = c.doc;
  /* A full page may simply not reach it — that is not a reason to read again. */
  const known = !rows || rows.length === ALL_LIMIT || rows.some((r) => r.id === docId);
  useEffect(() => {
    if (docId && mine && !known && !filtered) setReload((n) => n + 1);
  }, [docId, mine, known, filtered]);

  const styles = useMemo(() => Object.keys(c.catalogue.styles), [c.catalogue.styles]);

  return (
    <>
      <FilterBar filter={filter} onChange={setFilter} styles={styles} label="your patterns" />
      {failed && !rows ? (
        <div className="hint">
          Your patterns could not be read.{' '}
          <button type="button" className="mini" onClick={() => setReload((n) => n + 1)}>
            Try again
          </button>
        </div>
      ) : rows === null ? (
        <div className="empty">Reading your patterns…</div>
      ) : rows.length ? (
        <div className="list">
          {rows.map((r) => (
            <Row
              key={r.id}
              target={{ breakId: r.id }}
              title={r.title}
              sub={`${styleLabel(r.style)} · L${r.level}`}
              right={tempo(r.bpm, r.meter)}
            />
          ))}
          {rows.length === ALL_LIMIT ? (
            <div className="hint">
              The {ALL_LIMIT} most recently changed — search to find older.
            </div>
          ) : null}
        </div>
      ) : filtered ? (
        <div className="empty">Nothing of yours matches.</div>
      ) : (
        <div className="hint">
          Nothing saved to your account yet. <b>Save</b> in the header keeps the pattern on the
          stage — both sections, the tempo, the swing and the layer — and it autosaves from then on.
        </div>
      )}
    </>
  );
}

function matches(entry: CatalogueEntry, filter: Filter): boolean {
  if (filter.style && entry.styleKey !== filter.style) return false;
  if (filter.meter && entry.meter !== filter.meter) return false;
  const q = filter.q.trim().toLowerCase();
  if (!q) return true;
  return entry.title.toLowerCase().includes(q) || entry.artist.toLowerCase().includes(q);
}

/** Every library the catalogue holds, filtered here — the rows are already in the page. */
function LibrariesList() {
  const c = useStudio();
  const { libraries } = c.catalogue;
  const [filter, setFilter] = useState<Filter>(NO_FILTER);
  const styles = useMemo(
    () => [...new Set(libraries.flatMap((l) => l.entries.map((e) => e.styleKey)))],
    [libraries]
  );

  const shown = libraries
    .map((library) => ({
      library,
      groups: libraryGroups({
        ...library,
        entries: library.entries.filter((e) => matches(e, filter)),
      }),
    }))
    .filter((l) => l.groups.length);

  return (
    <>
      <FilterBar filter={filter} onChange={setFilter} styles={styles} label="the libraries" />
      {shown.length ? (
        shown.map(({ library, groups }) => (
          <div className="list" key={library.key}>
            {libraries.length > 1 ? <div className="list-hd">{library.title}</div> : null}
            {/* The group headings sit in the same column as the rows rather
                than wrapping each group in a box of its own: one flex column is
                what puts an even gap between every row. */}
            {groups.map(([group, items]) => (
              <Fragment key={group}>
                <div className="list-hd">{group}</div>
                {items.map((item) => (
                  <Row
                    key={item.id}
                    target={{ libraryEntryId: item.id }}
                    title={item.title}
                    sub={item.artist}
                    right={tempo(item.bpm, item.meter)}
                    hint={item.note ?? undefined}
                    onOpen={() => {
                      c.loadLibraryEntry(item.id);
                      c.say(item.note ? `${item.title} — ${item.note}` : `${item.title} loaded`);
                    }}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        ))
      ) : (
        <div className="empty">Nothing in the libraries matches.</div>
      )}
      <div className="hint">
        The main groove off each record — a bar or two of it, in the meter it was played in. Fills
        and variations are not here. The feel studies at the bottom are written rather than
        transcribed, and say so.
      </div>
    </>
  );
}

/**
 * The favourites kept in this browser (`bb.favs`) — until task 4.10 brings
 * them into your account, they are only here.
 */
function BrowserFavs() {
  const c = useStudio();
  const { say } = c;
  const { styles } = c.catalogue;
  if (!c.favs.length) return null;
  return (
    <div className="card">
      <div className="card-hd">
        <h3>In this browser</h3>
      </div>
      <div className="card-bd">
        <div className="list">
          {c.favs.map((fav, i) => (
            /* Load and delete side by side, not nested — see `Row`. */
            <div className="favrow" key={`${fav.code.slice(0, 12)}-${i}`}>
              <button
                type="button"
                className="item"
                onClick={() => {
                  // "Loaded" is said when it loads — it may wait on the unsaved-changes prompt
                  if (!c.loadFav(i)) say('That saved break could not be read');
                }}
              >
                <div className="nm">
                  <b>{fav.name}</b>
                  <span>
                    {styles[fav.style]?.params.label ?? fav.style} · L{fav.level}
                  </span>
                </div>
                <span className="bpm">{fav.bpm}</span>
              </button>
              <button
                type="button"
                className="item kill"
                aria-label={`Delete ${fav.name}`}
                onClick={() => c.deleteFav(i)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="hint" style={{ marginTop: 10 }}>
          Saved in this browser before patterns lived in your account. Open one and <b>Save</b> it
          to keep it everywhere.
        </div>
      </div>
    </div>
  );
}

export function PatternsPanel() {
  const { pins, history } = useStudio();
  /* The tab you were on, per browser — a convenience, so it is checked on the
     way out of storage and falls back rather than trusting what is there. */
  const [stored, setStored] = useLocalStorage<string | null>('bb.patternsTab', null);
  const fallback: Tab = pins.shelves.practising.length
    ? 'practising'
    : history.items.length
      ? 'recent'
      : 'libraries';
  const tab: Tab = isTab(stored) ? stored : fallback;

  const count: Partial<Record<Tab, number>> = {
    practising: pins.shelves.practising.length,
    later: pins.shelves.later.length,
  };

  return (
    <>
      <div className="tabs tabs-5" role="tablist" aria-label="Patterns">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`bb-patterns-tab-${t}`}
            aria-selected={tab === t}
            aria-controls="bb-patterns-tabpanel"
            onClick={() => setStored(t)}
          >
            {TAB_LABEL[t]}
            {count[t] ? <span className="tab-n"> {count[t]}</span> : null}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="bb-patterns-tabpanel" aria-labelledby={`bb-patterns-tab-${tab}`}>
        {tab === 'practising' || tab === 'later' ? (
          <ShelfList
            shelf={tab}
            empty={
              <>
                Nothing on {SHELF_LABEL[tab]} yet. The ☆ beside any pattern or famous break — or
                beside the title on the stage — puts it here.
              </>
            }
          />
        ) : tab === 'recent' ? (
          <RecentList />
        ) : tab === 'all' ? (
          <AllList />
        ) : (
          <LibrariesList />
        )}
      </div>
      {tab === 'all' ? <BrowserFavs /> : null}
    </>
  );
}
