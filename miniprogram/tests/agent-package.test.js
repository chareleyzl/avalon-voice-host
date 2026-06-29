/**
 * Agent Skill 包完整性测试
 *
 * 验证 app.json 声明、skill 文件结构、mcp.json API 定义、
 * index.js 注册入口、以及三个原子接口的逻辑正确性。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { buildRules } = require('../utils/rules');

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const skills = (app.agent && app.agent.skills) || [];
assert(skills.length > 0, 'app.json should register at least one agent skill');

const skill = skills.find(s => s.name === 'avalon-skill');
assert(skill, 'app.json should register avalon-skill');
assert(skill.path, 'avalon-skill should have a path');

const skillDir = path.resolve(skill.path);
const skillMdPath = path.join(skillDir, 'SKILL.md');
const mcpPath = path.join(skillDir, 'mcp.json');
const indexJsPath = path.join(skillDir, 'index.js');
const apisDir = path.join(skillDir, 'apis');

assert(fs.existsSync(skillMdPath), 'SKILL.md should exist');
assert(fs.existsSync(mcpPath), 'mcp.json should exist');
assert(fs.existsSync(indexJsPath), 'index.js should exist');
assert(fs.existsSync(apisDir), 'apis/ directory should exist');

const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
assert.strictEqual(typeof mcp, 'object', 'mcp.json should be a JSON object');
assert(Array.isArray(mcp.apis), 'mcp.json should declare an apis array');
assert(mcp.apis.length >= 3, 'mcp.json should declare at least 3 APIs');

const apiNames = mcp.apis.map(a => a.name);
assert(apiNames.includes('startGame'), 'mcp.json should declare startGame API');
assert(apiNames.includes('showRules'), 'mcp.json should declare showRules API');
assert(apiNames.includes('getRoleInfo'), 'mcp.json should declare getRoleInfo API');

for (const api of mcp.apis) {
  assert(api.name && typeof api.name === 'string', `API name should be a non-empty string, got: ${api.name}`);
  assert(api.description && typeof api.description === 'string', `API "${api.name}" should have a non-empty description`);
  assert(api.inputSchema && typeof api.inputSchema === 'object', `API "${api.name}" should have an inputSchema object`);
}

for (const apiName of ['startGame', 'showRules']) {
  const api = mcp.apis.find(a => a.name === apiName);
  const playersSchema = api.inputSchema.properties.players;
  assert.deepStrictEqual(playersSchema.enum, [5, 6, 7, 8, 9, 10], `${apiName}.players should restrict supported player counts`);
}

for (const apiName of ['startGame', 'showRules']) {
  const api = mcp.apis.find(a => a.name === apiName);
  for (const key of ['path', 'players', 'mordred', 'oberon']) {
    assert(api.outputSchema.properties[key], `${apiName}.outputSchema should include ${key}`);
  }
}

const roleInfoApi = mcp.apis.find(a => a.name === 'getRoleInfo');
assert(roleInfoApi, 'getRoleInfo should exist');
assert(roleInfoApi.inputSchema.required.includes('roleName'), 'getRoleInfo inputSchema should require roleName');

const indexContent = fs.readFileSync(indexJsPath, 'utf8');
assert(indexContent.includes('wx.modelContext'), 'index.js should reference wx.modelContext');
const originalWarn = console.warn;
const registrationWarnings = [];
console.warn = (message) => registrationWarnings.push(String(message));
try {
  delete require.cache[require.resolve(indexJsPath)];
  assert.doesNotThrow(() => require(indexJsPath), 'index.js should not throw when wx is unavailable in non-miniprogram tooling');
} finally {
  console.warn = originalWarn;
}
assert.deepStrictEqual(registrationWarnings, [], 'index.js should not warn when wx is unavailable in non-miniprogram tooling');

const registeredApis = [];
global.wx = {
  modelContext: {
    createSkill(skillPath) {
      assert.strictEqual(skillPath, 'packageAgent/avalon-skill');
      return {
        registerAPI(name, handler) {
          registeredApis.push({ name, handler });
        }
      };
    }
  }
};
delete require.cache[require.resolve(indexJsPath)];
require(indexJsPath);
delete global.wx;
assert.deepStrictEqual(registeredApis.map(api => api.name), ['startGame', 'showRules', 'getRoleInfo'], 'index.js should register all APIs with wx.modelContext');
for (const api of registeredApis) {
  assert.strictEqual(typeof api.handler, 'function', api.name + ' handler should be a function');
}
assert(indexContent.includes("'startGame'") || indexContent.includes('"startGame"'), 'index.js should register startGame');
assert(indexContent.includes("'showRules'") || indexContent.includes('"showRules"'), 'index.js should register showRules');
assert(indexContent.includes("'getRoleInfo'") || indexContent.includes('"getRoleInfo"'), 'index.js should register getRoleInfo');

const apiFiles = ['startGame.js', 'showRules.js', 'getRoleInfo.js'];
for (const f of apiFiles) {
  const fp = path.join(apisDir, f);
  assert(fs.existsSync(fp), `apis/${f} should exist`);
  const content = fs.readFileSync(fp, 'utf8');
  assert(content.includes('module.exports'), `apis/${f} should export a function via module.exports`);
}

const startGame = require('../packageAgent/avalon-skill/apis/startGame');
const showRules = require('../packageAgent/avalon-skill/apis/showRules');
const getRoleInfo = require('../packageAgent/avalon-skill/apis/getRoleInfo');

async function run() {
  const defaultGame = await startGame();
  assert.strictEqual(defaultGame.isError, false, 'startGame should accept missing options');
  assert.strictEqual(defaultGame.structuredContent.path, '/pages/setup/setup?players=7');

  const sevenBoth = await startGame({ players: 7, mordred: true, oberon: true });
  assert.strictEqual(sevenBoth.structuredContent.mordred, true);
  assert.strictEqual(sevenBoth.structuredContent.oberon, false);
  assert.strictEqual(sevenBoth.structuredContent.path, '/pages/setup/setup?players=7&mordred=1');

  const sixBothRules = await showRules({ players: 6, mordred: true, oberon: true });
  assert.strictEqual(sixBothRules.structuredContent.path, '/pages/rules/rules?players=6');

  const sevenBothRules = await showRules({ players: 7, mordred: true, oberon: true });
  assert.strictEqual(sevenBothRules.structuredContent.path, '/pages/rules/rules?players=7&mordred=1');

  const tenBothRules = await showRules({ players: 10, mordred: true, oberon: true });
  assert.strictEqual(tenBothRules.structuredContent.path, '/pages/rules/rules?players=10&mordred=1&oberon=1');

  const mainRoles = [...buildRules({ playerCount: 10, mordred: true, oberon: true }).goodRoles, ...buildRules({ playerCount: 10, mordred: true, oberon: true }).evilRoles].map(r => r.name);
  for (const role of mainRoles) {
    const info = await getRoleInfo({ roleName: role });
    assert.strictEqual(info.isError, false, `getRoleInfo should support main role: ${role}`);
    assert.strictEqual(info.structuredContent.roleName, role);
  }

  const skillMd = fs.readFileSync(skillMdPath, 'utf8');
  assert(!skillMd.includes('playes'), 'SKILL.md should not contain typo playes');
  assert(skillMd.includes('players/mordred/oberon'), 'SKILL.md should document players/mordred/oberon params');
  assert(skillMd.includes('startGame') || skillMd.includes('showRules') || skillMd.includes('getRoleInfo'), 'SKILL.md should reference at least one API name');
  assert(skillMd.length <= 16000, 'SKILL.md should be within 16000 bytes limit');

  console.log('✅ All agent package tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
