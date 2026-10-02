'use client';

import { ArrowDown, ArrowUp, Loader2, Pin, PinOff, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { NumberField } from '@/components/app/practice/number-field';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FieldHelp } from '@/components/ui/field-help';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { APIClientError, apiClient } from '@/lib/api/client';
import { LAYER_NAMES, layerName } from '@/lib/app/breaks/layers';
import {
  CLIMB_PCT_RANGE,
  type ClimbShape,
  CLIMB_SHAPES,
  CLIMB_STEPS_RANGE,
  PRACTICE_BPM_MIN,
  START_PCT_RANGE,
} from '@/lib/app/practice/climb';
import { keptItem } from '@/lib/app/practice/items';
import { nudgeMinutes, splitMinutes } from '@/lib/app/practice/split';
import {
  COUNT_IN_RANGE,
  SESSION_BPM_MAX,
  SESSION_DESCRIPTION_MAX,
  SESSION_MINUTES,
  SESSION_NAME_MAX,
  type SessionItemView,
  type SessionView,
  sessionViewSchema,
} from '@/lib/validations/practice-sessions';

/** What each climb shape is called on screen. */
export const SHAPE_LABEL: Record<ClimbShape, string> = {
  steady: 'Steady',
  'gentle-start': 'Gentle start',
  'gentle-finish': 'Gentle finish',
  steps: 'Steps',
};

const COUNT_IN_LABEL = ['None', 'One bar', 'Two bars'];

const selectClass =
  'border-input bg-background h-9 rounded-md border px-2 text-sm disabled:opacity-50';

/** The session's own fields, as the editor holds them. */
interface Fields {
  name: string;
  description: string;
  totalMinutes: number;
  startPct: number;
  climbPct: number;
  climbShape: ClimbShape;
  climbSteps: number;
  countIn: number;
}

function fieldsOf(s: SessionView): Fields {
  return {
    name: s.name,
    description: s.description ?? '',
    totalMinutes: s.totalMinutes,
    startPct: s.startPct,
    climbPct: s.climbPct,
    climbShape: s.climbShape,
    climbSteps: s.climbSteps,
    countIn: s.countIn,
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Where an item's target comes from, in words. */
function targetSource(item: SessionItemView): string {
  if (!item.target) return '';
  if (item.goalBpm !== null) return 'your goal';
  if (item.bestBpm !== null) return 'your best';
  return "the pattern's tempo";
}

/** Whether an edit since the last save moves this item's start or target. */
function tempoChanged(item: SessionItemView, saved: SessionView, fields: Fields): boolean {
  const was = saved.items.find((i) => i.id === item.id);
  return (
    !was ||
    was.level !== item.level ||
    was.goalBpm !== item.goalBpm ||
    was.startPct !== item.startPct ||
    (item.startPct === null && fields.startPct !== saved.startPct)
  );
}

/**
 * The practice-session editor (Phase 7D, task 7D.5): the session's name, total
 * and climb, and its patterns — each with its minutes, layer, target and its
 * own climb if it needs one.
 *
 * The minutes are split here as you change them, by the same `splitMinutes`
 * the server runs, so what you see adds up before you save; the server splits
 * again on save and its answer replaces what is shown. Changing one pattern's
 * minutes pins it (D31); the pin button lets it go again. Patterns are
 * reordered with the up and down buttons, which the keyboard reaches, and the
 * focus stays on the button you pressed as the row moves.
 *
 * Patterns are added from where you find them — _Add to a session_ beside
 * every pattern in the Studio's drawer and on a pattern's page.
 */
export function SessionEditor({ initial }: { initial: SessionView }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [fields, setFields] = useState<Fields>(() => fieldsOf(initial));
  const [items, setItems] = useState<SessionItemView[]>(initial.items);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  /* After a move, the button pressed follows its row. */
  const moveButtons = useRef(new Map<string, HTMLButtonElement | null>());
  const [focusAfterMove, setFocusAfterMove] = useState<{ id: string; dir: 'up' | 'down' } | null>(
    null
  );
  useEffect(() => {
    if (!focusAfterMove) return;
    const { id, dir } = focusAfterMove;
    const pressed = moveButtons.current.get(`${dir}:${id}`);
    const other = moveButtons.current.get(`${dir === 'up' ? 'down' : 'up'}:${id}`);
    // at the top (or bottom) the pressed button is disabled; its partner takes the focus
    (pressed && !pressed.disabled ? pressed : other)?.focus();
  }, [focusAfterMove, items]);

  const fieldsDirty = !same(fields, fieldsOf(saved));
  const itemsDirty = !same(items.map(keptItem), saved.items.map(keptItem));
  const dirty = fieldsDirty || itemsDirty;
  const allotted = items.reduce((sum, i) => sum + i.minutes, 0);
  const minTotal = Math.max(SESSION_MINUTES.min, items.length);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setDone(false);
    setFields((f) => ({ ...f, [key]: value }));
  };

  const editItems = (next: SessionItemView[]) => {
    setDone(false);
    setItems(next);
  };

  /** Re-split the free items around the pinned ones. */
  const resplit = (total: number, list: SessionItemView[]): SessionItemView[] => {
    const split = splitMinutes(
      total,
      list.map((i) => ({ minutes: i.minutes, pinned: i.minutesPinned }))
    );
    return list.map((i, k) => ({ ...i, minutes: split[k] }));
  };

  const setTotal = (total: number) => {
    set('totalMinutes', total);
    editItems(resplit(total, items));
  };

  const nudge = (index: number, to: number) => {
    const slots = nudgeMinutes(
      fields.totalMinutes,
      items.map((i) => ({ minutes: i.minutes, pinned: i.minutesPinned })),
      index,
      to
    );
    editItems(
      items.map((i, k) => ({ ...i, minutes: slots[k].minutes, minutesPinned: slots[k].pinned }))
    );
  };

  const unpin = (index: number) => {
    editItems(
      resplit(
        fields.totalMinutes,
        items.map((i, k) => (k === index ? { ...i, minutesPinned: false } : i))
      )
    );
  };

  const patch = (index: number, change: Partial<SessionItemView>) => {
    editItems(items.map((i, k) => (k === index ? { ...i, ...change } : i)));
  };

  const move = (index: number, dir: 'up' | 'down') => {
    const to = dir === 'up' ? index - 1 : index + 1;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[index], next[to]] = [next[to], next[index]];
    editItems(next);
    setFocusAfterMove({ id: items[index].id, dir });
  };

  const remove = (index: number) => {
    editItems(
      resplit(
        fields.totalMinutes,
        items.filter((_, k) => k !== index)
      )
    );
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setDone(false);
    const base = `/api/v1/practice-sessions/${saved.id}`;
    try {
      let view = saved;
      const sendFields = async () =>
        sessionViewSchema.parse(
          await apiClient.patch(base, {
            body: { ...fields, description: fields.description.trim() || null },
          })
        );
      const sendItems = async () =>
        sessionViewSchema.parse(
          await apiClient.put(`${base}/items`, { body: { items: items.map(keptItem) } })
        );
      /* The server checks a new total against the items it holds, and the new
         list against the total it holds. A total cut below the patterns still
         saved has to wait for the shorter list; otherwise the total goes first,
         so pins sized for a bigger total are not squeezed into the old one. */
      const listFirst = fields.totalMinutes < saved.items.length;
      if (listFirst && itemsDirty) view = await sendItems();
      if (fieldsDirty) view = await sendFields();
      if (!listFirst && itemsDirty) view = await sendItems();
      setSaved(view);
      setFields(fieldsOf(view));
      setItems(view.items);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof APIClientError && err.code !== 'NETWORK_ERROR'
          ? err.message
          : 'That did not save. Try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteSession = async () => {
    setBusy(true);
    try {
      await apiClient.delete(`/api/v1/practice-sessions/${saved.id}`);
      router.push('/practice');
      router.refresh();
    } catch {
      setError('That did not delete. Try again.');
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-8"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{saved.name}</h1>
        <Button asChild variant="ghost">
          <Link href="/practice">All sessions</Link>
        </Button>
      </div>

      <section className="space-y-4" aria-labelledby="session-about">
        <h2 id="session-about" className="text-xl font-semibold">
          The session
        </h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <div className="space-y-1">
            <Label htmlFor="session-name" className="flex items-center gap-1">
              Name
              <FieldHelp title="Name">
                What this session is for — “Ghost notes week 2”, “Warm-up”. Up to {SESSION_NAME_MAX}{' '}
                characters.
              </FieldHelp>
            </Label>
            <Input
              id="session-name"
              value={fields.name}
              maxLength={SESSION_NAME_MAX}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="session-total" className="flex items-center gap-1">
              Total minutes
              <FieldHelp title="Total minutes">
                How long the whole session runs, {SESSION_MINUTES.min} to {SESSION_MINUTES.max}{' '}
                minutes. Patterns you have not pinned share what the pinned ones leave, equally.
                Every pattern needs at least a minute.
              </FieldHelp>
            </Label>
            <NumberField
              id="session-total"
              value={fields.totalMinutes}
              min={minTotal}
              max={SESSION_MINUTES.max}
              onCommit={(v) => v !== null && setTotal(v)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="session-description" className="flex items-center gap-1">
            Description
            <FieldHelp title="Description">
              Optional. Notes for yourself, or for a student when you share it. Up to{' '}
              {SESSION_DESCRIPTION_MAX} characters.
            </FieldHelp>
          </Label>
          <Textarea
            id="session-description"
            value={fields.description}
            maxLength={SESSION_DESCRIPTION_MAX}
            rows={2}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="session-climb">
        <h2 id="session-climb" className="flex items-center gap-1 text-xl font-semibold">
          How each pattern climbs
          <FieldHelp title="The climb">
            Each pattern starts below its target, climbs to it, then holds it until its time is up.
            These are the session&apos;s settings; any pattern can have its own below.
          </FieldHelp>
        </h2>
        <ClimbFields
          prefix="session"
          value={fields}
          onChange={(key, value) => {
            if (key === 'climbShape') {
              if (typeof value === 'string') set('climbShape', value);
            } else if (typeof value === 'number') {
              set(key, value);
            }
          }}
        />
        <div className="space-y-1">
          <Label htmlFor="session-count-in" className="flex items-center gap-1">
            Count-in
            <FieldHelp title="Count-in">
              The click you hear before each pattern starts, so you can come in on time. Default:
              one bar.
            </FieldHelp>
          </Label>
          <select
            id="session-count-in"
            className={selectClass}
            value={fields.countIn}
            onChange={(e) => set('countIn', Number(e.target.value))}
          >
            {COUNT_IN_LABEL.slice(COUNT_IN_RANGE.min, COUNT_IN_RANGE.max + 1).map((label, n) => (
              <option key={label} value={n}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="session-patterns">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="session-patterns" className="text-xl font-semibold">
            Patterns
          </h2>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {allotted} of {fields.totalMinutes} minutes
          </p>
        </div>
        {items.length ? (
          <ol className="space-y-3">
            {items.map((item, index) => (
              <li key={item.id} className="space-y-3 rounded-md border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {index + 1}. {item.title}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {!item.target
                        ? 'No longer available — skipped when the session runs'
                        : tempoChanged(item, saved, fields)
                          ? 'Save to see its new tempos'
                          : `${item.startBpm} → ${item.targetBpm} BPM, ${targetSource(item)}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      ref={(el) => {
                        moveButtons.current.set(`up:${item.id}`, el);
                      }}
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${item.title} up`}
                      disabled={index === 0}
                      onClick={() => move(index, 'up')}
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      ref={(el) => {
                        moveButtons.current.set(`down:${item.id}`, el);
                      }}
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Move ${item.title} down`}
                      disabled={index === items.length - 1}
                      onClick={() => move(index, 'down')}
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${item.title}`}
                      onClick={() => remove(index)}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor={`item-${item.id}-minutes`} className="flex items-center gap-1">
                      Minutes
                      <FieldHelp title="Minutes">
                        Changing this pins it: the patterns you have not pinned share the rest, and
                        the total holds. The pin button lets it go back to an equal share.
                      </FieldHelp>
                    </Label>
                    <div className="flex items-center gap-1">
                      <NumberField
                        id={`item-${item.id}-minutes`}
                        value={item.minutes}
                        min={1}
                        max={fields.totalMinutes}
                        onCommit={(v) => v !== null && nudge(index, v)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={!item.minutesPinned}
                        aria-label={
                          item.minutesPinned
                            ? `Unpin ${item.title}'s minutes`
                            : `${item.title}'s minutes are an equal share`
                        }
                        title={
                          item.minutesPinned ? 'Pinned — press to share equally' : 'Equal share'
                        }
                        onClick={() => unpin(index)}
                      >
                        {item.minutesPinned ? (
                          <Pin className="h-4 w-4" aria-hidden />
                        ) : (
                          <PinOff className="h-4 w-4" aria-hidden />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`item-${item.id}-level`} className="flex items-center gap-1">
                      Layer
                      <FieldHelp title="Layer">
                        How much of the pattern you play, from the backbone up to the full groove.
                        Your best speed is kept per layer, so the target follows it.
                      </FieldHelp>
                    </Label>
                    <select
                      id={`item-${item.id}-level`}
                      className={selectClass}
                      value={item.level}
                      onChange={(e) => patch(index, { level: Number(e.target.value) })}
                    >
                      {Object.keys(LAYER_NAMES).map((level) => (
                        <option key={level} value={level}>
                          {layerName(Number(level))}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`item-${item.id}-goal`} className="flex items-center gap-1">
                      Goal BPM
                      <FieldHelp title="Goal">
                        The tempo this pattern climbs to. Leave it empty to aim at your best at this
                        layer — it moves up as you get faster — or the pattern&apos;s own tempo when
                        you have no record yet.
                      </FieldHelp>
                    </Label>
                    <NumberField
                      id={`item-${item.id}-goal`}
                      value={item.goalBpm}
                      min={PRACTICE_BPM_MIN}
                      max={SESSION_BPM_MAX}
                      blank
                      placeholder={
                        item.bestBpm !== null
                          ? `Best: ${item.bestBpm}`
                          : item.target
                            ? `Tempo: ${item.target.bpm}`
                            : ''
                      }
                      onCommit={(v) => patch(index, { goalBpm: v })}
                    />
                  </div>
                </div>

                <details>
                  <summary className="cursor-pointer text-sm">
                    This pattern&apos;s own climb
                    {item.startPct !== null ||
                    item.climbPct !== null ||
                    item.climbShape !== null ||
                    item.climbSteps !== null
                      ? ' (changed)'
                      : ''}
                  </summary>
                  <div className="pt-3">
                    <ClimbFields
                      prefix={`item-${item.id}`}
                      value={item}
                      fallback={fields}
                      onChange={(key, value) => patch(index, climbPatch(key, value))}
                    />
                  </div>
                </details>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground">
            No patterns yet. Add them from the Studio&apos;s Patterns drawer or a pattern&apos;s
            page: <strong>Add to a session</strong> sits beside each one.
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || !dirty || !fields.name.trim()}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          Save
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" disabled={busy}>
              <Trash2 className="mr-2 h-4 w-4" aria-hidden />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{saved.name}”?</AlertDialogTitle>
              <AlertDialogDescription>
                The session goes. Your patterns, your speeds and the times you ran it stay.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction onClick={() => void deleteSession()}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {done && !dirty ? (
          <p className="text-muted-foreground text-sm" role="status">
            Saved.
          </p>
        ) : null}
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

type ClimbKey = 'startPct' | 'climbPct' | 'climbShape' | 'climbSteps';

/** One of a pattern's climb overrides, as a change to the item. */
function climbPatch(key: ClimbKey, value: number | ClimbShape | null): Partial<SessionItemView> {
  if (key === 'climbShape') return { climbShape: typeof value === 'number' ? null : value };
  return { [key]: typeof value === 'number' ? value : null };
}

/**
 * The four climb settings. On the session they always have a value; on a
 * pattern (`fallback` given) an empty one is the session's, and says what
 * that is.
 */
function ClimbFields({
  prefix,
  value,
  fallback,
  onChange,
}: {
  prefix: string;
  value: { [K in ClimbKey]: K extends 'climbShape' ? ClimbShape | null : number | null };
  fallback?: Fields;
  onChange: (key: ClimbKey, value: number | ClimbShape | null) => void;
}) {
  const own = fallback !== undefined;
  const shape = value.climbShape ?? fallback?.climbShape ?? 'steady';
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-start`} className="flex items-center gap-1">
          Start below (%)
          <FieldHelp title="Start below">
            How far under the target the pattern starts, {START_PCT_RANGE.min}–{START_PCT_RANGE.max}
            %. Never slower than {PRACTICE_BPM_MIN} BPM. Default: 20%.
            {own ? ' Empty: the session’s.' : ''}
          </FieldHelp>
        </Label>
        <NumberField
          id={`${prefix}-start`}
          value={value.startPct}
          min={START_PCT_RANGE.min}
          max={START_PCT_RANGE.max}
          blank={own}
          placeholder={own ? String(fallback.startPct) : undefined}
          onCommit={(v) => onChange('startPct', v)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-climb`} className="flex items-center gap-1">
          Climb for (%)
          <FieldHelp title="Climb for">
            How much of the pattern&apos;s time the climb takes, {CLIMB_PCT_RANGE.min}–
            {CLIMB_PCT_RANGE.max}%. The rest holds the target. Default: 67%, two-thirds.
            {own ? ' Empty: the session’s.' : ''}
          </FieldHelp>
        </Label>
        <NumberField
          id={`${prefix}-climb`}
          value={value.climbPct}
          min={CLIMB_PCT_RANGE.min}
          max={CLIMB_PCT_RANGE.max}
          blank={own}
          placeholder={own ? String(fallback.climbPct) : undefined}
          onCommit={(v) => onChange('climbPct', v)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-shape`} className="flex items-center gap-1">
          Shape
          <FieldHelp title="Shape">
            Steady climbs evenly. Gentle start spends longer near the start tempo, gentle finish
            longer near the target. Steps jumps in equal steps. The tempo changes only between
            loops. Default: steady.
          </FieldHelp>
        </Label>
        <select
          id={`${prefix}-shape`}
          className={selectClass}
          value={value.climbShape ?? ''}
          onChange={(e) =>
            onChange('climbShape', CLIMB_SHAPES.find((s) => s === e.target.value) ?? null)
          }
        >
          {own ? (
            <option value="">Session&apos;s ({SHAPE_LABEL[fallback.climbShape]})</option>
          ) : null}
          {CLIMB_SHAPES.map((s) => (
            <option key={s} value={s}>
              {SHAPE_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      {shape === 'steps' ? (
        <div className="space-y-1">
          <Label htmlFor={`${prefix}-steps`} className="flex items-center gap-1">
            Steps
            <FieldHelp title="Steps">
              How many steps the climb takes, {CLIMB_STEPS_RANGE.min}–{CLIMB_STEPS_RANGE.max}, each
              held for an equal share. Default: 4.{own ? ' Empty: the session’s.' : ''}
            </FieldHelp>
          </Label>
          <NumberField
            id={`${prefix}-steps`}
            value={value.climbSteps}
            min={CLIMB_STEPS_RANGE.min}
            max={CLIMB_STEPS_RANGE.max}
            blank={own}
            placeholder={own ? String(fallback.climbSteps) : undefined}
            onCommit={(v) => onChange('climbSteps', v)}
          />
        </div>
      ) : null}
    </div>
  );
}
