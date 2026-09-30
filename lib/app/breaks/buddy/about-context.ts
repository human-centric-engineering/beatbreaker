import { getAbout } from '@/lib/app/breaks/community/about';
import { listStyles } from '@/lib/app/breaks/catalogue/data';
import { ABILITY_LABELS, PURPOSE_LABELS } from '@/lib/validations/drummer-about';

/**
 * What BeatBuddy is told about the drummer it is talking to (Phase 7B,
 * task 7B.9): their purposes, styles and ability, from About you.
 *
 * Private values are included, because they are the drummer's own and are
 * given to their own assistant; the public switches decide what strangers
 * see, not what BeatBuddy does. Channel links are left out: they say nothing
 * about how to pitch a pattern, and a URL is text a stranger could have
 * chosen.
 *
 * Registered as the `studio` context contributor in
 * `lib/app/context-contributors.ts`. The stream route names
 * {@link BUDDY_CONTEXT}; the loader reads the caller's own row by the user id
 * the chat handler passes, never by the context id, so one drummer's context
 * cannot be asked for by another.
 */

export const BUDDY_CONTEXT = { type: 'studio', id: 'about' } as const;

/** The `LOCKED CONTEXT` body for one drummer. */
export async function aboutContext(userId: string | undefined): Promise<string> {
  if (!userId) return 'No drummer is signed in.';
  const [about, styles] = await Promise.all([getAbout(userId), listStyles()]);
  const label = new Map(styles.map((s) => [s.key, s.params.label]));

  const lines: string[] = [];
  if (about.purposes.length) {
    lines.push(
      `Uses BeatBreaker for: ${about.purposes.map((p) => PURPOSE_LABELS[p].toLowerCase()).join('; ')}.`
    );
  }
  if (about.ability) lines.push(`Overall ability: ${ABILITY_LABELS[about.ability].toLowerCase()}.`);
  if (about.styles.length) {
    const named = about.styles.map((key) => {
      const level = about.styleAbility[key];
      const name = label.get(key) ?? key;
      return level ? `${name} (${ABILITY_LABELS[level].toLowerCase()})` : name;
    });
    lines.push(`Preferred styles: ${named.join(', ')}.`);
  }

  if (!lines.length) {
    return 'The drummer has not said what they play or how well. Ask if it matters to the request.';
  }
  return [
    'About the drummer, as they told BeatBreaker. Pitch suggestions to it — the level, tempo and styles — without reciting it back.',
    ...lines,
  ].join('\n');
}
