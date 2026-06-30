const assert = require('assert');
const { buildRules } = require('../utils/rules');

assert.deepStrictEqual(buildRules({ playerCount: 7, mordred: true, oberon: true }), {
  playerCount: 7,
  goodCount: 4,
  evilCount: 3,
  goodRoles: [
    { name: '梅林', desc: '开局看到所有坏人（除莫德雷德）' },
    { name: '派西维尔', desc: '开局看到梅林和莫甘娜' },
    { name: '忠臣', desc: '无特殊信息，靠逻辑推理' }
  ],
  evilRoles: [
    { name: '刺客', desc: '游戏结束时刺杀梅林' },
    { name: '莫甘娜', desc: '伪装成梅林，混淆派西维尔' },
    { name: '莫德雷德', desc: '梅林看不到他' }
  ]
});

assert.strictEqual(buildRules({ playerCount: 5, mordred: false, oberon: false }).goodRoles[0].desc, '开局看到所有坏人');

console.log('rules builder tests passed');
