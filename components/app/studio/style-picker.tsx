'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { ChevronsUpDown, Search, X } from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import '@/components/app/studio/style-picker.css';
import {
  type PickerEntry,
  type PickerSection,
  entryCount,
  searchSection,
  spineOf,
} from '@/lib/app/breaks/catalogue/picker';

/**
 * The style picker: a record crate.
 *
 * Closed, it is a sleeve with the record peeking out — the style on the stage,
 * its group's colour on the spine. Open, it is the crate: a search, the group
 * dividers down the side, and every style as a card with what it is in a line.
 * The card under the keyboard slides its record out.
 *
 * It shows sections of grouped entries rather than styles as such (see
 * `lib/app/breaks/catalogue/picker.ts`), so a second section sits beside the
 * first as a tab. Modal, and portalled into the Studio frame, so it covers the
 * stage and wears the Studio's tokens and fonts rather than the page's.
 *
 * Keyboard: the search has focus; the arrows move through what it leaves,
 * Enter picks, Escape closes. The list is a listbox the search controls
 * (`aria-activedescendant`), so a screen reader hears each card as it lands.
 */
export function StylePicker({
  id,
  labelId,
  sections,
  value,
  onPick,
}: {
  /** The trigger's id. */
  id?: string;
  /** The id of the label you see beside it: the sleeve is named by it, then by the style. */
  labelId?: string;
  sections: PickerSection[];
  /** The key on the stage. */
  value: string;
  onPick: (sectionId: string, key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const valueId = `${useId()}-value`;
  const [frame, setFrame] = useState<HTMLElement | null>(null);

  const current = useMemo(() => {
    for (const s of sections)
      for (const [, entries] of s.groups) {
        const hit = entries.find((e) => e.key === value);
        if (hit) return hit;
      }
    return null;
  }, [sections, value]);

  const openCrate = (next: boolean) => {
    // into the Studio frame, which carries the tokens and the fonts; the page body does not
    if (next) setFrame(trigger.current?.closest<HTMLElement>('.studio-frame, .bb') ?? null);
    setOpen(next);
  };

  return (
    <Dialog.Root open={open} onOpenChange={openCrate}>
      <Dialog.Trigger asChild>
        <button
          ref={trigger}
          id={id}
          type="button"
          className="pick-trigger"
          style={spineStyle(current?.group)}
          // what it is and what it is set to; its content is a sleeve and a line of facts
          aria-labelledby={labelId ? `${labelId} ${valueId}` : undefined}
          aria-label={labelId ? undefined : `Style: ${current?.label ?? value}`}
          aria-haspopup="dialog"
        >
          <span className="pick-sleeve" aria-hidden="true">
            <span className="pick-disc" />
          </span>
          <span className="pick-trigger-tx">
            <span id={valueId} className="pick-trigger-label">
              {current?.label ?? value}
            </span>
            <span className="pick-trigger-meta">
              {current ? [current.group, ...current.meta.slice(0, 2)].join(' · ') : 'Pick a style'}
            </span>
          </span>
          <ChevronsUpDown size={16} className="pick-trigger-icon" aria-hidden="true" />
        </button>
      </Dialog.Trigger>
      {open ? (
        <Dialog.Portal container={frame}>
          {/* `.bb` again, so the crate is styled even where there is no Studio frame to land in */}
          <div className="bb pick-root">
            <Dialog.Overlay className="pick-scrim" />
            <Crate
              sections={sections}
              value={value}
              onPick={(sectionId, key) => {
                setOpen(false);
                onPick(sectionId, key);
              }}
            />
          </div>
        </Dialog.Portal>
      ) : null}
    </Dialog.Root>
  );
}

/** Inline styles that may set the picker's own custom properties. */
type PickerVars = CSSProperties & { '--spine'?: string; '--deal'?: string };

/** A group's colour, as the CSS reads it: `--spine`. */
function spineStyle(group: string | undefined): PickerVars | undefined {
  if (!group) return undefined;
  const vars: PickerVars = { '--spine': `var(--${spineOf(group)})` };
  return vars;
}

function Crate({
  sections,
  value,
  onPick,
}: {
  sections: PickerSection[];
  value: string;
  onPick: (sectionId: string, key: string) => void;
}) {
  const uid = useId();
  const [sectionId, setSectionId] = useState(
    () =>
      sections.find((s) => s.groups.some(([, es]) => es.some((e) => e.key === value)))?.id ??
      sections[0]?.id
  );
  const section = sections.find((s) => s.id === sectionId) ?? sections[0];
  const [query, setQuery] = useState('');
  const shown = useMemo(() => searchSection(section, query), [section, query]);
  const flat = useMemo(() => shown.groups.flatMap(([, es]) => es), [shown]);
  const [active, setActive] = useState(value);
  const search = useRef<HTMLInputElement>(null);

  // the highlight stays on something that is still showing
  const activeKey = flat.some((e) => e.key === active) ? active : flat[0]?.key;
  const optionId = (key: string) => `${uid}-opt-${key}`;
  // by position: two names can squeeze to the same id, two positions cannot
  const groupId = (group: string) => `${uid}-grp-${shown.groups.findIndex(([g]) => g === group)}`;

  const reveal = useCallback(
    (key: string | undefined, block: ScrollLogicalPosition = 'nearest') => {
      if (!key) return;
      document.getElementById(`${uid}-opt-${key}`)?.scrollIntoView?.({ block });
    },
    [uid]
  );

  // open on the style that is playing, in the middle of the crate
  useEffect(() => reveal(value, 'center'), [reveal, value]);

  const move = (by: number) => {
    if (!flat.length) return;
    const at = flat.findIndex((e) => e.key === activeKey);
    const next = flat[Math.min(flat.length - 1, Math.max(0, (at < 0 ? -1 : at) + by))];
    setActive(next.key);
    reveal(next.key);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      move(6);
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      move(-6);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeKey) onPick(section.id, activeKey);
    }
  };

  const jumpTo = (group: string) => {
    document.getElementById(groupId(group))?.scrollIntoView?.({ block: 'start' });
    const first = shown.groups.find(([g]) => g === group)?.[1][0];
    if (first) setActive(first.key);
  };

  const activeGroup = flat.find((e) => e.key === activeKey)?.group;
  const total = entryCount(section);

  return (
    <Dialog.Content
      className="pick"
      // a modal: the Studio's shortcuts stay out while it is open (studio-frame.tsx)
      data-studio-modal=""
      aria-describedby={undefined}
      onOpenAutoFocus={(e) => {
        // the search, not the first tab or the close button
        e.preventDefault();
        search.current?.focus();
      }}
      onEscapeKeyDown={(e) => {
        // the first Escape clears what you typed; the next one closes
        if (query) {
          e.preventDefault();
          setQuery('');
        }
      }}
    >
      <header className="pick-hd">
        <div className="pick-kicker">
          The crate · {total} {section.noun}s in {section.groups.length} groups
        </div>
        <Dialog.Title className="pick-title">Pick a {section.noun}</Dialog.Title>
        {sections.length > 1 ? (
          <div className="pick-tabs" role="tablist" aria-label="What to pick">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === section.id}
                className="pick-tab"
                onClick={() => {
                  setSectionId(s.id);
                  setQuery('');
                }}
              >
                {s.label} <span>{entryCount(s)}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="pick-search">
          <Search size={18} aria-hidden="true" />
          <input
            ref={search}
            type="search"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${uid}-list`}
            aria-activedescendant={activeKey ? optionId(activeKey) : undefined}
            aria-label={`Search the ${section.label.toLowerCase()}`}
            placeholder={`Search ${total} ${section.noun}s — ${section.searchHint}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <Dialog.Close className="pick-x" aria-label="Close">
          <X size={20} />
        </Dialog.Close>
      </header>

      <div className="pick-body">
        <nav className="pick-rail" aria-label="Groups">
          {shown.groups.map(([group, entries]) => (
            <button
              key={group}
              type="button"
              className="pick-divider"
              style={spineStyle(group)}
              aria-current={group === activeGroup ? 'true' : undefined}
              onClick={() => jumpTo(group)}
            >
              <span className="pick-divider-name">{group}</span>
              <span className="pick-divider-n">{entries.length}</span>
            </button>
          ))}
        </nav>

        <div id={`${uid}-list`} className="pick-list" role="listbox" aria-label={section.label}>
          {shown.groups.length === 0 ? (
            <p className="pick-empty">
              Nothing in the crate matches “{query.trim()}”. Try a feel, a meter or a drummer’s
              name.
            </p>
          ) : (
            shown.groups.map(([group, entries]) => (
              <section
                key={group}
                id={groupId(group)}
                className="pick-group"
                role="group"
                aria-labelledby={`${groupId(group)}-h`}
                style={spineStyle(group)}
              >
                <h4 id={`${groupId(group)}-h`} className="pick-group-h">
                  {group} <span>{entries.length}</span>
                </h4>
                <div className="pick-grid">
                  {entries.map((e, i) => (
                    <Card
                      key={e.key}
                      id={optionId(e.key)}
                      entry={e}
                      index={i}
                      playing={e.key === value}
                      active={e.key === activeKey}
                      onHover={() => setActive(e.key)}
                      onPick={() => onPick(section.id, e.key)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      <footer className="pick-ft" aria-hidden="true">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> move
        </span>
        <span>
          <kbd>Enter</kbd> pick
        </span>
        <span>
          <kbd>Esc</kbd> close
        </span>
      </footer>
    </Dialog.Content>
  );
}

/** The first few cards deal in one after another; the rest are already there. */
function deal(index: number): PickerVars {
  const vars: PickerVars = { '--deal': `${Math.min(index, 8) * 28}ms` };
  return vars;
}

function Card({
  id,
  entry,
  index,
  playing,
  active,
  onHover,
  onPick,
}: {
  id: string;
  entry: PickerEntry;
  index: number;
  playing: boolean;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      className="pick-card"
      data-active={active || undefined}
      data-playing={playing || undefined}
      style={deal(index)}
      // focus stays in the search (aria-activedescendant); a card is reachable, not a tab stop
      tabIndex={-1}
      onMouseMove={active ? undefined : onHover}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick();
        }
      }}
    >
      <span className="pick-card-label">{entry.label}</span>
      {playing ? <span className="pick-card-tag">On the stage</span> : null}
      <span className="pick-card-meta">
        {entry.meta.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </span>
      <span className="pick-card-blurb">{entry.blurb}</span>
    </div>
  );
}
