const assert = require('assert');
const fs = require('fs');

const rulesUtil = fs.readFileSync('utils/rules.js', 'utf8');
const rulesPageJs = fs.readFileSync('pages/rules/rules.js', 'utf8');
const rulesWxml = fs.readFileSync('pages/rules/rules.wxml', 'utf8');
const rulesWxss = fs.readFileSync('pages/rules/rules.wxss', 'utf8');

assert(rulesUtil.includes("const merlinDesc = mordred ? '开局看到所有坏人（除莫德雷德）' : '开局看到所有坏人'"));
assert(rulesPageJs.includes("const { buildRules } = require('../../utils/rules');"));
assert(rulesWxml.includes('基本设置'));
assert(rulesWxml.includes('· 本局共 <text class="rules-hl">{{rules.playerCount}}</text> 名玩家，其中蓝方 {{rules.goodCount}} 人、红方 {{rules.evilCount}} 人'));
assert(rulesWxml.includes('<view class="rules-section-title">任务流程</view>'));
assert(rulesWxml.includes('<text class="rules-bold">组队阶段：</text>队长选择若干玩家'));
assert(rulesWxml.includes('　· 连续 5 次反对 → 红方直接获胜'));
assert(rulesWxml.includes('· 成功完成 <text class="rules-hl">3 次任务</text>，且刺客未成功刺杀梅林'));
assert(!rulesWxml.includes('适合线下聚会快速开局'));
assert(!rulesWxml.includes('天黑闭眼，红方阵营相识'));
assert(rulesWxml.includes('返回角色配置页面'));
assert(!rulesWxml.includes('按此配置开始主持'));
assert(!rulesWxml.includes('rules-page-header'));
assert(!rulesWxml.includes('<text class="rules-title">游戏规则</text>'));
assert(rulesWxml.includes('rules-footer-action'));
assert(rulesWxml.includes('rules-back-btn'));
assert(!rulesWxml.includes('`r`n'), 'rules footer should not render literal newline escape text beside the button');
assert(rulesWxss.includes('.rules-footer-action'));
assert(rulesWxss.includes('width: 100%;'));
assert(rulesWxss.includes('font-size: 38rpx;'));
assert(rulesWxss.includes('text-align: center;'));
assert(rulesWxss.includes('box-sizing: border-box;'));
assert(rulesWxss.includes('display: flex;'));
assert(rulesWxss.includes('justify-content: center;'));
assert(rulesWxss.includes('.rules-back-btn::after'));

console.log('rules content tests passed');
