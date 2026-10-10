'use client';

import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import '@/components/app/ui/select-menu.css';
import { cn } from '@/lib/utils';

/**
 * The app's dropdown: a button that opens a list, in place of the browser's
 * own `<select>`, whose open list is the operating system's and cannot be
 * themed.
 *
 * The ARIA "select-only combobox": the trigger is a `combobox` that owns a
 * `listbox`, focus stays on the trigger, and the active option is announced
 * through `aria-activedescendant`. Arrows, Home, End, Page Up/Down, typing a
 * label's first letters, Enter or Space to choose, Escape to close.
 *
 * The list is portalled, so a scrolling panel or a drawer cannot clip it: into
 * the nearest `.bb` (the Studio's theme, its tokens and its fonts) and
 * otherwise into the body, where it reads the site's `--color-*` tokens. A
 * `name` writes a hidden input, so it still submits with a plain form.
 */

export interface SelectOption {
  value: string;
  label: ReactNode;
  /** What typeahead matches, where `label` is not plain text. */
  text?: string;
  disabled?: boolean;
  /** A word after the label, quieter: "not ported yet". */
  note?: string;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export interface SelectMenuProps {
  id?: string;
  /** Submits the value with an enclosing form. */
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Either a flat list or groups, each under a heading. */
  options?: SelectOption[];
  groups?: SelectGroup[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  onBlur?: () => void;
}

/** Steps a page key moves the active option. */
const PAGE = 8;
/** How long typed letters keep adding to the same search. */
const TYPEAHEAD_MS = 600;

export function SelectMenu({
  id: idProp,
  name,
  value: valueProp,
  defaultValue,
  onValueChange,
  options,
  groups,
  disabled,
  placeholder = 'Choose…',
  className,
  onBlur,
  ...aria
}: SelectMenuProps) {
  const autoId = useId();
  const id = idProp ?? `sel-${autoId}`;
  const listId = `${id}-list`;
  const optId = (i: number) => `${id}-opt-${i}`;

  const [inner, setInner] = useState(defaultValue ?? '');
  const value = valueProp ?? inner;

  const sections = useMemo<SelectGroup[]>(
    () => groups ?? [{ label: '', options: options ?? [] }],
    [groups, options]
  );
  const flat = useMemo(() => sections.flatMap((s) => s.options), [sections]);
  const selectedIndex = flat.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? flat[selectedIndex] : undefined;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: '', at: 0 });

  const choose = useCallback(
    (i: number) => {
      const opt = flat[i];
      if (!opt || opt.disabled) return;
      if (valueProp === undefined) setInner(opt.value);
      if (opt.value !== value) onValueChange?.(opt.value);
      setOpen(false);
      trigger.current?.focus();
    },
    [flat, onValueChange, value, valueProp]
  );

  /** The next enabled option from `from`, stepping `dir`, clamped at the ends. */
  const step = useCallback(
    (from: number, dir: 1 | -1, by = 1): number => {
      let i = from;
      let moved = 0;
      let best = from;
      while (moved < by) {
        i += dir;
        if (i < 0 || i >= flat.length) break;
        if (!flat[i].disabled) {
          best = i;
          moved++;
        }
      }
      return best;
    },
    [flat]
  );
  const first = useCallback(() => step(-1, 1), [step]);
  const last = useCallback(() => step(flat.length, -1), [flat.length, step]);

  const show = useCallback(
    (at?: number) => {
      if (disabled || !flat.length) return;
      setActive(at ?? (selectedIndex >= 0 ? selectedIndex : first()));
      setOpen(true);
    },
    [disabled, first, flat.length, selectedIndex]
  );

  const findTyped = (key: string): number => {
    const now = Date.now();
    const t = typed.current;
    t.text = now - t.at < TYPEAHEAD_MS ? t.text + key.toLowerCase() : key.toLowerCase();
    t.at = now;
    const textOf = (o: SelectOption) =>
      (o.text ?? (typeof o.label === 'string' ? o.label : o.value)).toLowerCase();
    const start = open ? active : selectedIndex;
    for (let k = 1; k <= flat.length; k++) {
      const i = (start + k + flat.length) % flat.length;
      if (!flat[i].disabled && textOf(flat[i]).startsWith(t.text)) return i;
    }
    return -1;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const key = e.key;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
        e.preventDefault();
        show(key === 'ArrowUp' && selectedIndex < 0 ? last() : undefined);
      } else if (key.length === 1 && /\S/.test(key)) {
        // a closed select chooses by typing, as the browser's does
        const i = findTyped(key);
        if (i >= 0) choose(i);
      }
      return;
    }
    const moves: Record<string, () => number> = {
      ArrowDown: () => step(active, 1),
      ArrowUp: () => step(active, -1),
      PageDown: () => step(active, 1, PAGE),
      PageUp: () => step(active, -1, PAGE),
      Home: first,
      End: last,
    };
    if (moves[key]) {
      e.preventDefault();
      setActive(moves[key]());
    } else if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      choose(active);
    } else if (key === 'Tab') {
      setOpen(false);
    } else if (key.length === 1 && /\S/.test(key)) {
      const i = findTyped(key);
      if (i >= 0) setActive(i);
    }
  };

  /* ---- where the list goes, and where on screen ---- */

  const [host, setHost] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean }>();

  const place = useCallback(() => {
    const t = trigger.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const target = t.closest<HTMLElement>('.bb') ?? document.body;
    // a transformed host is the containing block for `position: fixed`
    const shifted = target !== document.body && getComputedStyle(target).transform !== 'none';
    const o = shifted ? target.getBoundingClientRect() : { top: 0, left: 0 };
    const below = window.innerHeight - r.bottom;
    const up = below < 240 && r.top > below;
    setHost(target);
    setPos({
      top: (up ? r.top : r.bottom) - o.top,
      left: r.left - o.left,
      width: r.width,
      up,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  // the active option stays in view as the keys move it
  useEffect(() => {
    if (!open || active < 0) return;
    const el = list.current?.querySelector<HTMLElement>(`#${CSS.escape(optId(active))}`);
    el?.scrollIntoView?.({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- optId is derived from id
  }, [open, active]);

  /* Escape closes the list and nothing else. A drawer or dialog around it
     listens for Escape on the document, which hears it before the trigger
     does, so it is caught on the window, which hears it first. */
  useEffect(() => {
    if (!open) return;
    const escape = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.preventDefault();
      setOpen(false);
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [open]);

  // a press anywhere else closes it
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      const at = e.target as Node;
      if (trigger.current?.contains(at) || list.current?.contains(at)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  let index = -1;
  const listbox =
    open && host && pos
      ? createPortal(
          <div
            ref={list}
            id={listId}
            role="listbox"
            aria-labelledby={aria['aria-labelledby'] ?? id}
            tabIndex={-1}
            className={cn('selm-list', pos.up && 'up')}
            style={{
              top: pos.top,
              left: pos.left,
              minWidth: pos.width,
            }}
            // keep focus on the trigger while the pointer chooses
            onMouseDown={(e) => e.preventDefault()}
          >
            {sections.map((section, si) => (
              <div
                key={`${si}-${section.label}`}
                role={section.label ? 'group' : undefined}
                aria-label={section.label || undefined}
                className="selm-group"
              >
                {section.label ? (
                  <div className="selm-group-h" aria-hidden="true">
                    <span>{section.label}</span>
                  </div>
                ) : null}
                {section.options.map((opt) => {
                  index++;
                  const i = index;
                  const isSel = i === selectedIndex;
                  return (
                    /* The keys are the combobox's: focus stays on the trigger and
                       the active option is `aria-activedescendant`, so an option
                       is neither focusable nor keyed itself (ARIA select-only
                       combobox). */
                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                    <div
                      key={opt.value}
                      id={optId(i)}
                      data-value={opt.value}
                      role="option"
                      aria-selected={isSel}
                      aria-disabled={opt.disabled || undefined}
                      data-active={i === active || undefined}
                      className="selm-opt"
                      onPointerMove={() => !opt.disabled && setActive(i)}
                      onClick={() => choose(i)}
                    >
                      <span className="selm-led" aria-hidden="true" />
                      <span className="selm-label">{opt.label}</span>
                      {opt.note ? (
                        <span className="selm-note">
                          <span className="selm-sep"> — </span>
                          {opt.note}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>,
          host
        )
      : null;

  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        // a button has a `value`: what is chosen reads off the trigger as a select's did
        value={value}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? optId(active) : undefined}
        aria-label={aria['aria-label']}
        aria-labelledby={aria['aria-labelledby']}
        aria-describedby={aria['aria-describedby']}
        disabled={disabled}
        data-open={open || undefined}
        className={cn('selm', className)}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setOpen(false);
          onBlur?.();
        }}
      >
        <span className={cn('selm-value', !selected && 'empty')}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className="selm-chev" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1.5l5 5 5-5" />
        </svg>
      </button>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      {listbox}
    </>
  );
}
