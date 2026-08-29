import { JavaRandom } from './rng/javaRandom';
import { populationSeed } from './rng/chunkSeed';
import { calculateDiamondOres, chunkRangeForRadius } from './oregen/oreCalculator';

// --- Step 1: validate the LCG against known java.util.Random(0) output ---
// These are widely-published reference values for new Random(0).nextInt()
// called 5 times in a row.
const expected = [-1155484576, -723955400, 1033096058, -1690734402, -1557280266];
const r = new JavaRandom(0n);
const actual = Array.from({ length: 5 }, () => r.nextInt());

console.log('JavaRandom(0).nextInt() x5');
console.log('  expected:', expected);
console.log('  actual:  ', actual);
console.log('  MATCH:', JSON.stringify(expected) === JSON.stringify(actual));

// --- Step 2: sanity check nextIntBound / nextDouble don't throw and are in range ---
const r2 = new JavaRandom(42n);
const boundedSamples = Array.from({ length: 10 }, () => r2.nextIntBound(10));
console.log('\nnextIntBound(10) x10 (seed 42):', boundedSamples);
console.log('  all in [0,10):', boundedSamples.every((v) => v >= 0 && v < 10));

// --- Step 3: population seed doesn't throw, produces plausible bigint ---
const worldSeed = 3257840388504953787n; // the famous "pack.png" seed
const pop = populationSeed(worldSeed, 0, 0);
console.log('\npopulationSeed(seed=pack.png, chunk 0,0):', pop.toString());

// --- Step 4: run the diamond calculator over a small radius near spawn ---
const range = chunkRangeForRadius(0, 0, 32); // ~2x2 chunks
const blocks = calculateDiamondOres(worldSeed, range);
console.log(`\nCandidate diamond blocks in a ${32 * 2}x${32 * 2} area near spawn:`, blocks.length);
console.log('First 5:', blocks.slice(0, 5));
