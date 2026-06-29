const { evils, goods } = require('./config');

const ROLE_DESC = {
  '梅林': { side: 'good', desc: '开局看到所有坏人（除莫德雷德）' },
  '派西维尔': { side: 'good', desc: '开局看到梅林和莫甘娜' },
  '忠臣': { side: 'good', desc: '无特殊信息，靠逻辑推理' },
  '莫甘娜': { side: 'evil', desc: '伪装成梅林，混淆派西维尔' },
  '刺客': { side: 'evil', desc: '游戏结束时刺杀梅林' },
  '莫德雷德': { side: 'evil', desc: '梅林看不到他' },
  '爪牙': { side: 'evil', desc: '无特殊能力，协助破坏任务' },
  '奥伯伦': { side: 'evil', desc: '不被其他坏人知道' }
};

function uniqRoles(roles, getDesc) {
  const seen = {};
  const result = [];
  for (const role of roles) {
    if (seen[role]) continue;
    seen[role] = true;
    result.push({ name: role, desc: getDesc(role) });
  }
  return result;
}

function buildRules({ playerCount, mordred, oberon }) {
  const evilRoles = evils(playerCount, mordred, oberon);
  const goodRoles = goods(playerCount);
  const merlinDesc = mordred ? '开局看到所有坏人（除莫德雷德）' : '开局看到所有坏人';

  return {
    playerCount,
    goodCount: goodRoles.length,
    evilCount: evilRoles.length,
    goodRoles: uniqRoles(goodRoles, (role) => role === '梅林' ? merlinDesc : (ROLE_DESC[role] || {}).desc || ''),
    evilRoles: uniqRoles(evilRoles, (role) => (ROLE_DESC[role] || {}).desc || '')
  };
}

module.exports = { buildRules };
