const { gen, audioPath } = require('../../utils/config');
const audio = require('../../utils/audio-manager');

Page({
  data: {
    sects: [],
    cur: 0,
    label: '',
    text: '',
    barPercent: 0,
    autoPlay: true,
    showAuto: true,
    audioStatus: '',
    audioWarn: false,
    done: false,
    advancing: false
  },

  _tmr: null,
  _cnt: null,

  onLoad() {
    const g = getApp().globalData;
    const { playerCount, mordred, oberon, pauseDuration } = g;
    this.playerCount = playerCount;
    this.mordred = mordred;
    this.oberon = oberon;
    this.pauseDuration = pauseDuration || 3;

    audio.create();

    this.sects = gen(playerCount, mordred, oberon);
    this.setData({ sects: this.sects });
    this.showSec(0);
  },

  onUnload() {
    this.clearTimers();
    audio.destroy();
  },

  onShareAppMessage() {
    return {
      title: `阿瓦隆语音主持 · ${this.playerCount}人局`,
      path: '/pages/setup/setup',
      imageUrl: ''
    };
  },

  showSec(i) {
    if (i >= this.sects.length) { this.done(); return; }
    const sec = this.sects[i];
    this.setData({
      cur: i,
      label: sec.sec,
      text: sec.pause ? (sec.pauseLabel || '') : (sec.txt || []).join('\n'),
      barPercent: ((i + 1) / this.sects.length * 100),
      advancing: false
    });
    if (this.data.autoPlay) this.playSec(i);
  },

  playSec(i) {
    const sec = this.sects[i];
    if (!sec) return;
    const cp = audioPath(this.playerCount, this.mordred, this.oberon, i);
    const onAudioDone = () => {
      if (sec.pause) {
        this.startPause(i);
      } else {
        this.showSec(i + 1);
      }
    };
    const onAudioError = () => {
      this.setData({ audioStatus: '音频播放失败，请手动点"下一步"', audioWarn: true });
    };
    if (cp) {
      audio.play(cp, onAudioDone, onAudioError);
    } else {
      onAudioDone();
    }
  },

  startPause(i) {
    const delay = this.pauseDuration * 1000;
    let rem = this.pauseDuration;
    const label = this.sects[i].pauseLabel || '请等待';
    this._cnt = setInterval(() => {
      rem--;
      if (rem > 0) this.setData({ text: label + '... ' + rem + '秒' });
      else { clearInterval(this._cnt); this._cnt = null; }
    }, 1000);
    this._tmr = setTimeout(() => {
      this._tmr = null;
      this.showSec(i + 1);
    }, delay);
  },

  onAdvance() {
    this.setData({ advancing: true });
    this.advance();
  },

  advance() {
    audio.stop();
    this.clearTimers();
    this.showSec(this.data.cur + 1);
  },

  onStop() {
    audio.stop();
    this.clearTimers();
    wx.redirectTo({ url: '/pages/setup/setup' });
  },

  onAgain() {
    this.onStop();
  },

  onAuto(e) {
    const v = e.detail.value;
    this.setData({ autoPlay: v, audioStatus: '', audioWarn: false });
    if (!v) { audio.stop(); this.clearTimers(); }
  },

  onTapText() {
    if (this.data.done) return;
    this.setData({ advancing: true });
    this.advance();
  },

  done() {
    this.setData({
      barPercent: 100,
      done: true,
      showAuto: false,
      audioStatus: '',
      label: '主持完成',
      text: '天亮了，请所有人睁开眼睛'
    });
    audio.stop();
  },

  clearTimers() {
    if (this._tmr) { clearTimeout(this._tmr); this._tmr = null; }
    if (this._cnt) { clearInterval(this._cnt); this._cnt = null; }
  }
});
