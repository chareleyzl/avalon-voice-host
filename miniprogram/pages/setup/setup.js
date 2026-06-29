const { CFG, evils, goods, gen, previewGroups } = require('../../utils/config');
const audio = require('../../utils/audio-manager');
const { parseSetupOptions, buildSetupPath, hasSetupOptions } = require('../../utils/entry');

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
    script: []
  },

  onLoad(options = {}) {
    const g = getApp().globalData;
    const saved = wx.getStorageSync('pauseDuration');
    if (saved) g.pauseDuration = parseInt(saved, 10);
    if (g.pauseDuration < 1 || g.pauseDuration > 60) g.pauseDuration = 5;

    const entry = hasSetupOptions(options)
      ? parseSetupOptions(options)
      : {
          playerCount: g.playerCount || 7,
          mordred: g.mordred || false,
          oberon: g.oberon || false
        };

    this.setData({
      playerCount: entry.playerCount,
      mordred: entry.mordred,
      oberon: entry.oberon,
      pauseDuration: g.pauseDuration
    });
    this.render();
  },

  render() {
    const { playerCount, mordred, oberon } = this.data;
    this.setData({
      goods: goods(playerCount),
      evils: evils(playerCount, mordred, oberon),
      showOptions: CFG[playerCount].min > 0,
      script: previewGroups(gen(playerCount, mordred, oberon))
    });
  },

  onCount(e) {
    const n = parseInt(e.currentTarget.dataset.n, 10);
    const min = CFG[n].min;
    let mordred = false;
    let oberon = false;

    if (min === 1) {
      if (this.data.mordred && !this.data.oberon) mordred = true;
      else if (!this.data.mordred && this.data.oberon) oberon = true;
    } else if (min > 1) {
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
    const v = parseInt(e.detail.value, 10);
    if (v >= 1 && v <= 60) {
      this.setData({ pauseDuration: v });
      wx.setStorageSync('pauseDuration', v);
    }
  },

  onPausePlus() {
    const v = this.data.pauseDuration + 1;
    if (v <= 60) {
      this.setData({ pauseDuration: v });
      wx.setStorageSync('pauseDuration', v);
    }
  },

  onPauseMinus() {
    const v = this.data.pauseDuration - 1;
    if (v >= 1) {
      this.setData({ pauseDuration: v });
      wx.setStorageSync('pauseDuration', v);
    }
  },

  onShowRules() {
    wx.navigateTo({ url: buildSetupPath(this.data).replace('/pages/setup/setup', '/pages/rules/rules') });
  },

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
      title: `阿瓦隆语音主持 · ${this.data.playerCount}人局自动带夜晚流程`,
      path: buildSetupPath(this.data),
      imageUrl: '/share.jpg'
    };
  },

  onShareTimeline() {
    return {
      title: '阿瓦隆语音主持，5-10人局自动带夜晚流程',
      query: buildSetupPath(this.data).split('?')[1] || '',
      imageUrl: '/share.jpg'
    };
  }
});
