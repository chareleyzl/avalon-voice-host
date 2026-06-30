const CFG = {
  5:  { min: 0 },
  6:  { min: 0 },
  7:  { min: 1 },
  8:  { min: 1 },
  9:  { min: 1 },
  10: { min: 2 }
};

function buildSetupPath(playerCount, mordred, oberon) {
  const params = [`players=${playerCount}`];
  if (mordred) params.push('mordred=1');
  if (oberon) params.push('oberon=1');
  return `/pages/setup/setup?${params.join('&')}`;
}

module.exports = async function startGame({ players = 7, mordred = false, oberon = false } = {}) {
  // 1. 校验玩家人数
  if (!CFG[players]) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `不支持的玩家人数：${players}。阿瓦隆支持 5-10 人局，请重新选择人数。`
      }]
    };
  }

  // 2. 应用角色互斥规则
  const min = CFG[players].min;
  if (min === 0) {
    // 5-6 人局无变体角色
    mordred = false;
    oberon = false;
  } else if (min === 1 && mordred && oberon) {
    // 7-9 人局二选一，莫德雷德优先
    oberon = false;
  }

  // 3. 构建路径并跳转
  const path = buildSetupPath(players, mordred, oberon);

  const roleNote = [];
  if (mordred) roleNote.push('含莫德雷德');
  if (oberon) roleNote.push('含奥伯伦');
  const desc = `${players}人局${roleNote.length ? '（' + roleNote.join('、') + '）' : ''}`;

  return {
    isError: false,
    content: [{
      type: 'text',
      text: `已为您配置${desc}阿瓦隆，请确认角色设置后点击"开始主持"。`
    }],
    structuredContent: { path, players, mordred, oberon },
    navigateTo: path
  };
};
