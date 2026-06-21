const { CFG, evils, goods, gen, audioPath, previewGroups } = require('../../utils/config');
const audio = require('../../utils/audio-manager');

const ROLE_DESC = {
  '梅林':     { side: 'good', desc: '开局看到所有坏人（除莫德雷德）' },
  '派西维尔': { side: 'good', desc: '开局看到梅林和莫甘娜' },
  '忠臣':     { side: 'good', desc: '无特殊信息，靠逻辑推理' },
  '莫甘娜':   { side: 'evil', desc: '伪装成梅林，混淆派西维尔' },
  '刺客':     { side: 'evil', desc: '游戏结束时刺杀梅林' },
  '莫德雷德': { side: 'evil', desc: '梅林看不到他' },
  '爪牙':     { side: 'evil', desc: '无特殊能力，协助破坏任务' },
  '奥伯伦':   { side: 'evil', desc: '不被其他坏人知道' }
};

Page({
  data: {
    counts: [5, 6, 7, 8, 9, 10],
    playerCount: 7,
    mordred: false,
    oberon: false,
    showOptions: true,
    pauseDuration: 5,
    goods: [],
    evils: [],
    script: [],
    showRules: false,
    rules: { playerCount: 0, goodCount: 0, evilCount: 0, goodRoles: [], evilRoles: [] }
  },

  onLoad() {
    const g = getApp().globalData;
    const saved = wx.getStorageSync('pauseDuration');
    if (saved) g.pauseDuration = parseInt(saved);
    if (g.pauseDuration < 1 || g.pauseDuration > 60) g.pauseDuration = 5;

    this.setData({
      playerCount: g.playerCount || 7,
      mordred: g.mordred || false,
      oberon: g.oberon || false,
      pauseDuration: g.pauseDuration
    });
    this.render();
  },

  render() {
    const { playerCount, mordred, oberon, pauseDuration } = this.data;
    const ev = evils(playerCount, mordred, oberon);
    const gd = goods(playerCount);
    this.setData({
      goods: gd,
      evils: ev,
      showOptions: CFG[playerCount].min > 0,
      script: previewGroups(gen(playerCount, mordred, oberon))
    });
  },

  onCount(e) {
    const n = parseInt(e.currentTarget.dataset.n);
    const min = CFG[n].min;
    let mordred = false, oberon = false;
    if (min === 0) { /* keep false */ }
    else if (min === 1) {
      if (this.data.mordred && !this.data.oberon) mordred = true;
      else if (!this.data.mordred && this.data.oberon) oberon = true;
    } else {
      mordred = this.data.mordred;
      oberon = this.data.oberon;
    }
    this.setData({ playerCount: n, mordred, oberon });
    this.render();
  },

  onMordred(e) {
    const mordred = e.detail.value;
    let oberon = this.data.oberon;
    if (mordred && oberon && CFG[this.data.playerCount].min === 1) oberon = false;
    this.setData({ mordred, oberon });
    this.render();
  },

  onOberon(e) {
    const oberon = e.detail.value;
    let mordred = this.data.mordred;
    if (mordred && oberon && CFG[this.data.playerCount].min === 1) mordred = false;
    this.setData({ oberon, mordred });
    this.render();
  },

  onPause(e) {
    const v = parseInt(e.detail.value);
    if (v >= 1 && v <= 60) {
      this.setData({ pauseDuration: v });
      wx.setStorageSync('pauseDuration', v);
      this.render();
    }
  },

  onPausePlus() {
    const v = this.data.pauseDuration + 1;
    if (v <= 60) {
      this.setData({ pauseDuration: v });
      wx.setStorageSync('pauseDuration', v);
      this.render();
    }
  },

  onPauseMinus() {
    const v = this.data.pauseDuration - 1;
    if (v >= 1) {
      this.setData({ pauseDuration: v });
      wx.setStorageSync('pauseDuration', v);
      this.render();
    }
  },

  buildRules() {
    const { playerCount, mordred } = this.data;
    const ev = evils(playerCount, this.data.mordred, this.data.oberon);
    const gd = goods(playerCount);

    const merlinDesc = mordred ? '开局看到所有坏人（除莫德雷德）' : '开局看到所有坏人';
    const goodRoles = [];
    const seen = {};
    for (const r of gd) {
      if (seen[r]) continue;
      seen[r] = true;
      const desc = r === '梅林' ? merlinDesc : (ROLE_DESC[r] || {}).desc || '';
      goodRoles.push({ name: r, desc });
    }

    const evilRoles = [];
    const seen2 = {};
    for (const r of ev) {
      if (seen2[r]) continue;
      seen2[r] = true;
      evilRoles.push({ name: r, desc: (ROLE_DESC[r] || {}).desc || '' });
    }

    return { playerCount, goodCount: gd.length, evilCount: ev.length, goodRoles, evilRoles };
  },

  onShowRules() {
    this.setData({ showRules: true, rules: this.buildRules() });
  },

  onCloseRules() {
    this.setData({ showRules: false });
  },

  noop() {},

  onStart() {
    const { playerCount, mordred, oberon, pauseDuration } = this.data;
    const g = getApp().globalData;
    g.playerCount = playerCount;
    g.mordred = mordred;
    g.oberon = oberon;
    g.pauseDuration = pauseDuration;
    audio.stop();
    wx.redirectTo({ url: '/pages/host/host' });
  },

  onShareAppMessage() {
    return {
      title: '阿瓦隆线下语音主持',
      path: '/pages/setup/setup'
    };
  }
});
