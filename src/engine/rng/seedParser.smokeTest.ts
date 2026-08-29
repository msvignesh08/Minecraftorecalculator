import { javaStringHashCode, parseWorldSeed } from './seedParser';

console.log('hello ->', javaStringHashCode('hello'), '(expect 99162322)');
console.log('match:', javaStringHashCode('hello') === 99162322);

console.log(parseWorldSeed('12345'));
console.log(parseWorldSeed('-987654321'));
try { parseWorldSeed(''); } catch (e) { console.log('empty rejected:', (e as Error).message); }
