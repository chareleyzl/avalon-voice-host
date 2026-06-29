const startGame = require('./apis/startGame');
const showRules = require('./apis/showRules');
const getRoleInfo = require('./apis/getRoleInfo');

function registerAPIs() {
  if (typeof wx === 'undefined') {
    return;
  }

  if (!wx.modelContext || !wx.modelContext.createSkill) {
    console.warn('AI modelContext is unavailable; avalon-skill APIs were not registered.');
    return;
  }

  const skill = wx.modelContext.createSkill('packageAgent/avalon-skill');
  skill.registerAPI('startGame', startGame);
  skill.registerAPI('showRules', showRules);
  skill.registerAPI('getRoleInfo', getRoleInfo);
}

registerAPIs();