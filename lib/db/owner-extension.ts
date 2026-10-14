/**
 * Owner chokepoint — a narrowed caller reads only rows it may read (§115 t-801).
 *
 * The tenancy layer (`lib/db/tenancy-extension.ts`) draws the wall between
 * orgs. Inside one org the only thing that kept a member's personal rows
 * from another member was each route remembering to narrow its query, one
 * route at a time. This layer checks the resolved query instead, below every
 * route and every library function. `lib/db/client.ts` applies it over the
 * tenancy layer.
 *
 * **Who is checked.** The caller the guard entered as the subject
 * (`lib/auth/subject-context.ts`) when the policy narrowed them to one user:
 * `filter.userId` is set. A platform admin, an `admin` API key, a job, a
 * guard-less route and a read inside `runAcrossOwners(reason, fn)` are not
 * narrowed, and for them this layer sends exactly the query it was handed.
 *
 * **What is checked**, on the models `lib/db/owner-classification.ts` marks
 * `enforced` (rulings 1–3 on the feature, journal 2026-10-14):
 *
 *   • `findMany` / `count` / `aggregate` / `groupBy` must carry a filter that
 *     *confines* the read: every row it can match is one the caller may read.
 *     The `where` is analysed as a tree — any `AND` conjunct that confines
 *     confines the whole; an `OR` confines when every arm does; `NOT` never
 *     does. A leaf confines when it names the owner as the subject, or names
 *     no owner and the caller may read ownerless rows of that kind
 *     (`session.unattributedReads`). So `{ OR: [{ userId: me }, { userId: null }] }`
 *     passes for a caller admitted to ownerless rows, and `{ agentId }` alone
 *     does not.
 *   • `findUnique` / `findFirst` (and the `OrThrow` forms) run whatever their
 *     filter, and the row that comes back is checked: someone else's, or an
 *     ownerless one the caller may not read, is refused. A route that fetches
 *     by id and checks the owner afterwards keeps working, and gains a
 *     backstop for the day it forgets.
 *   • An `include` / `select` reaching an enforced model from any root (a
 *     `user.findUnique({ include: { aiUserMemories: true } })`) must confine
 *     that relation with its own `where`, or it is refused. A `_count` of
 *     one is held to the same rule.
 *
 * A refusal throws {@link OwnerReadRefusedError} in every environment. There
 * is no log-only mode: that records a leak rather than stopping it.
 * `handleAPIError` answers it as a 404, so a refusal does not confirm the row
 * exists. Code that must read across owners for a narrowed caller says so
 * with `runAcrossOwners(reason, fn)`, which is logged.
 *
 * **What is not checked**, and why:
 *   • **Writes.** An `update` / `delete` of another member's row is a write
 *     decision the routes make (`canAdminister`); this layer guards reads.
 *   • **A relation filter that only tests existence**
 *     (`aiAgent.findMany({ where: { userMemories: { some: … } } })`): it
 *     returns the root's rows, not the personal ones.
 *   • **Raw SQL** (`model === undefined`). No `where` reaches it; every raw
 *     read of an enforced table is in the manifest
 *     `tests/unit/lib/db/owner-raw-sql-manifest.test.ts` keeps.
 *
 * **Cost.** Off the enforced models a read pays one set lookup, plus a walk
 * of its `include` / `select` when it has one. An enforced read under a
 * narrowed caller pays the subject lookup (memoised per request) and one walk
 * of its `where`. Measured in the design doc, Spike register item 8.
 *
 * @see lib/db/owner-classification.ts — which models, and how each owner is reached
 * @see lib/auth/subject-context.ts — who is asking
 * @see .context/auth/authorization.md — "The owner chokepoint"
 */

import type { UnattributedReadKind, UnattributedReads } from '@/lib/auth/orphan-reads';
import type { SubjectReadScope } from '@/lib/auth/subject-context';
import {
  ownerClassificationOf,
  type OwnerClassification,
  type OwnerPath,
} from '@/lib/db/owner-classification';
import type { TenancyClient } from '@/lib/db/tenancy-extension';
import { readRuntimeDataModel, type RuntimeDataModel } from '@/lib/tenancy/classification';

/** Reads whose filter must confine them: their result cannot be checked row by row. */
const FILTER_CHECKED_OPS: ReadonlySet<string> = new Set([
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

/** Reads of at most one row: run, then the row is checked. */
const RESULT_CHECKED_OPS: ReadonlySet<string> = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
]);

/** Why a read was refused. */
export type OwnerRefusalReason =
  /** A list, count or aggregate whose filter does not confine it. */
  | 'unconfined-filter'
  /** A single-row read that returned a row this caller may not read. */
  | 'foreign-row'
  /** An `include` / `select` / `_count` of an enforced relation with no confining `where`. */
  | 'unconfined-relation';

/**
 * A narrowed caller's read of rows it may not read. Thrown in every
 * environment; `handleAPIError` answers it as a 404 so the refusal does not
 * confirm the row exists. The message names the model and operation and never
 * a row's content.
 */
export class OwnerReadRefusedError extends Error {
  constructor(
    readonly model: string,
    readonly operation: string,
    readonly reason: OwnerRefusalReason,
    detail: string
  ) {
    super(
      `Refused ${model}.${operation} for a caller narrowed to their own rows: ${detail} ` +
        'Narrow the query with session.subjectFilter, or wrap a deliberate crossing in ' +
        'runAcrossOwners(reason, fn). See .context/auth/authorization.md ("The owner chokepoint").'
    );
    this.name = 'OwnerReadRefusedError';
  }
}

/** The caller a read is checked for: whose rows, and which ownerless kinds. */
export interface OwnerReader {
  userId: string;
  unattributedReads: UnattributedReads;
}

/**
 * The reader a scope narrows to, or `null` when it does not narrow — no
 * subject, a deliberate crossing, or a caller who may see every subject.
 */
export function readerFor(scope: SubjectReadScope): OwnerReader | null {
  if (scope.kind !== 'subject' || scope.filter.userId === undefined) return null;
  return { userId: scope.filter.userId, unattributedReads: scope.unattributedReads };
}

/** What the analysis reads about the schema and the classification. */
export interface OwnerSchema {
  rdm: RuntimeDataModel;
  /** Models the layer enforces. */
  enforced: ReadonlySet<string>;
  /** The classification of a model, or `null`. Injected so tests can classify a fixture. */
  classify: (model: string) => OwnerClassification | null;
}

/** Derive {@link OwnerSchema} from a generated client and the enforced set. */
export function readOwnerSchema(
  client: unknown,
  enforced: readonly string[],
  classify: (model: string) => OwnerClassification | null = ownerClassificationOf
): OwnerSchema {
  const rdm = readRuntimeDataModel(client);
  for (const model of enforced) assertEnforceable(model, classify(model), rdm);
  return { rdm, enforced: new Set(enforced), classify };
}

/**
 * Refuse, at construction, to enforce a model this layer cannot fully check.
 *
 * A `through` owner needs the parent's owner on every returned row, and an
 * `alsoVisible` arm needs the share's state; neither is read yet. t-802 adds
 * both before it enforces conversations and messages. Failing here rather
 * than at the first query is what keeps a half-supported model from being
 * switched on by a one-line classification change.
 */
function assertEnforceable(
  model: string,
  c: OwnerClassification | null,
  rdm: RuntimeDataModel
): void {
  if (!c || c.kind !== 'personal') {
    throw new Error(`Owner layer: ${model} is enforced but not classified personal`);
  }
  if (!('column' in c.owner)) {
    throw new Error(
      `Owner layer: ${model} is owned through a relation, which the result check cannot read yet (§115 t-802)`
    );
  }
  if (c.alsoVisible && c.alsoVisible.length > 0) {
    throw new Error(
      `Owner layer: ${model} declares alsoVisible arms, which the analysis cannot recognise yet (§115 t-802)`
    );
  }
  const column = c.owner.column;
  if (!rdm.models[model]?.fields.some((f) => f.kind === 'scalar' && f.name === column)) {
    throw new Error(`Owner layer: ${model}.${column} is not a scalar column of ${model}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function personal(
  schema: OwnerSchema,
  model: string
): Extract<OwnerClassification, { kind: 'personal' }> | null {
  const c = schema.classify(model);
  return c?.kind === 'personal' ? c : null;
}

/** May this reader read ownerless rows of `kind`? Absent kind: nobody narrowed may. */
function readsOwnerless(reader: OwnerReader, kind: UnattributedReadKind | undefined): boolean {
  return kind !== undefined && reader.unattributedReads[kind];
}

/** A scalar filter value that pins the column to exactly `id`. */
function pinsTo(value: unknown, id: string): boolean {
  if (value === id) return true;
  if (!isRecord(value)) return false;
  if (value.equals === id) return true;
  // `in: []` matches nothing, so it confines too.
  return Array.isArray(value.in) && value.in.every((v: unknown) => v === id);
}

/** A scalar filter value that pins the column to null. */
function pinsToNull(value: unknown): boolean {
  return value === null || (isRecord(value) && value.equals === null);
}

/** The inner `where` of a to-one relation filter: `{ is: W }` or the bare `W`. */
function toOneInner(value: Record<string, unknown>): unknown {
  return 'is' in value ? value.is : 'isNot' in value ? undefined : value;
}

/**
 * Does `where` on `model` confine the read to rows `reader` may read?
 *
 * Every key of a `where` object is a conjunct, so one confining key confines
 * the whole. `OR` confines when every arm does (an empty `OR` matches
 * nothing). `NOT` never confines. A compound unique key
 * (`userId_agentId_key: { … }`) is a conjunction of its fields.
 *
 * Exported for the parity test: the route layer's disposition and this
 * function must agree on what narrowed means.
 */
export function whereConfines(
  schema: OwnerSchema,
  model: string,
  where: unknown,
  reader: OwnerReader
): boolean {
  if (!isRecord(where)) return false;
  const c = personal(schema, model);
  if (!c) return false;
  const fields = schema.rdm.models[model]?.fields ?? [];

  for (const [key, value] of Object.entries(where)) {
    if (key === 'AND') {
      const conjuncts = Array.isArray(value) ? value : [value];
      if (conjuncts.some((w: unknown) => whereConfines(schema, model, w, reader))) return true;
      continue;
    }
    if (key === 'OR') {
      if (
        Array.isArray(value) &&
        value.every((w: unknown) => whereConfines(schema, model, w, reader))
      ) {
        return true;
      }
      continue;
    }
    if (key === 'NOT') continue;
    if (ownerLeafConfines(schema, c.owner, c.ownerless, key, value, reader)) return true;
    // A compound unique key: not a field, and its value names fields.
    if (!fields.some((f) => f.name === key) && isRecord(value)) {
      if (whereConfines(schema, model, value, reader)) return true;
    }
  }
  return false;
}

/** Does the `key: value` conjunct pin this model's owner to something the reader may read? */
function ownerLeafConfines(
  schema: OwnerSchema,
  owner: OwnerPath,
  ownerless: UnattributedReadKind | undefined,
  key: string,
  value: unknown,
  reader: OwnerReader
): boolean {
  if ('column' in owner) {
    if (key !== owner.column) return false;
    return pinsTo(value, reader.userId) || (pinsToNull(value) && readsOwnerless(reader, ownerless));
  }
  const { field, parent } = owner.through;
  if (key !== field) return false;
  // A child with no parent: its own ownerless arm.
  if (value === null || (isRecord(value) && value.is === null)) {
    return readsOwnerless(reader, ownerless);
  }
  if (!isRecord(value)) return false;
  // The parent's predicate, analysed as the parent's: the child inherits its
  // ownerless and alsoVisible arms (`owner-classification.ts`, OwnerPath).
  return whereConfines(schema, parent, toOneInner(value), reader);
}

/** May `reader` read a row of `model` whose owner column holds `owner`? */
export function rowReadable(
  schema: OwnerSchema,
  model: string,
  owner: unknown,
  reader: OwnerReader
): boolean {
  const c = personal(schema, model);
  if (!c) return true;
  if (owner === reader.userId) return true;
  return owner === null && readsOwnerless(reader, c.ownerless);
}

/**
 * Does this read's `include` / `select` mention an enforced relation at any
 * depth? Pure and cheap: decides whether the subject is worth looking up.
 */
export function selectionTouchesEnforced(
  schema: OwnerSchema,
  model: string,
  args: unknown
): boolean {
  if (!isRecord(args)) return false;
  return (
    selectionNodeTouches(schema, model, args.include) ||
    selectionNodeTouches(schema, model, args.select)
  );
}

function relationTarget(schema: OwnerSchema, model: string, field: string): string | undefined {
  return schema.rdm.models[model]?.fields.find((f) => f.kind === 'object' && f.name === field)
    ?.type;
}

function selectionNodeTouches(schema: OwnerSchema, model: string, node: unknown): boolean {
  if (!isRecord(node)) return false;
  for (const [key, value] of Object.entries(node)) {
    if (value === false || value === undefined) continue;
    if (key === '_count') {
      if (value === true) return countableEnforced(schema, model).length > 0;
      if (isRecord(value) && selectionNodeTouches(schema, model, value.select)) return true;
      continue;
    }
    const target = relationTarget(schema, model, key);
    if (target === undefined) continue;
    if (schema.enforced.has(target)) return true;
    if (selectionTouchesEnforced(schema, target, value)) return true;
  }
  return false;
}

/** The relation fields of `model` that lead straight to an enforced model. */
function countableEnforced(schema: OwnerSchema, model: string): string[] {
  return (schema.rdm.models[model]?.fields ?? [])
    .filter((f) => f.kind === 'object' && schema.enforced.has(f.type))
    .map((f) => f.name);
}

/**
 * The first enforced relation this read's `include` / `select` reaches without
 * a confining `where`, as a dotted path — or `null` when every one is confined.
 */
export function unconfinedRelation(
  schema: OwnerSchema,
  model: string,
  args: unknown,
  reader: OwnerReader,
  path = model
): string | null {
  if (!isRecord(args)) return null;
  return (
    unconfinedInSelection(schema, model, args.include, reader, path) ??
    unconfinedInSelection(schema, model, args.select, reader, path)
  );
}

function unconfinedInSelection(
  schema: OwnerSchema,
  model: string,
  node: unknown,
  reader: OwnerReader,
  path: string
): string | null {
  if (!isRecord(node)) return null;
  for (const [key, value] of Object.entries(node)) {
    if (value === false || value === undefined) continue;
    if (key === '_count') {
      if (value === true) {
        const counted = countableEnforced(schema, model);
        if (counted.length > 0) return `${path}._count.${counted[0]}`;
        continue;
      }
      if (!isRecord(value) || !isRecord(value.select)) continue;
      for (const [rel, sel] of Object.entries(value.select)) {
        const target = relationTarget(schema, model, rel);
        if (target === undefined || !schema.enforced.has(target) || sel === false) continue;
        if (!(isRecord(sel) && whereConfines(schema, target, sel.where, reader))) {
          return `${path}._count.${rel}`;
        }
      }
      continue;
    }
    const target = relationTarget(schema, model, key);
    if (target === undefined) continue;
    const here = `${path}.${key}`;
    // Every include of an enforced relation must carry a `where` that confines
    // it. A to-one relation cannot take one, so reading up to an enforced
    // parent is refused too; nothing does that to `AiUserMemory`, and t-802
    // decides it for messages reading their conversation.
    if (
      schema.enforced.has(target) &&
      !(isRecord(value) && whereConfines(schema, target, value.where, reader))
    ) {
      return here;
    }
    const deeper = unconfinedRelation(schema, target, value, reader, here);
    if (deeper !== null) return deeper;
  }
  return null;
}

/**
 * The typed boundary for Prisma's top-level `$allOperations` hook, which
 * types `args` and `query` as `any` — as in `tenancy-extension.ts`.
 */
interface OperationParams {
  model?: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<unknown>;
}

/** What the layer reads from the outside; `lib/db/client.ts` wires the real ones. */
export interface OwnerExtensionOptions {
  /** The schema and the enforced set — {@link readOwnerSchema} on the base client. */
  schema: OwnerSchema;
  /** Whose rows the current call stack may read (`getSubjectReadScope`). */
  getSubjectReadScope: () => Promise<SubjectReadScope>;
  /**
   * Told when an enforced read under a narrowed caller passed the check
   * (`noteConfinedRead`). The guard counts that as the route having used the
   * policy's answer (`reportOwnershipGap`): the data layer narrowed the read
   * for it.
   */
  onConfinedRead: () => void;
}

/**
 * Ensure a single-row read returns the owner column, so the row can be checked.
 * Returns the args to send and whether the column must be stripped afterwards.
 */
function withOwnerColumn(args: unknown, column: string): { args: unknown; strip: boolean } {
  if (!isRecord(args)) return { args, strip: false };
  if (isRecord(args.select)) {
    if (args.select[column] === true) return { args, strip: false };
    return { args: { ...args, select: { ...args.select, [column]: true } }, strip: true };
  }
  if (isRecord(args.omit) && args.omit[column] === true) {
    const { [column]: _dropped, ...omit } = args.omit;
    return { args: { ...args, omit }, strip: true };
  }
  return { args, strip: false };
}

/** Apply the owner chokepoint to an already tenancy-extended client. */
export function withOwnerChecks(
  client: TenancyClient,
  options: OwnerExtensionOptions
): TenancyClient {
  const { schema } = options;

  async function handleOperation(params: OperationParams): Promise<unknown> {
    const { model, operation, query } = params;
    if (model === undefined || schema.enforced.size === 0) return query(params.args);

    const isEnforcedRead =
      schema.enforced.has(model) &&
      (FILTER_CHECKED_OPS.has(operation) || RESULT_CHECKED_OPS.has(operation));
    if (!isEnforcedRead && !selectionTouchesEnforced(schema, model, params.args)) {
      return query(params.args);
    }

    const reader = readerFor(await options.getSubjectReadScope());
    if (reader === null) return query(params.args);

    const relation = unconfinedRelation(schema, model, params.args, reader);
    if (relation !== null) {
      throw new OwnerReadRefusedError(
        model,
        operation,
        'unconfined-relation',
        `${relation} reads an enforced model with no where that confines it.`
      );
    }
    if (!isEnforcedRead) return query(params.args);

    const where = isRecord(params.args) ? params.args.where : undefined;
    if (whereConfines(schema, model, where, reader)) {
      options.onConfinedRead();
      return query(params.args);
    }
    if (FILTER_CHECKED_OPS.has(operation)) {
      throw new OwnerReadRefusedError(
        model,
        operation,
        'unconfined-filter',
        'its where does not confine the read to rows this caller may read.'
      );
    }

    // A single-row read whose filter does not confine it: run it, then check
    // the row that came back.
    const c = personal(schema, model);
    const column = c && 'column' in c.owner ? c.owner.column : null;
    if (column === null) throw new Error(`Owner layer: ${model} has no owner column`);
    const sent = withOwnerColumn(params.args, column);
    const row = await query(sent.args);
    if (!isRecord(row)) return row;
    if (!rowReadable(schema, model, row[column], reader)) {
      throw new OwnerReadRefusedError(
        model,
        operation,
        'foreign-row',
        'the row it returned belongs to someone else.'
      );
    }
    options.onConfinedRead();
    if (!sent.strip) return row;
    const { [column]: _owner, ...rest } = row;
    return rest;
  }

  // Applied over the tenancy layer, so its `$transaction` override hands this
  // layer's hook the `tx` client too (tenancy-extension.ts, "Transactions").
  const extended: unknown = client.$extends({
    name: 'sunrise-owner',
    query: {
      $allOperations: (params) => handleOperation(params),
    },
  });
  return extended as TenancyClient;
}
