/**
 * javaRandom.ts
 *
 * A faithful reimplementation of java.util.Random — the linear congruential
 * generator (LCG) that Minecraft: Java Edition uses for essentially all of
 * its world generation (population/feature seeds, ore vein placement,
 * height sampling, etc).
 *
 * Every constant below (multiplier, increment, mask) is from the public
 * Java Random specification and is stable across all JDK/Minecraft
 * versions — this part carries no version risk.
 *
 * JS numbers can't represent 64-bit integers exactly, so this uses BigInt
 * throughout. It's slower than a native 53-bit-safe implementation but
 * correctness matters far more than speed for this module; the ore
 * calculator can batch/parallelize via the Web Worker instead.
 */

const MULTIPLIER = 0x5deece66dn;
const INCREMENT = 0xbn;
const MASK = (1n << 48n) - 1n;

// Wrap a signed JS/BigInt value into Java's signed 64-bit long semantics.
const LONG_MASK = (1n << 64n) - 1n;
const LONG_SIGN_BIT = 1n << 63n;
function toSignedLong(value: bigint): bigint {
  const wrapped = ((value % (1n << 64n)) + (1n << 64n)) % (1n << 64n);
  return wrapped >= LONG_SIGN_BIT ? wrapped - (1n << 64n) : wrapped;
}

// Wrap into Java's signed 32-bit int semantics.
function toSignedInt(value: bigint): number {
  const wrapped = ((value % (1n << 32n)) + (1n << 32n)) % (1n << 32n);
  const signed = wrapped >= 1n << 31n ? wrapped - (1n << 32n) : wrapped;
  return Number(signed);
}

export class JavaRandom {
  private seed: bigint = 0n;

  constructor(seed?: bigint) {
    if (seed !== undefined) this.setSeed(seed);
  }

  /** Equivalent to java.util.Random#setSeed(long) */
  setSeed(seed: bigint): void {
    this.seed = (toSignedLong(seed) ^ MULTIPLIER) & MASK;
  }

  /** Equivalent to the protected java.util.Random#next(int bits) */
  private next(bits: number): number {
    this.seed = (this.seed * MULTIPLIER + INCREMENT) & MASK;
    // unsigned right shift by (48 - bits)
    const shifted = this.seed >> BigInt(48 - bits);
    return toSignedInt(shifted);
  }

  /** Equivalent to java.util.Random#nextInt() */
  nextInt(): number {
    return this.next(32);
  }

  /**
   * Equivalent to java.util.Random#nextInt(int bound).
   * Faithfully reproduces the rejection-sampling loop Java uses for
   * non-power-of-two bounds, including its (intentional) bias fix.
   */
  nextIntBound(bound: number): number {
    if (bound <= 0) throw new Error('bound must be positive');

    if ((bound & -bound) === bound) {
      // power of two
      return Number((BigInt(bound) * BigInt(this.next(31))) >> 31n);
    }

    let bits: number;
    let val: number;
    do {
      bits = this.next(31);
      val = bits % bound;
    } while (bits - val + (bound - 1) < 0);
    return val;
  }

  /** Equivalent to java.util.Random#nextLong() */
  nextLong(): bigint {
    const hi = BigInt(this.next(32));
    const lo = BigInt(this.next(32));
    return toSignedLong((hi << 32n) + lo);
  }

  /** Equivalent to java.util.Random#nextFloat() */
  nextFloat(): number {
    return this.next(24) / (1 << 24);
  }

  /** Equivalent to java.util.Random#nextDouble() */
  nextDouble(): number {
    const hi = BigInt(this.next(26));
    const lo = BigInt(this.next(27));
    return Number((hi << 27n) + lo) / Number(1n << 53n);
  }
}
