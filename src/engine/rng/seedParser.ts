/**
 * seedParser.ts
 *
 * Minecraft accepts either a numeric seed or arbitrary text (e.g.
 * "cheese"). A text seed is converted via Java's String.hashCode() —
 * a specific, well-documented 32-bit algorithm (h = 31*h + charCode,
 * wrapped to a signed 32-bit int) — then widened to a 64-bit long.
 * Implemented for real here rather than left as a claim, since it's
 * exactly the kind of thing that's easy to get subtly wrong (sign
 * handling on the wrap is the usual mistake).
 */

/** Java's String#hashCode(), reproduced exactly including 32-bit signed overflow. */
export function javaStringHashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    // |0 forces 32-bit signed integer wraparound, same as Java's int overflow.
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export interface SeedParseResult {
  seed: bigint;
  wasTextSeed: boolean;
}

/**
 * Mirrors how Minecraft's world-creation screen interprets the seed
 * field: try it as a base-10 long first; if that fails, hash it as text.
 */
export function parseWorldSeed(input: string): SeedParseResult {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    // Empty seed = Minecraft generates a random one. This app can't
    // meaningfully do that (there's nothing to calculate against), so
    // treat it as an error the caller should surface rather than
    // silently picking an arbitrary number.
    throw new Error('Enter a seed — leave-blank-for-random only makes sense inside the actual game.');
  }

  if (/^-?\d+$/.test(trimmed)) {
    // Valid Minecraft behavior: a numeric seed outside the signed
    // 64-bit range wraps, it isn't rejected. Reproduce that wrap
    // instead of throwing, so out-of-range numeric input still
    // matches what the real game would do with it.
    const asBigInt = BigInt(trimmed);
    const wrapped = BigInt.asIntN(64, asBigInt);
    return { seed: wrapped, wasTextSeed: false };
  }

  const hash = javaStringHashCode(trimmed);
  return { seed: BigInt(hash), wasTextSeed: true };
}
