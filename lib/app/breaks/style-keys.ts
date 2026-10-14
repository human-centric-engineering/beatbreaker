/**
 * The style keys that are not styles. A leaf module, so what only needs the
 * key (the layer names, say) does not pull in the library's parsing code.
 */

/**
 * The style key every rudiment carries (D45). It is not a style row:
 * there is nothing to generate, regenerate or doctor a rudiment from, and the
 * Studio offers none of them for it.
 */
export const RUDIMENT_STYLE = 'rudiment';

/**
 * The style key every polyrhythm carries (Phase 12). Not a style row, for the
 * reason a rudiment's is not: a polyrhythm entry is written out, and New,
 * Regenerate and the doctor leave it alone.
 */
export const POLYRHYTHM_STYLE = 'polyrhythm';
