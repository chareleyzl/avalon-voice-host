const { CFG, evils, goods, gen, audioPath, previewGroups } = require('../../utils/config');
const audio = require('../../utils/audio-manager');

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
      script: previewGroups(gen(playerCount, mordred, oberon, pauseDuration))
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

  onTestSound() {
    const cp = audioPath(this.data.playerCount, this.data.mordred, this.data.oberon, 0);
    audio.create();
    audio.play(cp);
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
      title: '阿瓦隆线下语音主持',
      path: '/pages/setup/setup'
    };
  }
});
