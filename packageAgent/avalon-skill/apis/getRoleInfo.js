const ROLE_DB = {
  '梅林': {
    side: 'good',
    sideLabel: '蓝方',
    desc: '开局看到所有坏人（除莫德雷德）。游戏全程隐藏身份——如果蓝方完成3次任务后被刺客指认出来，红方直接获胜。'
  },
  '派西维尔': {
    side: 'good',
    sideLabel: '蓝方',
    desc: '开局看到梅林和莫甘娜（但不知道谁是谁）。需要通过观察和推理分辨真正的梅林，保护梅林不被刺客发现。'
  },
  '忠臣': {
    side: 'good',
    sideLabel: '蓝方',
    desc: '无特殊信息，依靠逻辑推理判断队友和敌人。投票阶段要找出可疑的红方玩家，任务阶段只能投成功。'
  },
  '刺客': {
    side: 'evil',
    sideLabel: '红方',
    desc: '游戏结束时（蓝方完成3次任务后）拥有刺杀梅林的机会。指认正确则红方逆转获胜。通常伪装成忠臣，观察谁在保护谁。'
  },
  '莫甘娜': {
    side: 'evil',
    sideLabel: '红方',
    desc: '伪装成梅林——开局也会对派西维尔"竖起大拇指"，混淆派西维尔的判断。与刺客配合误导蓝方。'
  },
  '莫德雷德': {
    side: 'evil',
    sideLabel: '红方',
    desc: '梅林看不到他。在梅林识人环节中不被暴露，是红方的隐藏王牌，可以放心大胆地伪装蓝方。仅在7人及以上局可选。'
  },
  '奥伯伦': {
    side: 'evil',
    sideLabel: '红方',
    desc: '不被其他坏人知道——坏人睁眼确认同伴时他看不到其他人、其他人也看不到他。既是红方又是孤狼，可能导致意外互投。仅在7人及以上局可选。'
  },
  '爪牙': {
    side: 'evil',
    sideLabel: '红方',
    desc: '红方普通成员，无特殊能力。与其他坏人一起睁眼确认同伴，协助破坏任务、迷惑蓝方投票。'
  }
};

function findRole(name) {
  if (!name) return null;

  // 精确匹配
  if (ROLE_DB[name]) return ROLE_DB[name];

  // 模糊匹配（用户可能说简称或别称）
  const alias = {
    'merlin': '梅林',
  '派': '派西维尔', '派西': '派西维尔', 'percy': '派西维尔',
  '杀手': '刺客', 'assassin': '刺客',
  '摩根': '莫甘娜', '莫甘': '莫甘娜', 'morgana': '莫甘娜',
  'mordred': '莫德雷德', '莫德': '莫德雷德',
  'oberon': '奥伯伦', '奥伯': '奥伯伦',
  'minion': '爪牙', '小弟': '爪牙', '小兵': '爪牙',
  '平民': '忠臣', '好人': '忠臣'
  };

  const key = (name || '').toLowerCase().trim();
  const resolved = alias[key];
  if (resolved && ROLE_DB[resolved]) {
    return { ...ROLE_DB[resolved], resolvedName: resolved };
  }

  return null;
}

module.exports = async function getRoleInfo({ roleName }) {
  if (!roleName) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: '请提供要查询的角色名称，例如：梅林、派西维尔、刺客、莫甘娜、莫德雷德、奥伯伦、爪牙、忠臣。'
      }]
    };
  }

  const info = findRole(roleName);

  if (!info) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `未找到角色"${roleName}"。阿瓦隆角色包括：梅林、派西维尔、忠臣（蓝方）；刺客、莫甘娜、莫德雷德、奥伯伦、爪牙（红方）。请确认角色名称。`
      }]
    };
  }

  const displayName = info.resolvedName || roleName;

  return {
    isError: false,
    content: [{
      type: 'text',
      text: `${displayName}（${info.sideLabel}）：${info.desc}`
    }],
    structuredContent: {
      roleName: displayName,
      side: info.side,
      sideLabel: info.sideLabel,
      desc: info.desc
    }
  };
};
