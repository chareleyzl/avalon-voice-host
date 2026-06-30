const assert = require('assert');

let endHandlers = [];
let errorHandlers = [];
let stopCount = 0;
let destroyCount = 0;

global.wx = {
  createInnerAudioContext() {
    return {
      obeyMuteSwitch: true,
      src: '',
      onEnded(handler) { endHandlers.push(handler); },
      onError(handler) { errorHandlers.push(handler); },
      play() {},
      stop() { stopCount++; },
      destroy() { destroyCount++; }
    };
  }
};

global.console = { error() {}, log() {} };

const audio = require('../utils/audio-manager');

audio.create();
assert.strictEqual(endHandlers.length, 1, 'create should register one ended handler');
assert.strictEqual(errorHandlers.length, 1, 'create should register one error handler');

audio.play('/audio/one.mp3', () => {});
audio.play('/audio/two.mp3', () => {});
assert.strictEqual(endHandlers.length, 1, 'play should not add ended handlers repeatedly');
assert.strictEqual(errorHandlers.length, 1, 'play should not add error handlers repeatedly');
assert.strictEqual(stopCount, 2, 'play should still stop previous audio before playing');

audio.destroy();
assert.strictEqual(destroyCount, 1);

console.log('audio manager tests passed');
