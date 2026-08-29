/**
 * copy.ts
 *
 * Centralized user-facing text that needs to stay identical everywhere
 * it appears (so it can't drift between the ore-detail panel, the
 * Nearby Ores list, etc.) or that carries a deliberate wording decision
 * worth documenting once instead of at every call site.
 */

/**
 * Shown alongside any ore/dig-path info. Deliberately NOT based on any
 * seed prediction — see the cave-warning discussion earlier in this
 * build: the ore engine's cave data (legacy carvers only) misses most
 * real caves in 26.2's noise-based terrain, so a prediction here would
 * risk false "it's clear" confidence. This note is true regardless of
 * seed, version, or path, which is what makes it safe to always show.
 */
export const DIG_SAFETY_NOTE =
  'Place a block before stepping down, or dig sideways at the last block — mining straight toward ore risks fall damage or lava regardless of what\'s shown here.';
