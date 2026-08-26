const assert = require('assert');
const fs = require('fs');
const Module = require('module');

// ---- 可控定时器 ----
let timers = [];
let timerSeq = 0;
global.setTimeout = (fn, ms) => { timers.push({ id: ++timerSeq, fn, ms }); return timerSeq; };
global.clearTimeout = (id) => { timers = timers.filter(t => t.id !== id); };
global.setInterval = (fn, ms) => { timers.push({ id: ++timerSeq, fn, ms, interval: true }); return timerSeq; };
global.clearInterval = (id) => { timers = timers.filter(t => t.id !== id); };
function fireAll() {
  const due = timers;
  timers = [];
  due.forEach(t => t.fn());
}

// ---- audio-manager 桩 ----
const calls = { play: [], preload: [], stop: 0 };
let lastOnEnd = null;
let lastOnError = null;
const audioStub = {
  play(src, onEnd, onError) {
    calls.play.push(src);
    lastOnEnd = onEnd;
    lastOnError = onError;
  },
  preload(src) { calls.preload.push(src); },
  stop() { calls.stop++; },
  destroy() {}
};

const amPath = require.resolve('../miniprogram/utils/audio-manager');
const stubModule = new Module(amPath, null);
stubModule.filename = amPath;
stubModule.loaded = true;
stubModule.exports = audioStub;
require.cache[amPath] = stubModule;

// ---- 小程序运行时桩 ----
let pageOptions = null;
let onInterruptBegin = null;
let onInterruptEnd = null;
global.Page = (opts) => { pageOptions = opts; };
global.getApp = () => ({
  globalData: { playerCount: 7, mordred: false, oberon: false, pauseDuration: 3 }
});
global.wx = {
  setKeepScreenOn() {},
  onAudioInterruptionBegin(fn) { onInterruptBegin = fn; },
  onAudioInterruptionEnd(fn) { onInterruptEnd = fn; },
  offAudioInterruptionBegin() {},
  offAudioInterruptionEnd() {},
  redirectTo() {}
};

require('../miniprogram/pages/host/host.js');
assert(pageOptions, 'host.js should register a Page');

function makePage() {
  const page = {};
  Object.keys(pageOptions).forEach((k) => { if (k !== 'data') page[k] = pageOptions[k]; });
  page.data = JSON.parse(JSON.stringify(pageOptions.data));
  page.setData = function (d) { Object.assign(page.data, d); };
  return page;
}

function reset() {
  calls.play = [];
  calls.preload = [];
  calls.stop = 0;
  lastOnEnd = null;
  lastOnError = null;
  timers = [];
  const page = makePage();
  page.onLoad();
  return page;
}

const CUE0 = '/audio/close-eyes.mp3';
const CUE1 = '/audio/evil-assassin-morgana-minion.mp3';

// ---- 全自动：没有任何手动推进入口 ----
const wxml = fs.readFileSync('miniprogram/pages/host/host.wxml', 'utf8');
assert(!wxml.includes('下一步'), 'the hosting screen should not offer a next-step button');
assert(!wxml.includes('<switch'), 'the hosting screen should not offer an auto-play toggle');
assert(!wxml.includes('bindtap="onTapText"'), 'tapping the cue text should no longer advance');
assert(wxml.includes('bindtap="onStop"'), 'the hosting screen should keep the stop button');
assert.strictEqual(pageOptions.onAdvance, undefined, 'onAdvance should be gone');
assert.strictEqual(pageOptions.onTapText, undefined, 'onTapText should be gone');
assert.strictEqual(pageOptions.onAuto, undefined, 'onAuto should be gone');
['autoPlay', 'showAuto', 'advancing'].forEach((k) => {
  assert(!(k in pageOptions.data), `data.${k} belonged to manual mode and should be gone`);
});

// ---- 起步：播放第 0 段并预加载第 1 段 ----
let page = reset();
assert.deepStrictEqual(calls.play, [CUE0], 'onLoad should play the first cue');
assert.deepStrictEqual(calls.preload, [CUE1], 'showSec should preload the next cue while the current one plays');
assert.strictEqual(page.data.sectCount, 11, 'the view should receive only the step count');

// ---- 播完自动推进 ----
page = reset();
lastOnEnd();
fireAll();
assert.strictEqual(page.data.cur, 1, 'a finished cue should advance automatically');
assert.deepStrictEqual(calls.play, [CUE0, CUE1], 'the next cue should start on its own');

// ---- 失败重试一次 ----
page = reset();
lastOnError();
assert.strictEqual(calls.play.length, 1, 'the retry should be deferred, not immediate');
fireAll();
assert.deepStrictEqual(calls.play, [CUE0, CUE0], 'an isolated failure should retry the same cue once');

// ---- 关键：重试仍失败时必须自行推进，不能停在原地等人 ----
lastOnError();
assert.strictEqual(page.data.audioWarn, true, 'a second failure should warn the host');
assert(page.data.audioStatus.indexOf('念') !== -1, 'the warning should tell the host to read the line aloud');
assert.strictEqual(page.data.cur, 0, 'the failed step should linger long enough to be read aloud');
fireAll();
assert.strictEqual(page.data.cur, 1, 'a failed cue must advance on its own — there is no manual exit');
assert.strictEqual(calls.play.length, 3, 'the next cue should start after the failure delay');

// ---- 挂起的重试不得在流程停止后复活 ----
page = reset();
lastOnError();
page.onHide();
fireAll();
assert.strictEqual(calls.play.length, 1, 'a pending retry must be cancelled when playback halts');

// ---- 挂起的延迟推进不得在流程停止后复活 ----
page = reset();
lastOnEnd();
page.onHide();
fireAll();
assert.strictEqual(page.data.cur, 0, 'a pending advance must be cancelled when playback halts');
assert.strictEqual(calls.play.length, 1, 'no extra cue should start after halting');

// ---- 中断：打断即停，恢复即重播本句 ----
page = reset();
assert(onInterruptBegin && onInterruptEnd, 'both interruption hooks should be registered');
const stopsBefore = calls.stop;
onInterruptBegin();
assert.strictEqual(calls.stop, stopsBefore + 1, 'an interruption should stop playback');
assert.strictEqual(page.data.audioWarn, true, 'an interruption should tell the host what happens next');
onInterruptEnd();
assert.deepStrictEqual(calls.play, [CUE0, CUE0], 'the interrupted cue should replay, not be skipped');
assert.strictEqual(page.data.audioStatus, '', 'resuming should clear the interruption notice');
assert.strictEqual(page.data.cur, 0, 'resuming should stay on the same step');

// ---- 暂停步骤：首秒即显示倒计时 ----
page = reset();
page.startPause(2);
assert.strictEqual(page.data.text, '确认彼此身份... 3秒', 'the countdown should show the full duration immediately');

// ---- 切后台停止播放 ----
page = reset();
const stops = calls.stop;
page.onHide();
assert.strictEqual(calls.stop, stops + 1, 'onHide should stop playback');

// ---- 切后台再回前台：必须自行续播，否则全自动流程停死 ----
page = reset();
page.onHide();
page.onShow();
assert.deepStrictEqual(calls.play, [CUE0, CUE0], 'returning to the foreground must resume the current cue');
assert.strictEqual(page.data.cur, 0, 'returning should stay on the same step');

// ---- onLoad 之后的首次 onShow 不得重复播放 ----
page = reset();
page.onShow();
assert.deepStrictEqual(calls.play, [CUE0], 'the initial onShow should not restart the first cue');

// ---- 中断只来 Begin 不来 End：兜底必须自行重播 ----
page = reset();
onInterruptBegin();
fireAll();
assert.deepStrictEqual(calls.play, [CUE0, CUE0], 'a missing interruption-end must not strand the flow');

// ---- 中断在后台结束：不得在后台出声，回前台再播 ----
page = reset();
page.onHide();
onInterruptBegin();
onInterruptEnd();
assert.strictEqual(calls.play.length, 1, 'an interruption ending in the background should not start audio');
page.onShow();
assert.deepStrictEqual(calls.play, [CUE0, CUE0], 'the cue should resume once the page is visible again');

console.log('host playback tests passed');
