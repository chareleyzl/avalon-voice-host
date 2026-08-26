const assert = require('assert');

// ---- 可控定时器：让超时兜底逻辑可确定性测试 ----
let timers = [];
let timerSeq = 0;
global.setTimeout = (fn, ms) => { timers.push({ id: ++timerSeq, fn, ms }); return timerSeq; };
global.clearTimeout = (id) => { timers = timers.filter(t => t.id !== id); };
function fireAll() {
  const due = timers;
  timers = [];
  due.forEach(t => t.fn());
}

// ---- InnerAudioContext mock ----
let createCount = 0;
const ctxs = [];

global.wx = {
  createInnerAudioContext() {
    createCount++;
    const o = {
      id: ctxs.length,
      src: '',
      duration: 0,
      obeyMuteSwitch: true,
      played: false,
      stopped: false,
      destroyed: false,
      h: {},
      onPlay(fn) { o.h.play = fn; },
      onEnded(fn) { o.h.ended = fn; },
      onError(fn) { o.h.error = fn; },
      offPlay() { o.offCalls.push('play'); },
      offEnded() { o.offCalls.push('ended'); },
      offError() { o.offCalls.push('error'); },
      offCalls: [],
      play() { o.played = true; },
      stop() { o.stopped = true; o.order.push('stop'); },
      destroy() { o.destroyed = true; o.order.push('destroy'); },
      order: []
    };
    ctxs.push(o);
    return o;
  }
};

const realError = console.error;
console.error = () => {};

const audio = require('../miniprogram/utils/audio-manager');

function reset() {
  audio.destroy();
  timers = [];
  ctxs.length = 0;
  createCount = 0;
}

// ---- 预加载 ----
reset();
audio.preload('/audio/a.mp3');
assert.strictEqual(createCount, 1, 'preload should create a context');
assert.strictEqual(ctxs[0].src, '/audio/a.mp3', 'preload should assign src to start loading');
assert.strictEqual(ctxs[0].played, false, 'preload must not start playback');

audio.preload('/audio/a.mp3');
assert.strictEqual(createCount, 1, 'preloading the same src twice should reuse the context');

audio.play('/audio/a.mp3', () => {}, () => {});
assert.strictEqual(createCount, 1, 'play should take over the preloaded context, not create a new one');
assert.strictEqual(ctxs[0].played, true, 'the preloaded context should be the one that plays');

// 预加载未命中时应释放旧的预加载实例
reset();
audio.preload('/audio/a.mp3');
audio.play('/audio/b.mp3', () => {}, () => {});
assert.strictEqual(createCount, 2, 'a preload miss should create a fresh context for the played src');
assert.strictEqual(ctxs[0].destroyed, true, 'an unused preloaded context should be released');

// ---- 释放顺序：先解绑再 stop 再 destroy ----
reset();
audio.play('/audio/a.mp3', () => {}, () => {});
audio.stop();
assert.deepStrictEqual(ctxs[0].offCalls.sort(), ['ended', 'error', 'play'], 'release should detach all handlers');
assert.deepStrictEqual(ctxs[0].order, ['stop', 'destroy'], 'release should stop before destroying');

// ---- 回归：旧实例迟到 onEnded 不得推进新步骤 ----
reset();
let endA = 0; let endB = 0;
audio.play('/audio/a.mp3', () => endA++, () => {});
audio.play('/audio/b.mp3', () => endB++, () => {});
ctxs[0].h.ended();
assert.strictEqual(endA, 0, 'a released context must not fire its own onEnd');
assert.strictEqual(endB, 0, 'a released context must not fire the NEW step onEnd (cross-talk)');

// ---- 回归：旧实例迟到 onError 不得污染新步骤，且新步骤仍能正常结束 ----
reset();
let errB = 0; endB = 0;
audio.play('/audio/a.mp3', () => {}, () => {});
audio.play('/audio/b.mp3', () => endB++, () => errB++);
ctxs[0].h.error({ errCode: 10003 });
assert.strictEqual(errB, 0, 'a released context must not fire the NEW step onError');
ctxs[1].h.ended();
assert.strictEqual(endB, 1, 'the new step must still complete after a stale error from the old context');

// ---- stop / destroy 之后回调全部失效 ----
reset();
let endC = 0; let errC = 0;
audio.play('/audio/c.mp3', () => endC++, () => errC++);
audio.stop();
ctxs[0].h.ended();
ctxs[0].h.error({ errCode: 10003 });
assert.strictEqual(endC, 0, 'callbacks must not fire after stop()');
assert.strictEqual(errC, 0, 'error callbacks must not fire after stop()');

// ---- 起播超时兜底：既无 onPlay 也无 onError 时报错 ----
reset();
let errD = 0;
audio.play('/audio/d.mp3', () => {}, () => errD++);
fireAll();
assert.strictEqual(errD, 1, 'a silent failure to start should surface as onError');

// ---- 起播成功后改用时长兜底，起播超时不再触发 ----
reset();
let errE = 0; let endE = 0;
audio.play('/audio/e.mp3', () => endE++, () => errE++);
ctxs[0].duration = 4;
ctxs[0].h.play();
assert.strictEqual(timers.length, 1, 'onPlay should replace the start watchdog with a duration watchdog');
assert.strictEqual(timers[0].ms, 4 * 1000 + 2000, 'duration watchdog should cover the clip plus slack');
ctxs[0].h.ended();
assert.strictEqual(endE, 1, 'normal completion should still report onEnd');
assert.strictEqual(errE, 0, 'normal completion should not report an error');
assert.strictEqual(timers.length, 0, 'settling should clear the watchdog');

// ---- 空 src：直接完成，同时停掉上一段音频 ----
reset();
let endF = 0;
audio.play('/audio/f.mp3', () => {}, () => {});
audio.play('', () => endF++, () => {});
assert.strictEqual(endF, 1, 'an empty src should complete immediately');
assert.strictEqual(ctxs[0].destroyed, true, 'an empty src should still release the previous context');

console.error = realError;
console.log('audio manager tests passed');
