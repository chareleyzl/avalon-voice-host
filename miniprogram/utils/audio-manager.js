let ctx = null;
let runToken = 0;
let currentEnd = null;
let currentError = null;

function create() {
  if (ctx) return;
  ctx = wx.createInnerAudioContext();
  ctx.obeyMuteSwitch = false;
  ctx.onEnded(() => {
    if (currentEnd) currentEnd();
  });
  ctx.onError((err) => {
    if (currentError) currentError(err);
  });
}

function destroy() {
  runToken++;
  currentEnd = null;
  currentError = null;
  if (ctx) {
    ctx.destroy();
    ctx = null;
  }
}

function play(src, onEnd, onError) {
  if (!ctx) create();
  if (!src) { if (onEnd) onEnd(); return; }

  stop();
  const token = ++runToken;
  let fired = false;

  currentEnd = () => {
    if (fired || token !== runToken) return;
    fired = true;
    if (onEnd) onEnd();
  };

  currentError = (err) => {
    if (fired || token !== runToken) return;
    fired = true;
    console.error('Audio error:', err);
    if (onError) onError(err);
  };

  ctx.src = src;
  ctx.play();
}

function stop() {
  runToken++;
  currentEnd = null;
  currentError = null;
  if (ctx) {
    ctx.stop();
  }
}

module.exports = { create, destroy, play, stop };
