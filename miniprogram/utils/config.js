const CFG = {
  5:  { good:['梅林','派西维尔','忠臣'],            evil:['刺客','莫甘娜'],          min:0 },
  6:  { good:['梅林','派西维尔','忠臣','忠臣'],      evil:['刺客','莫甘娜'],          min:0 },
  7:  { good:['梅林','派西维尔','忠臣','忠臣'],      evil:['刺客','莫甘娜','爪牙'],    min:1 },
  8:  { good:['梅林','派西维尔','忠臣','忠臣','忠臣'], evil:['刺客','莫甘娜','爪牙'],  min:1 },
  9:  { good:['梅林','派西维尔','忠臣','忠臣','忠臣','忠臣'], evil:['刺客','莫甘娜','爪牙'], min:1 },
  10: { good:['梅林','派西维尔','忠臣','忠臣','忠臣','忠臣'], evil:['刺客','莫甘娜','爪牙','爪牙'], min:2 },
};

const ROLE_AUDIO_KEY = {
  '刺客':'assassin',
  '莫甘娜':'morgana',
  '爪牙':'minion',
  '莫德雷德':'mordred',
  '奥伯伦':'oberon'
};

function evils(playerCount, mordred, oberon) {
  const a = [...CFG[playerCount].evil];
  if (mordred) { const i = a.indexOf('爪牙'); if (i !== -1) a[i] = '莫德雷德'; }
  if (oberon) { const i = a.indexOf('爪牙'); if (i !== -1) a[i] = '奥伯伦'; }
  return a;
}

function goods(playerCount) {
  return [...CFG[playerCount].good];
}

function roleAudioKey(roles) {
  return roles.map(r => ROLE_AUDIO_KEY[r] || r).join('-');
}

function uniq(arr) { return [...new Set(arr)]; }

function audioPath(playerCount, mordred, oberon, stepIndex) {
  const ev = evils(playerCount, mordred, oberon);
  let file = '';
  if (stepIndex === 0) file = 'close-eyes.mp3';
  else if (stepIndex === 1) {
    const visible = uniq(ev.filter(r => r !== '奥伯伦'));
    file = `evil-${roleAudioKey(visible)}.mp3`;
  } else if (stepIndex === 2) file = 'evil-confirm.mp3';
  else if (stepIndex === 3) file = 'evil-close-eyes.mp3';
  else if (stepIndex === 4) {
    const thumbs = uniq(ev.filter(r => r !== '莫德雷德'));
    file = `merlin-${roleAudioKey(thumbs)}.mp3`;
  } else if (stepIndex === 6) file = 'merlin-close-eyes.mp3';
  else if (stepIndex === 7) file = 'percival.mp3';
  else if (stepIndex === 9) file = 'percival-close-eyes.mp3';
  else if (stepIndex === 10) file = 'dawn.mp3';
  return file ? `/audio/${file}` : '';
}

function gen(playerCount, mordred, oberon) {
  const ev = evils(playerCount, mordred, oberon);
  const visible = uniq(ev.filter(r => r !== '奥伯伦'));
  const thumbs = uniq(ev.filter(r => r !== '莫德雷德'));
  const st = [];
  st.push({ sec:'天黑闭眼', txt:['请所有人闭上眼睛'] });
  st.push({ sec:'阵营相识', txt:[`${visible.join('、')}请睁开眼睛`] });
  st.push({ sec:'阵营相识', pause:true, pauseLabel:'确认彼此身份' });
  st.push({ sec:'阵营相识', txt:['请闭上眼睛'] });
  st.push({ sec:'梅林识人', txt:[`请${thumbs.join('、')}竖起大拇指`, '梅林请睁开眼睛'] });
  st.push({ sec:'梅林识人', pause:true, pauseLabel:'请等待' });
  st.push({ sec:'梅林识人', txt:['梅林请闭上眼睛', '请收回大拇指'] });
  st.push({ sec:'派西维尔辨人', txt:['请梅林和莫甘娜竖起大拇指','派西维尔请睁开眼睛'] });
  st.push({ sec:'派西维尔辨人', pause:true, pauseLabel:'请等待' });
  st.push({ sec:'派西维尔辨人', txt:['派西维尔请闭上眼睛', '请收回大拇指'] });
  st.push({ sec:'天亮', txt:['天亮了，请所有人睁开眼睛'] });
  return st;
}

function evilRoleList(playerCount, mordred, oberon) {
  return uniq(evils(playerCount, mordred, oberon));
}

function previewGroups(steps) {
  const groups = [];
  for (const step of steps) {
    const last = groups[groups.length - 1];
    if (last && last.sec === step.sec) {
      last.items.push(step);
    } else {
      groups.push({ sec: step.sec, items: [step] });
    }
  }
  return groups;
}

module.exports = { CFG, evils, goods, gen, audioPath, previewGroups, evilRoleList };
