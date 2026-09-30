'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Drum, Loader2, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormError } from '@/components/forms/form-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldHelp } from '@/components/ui/field-help';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { APIClientError, apiClient } from '@/lib/api/client';
import { CHANNEL_KINDS, CHANNEL_RULE, MAX_CHANNELS } from '@/lib/app/breaks/community/channels';
import {
  ABILITIES,
  ABILITY_LABELS,
  type AboutFormValues,
  aboutFormSchema,
  MAX_STYLES,
  PUBLIC_FIELDS,
  PURPOSES,
  PURPOSE_LABELS,
  type PublicField,
} from '@/lib/validations/drummer-about';

/** A style as the picker offers it. */
export interface StyleOption {
  key: string;
  label: string;
}

/** What the server answers — checked, not cast. */
export const aboutAnswerSchema = z.object({
  purposes: z.array(z.enum(PURPOSES)),
  styles: z.array(z.string()),
  ability: z.enum(ABILITIES).nullable(),
  styleAbility: z.record(z.string(), z.enum(ABILITIES)),
  channels: z.array(
    z.object({
      kind: z.enum(CHANNEL_KINDS),
      url: z.string(),
      drumming: z.boolean(),
      display: z.string(),
    })
  ),
  public: z.object({
    purposes: z.boolean(),
    styles: z.boolean(),
    ability: z.boolean(),
    channels: z.boolean(),
  }),
  askedAt: z.string().nullable(),
});

export type AboutAnswer = z.infer<typeof aboutAnswerSchema>;

const SWITCH_LABELS: Record<PublicField, string> = {
  purposes: 'What you use BeatBreaker for',
  styles: 'Your styles',
  ability: 'How well you play',
  channels: 'Your channel links',
};

function valuesOf(about: AboutAnswer): AboutFormValues {
  return {
    purposes: about.purposes,
    ability: about.ability ?? '',
    styles: about.styles,
    styleAbility: about.styleAbility,
    channels: about.channels.map(({ url, drumming }) => ({ url, drumming })),
    public: about.public,
  };
}

const selectClass =
  'border-input bg-background h-9 rounded-md border px-2 text-sm disabled:opacity-50';

/**
 * Settings → About you (Phase 7B, task 7B.7): what you use BeatBreaker for,
 * the styles you play and how well, your channel links, and which of these
 * your public page shows.
 *
 * Everything is optional. Channel links are checked here by the same parser
 * the server runs, and the server stores the canonical link it rebuilds, so
 * after a save the list shows what was kept rather than what was typed.
 */
export function AboutYouForm({ about, styles }: { about: AboutAnswer; styles: StyleOption[] }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AboutFormValues>({
    resolver: zodResolver(aboutFormSchema),
    mode: 'onTouched',
    defaultValues: valuesOf(about),
  });
  const channels = useFieldArray({ control, name: 'channels' });
  const chosen = watch('styles');
  const label = new Map(styles.map((s) => [s.key, s.label]));

  const onSubmit = async (values: AboutFormValues) => {
    setServerError(null);
    setDone(false);
    const styleAbility = Object.fromEntries(
      Object.entries(values.styleAbility).filter(
        ([style, level]) => level !== '' && values.styles.includes(style)
      )
    );
    try {
      const answer = aboutAnswerSchema.parse(
        await apiClient.put('/api/v1/drummer-about', {
          body: { ...values, ability: values.ability || null, styleAbility },
        })
      );
      reset(valuesOf(answer));
      setDone(true);
    } catch (error) {
      setServerError(
        error instanceof APIClientError ? error.message : 'That did not save. Try again.'
      );
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-6" noValidate>
      <fieldset className="space-y-2" disabled={isSubmitting}>
        <legend className="flex items-center gap-1 text-sm font-medium">
          What you use BeatBreaker for
          <FieldHelp title="What you use BeatBreaker for">
            Any that apply, or none. BeatBuddy uses it to pitch its suggestions. Private unless you
            switch it on below.
          </FieldHelp>
        </legend>
        <Controller
          control={control}
          name="purposes"
          render={({ field }) => (
            <div className="space-y-1">
              {PURPOSES.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={field.value.includes(p)}
                    onCheckedChange={(on) =>
                      field.onChange(on ? [...field.value, p] : field.value.filter((v) => v !== p))
                    }
                  />
                  {PURPOSE_LABELS[p]}
                </label>
              ))}
            </div>
          )}
        />
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="about-ability" className="flex items-center gap-1">
          How well you play
          <FieldHelp title="How well you play">
            Sets the layer and tempo a new pattern starts at — Just starting opens at the Skeleton
            layer at 70 BPM, Professional at the full break at 115. You can still change both in the
            Studio, and changing this again resets them. Private unless you switch it on below.
          </FieldHelp>
        </Label>
        <select id="about-ability" className={selectClass} {...register('ability')}>
          <option value="">Not saying</option>
          {ABILITIES.map((a) => (
            <option key={a} value={a}>
              {ABILITY_LABELS[a]}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-2" disabled={isSubmitting}>
        <legend className="flex items-center gap-1 text-sm font-medium">
          Styles you play
          <FieldHelp title="Styles you play">
            Up to {MAX_STYLES}. These styles and their famous breaks come first in the Studio, and
            you can say how well you play each. Private unless you switch it on below.
          </FieldHelp>
        </legend>
        <Controller
          control={control}
          name="styles"
          render={({ field }) => (
            <div className="grid gap-1 sm:grid-cols-3">
              {styles.map((s) => {
                const on = field.value.includes(s.key);
                return (
                  <label key={s.key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={on}
                      disabled={!on && field.value.length >= MAX_STYLES}
                      onCheckedChange={(next) =>
                        field.onChange(
                          next ? [...field.value, s.key] : field.value.filter((v) => v !== s.key)
                        )
                      }
                    />
                    {s.label}
                  </label>
                );
              })}
            </div>
          )}
        />
        <FormError message={errors.styles?.message} />
        {chosen.length ? (
          <div className="space-y-2 pt-2">
            <p className="text-muted-foreground text-sm">How well you play each (optional)</p>
            {chosen.map((key) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <label htmlFor={`about-style-${key}`} className="w-32 truncate">
                  {label.get(key) ?? key}
                </label>
                <select
                  id={`about-style-${key}`}
                  className={selectClass}
                  {...register(`styleAbility.${key}`)}
                >
                  <option value="">Same as overall</option>
                  {ABILITIES.map((a) => (
                    <option key={a} value={a}>
                      {ABILITY_LABELS[a]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ) : null}
      </fieldset>

      <fieldset className="space-y-2" disabled={isSubmitting}>
        <legend className="flex items-center gap-1 text-sm font-medium">
          Channel links
          <FieldHelp title="Channel links">
            Up to {MAX_CHANNELS} places people can watch or hear you: YouTube, Instagram, TikTok, X,
            Facebook, Twitch, SoundCloud, Bandcamp, and one website of your own. Tick{' '}
            <em>About drumming</em> for the ones that are, and they are listed first with a drum
            mark. Public unless you switch them off below.
          </FieldHelp>
        </legend>
        {channels.fields.map((f, i) => (
          <div key={f.id} className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label={`Channel link ${i + 1}`}
                placeholder="https://www.youtube.com/@you"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1"
                aria-invalid={!!errors.channels?.[i]?.url}
                {...register(`channels.${i}.url`)}
              />
              <Controller
                control={control}
                name={`channels.${i}.drumming`}
                render={({ field }) => (
                  <span className="flex items-center gap-1 text-sm">
                    <Checkbox
                      id={`about-channel-${i}-drumming`}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Drum className="size-4" aria-hidden="true" />
                    <label htmlFor={`about-channel-${i}-drumming`}>About drumming</label>
                  </span>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove channel link ${i + 1}`}
                onClick={() => channels.remove(i)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <FormError message={errors.channels?.[i]?.url?.message} />
          </div>
        ))}
        <FormError message={errors.channels?.root?.message ?? errors.channels?.message} />
        {channels.fields.length < MAX_CHANNELS ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => channels.append({ url: '', drumming: true })}
          >
            <Plus className="mr-1 size-4" /> Add a link
          </Button>
        ) : null}
        <p className="text-muted-foreground text-xs">{CHANNEL_RULE}</p>
      </fieldset>

      <fieldset className="space-y-2" disabled={isSubmitting}>
        <legend className="flex items-center gap-1 text-sm font-medium">
          On your public page
          <FieldHelp title="On your public page">
            What anyone can see at /u/your-username, once you have a username. Only what is switched
            on is ever sent to someone else. BeatBuddy sees all of it either way, because it is
            yours.
          </FieldHelp>
        </legend>
        {PUBLIC_FIELDS.map((field) => (
          <Controller
            key={field}
            control={control}
            name={`public.${field}`}
            render={({ field: f }) => (
              <label className="flex items-center justify-between gap-4 text-sm sm:max-w-sm">
                {SWITCH_LABELS[field]}
                <Switch checked={f.value} onCheckedChange={f.onChange} />
              </label>
            )}
          />
        ))}
      </fieldset>

      {serverError ? <FormError message={serverError} /> : null}
      {done ? (
        <p className="text-sm" role="status">
          Saved.
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save
      </Button>
    </form>
  );
}
