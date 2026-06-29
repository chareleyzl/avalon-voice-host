const assert = require('assert');
const { parseSetupOptions, buildSetupPath, hasSetupOptions } = require('../utils/entry');

assert.strictEqual(hasSetupOptions({}), false);
assert.strictEqual(hasSetupOptions({ players: '7' }), true);

assert.deepStrictEqual(parseSetupOptions({ players: '7' }), {
  playerCount: 7,
  mordred: false,
  oberon: false
});

assert.deepStrictEqual(parseSetupOptions({ playerCount: '10', mordred: '1', oberon: 'true' }), {
  playerCount: 10,
  mordred: true,
  oberon: true
});

assert.deepStrictEqual(parseSetupOptions({ players: '6', mordred: '1', oberon: '1' }), {
  playerCount: 6,
  mordred: false,
  oberon: false
});

assert.deepStrictEqual(parseSetupOptions({ players: '7', mordred: '1', oberon: '1' }), {
  playerCount: 7,
  mordred: true,
  oberon: false
});

assert.strictEqual(
  buildSetupPath({ playerCount: 10, mordred: true, oberon: true }),
  '/pages/setup/setup?players=10&mordred=1&oberon=1'
);

console.log('entry tests passed');
