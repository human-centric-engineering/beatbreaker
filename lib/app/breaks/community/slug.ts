/**
 * Minting a pattern's public address, `/p/<slug>` (task 6.1).
 *
 * Minted on the server, from Web Crypto's `getRandomValues`. What a slug
 * looks like on the way in is `slugSchema` in `visibility.ts`.
 */

/*
 * Crockford's base32, lower-case: no i, l, o or u, so a slug read aloud or
 * copied by hand survives. Ten characters is 50 bits — not enumerable.
 */
const SLUG_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
export const SLUG_LENGTH = 10;

/** A fresh public address. Callers retry on the (vanishing) unique clash. */
export function mintSlug(): string {
  // 32 symbols: the low five bits of each byte are uniform, so there is no bias
  const bytes = crypto.getRandomValues(new Uint8Array(SLUG_LENGTH));
  return Array.from(bytes, (b) => SLUG_ALPHABET[b & 31]).join('');
}
