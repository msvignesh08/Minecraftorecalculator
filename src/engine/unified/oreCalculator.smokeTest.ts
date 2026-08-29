import { findOres } from './oreCalculator';
import { OreType } from '../wasm/cubiomesEngine';
import { parseWorldSeed } from '../rng/seedParser';

async function main() {
  const { seed } = parseWorldSeed('3257840388504953787'); // the "pack.png" seed used earlier

  const result = await findOres({
    worldSeed: seed,
    mcVersionLabel: '26.2',
    dimension: 0,
    oreType: OreType.DiamondOre,
    centerX: 0,
    centerZ: 0,
    radius: 64,
  });

  console.log('source:', result.source);
  console.log('warning:', result.warning);
  console.log('ore count:', result.ores.length);
  console.log('first 3:', result.ores.slice(0, 3));

  if (result.source !== 'fallback-unconfirmed') throw new Error('expected fallback since WASM is a placeholder');
  if (!result.warning) throw new Error('expected a warning to be surfaced to the UI');
  if (result.ores.length === 0) throw new Error('expected at least some candidate ore blocks');
  console.log('\nPASS — full pipeline (seed parse -> unified calculator -> fallback engine) works end to end');
}

main().catch((e) => {
  console.error('FAIL:', e);
  process.exit(1);
});
