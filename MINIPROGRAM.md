# 阿瓦隆语音主持 - 微信小程序开发文档

## 项目概述

阿瓦隆语音主持是一款辅助线下桌游《阿瓦隆》(Avalon / The Resistance) 夜间环节的微信小程序。通过预录制的语音指令引导玩家完成闭眼、睁眼、辨认身份等夜间流程，替代传统人工主持。

小程序总大小约 **656KB**，远低于 2MB 主包限制。支持 5-10 人局，含莫德雷德和奥伯伦变体，并集成微信 AI Agent 技能，可通过自然语言操控小程序。

---

## 技术栈

| 层面 | 技术 |
|------|------|
| 框架 | 微信小程序原生框架 (WXML / WXSS / JS) |
| 音频 | `wx.createInnerAudioContext()` |
| 数据持久化 | `wx.setStorageSync` / `wx.getStorageSync` |
| 页面间通信 | `getApp().globalData` |
| AI Agent | 微信小程序 AI 开发模式（beta），SKILL.md + mcp.json + 原子接口 |
| 语音合成 | 预生成 MP3，使用 edge-tts (zh-CN-XiaoxiaoNeural) |
| 开发工具 | 微信开发者工具 |

---

## 目录结构

```
miniprogram/
├── app.js                          # 入口：全局数据初始化 + 全局错误处理
├── app.json                        # 小程序配置（页面路由、Agent Skill、导航栏）
├── app.wxss                        # 全局样式（CSS 变量、基础组件样式）
├── audio/                          # 预生成 MP3（15 个）
│   ├── close-eyes.mp3
│   ├── dawn.mp3
│   ├── evil-*.mp3                  # 坏人阵营相关音频（7 个变体）
│   ├── merlin-close-eyes.mp3
│   ├── merlin-*.mp3                # 梅林识人相关音频（4 个变体）
│   ├── percival-close-eyes.mp3
│   └── percival.mp3
├── components/
│   ├── progress-bar/               # 进度条组件
│   └── step-dots/                  # 步骤指示器组件
├── pages/
│   ├── setup/                      # 设置页：选人数/角色，预览剧本，开始主持
│   ├── host/                       # 主持页：执行夜间流程
│   └── rules/                      # 规则页：独立规则展示
├── packageAgent/
│   └── avalon-skill/               # 微信 AI Agent 技能包
│       ├── SKILL.md                # 技能说明（触发词、意图路由、业务约束）
│       ├── mcp.json                # 原子接口声明（startGame / showRules / getRoleInfo）
│       ├── index.js                # 接口注册入口
│       └── apis/                   # 原子接口实现
│           ├── startGame.js        # 配置并导航到设置页
│           ├── showRules.js        # 导航到规则页
│           └── getRoleInfo.js      # 查询角色阵营和能力
├── utils/
│   ├── audio-manager.js            # 音频播放封装（InnerAudioContext 单例）
│   ├── config.js                   # 游戏逻辑（角色配置、剧本生成、音频路径映射）
│   ├── entry.js                    # URL 参数解析与深层链接工具
│   └── rules.js                    # 规则数据构建（ROLE_DESC + buildRules）
├── tests/                          # 测试文件
│   ├── agent-package.test.js       # Agent Skill 包完整性测试
│   ├── entry.test.js               # URL 解析工具测试
│   ├── rules-builder.test.js       # buildRules 逻辑测试
│   ├── rules-content.test.js       # 规则页面内容测试
│   ├── setup-cleanup.test.js       # 设置页死代码清理验证
│   └── setup-style.test.js         # 设置页样式验证
├── share.jpg                       # 分享卡片图片（24KB）
├── sitemap.json                    # 搜索索引配置
├── project.config.json             # 微信开发者工具项目配置
└── project.private.config.json     # 私人配置（不进入版本控制）
```

---

## 页面流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   设置页面    │────▶│   主持页面    │────▶│   设置页面    │
│  选择人数    │     │  执行流程    │     │  (再来一局)  │
│  选择角色    │     │  语音引导    │     └──────────────┘
│  设置暂停    │     │  手动推进    │
│  预览剧本    │     └──────────────┘
│  开始主持    │
└──────┬───────┘
       │ 游戏规则
       ▼
┌──────────────┐
│   规则页面    │
│  角色能力    │
│  任务流程    │
│  胜利条件    │
└──────────────┘
```

页面间通过 `getApp().globalData` 传递配置：
- `playerCount` — 玩家人数 (5-10)
- `mordred` — 是否启用莫德雷德变体
- `oberon` — 是否启用奥伯伦变体
- `pauseDuration` — 暂停时长（秒，默认 5）

通过 URL 查询参数支持深层链接（用于分享/AI Agent 跳转）：
- `?players=7&mordred=1&oberon=1`

---

## 全局入口

### app.js

```js
App({
  globalData: {
    playerCount: 7,
    mordred: false,
    oberon: false,
    pauseDuration: 5
  }
})
```

### app.json

注册 3 个页面（setup 为首页）、1 个 AI Agent 技能、1 个独立子包：

```json
{
  "pages": ["pages/setup/setup", "pages/host/host", "pages/rules/rules"],
  "subPackages": [{
    "root": "packageAgent",
    "independent": true,
    "pages": []
  }],
  "agent": {
    "skills": [{
      "name": "avalon-skill",
      "description": "阿瓦隆/抵抗组织桌游语音主持",
      "path": "packageAgent/avalon-skill"
    }]
  }
}
```

### sitemap.json

- `pages/setup/setup` 和 `pages/rules/rules` 允许搜索索引
- `pages/host/host` 禁止索引（游戏会话属于动态内容）

---

## 页面：设置页 (pages/setup)

### 功能

1. **玩家人数选择**：5-10 人圆形按钮
2. **角色配置展示**：显示当前人数下的蓝方/红方角色
3. **变体规则**（7-10 人局）：莫德雷德、奥伯伦开关（互斥逻辑处理）
4. **暂停时长**：+/- 步进器调节（1-60 秒）
5. **剧本预览**：按游戏环节分组展示所有 11 个步骤
6. **游戏规则**：跳转到独立的 rules 页面
7. **开始主持**：保存配置并跳转到主持页面

### 核心逻辑 (setup.js)

**数据加载 (onLoad)**：
- 优先从 URL 查询参数恢复配置（支持深层链接和 AI Agent 跳转）
- 其次从 `app.globalData` 恢复
- 暂停时长从 `wx.getStorageSync('pauseDuration')` 读取

**渲染 (render)**：
- 调用 `utils/config.js` 的 `goods()` 和 `evils()` 计算角色列表
- 调用 `gen()` 生成剧本步骤，再调用 `previewGroups()` 分组用于展示

**互斥规则**：
- 5-6 人局：无变体槽位，莫德雷德/奥伯伦不可用
- 7-9 人局：仅 1 个"爪牙"槽位，莫德雷德和奥伯伦互斥（二选一）
- 10 人局：2 个槽位，两者可同时启用

**持久化**：
- 暂停时长通过 `wx.setStorageSync('pauseDuration', val)` 保存

---

## 页面：主持页 (pages/host)

### 夜间流程（11 步）

| 步骤 | 环节 | 台词 | 类型 |
|------|------|------|------|
| 0 | 天黑闭眼 | 请所有人闭上眼睛 | 音频 |
| 1 | 阵营相识 | 坏人请睁开眼睛（除奥伯伦） | 音频 |
| 2 | 阵营相识 | 确认彼此身份 | **暂停** |
| 3 | 阵营相识 | 请闭上眼睛 | 音频 |
| 4 | 梅林识人 | 坏人竖起大拇指，梅林请睁开眼睛 | 音频 |
| 5 | 梅林识人 | 请等待 | **暂停** |
| 6 | 梅林识人 | 梅林请闭上眼睛，请收回大拇指 | 音频 |
| 7 | 派西维尔辨人 | 梅林和莫甘娜竖起大拇指，派西维尔请睁开眼睛 | 音频 |
| 8 | 派西维尔辨人 | 请等待 | **暂停** |
| 9 | 派西维尔辨人 | 派西维尔请闭上眼睛，请收回大拇指 | 音频 |
| 10 | 天亮 | 天亮了，请所有人睁开眼睛 | 音频 |

步骤 2、5、8 为暂停步骤，不播放音频，显示倒计时后自动推进。

### 核心逻辑 (host.js)

**音频播放 (playSec)**：
- 通过 `config.audioPath()` 获取音频文件路径
- 无音频步骤直接跳到暂停或自动推进
- 播放成功 → 自动推进；播放失败 → 提示用户手动点击

**暂停倒计时 (startPause)**：
- `setInterval` 每秒更新剩余秒数
- `setTimeout` 到期后自动调用 `advance()` 推进

**手动控制**：
- 点击台词文本或"下一步"按钮手动推进
- 可切换自动/手动播放模式
- "再来一局"直接跳回设置页

---

## 页面：规则页 (pages/rules)

独立的规则参考页面，通过设置页的"游戏规则"按钮进入。

**数据来源**：
- URL 查询参数解析（`utils/entry.js` 的 `parseSetupOptions`）
- 规则数据由 `utils/rules.js` 的 `buildRules()` 动态生成

**内容**：
- 基本设置（人数、蓝红方数量）
- 角色能力（按阵营分组，梅林描述随莫德雷德开关变化）
- 任务流程（组队→投票→执行）
- 胜利条件

---

## 组件

### progress-bar

水平进度条，属性 `percent` (0-100)，3px 高，金色填充 `#e8d5b7`。

### step-dots

步骤圆点指示器。属性 `total`（总步骤数）、`current`（当前索引）。圆点状态：普通（灰）→ 活跃（金色）→ 完成（绿色）。

---

## 工具模块

### utils/config.js

共享游戏逻辑核心模块。

| 函数 | 说明 |
|------|------|
| `goods(count)` | 返回好人方角色列表 |
| `evils(count, mordred, oberon)` | 返回坏人方角色列表（含变体替换） |
| `gen(count, mordred, oberon)` | 生成 11 个步骤的完整剧本 |
| `roleAudioKey(roles)` | 角色名按字母排序后拼接为音频文件名片段 |
| `audioPath(count, mordred, oberon, stepIndex)` | 返回音频文件路径（无音频时返回 `''`） |
| `previewGroups(steps)` | 将连续同环节步骤合并，用于剧本预览 |

**CFG 角色配置**：

```js
CFG = {
  5:  { good: ['梅林','派西维尔','忠臣'],           evil: ['刺客','莫甘娜'],           min: 0 },
  6:  { good: ['梅林','派西维尔','忠臣','忠臣'],      evil: ['刺客','莫甘娜'],           min: 0 },
  7:  { good: ['梅林','派西维尔','忠臣','忠臣'],      evil: ['刺客','莫甘娜','爪牙'],     min: 1 },
  8:  { good: ['梅林','派西维尔','忠臣','忠臣','忠臣'], evil: ['刺客','莫甘娜','爪牙'],   min: 1 },
  9:  { good: ['梅林','派西维尔','忠臣'×4],          evil: ['刺客','莫甘娜','爪牙'],     min: 1 },
  10: { good: ['梅林','派西维尔','忠臣'×4],          evil: ['刺客','莫甘娜','爪牙','爪牙'], min: 2 },
};
```

`roleAudioKey()` 对角色英文键进行字母排序，确保输出与音频文件命名一致。例如 `['刺客','莫甘娜','爪牙','奥伯伦']` → `'assassin-morgana-minion-oberon'`。

### utils/audio-manager.js

InnerAudioContext 单例封装，`runToken` 机制防止过期回调。

| 方法 | 说明 |
|------|------|
| `create()` | 创建音频上下文，`obeyMuteSwitch = false` |
| `destroy()` | 销毁音频上下文 |
| `play(src, onEnd, onError)` | 播放音频，token 校验回调 |
| `stop()` | 停止播放并递增 token |

### utils/entry.js

URL 参数解析与深层链接工具。

| 函数 | 说明 |
|------|------|
| `parseSetupOptions(options)` | 解析查询参数，应用互斥规则，返回标准化配置 |
| `buildSetupPath(config)` | 构建 setup 页面深层链接路径 |
| `hasSetupOptions(options)` | 判断查询参数是否包含设置选项 |

### utils/rules.js

规则数据构建模块，被 rules 页面引用以避免与 setup 页面重复代码。

| 函数 | 说明 |
|------|------|
| `buildRules({ playerCount, mordred, oberon })` | 返回完整的规则数据结构（角色列表、阵营人数、能力描述） |

---

## AI Agent 技能 (packageAgent/avalon-skill)

### 概述

注册为微信小程序 AI 开发模式（beta）的技能包，使用独立子包运行。AI Agent 通过自然语言识别用户意图，自动调用原子接口导航或查询。

### 技能说明 (SKILL.md)

定义 5 个意图分支 + 触发词 + 业务约束：

| 分支 | 用户说法示例 | 调用的 API |
|------|-------------|-----------|
| 了解规则 | "阿瓦隆怎么玩""规则是什么" | `showRules` |
| 找主持工具 | "聚会需要主持人""自动带队" | `startGame`（默认参数） |
| 指定人数 | "阿瓦隆7人局""开一局" | `startGame`（传入人数） |
| 指定变体 | "10人带莫德雷德奥伯伦" | `startGame`（传入全部参数） |
| 角色咨询 | "梅林能看见谁""刺客怎么玩" | `getRoleInfo` |

### 原子接口 (mcp.json + apis/)

| API | 参数 | 功能 |
|-----|------|------|
| `startGame` | players(5-10), mordred, oberon | 校验参数 → 应用互斥规则 → 返回导航路径 |
| `showRules` | players, mordred, oberon（均可选） | 返回规则页导航路径 |
| `getRoleInfo` | roleName（必填） | 模糊匹配角色名 → 返回阵营和能力描述 |

### 测试

在微信开发者工具 Nightly 版（≥ 2.02.2606102）中，基础库 ≥ 3.16.1，编译模式切换为「小程序 AI 编译」即可调试。目前处于内测阶段，普通用户暂不可见。

---

## 音频系统

### 音频文件（15 个 MP3）

使用 `edge-tts` 预生成，覆盖所有人数 (5-10) 和变体组合。部分组合共享同一音频文件（例如 7 人局含莫德雷德与 8 人局含莫德雷德使用相同的 `evil-*.mp3`）。

| 类型 | 数量 | 命名规则 |
|------|------|----------|
| 固定音频 | 5 个 | `close-eyes`, `dawn`, `evil-close-eyes`, `merlin-close-eyes`, `percival-close-eyes`, `percival` |
| 坏人睁眼 | 4 个 | `evil-{角色键按字母排序}.mp3` |
| 梅林识人 | 4 个 | `merlin-{角色键按字母排序}.mp3` |

### 播放策略

- **自动模式**（默认）：音频结束后自动推进；暂停步骤倒计时
- **手动模式**：每步需手动点击推进
- **降级处理**：音频失败时显示提示，不影响主持流程

---

## 测试

```bash
# 运行全部测试
node tests/agent-package.test.js    # Agent Skill 包结构与逻辑
node tests/entry.test.js            # URL 解析工具
node tests/rules-builder.test.js    # 规则数据构建
node tests/rules-content.test.js    # 规则页面内容
node tests/setup-cleanup.test.js    # 设置页死代码清理验证
node tests/setup-style.test.js      # 设置页样式验证
```

---

## 微信配置

### project.config.json

| 配置项 | 值 |
|--------|-----|
| appid | `wx204299628099ac7f` |
| projectname | `avalon-host` |
| compileType | `miniprogram` |
| es6 | `true` |
| minified | `true` |
| urlCheck | `true` |
| uploadWithSourceMap | `false` |

---

## 开发指南

### 环境准备

1. 安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开工具 → 导入项目 → 指向 `miniprogram/` 目录
3. 填写 AppID 或使用测试号

### 生成音频

```bash
cd tools
pip install edge-tts
python generate_audio.py
```

生成的 MP3 输出到 `tools/audio/`，需手动复制到 `miniprogram/audio/`。

### AI Agent 调试

1. 下载 Nightly 版开发者工具（≥ 2.02.2606102）
2. 基础库切换到 3.16.1+
3. 编译模式切换为「小程序 AI 编译」
4. 在对话面板输入自然语言测试

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-06-09 | 初始版本：设置页、主持页、组件、音频管理、游戏逻辑模块 |
| 2026-06-11 | 设置页增加游戏规则弹窗，UI 优化与修复爪牙重复播报 |
| 2026-06-26 | 精简优化：修复音频文件名 bug（roleAudioKey 排序）、移除死代码、添加网页版步进器 |
| 2026-06-29 | 规则弹窗改为独立页面；ROLE_DESC 和 buildRules 提取到 utils/rules.js；新增 utils/entry.js 深层链接 |
| 2026-06-29 | 补全 AI Agent Skill：mcp.json 声明 3 个接口、index.js 注册、apis/ 实现；share.jpg 压缩 83→24KB；新增测试覆盖；总大小 656KB |
