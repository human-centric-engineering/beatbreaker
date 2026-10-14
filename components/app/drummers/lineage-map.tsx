'use client';

import Link from 'next/link';
import { useEffect, useId, useMemo, useState } from 'react';

import { SelectMenu } from '@/components/app/ui/select-menu';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldHelp } from '@/components/ui/field-help';
import { Label } from '@/components/ui/label';
import {
  DEVICE_LABELS,
  EDGE_KIND_LABELS,
  MAP_EDGE_KINDS,
  type LineageLayout,
  type MapEdgeKind,
  edgePath,
  isTentative,
  meetsConfidence,
  traceLineage,
} from '@/lib/app/lineage/layout';
import { type Confidence, DEVICE_KINDS, type DeviceKind, isOneOf } from '@/lib/app/lineage/types';
import { cn } from '@/lib/utils';

/**
 * The lineage map (Phase 11-b, D49): every person in the drummer records, time
 * left to right and a band per family, with an edge for each claim that one
 * passed something to another.
 *
 * The layout comes from the server, so the first HTML is the whole map. Point
 * at or tab to a person and everyone they learned from and everyone who
 * learned from them lights up; "Trace" keeps one lit. Each person is a link to
 * their page. Filters thin the edges by kind and by how sure the claim is, and
 * "Plays" picks out the drummers whose record names a rhythmic device (12-b).
 */

const KIND_COLOUR: Record<MapEdgeKind, { stroke: string; fill: string; swatch: string }> = {
  influence: { stroke: 'stroke-amber-500', fill: 'fill-amber-500', swatch: 'bg-amber-500' },
  teacher: { stroke: 'stroke-emerald-500', fill: 'fill-emerald-500', swatch: 'bg-emerald-500' },
  succession: { stroke: 'stroke-violet-500', fill: 'fill-violet-500', swatch: 'bg-violet-500' },
  peer: { stroke: 'stroke-sky-500', fill: 'fill-sky-500', swatch: 'bg-sky-500' },
  family: { stroke: 'stroke-pink-500', fill: 'fill-pink-500', swatch: 'bg-pink-500' },
  recording: { stroke: 'stroke-slate-400', fill: 'fill-slate-400', swatch: 'bg-slate-400' },
};

/** The confidence filter: a floor, strongest last. */
const FLOORS: { value: Confidence | ''; label: string }[] = [
  { value: '', label: 'Any claim' },
  { value: 'likely', label: 'Likely or surer' },
  { value: 'widely_reported', label: 'Widely reported or surer' },
  { value: 'verified', label: 'Verified only' },
];

function isFloor(value: string): value is Confidence | '' {
  return FLOORS.some((f) => f.value === value);
}

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5] as const;

export interface LineageMapProps {
  layout: LineageLayout;
  /** A person to trace when the page opens (`/drummers?trace=<slug>`), by id. */
  initialTrace?: string | null;
}

export function LineageMap({ layout, initialTrace = null }: LineageMapProps) {
  const uid = useId();
  const [kinds, setKinds] = useState<ReadonlySet<MapEdgeKind>>(() => new Set(MAP_EDGE_KINDS));
  const [floor, setFloor] = useState<Confidence | ''>('');
  const [plays, setPlays] = useState<DeviceKind | ''>('');
  const [picked, setPicked] = useState<string | null>(initialTrace);
  /* Hover and keyboard focus are kept apart, so leaving one never drops the other. */
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  const edges = useMemo(
    () =>
      layout.edges.filter(
        (e) => kinds.has(e.kind) && meetsConfidence(e.confidence, floor === '' ? null : floor)
      ),
    [layout.edges, kinds, floor]
  );
  /* A stub is on the map for its edges; with none left, it goes. A record stays. */
  const nodes = useMemo(() => {
    const touched = new Set(edges.flatMap((e) => [e.from, e.to]));
    return layout.nodes.filter((n) => n.modelled || touched.has(n.id));
  }, [layout.nodes, edges]);
  const byId = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout.nodes]);

  /* Only the devices some record names, in the vocabulary's order. */
  const deviceOptions = useMemo(() => {
    const named = new Set(layout.nodes.flatMap((n) => n.devices));
    return [
      { value: '', label: 'Anything' },
      ...DEVICE_KINDS.filter((k) => named.has(k)).map((k) => ({
        value: k,
        label: DEVICE_LABELS[k],
      })),
    ];
  }, [layout.nodes]);
  /* Who plays the picked device, earliest first; null when nothing is picked. */
  const players = useMemo(
    () =>
      plays === ''
        ? null
        : {
            label: DEVICE_LABELS[plays],
            nodes: layout.nodes.filter((n) => n.devices.includes(plays)).sort((a, b) => a.x - b.x),
          },
    [layout.nodes, plays]
  );
  const playerIds = useMemo(
    () => (players ? new Set(players.nodes.map((n) => n.id)) : null),
    [players]
  );

  /* Esc lets go of a trace, wherever focus is — the select's own list closes first. */
  const tracing = hovered !== null || focused !== null || picked !== null;
  useEffect(() => {
    if (!tracing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      setPicked(null);
      setHovered(null);
      setFocused(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tracing]);

  const focus = hovered ?? focused ?? picked;
  const trace = useMemo(() => (focus ? traceLineage(edges, focus) : null), [edges, focus]);
  /* With both on, the traced person stays lit whatever they play: the status
     line is about them. Everyone else must be on the trace and a player. */
  const isPlayer = (id: string) => !playerIds || playerIds.has(id) || id === focus;
  const lit = (id: string) =>
    isPlayer(id) &&
    (!trace || id === focus || trace.ancestors.has(id) || trace.descendants.has(id));
  const dim = trace !== null || playerIds !== null;

  const traceable = useMemo(
    () =>
      /* The records, and whoever the page opened traced (a stub, from its own
         page), so the select always names who is traced. */
      layout.nodes
        .filter((n) => n.modelled || n.id === initialTrace)
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((n) => ({ value: n.id, label: n.label })),
    [layout.nodes, initialTrace]
  );

  const tracedNode = focus ? byId.get(focus) : undefined;
  const status =
    tracedNode && trace
      ? `${tracedNode.label}: learned from ${trace.ancestors.size}, passed on to ${trace.descendants.size}.`
      : players
        ? `${players.label}: ${players.nodes.map((n) => n.label).join(', ')}.`
        : '';

  const toggleKind = (kind: MapEdgeKind, on: boolean) =>
    setKinds((was) => {
      const next = new Set(was);
      if (on) next.add(kind);
      else next.delete(kind);
      return next;
    });

  const zoomAt = ZOOMS.findIndex((z) => z === zoom);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${uid}-trace`} className="flex items-center gap-1">
            Trace a drummer
            <FieldHelp title="Trace a drummer">
              Lights up everyone they learned from, however far back, and everyone who learned from
              them, and dims the rest. Pointing at or tabbing to anyone on the map does the same
              while you are there. Esc clears it.
            </FieldHelp>
          </Label>
          <SelectMenu
            id={`${uid}-trace`}
            className="min-w-48"
            value={picked ?? ''}
            onValueChange={(v) => setPicked(v === '' ? null : v)}
            options={[{ value: '', label: 'Nobody' }, ...traceable]}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${uid}-floor`} className="flex items-center gap-1">
            How sure
            <FieldHelp title="How sure">
              Every link is a claim from a drummer&apos;s record, with how well it is backed up.
              Raise this to keep only the better-evidenced ones. Dashed links are weaker than
              &ldquo;likely&rdquo;. Default: any claim.
            </FieldHelp>
          </Label>
          <SelectMenu
            id={`${uid}-floor`}
            className="min-w-48"
            value={floor}
            onValueChange={(v) => {
              if (isFloor(v)) setFloor(v);
            }}
            options={FLOORS}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${uid}-plays`} className="flex items-center gap-1">
            Plays
            <FieldHelp title="Plays">
              Picks out the drummers whose record names this device, with a source for it, and dims
              the rest. Only cross-rhythm and hemiola are polyrhythms; the others are what is often
              called one, named for what they are. A drummer&apos;s page lists the sources. Default:
              anything.
            </FieldHelp>
          </Label>
          <SelectMenu
            id={`${uid}-plays`}
            className="min-w-48"
            value={plays}
            onValueChange={(v) => setPlays(isOneOf(DEVICE_KINDS, v) ? v : '')}
            options={deviceOptions}
          />
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Zoom">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZoom(ZOOMS[Math.max(0, zoomAt - 1)])}
            disabled={zoomAt <= 0}
          >
            Zoom out
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZoom(1)}
            disabled={zoom === 1}
          >
            {Math.round(zoom * 100)}%
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, zoomAt + 1)])}
            disabled={zoomAt >= ZOOMS.length - 1}
          >
            Zoom in
          </Button>
        </div>
      </div>

      <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <legend className="mb-2 flex items-center gap-1 text-sm font-medium">
          Links
          <FieldHelp title="Links">
            Which kinds of link to draw. Influence and teacher links run from the earlier drummer to
            the later one; playing together, family and a shared record have no direction. Default:
            all of them.
          </FieldHelp>
        </legend>
        {MAP_EDGE_KINDS.map((kind) => (
          <div key={kind} className="flex items-center gap-2">
            <Checkbox
              id={`${uid}-kind-${kind}`}
              checked={kinds.has(kind)}
              onCheckedChange={(on) => toggleKind(kind, on === true)}
            />
            <Label htmlFor={`${uid}-kind-${kind}`} className="flex items-center gap-2 font-normal">
              <span
                aria-hidden
                className={cn('inline-block h-1 w-5 rounded', KIND_COLOUR[kind].swatch)}
              />
              {EDGE_KIND_LABELS[kind]}
            </Label>
          </div>
        ))}
      </fieldset>

      <p className="text-muted-foreground text-sm" aria-live="polite">
        {status ||
          'Point at a drummer, or tab to one, to see who they learned from and who learned from them.'}
      </p>

      <div
        className="bg-card max-h-[75vh] overflow-auto rounded-lg border"
        role="region"
        aria-label="Lineage map"
      >
        <svg
          width={layout.width * zoom}
          height={layout.height * zoom}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="block"
          aria-label="Who learned from whom, by the decade they started"
          role="group"
        >
          <defs>
            {MAP_EDGE_KINDS.map((kind) => (
              <marker
                key={kind}
                id={`${uid}-arrow-${kind}`}
                viewBox="0 0 10 10"
                refX="14"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" className={KIND_COLOUR[kind].fill} />
              </marker>
            ))}
          </defs>

          {layout.bands.map((band, i) => (
            <g key={band.family}>
              <rect
                x={0}
                y={band.top}
                width={layout.width}
                height={band.height}
                className={i % 2 === 0 ? 'fill-muted/40' : 'fill-transparent'}
              />
              <text
                x={12}
                y={band.top + 20}
                className="fill-muted-foreground text-xs font-semibold"
              >
                {band.label}
              </text>
            </g>
          ))}

          {layout.ticks.map((tick) => (
            <g key={tick.year} aria-hidden>
              <line
                x1={tick.x}
                x2={tick.x}
                y1={24}
                y2={layout.height}
                className="stroke-border"
                strokeWidth={1}
              />
              <text x={tick.x + 4} y={18} className="fill-muted-foreground text-[11px]">
                {tick.year}s
              </text>
            </g>
          ))}
          {layout.unknownX !== null && (
            <text x={layout.unknownX} y={18} className="fill-muted-foreground text-[11px]">
              Dates unknown
            </text>
          )}

          <g fill="none">
            {edges.map((e) => {
              const a = byId.get(e.from);
              const b = byId.get(e.to);
              if (!a || !b) return null;
              const on =
                (trace ? trace.edges.has(e.id) : true) && isPlayer(e.from) && isPlayer(e.to);
              return (
                <path
                  key={e.id}
                  d={edgePath(a, b)}
                  className={cn(KIND_COLOUR[e.kind].stroke, 'transition-opacity')}
                  strokeWidth={dim && on ? 2 : 1.25}
                  strokeOpacity={dim ? (on ? 0.95 : 0.07) : 0.45}
                  strokeDasharray={isTentative(e.confidence) ? '4 3' : undefined}
                  markerEnd={e.directed ? `url(#${uid}-arrow-${e.kind})` : undefined}
                  data-kind={e.kind}
                  data-lit={dim ? String(on) : undefined}
                />
              );
            })}
          </g>

          {nodes.map((n) => {
            const on = lit(n.id);
            const year =
              n.year === null
                ? 'dates unknown'
                : n.inferred
                  ? `around the ${Math.floor(n.year / 10) * 10}s`
                  : `from ${n.year}`;
            return (
              <Link
                key={n.id}
                href={`/drummers/${n.slug}`}
                aria-label={`${n.label}, ${year}`}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setFocused(n.id)}
                onBlur={() => setFocused(null)}
                className="group outline-none"
                data-node={n.id}
                data-lit={dim ? String(on) : undefined}
              >
                <g opacity={on ? 1 : 0.2} className="transition-opacity">
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.modelled ? 6 : 4}
                    className={cn(
                      n.modelled ? 'fill-primary' : 'fill-muted-foreground',
                      'group-focus-visible:stroke-ring stroke-background',
                      n.id === focus && 'stroke-ring'
                    )}
                    strokeWidth={n.id === focus ? 3 : 1.5}
                  />
                  <text
                    x={n.x + 10}
                    y={n.y + 4}
                    className={cn(
                      'text-xs group-hover:underline group-focus-visible:underline',
                      n.modelled ? 'fill-foreground font-semibold' : 'fill-muted-foreground',
                      n.inferred && 'italic',
                      n.id === focus && 'font-bold'
                    )}
                  >
                    {n.label}
                  </text>
                </g>
              </Link>
            );
          })}
        </svg>
      </div>
      <p className="text-muted-foreground text-xs">
        Bold names have a full record; the rest are people those records name. An italic name has no
        start year in the records and is placed by who they learned from or played with.
      </p>
    </div>
  );
}
