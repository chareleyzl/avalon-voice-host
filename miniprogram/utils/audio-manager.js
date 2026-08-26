// 起播兜底：src 赋值后若 START_TIMEOUT 内既没 onPlay 也没 onError，视为静默失败
const START_TIMEOUT = 3000;
// 起播成功后的总时长兜底，防止 onEnded 丢失导致流程停滞
const END_SLACK = 2000;
const FALLBACK_DURATION = 20;

let playing = null;   // { ctx, token }
let preloaded = null; // { ctx, src }
let runToken = 0;

function off(ctx, name) {
  const fn = ctx[name];
  if (typeof fn === 'function') {
    try { fn.call(ctx); } catch (e) { /* 基础库不支持则忽略 */ }
  }
}

// 解绑 -> 停止 -> 销毁。先解绑可避免 destroy 触发的迟到回调打到新实例上
function release(ctx) {
  if (!ctx) return;
  off(ctx, 'offEnded');
  off(ctx, 'offError');
  off(ctx, 'offPlay');
  try { ctx.stop(); } catch (e) { /* 未起播时 stop 可能抛错 */ }
  try { ctx.destroy(); } catch (e) { /* 已销毁则忽略 */ }
}

function makeCtx(src) {
  const ctx = wx.createInnerAudioContext();
  ctx.obeyMuteSwitch = false;
  ctx.src = src; // 赋值即触发加载，预加载靠的就是这一步
  return ctx;
}

function dropPreloaded() {
  if (preloaded) {
    release(preloaded.ctx);
    preloaded = null;
  }
}

// 提前创建下一步的实例并开始加载，使切步时无需等待解码
function preload(src) {
  if (!src) { dropPreloaded(); return; }
  if (preloaded && preloaded.src === src) return;
  dropPreloaded();
  preloaded = { ctx: makeCtx(src), src };
}

function play(src, onEnd, onError) {
  const token = ++runToken;

  if (playing) {
    if (playing.disarm) playing.disarm();
    release(playing.ctx);
    playing = null;
  }

  if (!src) { if (onEnd) onEnd(); return; }

  let ctx;
  if (preloaded && preloaded.src === src) {
    ctx = preloaded.ctx;
    preloaded = null;
  } else {
    dropPreloaded();
    ctx = makeCtx(src);
  }
  playing = { ctx, token };

  let settled = false;
  let timer = null;

  const disarm = () => { if (timer) { clearTimeout(timer); timer = null; } };

  // token 与 settled 都在闭包内，旧实例的迟到回调无法影响后续播放
  const settle = (fn, arg) => {
    if (settled || token !== runToken) return;
    settled = true;
    disarm();
    if (fn) fn(arg);
  };

  const arm = (ms) => {
    disarm();
    timer = setTimeout(() => {
      settle(onError, { errCode: -1, errMsg: 'audio timeout' });
    }, ms);
  };

  ctx.onPlay(() => {
    if (settled || token !== runToken) return;
    const dur = ctx.duration > 0 ? ctx.duration : FALLBACK_DURATION;
    arm(dur * 1000 + END_SLACK);
  });
  ctx.onEnded(() => settle(onEnd));
  ctx.onError((err) => {
    console.error('Audio error:', err);
    settle(onError, err);
  });

  arm(START_TIMEOUT);
  playing.disarm = disarm;
  ctx.play();
}

function stop() {
  runToken++;
  if (playing) {
    if (playing.disarm) playing.disarm();
    release(playing.ctx);
    playing = null;
  }
}

function destroy() {
  stop();
  dropPreloaded();
}

module.exports = { preload, play, stop, destroy };
