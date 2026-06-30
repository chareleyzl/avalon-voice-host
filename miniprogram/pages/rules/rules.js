const { parseSetupOptions, buildSetupPath } = require('../../utils/entry');
const { buildRules } = require('../../utils/rules');
const { evilRoleList } = require('../../utils/config');

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
    const { playerCount, mordred, oberon } = this.data;
    const evilRoles = evilRoleList(playerCount, mordred, oberon);
    return {
      title: `阿瓦隆规则 · ${playerCount}人局（${evilRoles.join('、')}）`,
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
