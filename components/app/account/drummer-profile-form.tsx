'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormError } from '@/components/forms/form-error';
import { Button } from '@/components/ui/button';
import { FieldHelp } from '@/components/ui/field-help';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { APIClientError, apiClient } from '@/lib/api/client';
import type { DrummerProfileView } from '@/lib/app/breaks/community/profile';
import {
  USERNAME_CHANGE_DAYS,
  USERNAME_HOLD_DAYS,
  USERNAME_RULE,
  usernameSchema,
} from '@/lib/app/breaks/community/username';
import { BIO_MAX } from '@/lib/validations/drummer-profile';

/** The form's own schema: the username rules the server runs, and the bio's length. */
const formSchema = z.object({
  username: usernameSchema,
  bio: z.string().trim().max(BIO_MAX, `Up to ${BIO_MAX} characters`),
});

type FormValues = z.infer<typeof formSchema>;

/** What the server answers — checked, not cast. */
const answerSchema = z.object({
  username: z.string(),
  bio: z.string(),
  nextChangeAt: z.string().nullable(),
});

/**
 * Choose or change your username, and say something about yourself.
 *
 * The username rules are checked here by the same `usernameSchema` the API
 * runs, so the form refuses exactly what the server would; whether a name is
 * taken, held, or changed too recently is the server's answer, shown under
 * the field.
 */
export function DrummerProfileForm({ profile }: { profile: DrummerProfileView | null }) {
  const [saved, setSaved] = useState<DrummerProfileView | null>(profile);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: { username: profile?.username ?? '', bio: profile?.bio ?? '' },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setDone(false);
    try {
      const answer = answerSchema.parse(
        await apiClient.put('/api/v1/drummer-profile', { body: values })
      );
      setSaved(answer);
      reset({ username: answer.username, bio: answer.bio });
      setDone(true);
    } catch (error) {
      setServerError(
        error instanceof APIClientError ? error.message : 'That did not save. Try again.'
      );
    }
  };

  const nextChange = saved?.nextChangeAt ? saved.nextChangeAt.slice(0, 10) : null;

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="drummer-username" className="flex items-center gap-1">
          Username
          <FieldHelp title="Username">
            Shown on patterns you publish and on your public page, /u/your-username. Your account
            name and email are never public. You can change it once every {USERNAME_CHANGE_DAYS}{' '}
            days, and your old one is held for {USERNAME_HOLD_DAYS} days so nobody else can take it.
          </FieldHelp>
        </Label>
        <Input
          id="drummer-username"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!errors.username}
          aria-describedby="drummer-username-rule"
          {...register('username')}
        />
        <p id="drummer-username-rule" className="text-muted-foreground text-sm">
          {USERNAME_RULE}.{nextChange ? ` You can change it again from ${nextChange}.` : null}
        </p>
        <FormError message={errors.username?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="drummer-bio" className="flex items-center gap-1">
          Bio
          <FieldHelp title="Bio">
            Optional. Shown on your public page, under your username — what you play, what you are
            working on. Up to {BIO_MAX} characters.
          </FieldHelp>
        </Label>
        <Textarea id="drummer-bio" rows={3} {...register('bio')} />
        <FormError message={errors.bio?.message} />
      </div>

      {serverError ? <FormError message={serverError} /> : null}
      {done ? (
        <p className="text-sm" role="status">
          Saved.
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {saved ? 'Save profile' : 'Choose username'}
      </Button>
    </form>
  );
}
