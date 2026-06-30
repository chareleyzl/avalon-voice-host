const CFG = {
  5: { min: 0 },
  6: { min: 0 },
  7: { min: 1 },
  8: { min: 1 },
  9: { min: 1 },
  10: { min: 2 }
};

function normalizeOptions({ players = 7, mordred = false, oberon = false } = {}) {
  const playerCount = CFG[players] ? players : 7;
  const min = CFG[playerCount].min;
  let hasMordred = Boolean(mordred);
  let hasOberon = Boolean(oberon);

  if (min === 0) {
    hasMordred = false;
    hasOberon = false;
  } else if (min === 1 && hasMordred && hasOberon) {
    hasOberon = false;
  }

  return { players: playerCount, mordred: hasMordred, oberon: hasOberon };
}

function buildRulesPath(playerCount, mordred, oberon) {
  const params = [`players=${playerCount}`];
  if (mordred) params.push('mordred=1');
  if (oberon) params.push('oberon=1');
  return `/pages/rules/rules?${params.join('&')}`;
}

module.exports = async function showRules(options = {}) {
  const normalized = normalizeOptions(options);
  const path = buildRulesPath(normalized.players, normalized.mordred, normalized.oberon);

  return {
    isError: false,
    content: [{
      type: 'text',
      text: `为您展示阿瓦隆${normalized.players}人局规则，包含角色能力、任务流程和胜利条件。`
    }],
    structuredContent: { path, ...normalized },
    navigateTo: path
  };
};
