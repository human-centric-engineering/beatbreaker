'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

import type { PatternDetails } from '@/components/app/breaks/use-break-console';
import { useStudio } from '@/components/app/studio/studio-provider';
import { FieldHelp } from '@/components/ui/field-help';
import { LINK_RULE, MAX_LINKS, parseReferenceLink, type StoredLink } from '@/lib/app/breaks/links';

/**
 * Details (task 4.11): what the pattern on the stage is called, what it is,
 * and where it came from — at the top of the Share & export drawer.
 *
 * The links are checked here by the same {@link parseReferenceLink} the API
 * runs, so the form refuses exactly what the server would, before anything is
 * sent. What is stored is the canonical URL it rebuilds; once a save lands the
 * form shows that, not what was typed.
 *
 * The name is the pattern's own (it rides in the document and autosaves with
 * it), so it can be changed on anything. The description and links belong to a
 * saved row, so they can be changed only on a saved pattern of yours: a
 * scratch pattern has nowhere to put them yet, and someone else's pattern is
 * theirs — a copy of it keeps its links.
 */

const detailsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'A break needs a name')
    .max(120, 'Keep the name under 120 characters'),
  description: z.string().trim().max(500, 'Keep the description under 500 characters'),
  links: z
    .array(
      z.object({
        url: z
          .string()
          .trim()
          .min(1, 'Paste a link, or remove this one')
          .refine((url) => parseReferenceLink(url) !== null, LINK_RULE),
        label: z.string().optional(),
      })
    )
    .max(MAX_LINKS, `Up to ${MAX_LINKS} links`),
});

type DetailsValues = z.infer<typeof detailsSchema>;

/** The form's values for a name and a pattern's details. */
function formValues(title: string, details: PatternDetails): DetailsValues {
  return {
    title,
    description: details.description,
    links: details.links.map((l) => ({ url: l.url, ...(l.label ? { label: l.label } : {}) })),
  };
}

/** A link the form has already checked, as the row stores it. */
function toStored(link: DetailsValues['links'][number]): StoredLink | null {
  const parsed = parseReferenceLink(link.url);
  if (!parsed) return null;
  return {
    kind: parsed.kind,
    url: parsed.canonicalUrl,
    ...(link.label ? { label: link.label } : {}),
  };
}

export function DetailsForm() {
  const c = useStudio();
  const { doc, say, rename, saveAs } = c;
  const name = c.patterns.A?.name ?? '';
  const editable = !!doc.id && doc.mine;

  const {
    register,
    control,
    handleSubmit,
    reset,
    resetField,
    getFieldState,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    mode: 'onTouched',
    defaultValues: formValues(name, doc.details),
  });

  /* The form follows the stage, in two ways, and never over what is being
     typed without a reason:

     - **Different details** — another pattern opened (or let go), or the
       server's answer to a save — replace the whole form. `doc.details` only
       changes for those, and the answer carries the canonical links, so the
       form shows what was stored rather than what was typed.
     - **A new name** on its own — a regenerate, a rename that landed —
       reaches the Name field only if you have not edited it, and touches
       nothing else. A half-typed description survives it.

     Not React Hook Form's `values` prop: that resets every field on any
     change, which lost typed links whenever the name moved. */
  const nameNow = useRef(name);
  useLayoutEffect(() => {
    nameNow.current = name;
  });
  useEffect(() => {
    reset(formValues(nameNow.current, doc.details));
  }, [doc.id, doc.details, reset]);
  useEffect(() => {
    if (!getFieldState('title').isDirty) resetField('title', { defaultValue: name });
  }, [name, getFieldState, resetField]);
  const { fields, append, remove } = useFieldArray({ control, name: 'links' });
  const full = fields.length >= MAX_LINKS;

  const onSubmit = async (next: DetailsValues) => {
    if (!editable) {
      if (next.title !== name) rename(next.title);
      say('Renamed');
      return;
    }
    const links = next.links.map(toStored).filter((l): l is StoredLink => l !== null);
    /* The rename waits for the save. Renamed first, the stage's new name
       would reach the form while the save was still out — and a save that
       then failed would leave the name changed and the rest looking saved. */
    if (!(await doc.saveDetails({ description: next.description, links }))) return;
    // the saved details reset the form; the rename then brings its name level
    if (next.title !== name) rename(next.title);
    say('Details saved');
  };

  /* Save As. The copy is named from the field and carries the details as they
     are saved, not as edited here — its own details are edited once it is
     the one on the stage. */
  const onSaveCopy = async (next: DetailsValues) => {
    await saveAs(next.title);
  };

  const lockedWhy = !doc.id
    ? 'Save the pattern to give it a description and links.'
    : !doc.mine
      ? 'This pattern is someone else’s. Save a copy to change these — the copy keeps its links.'
      : null;

  return (
    <form className="card" onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
      <div className="card-hd">
        <h3>Details</h3>
      </div>
      <div className="card-bd">
        <div className="field">
          <label htmlFor="bb-details-title">
            Name{' '}
            <FieldHelp title="Name">
              What the pattern is called — on the stage, in Patterns, on Home. Changing it renames
              this pattern; Save a copy is for keeping both. Default: the name the generator gave
              it.
            </FieldHelp>
          </label>
          <input
            id="bb-details-title"
            type="text"
            maxLength={120}
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'bb-details-title-err' : undefined}
            {...register('title')}
          />
          {errors.title ? (
            <div id="bb-details-title-err" className="hint err" role="alert">
              {errors.title.message}
            </div>
          ) : null}
        </div>

        <fieldset disabled={!editable} className="details-row">
          <div className="field">
            <label htmlFor="bb-details-description">
              Description{' '}
              <FieldHelp title="Description">
                A line or two about the pattern — what you are working on in it, the tempo you are
                building towards. Up to 500 characters. Default: none.
              </FieldHelp>
            </label>
            <textarea
              id="bb-details-description"
              rows={3}
              maxLength={500}
              aria-invalid={!!errors.description}
              {...register('description')}
            />
            {errors.description ? (
              <div className="hint err" role="alert">
                {errors.description.message}
              </div>
            ) : null}
          </div>

          <div className="field">
            <span className="fieldlab">
              Links{' '}
              <FieldHelp title="Reference links">
                Up to {MAX_LINKS} links to where the pattern came from or what teaches it: a YouTube
                or Vimeo video, or a Spotify track, album or playlist. A YouTube start time
                (&hellip;&amp;t=5m21s) is kept, so the link opens on the break. They show as chips
                beside the title and open in a new tab. Default: none.
              </FieldHelp>
            </span>
            {fields.map((field, i) => {
              const err = errors.links?.[i]?.url;
              return (
                <div key={field.id} className="details-link">
                  <div className="btnrow">
                    <input
                      type="url"
                      inputMode="url"
                      placeholder="https://www.youtube.com/watch?v=…"
                      aria-label={`Link ${i + 1}`}
                      aria-invalid={!!err}
                      {...register(`links.${i}.url`)}
                    />
                    <button
                      type="button"
                      className="mini"
                      aria-label={`Remove link ${i + 1}`}
                      onClick={() => remove(i)}
                    >
                      ✕
                    </button>
                  </div>
                  {err ? (
                    <div className="hint err" role="alert">
                      {err.message}
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div className="btnrow">
              <button
                type="button"
                className="mini"
                disabled={full}
                onClick={() => append({ url: '' })}
              >
                Add a link
              </button>
            </div>
            {full ? (
              <div className="hint">Up to {MAX_LINKS} links — remove one to add another.</div>
            ) : null}
            {errors.links?.root?.message || errors.links?.message ? (
              <div className="hint err" role="alert">
                {errors.links?.root?.message ?? errors.links?.message}
              </div>
            ) : null}
          </div>
        </fieldset>
        {lockedWhy ? <div className="hint">{lockedWhy}</div> : null}

        <div className="btnrow">
          <button type="submit" className="mini" disabled={!isDirty || isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save details'}
          </button>
          {editable ? (
            <button
              type="button"
              className="mini"
              disabled={isSubmitting}
              onClick={() => void handleSubmit(onSaveCopy)()}
            >
              Save a copy
            </button>
          ) : null}
        </div>
        {editable ? (
          <div className="hint">
            <b>Save a copy</b> makes a new pattern of yours under the name above, with this
            one&rsquo;s saved description and links. This one stays as it is.
          </div>
        ) : null}
      </div>
    </form>
  );
}
