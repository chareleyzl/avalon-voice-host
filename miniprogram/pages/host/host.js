const { gen, audioPath } = require('../../utils/config');
const audio = require('../../utils/audio-manager');
const { buildSetupPath } = require('../../utils/entry');

const RETRY_DELAY = 300;
// 部分机型中断后只发 Begin 不发 End，靠这个兜底自行重播，避免全自动流程停死
const INTERRUPT_RESUME_DELAY = 10000;

Page({
  data: {
    sectCount: 0,
    cur: 0,
    label: '',
    text: '',
    barPercent: 0,
    audioStatus: '',
    audioWarn: false,
    finished: false
  },

  _tmr: null,
  _cnt: null,
  _retry: null,
  _defer: null,
  _fail: null,
  _wake: null,
  _step: 0,
  _interrupted: false,
  _halted: false,

  onLoad() {
    const g = getApp().globalData;
    const { playerCount, mordred, oberon, pauseDuration } = g;
    this.playerCount = playerCount;
    this.mordred = mordred;
    this.oberon = oberon;
    this.pauseDuration = pauseDuration || 5;

    this.sects = gen(playerCount, mordred, oberon);
    // 渲染层只用到步骤总数，不必把整个剧本送过去
    this.setData({ sectCount: this.sects.length });

    this.bindInterruption();
    wx.setKeepScreenOn({ keepScreenOn: true, fail() {} });

    this.showSec(0);
  },

  onShow() {
    // onLoad 之后也会走一次 onShow，只有真正被切走过才需要续播
    if (this._halted) this.resumeCurrent();
  },

  onHide() {
    // 切后台时音频会被系统中断，主动停下避免回前台后流程错乱；回来时靠 onShow 续播
    if (!this.data.finished) this._halted = true;
    this.haltPlayback();
  },

  onUnload() {
    this.haltPlayback();
    this.unbindInterruption();
    wx.setKeepScreenOn({ keepScreenOn: false, fail() {} });
    audio.destroy();
  },

  bindInterruption() {
    // 全自动流程没有手动出口，中断必须能自行恢复：打断时停播，恢复时重播当前这句
    this._onInterruptBegin = () => {
      if (this.data.finished) return;
      this._interrupted = true;
      this.haltPlayback();
      this.setData({ audioStatus: '语音被打断，恢复后将重播本句', audioWarn: true });
      // 有些机型只发 Begin 不发 End，不设兜底就会永远停在这一步
      this._wake = setTimeout(() => {
        this._wake = null;
        if (this._interrupted && !this._halted) this.resumeCurrent();
      }, INTERRUPT_RESUME_DELAY);
    };
    this._onInterruptEnd = () => {
      // 还在后台就先不出声，等 onShow 再续播
      if (!this._interrupted || this._halted || this.data.finished) return;
      this.resumeCurrent();
    };
    if (wx.onAudioInterruptionBegin) wx.onAudioInterruptionBegin(this._onInterruptBegin);
    if (wx.onAudioInterruptionEnd) wx.onAudioInterruptionEnd(this._onInterruptEnd);
  },

  unbindInterruption() {
    if (wx.offAudioInterruptionBegin && this._onInterruptBegin) {
      wx.offAudioInterruptionBegin(this._onInterruptBegin);
    }
    if (wx.offAudioInterruptionEnd && this._onInterruptEnd) {
      wx.offAudioInterruptionEnd(this._onInterruptEnd);
    }
    this._onInterruptBegin = null;
    this._onInterruptEnd = null;
  },

  onShareAppMessage() {
    return {
      title: `阿瓦隆语音主持 · ${this.playerCount}人局`,
      path: buildSetupPath({
        playerCount: this.playerCount,
        mordred: this.mordred,
        oberon: this.oberon
      }),
      imageUrl: '/share.jpg'
    };
  },

  onShareTimeline() {
    return {
      title: '阿瓦隆语音主持，聚会桌游自动带流程',
      query: buildSetupPath({
        playerCount: this.playerCount,
        mordred: this.mordred,
        oberon: this.oberon
      }).split('?')[1] || '',
      imageUrl: '/share.jpg'
    };
  },

  // 中断结束 / 切回前台 / 中断兜底，三条路径都从这里续播当前这句
  resumeCurrent() {
    const i = this.data.cur;
    const sec = this.sects && this.sects[i];
    if (!sec || this.data.finished) return;
    this._interrupted = false;
    this._halted = false;
    this.haltPlayback();
    this.setData({ audioStatus: '', audioWarn: false });
    const token = ++this._step;
    if (sec.pause) this.startPause(i);
    else this.playSec(i, token);
  },

  showSec(i) {
    if (i >= this.sects.length) { this.finish(); return; }
    const sec = this.sects[i];
    const token = ++this._step;

    this.setData({
      cur: i,
      label: sec.sec,
      text: sec.pause ? (sec.pauseLabel || '') : (sec.txt || []).join('\n'),
      barPercent: ((i + 1) / this.sects.length * 100),
      audioStatus: '',
      audioWarn: false
    });

    this.playSec(i, token);
    // 当前步骤播放期间提前加载下一段，消除切步时的解码间隙
    audio.preload(audioPath(this.playerCount, this.mordred, this.oberon, i + 1));
  },

  playSec(i, token) {
    const sec = this.sects[i];
    if (!sec) return;
    const cp = audioPath(this.playerCount, this.mordred, this.oberon, i);
    let retried = false;

    const onAudioDone = () => {
      if (token !== this._step) return;
      // 延迟一拍，避免在 onEnded 回调内同步销毁并重建下一个实例
      this._defer = setTimeout(() => {
        this._defer = null;
        if (token !== this._step) return;
        if (sec.pause) this.startPause(i);
        else this.showSec(i + 1);
      }, 0);
    };

    const onAudioError = () => {
      if (token !== this._step) return;
      if (!retried) {
        retried = true;
        // 起播超时最长 3s，先给屏幕一个反馈，别让主持人对着不动的画面猜
        this.setData({ audioStatus: '语音加载中…', audioWarn: false });
        this._retry = setTimeout(() => {
          this._retry = null;
          if (token !== this._step) return;
          audio.play(cp, onAudioDone, onAudioError);
        }, RETRY_DELAY);
        return;
      }
      // 全自动流程无人工出口：留出时间让主持人照着屏幕念，然后自行推进
      this.setData({ audioStatus: '语音播放失败，请照屏幕念出本句', audioWarn: true });
      this._fail = setTimeout(() => {
        this._fail = null;
        if (token !== this._step) return;
        if (sec.pause) this.startPause(i);
        else this.showSec(i + 1);
      }, this.pauseDuration * 1000);
    };

    if (cp) audio.play(cp, onAudioDone, onAudioError);
    else onAudioDone();
  },

  startPause(i) {
    const label = this.sects[i].pauseLabel || '请等待';
    let rem = this.pauseDuration;
    this.setData({ text: label + '... ' + rem + '秒' });
    this._cnt = setInterval(() => {
      rem--;
      if (rem > 0) this.setData({ text: label + '... ' + rem + '秒' });
      else { clearInterval(this._cnt); this._cnt = null; }
    }, 1000);
    this._tmr = setTimeout(() => {
      this._tmr = null;
      this.showSec(i + 1);
    }, this.pauseDuration * 1000);
  },

  onStop() {
    this.haltPlayback();
    wx.redirectTo({ url: '/pages/setup/setup' });
  },

  onAgain() {
    this.onStop();
  },

  finish() {
    this._step++;
    this.haltPlayback();
    this.setData({
      barPercent: 100,
      finished: true,
      audioStatus: '',
      audioWarn: false,
      label: '主持完成',
      text: '天亮了，请所有人睁开眼睛'
    });
  },

  haltPlayback() {
    audio.stop();
    this.clearTimers();
  },

  clearTimers() {
    if (this._tmr) { clearTimeout(this._tmr); this._tmr = null; }
    if (this._cnt) { clearInterval(this._cnt); this._cnt = null; }
    if (this._retry) { clearTimeout(this._retry); this._retry = null; }
    if (this._defer) { clearTimeout(this._defer); this._defer = null; }
    if (this._fail) { clearTimeout(this._fail); this._fail = null; }
    if (this._wake) { clearTimeout(this._wake); this._wake = null; }
  }
});
