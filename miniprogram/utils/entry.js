const { CFG } = require('./config');

function truthy(value) {
  return value === true || value === '1' || value === 'true' || value === 'yes';
}

function parsePlayerCount(options) {
  const raw = options.players || options.playerCount || options.count;
  const n = parseInt(raw, 10);
  return CFG[n] ? n : 7;
}

function hasSetupOptions(options = {}) {
  return Boolean(options.players || options.playerCount || options.count || options.mordred || options.oberon);
}

function parseSetupOptions(options = {}) {
  const playerCount = parsePlayerCount(options);
  const min = CFG[playerCount].min;
  let mordred = min > 0 && truthy(options.mordred);
  let oberon = min > 0 && truthy(options.oberon);

  if (min === 1 && mordred && oberon) {
    oberon = false;
  }
  if (min === 0) {
    mordred = false;
    oberon = false;
  }

  return { playerCount, mordred, oberon };
}

function buildSetupPath({ playerCount, mordred, oberon }) {
  const params = [`players=${playerCount || 7}`];
  if (mordred) params.push('mordred=1');
  if (oberon) params.push('oberon=1');
  return `/pages/setup/setup?${params.join('&')}`;
}

module.exports = { parseSetupOptions, buildSetupPath, hasSetupOptions };
