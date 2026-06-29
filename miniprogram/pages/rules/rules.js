const { parseSetupOptions, buildSetupPath } = require('../../utils/entry');
const { buildRules } = require('../../utils/rules');

Page({
  data: {
    playerCount: 7,
    mordred: false,
    oberon: false,
    rules: { playerCount: 0, goodCount: 0, evilCount: 0, goodRoles: [], evilRoles: [] }
  },

  onLoad(options = {}) {
    const entry = parseSetupOptions(options);
    this.setData({
      ...entry,
      rules: buildRules(entry)
    });
  },

  onStart() {
    wx.redirectTo({ url: buildSetupPath(this.data) });
  },

  onShareAppMessage() {
    return {
      title: `阿瓦隆${this.data.playerCount}人局规则和语音主持`,
      path: buildSetupPath(this.data).replace('/pages/setup/setup', '/pages/rules/rules'),
      imageUrl: '/share.jpg'
    };
  },

  onShareTimeline() {
    return {
      title: '阿瓦隆规则与语音主持，新手也能开局',
      query: buildSetupPath(this.data).split('?')[1] || '',
      imageUrl: '/share.jpg'
    };
  }
});
