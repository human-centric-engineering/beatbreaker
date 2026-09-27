/**
 * The word check for what goes public (tasks 6.2 and 6.9): usernames, and a
 * published pattern's title and description.
 *
 * Deliberately short. It catches the obvious — slurs and the strongest
 * profanity — and leaves the rest to reporting and the moderation queue
 * (6.10, 6.11). A long list mostly refuses innocent words; this one is kept to
 * words with no innocent reading.
 */
const BLOCKED = [
  'fuck',
  'shit',
  'cunt',
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'whore',
  'slut',
  'bitch',
  'rapist',
  'nazi',
  'kike',
  'twat',
  'wanker',
] as const;

/**
 * Undo the usual disguises: case, separators, and digits standing in for
 * letters. `F_u_c_k`, `sh1t` and `4dm1n` all read as what they spell.
 */
export function normaliseForCheck(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s._\-*]+/g, '')
    .replace(/0/g, 'o')
    .replace(/[1l!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b');
}

/*
 * The same list with its own disguise undone, so `normaliseForCheck`'s
 * l → i does not make "slut" unmatchable.
 */
const BLOCKED_NORMALISED = BLOCKED.map(normaliseForCheck);

/**
 * Whether a username contains a blocked word anywhere. Substring, because a
 * username is one run of characters with no word boundaries to find.
 */
export function usernameIsBlocked(username: string): boolean {
  const flat = normaliseForCheck(username);
  return BLOCKED_NORMALISED.some((w) => flat.includes(w));
}

/**
 * Whether free text — a title, a description — contains a blocked word as a
 * word. Word by word rather than substring, so "Scunthorpe shuffle" is fine.
 * Plurals and -ing forms are caught by the stem check below.
 */
export function textIsBlocked(text: string): boolean {
  return text
    .split(/[^\p{L}\p{N}@$!|*]+/u)
    .filter(Boolean)
    .map(normaliseForCheck)
    .some((word) => BLOCKED_NORMALISED.some((w) => word === w || word.startsWith(w)));
}
