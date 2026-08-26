App({
  globalData: {
    playerCount: 7,
    mordred: false,
    oberon: false,
    pauseDuration: 5
  },

  onLaunch() {
    // iOS 上单实例的 obeyMuteSwitch 不可靠，用全局设置确保静音键下仍能外放
    wx.setInnerAudioOption({
      obeyMuteSwitch: false,
      mixWithOther: false,
      fail() {}
    });
  },

  onError(err) {
    console.error('App error:', err);
  }
});
