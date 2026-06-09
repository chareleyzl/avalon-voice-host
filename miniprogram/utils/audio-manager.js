let ctx = null;
let runToken = 0;

function create() {
  if (ctx) return;
  ctx = wx.createInnerAudioContext();
  ctx.obeyMuteSwitch = false;
}

function destroy() {
  runToken++;
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

  const done = () => {
    if (fired || token !== runToken) return;
    fired = true;
    if (onEnd) onEnd();
  };

  ctx.src = src;
  ctx.onEnded(() => done());
  ctx.onError((err) => {
    if (fired || token !== runToken) return;
    console.error('Audio error:', err);
    if (onError) onError(err);
  });
  ctx.play();
}

function stop() {
  runToken++;
  if (ctx) {
    ctx.stop();
  }
}

module.exports = { create, destroy, play, stop };
