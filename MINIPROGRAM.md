# 阿瓦隆语音主持 - 微信小程序开发文档

## 项目概述

阿瓦隆语音主持是一款辅助线下桌游《阿瓦隆》(Avalon / The Resistance) 夜间环节的微信小程序。通过预录制的语音指令引导玩家完成闭眼、睁眼、辨认身份等夜间流程，替代传统人工主持。

Web 版本与小程序版本功能一致，共享相同的游戏逻辑（角色配置、剧本生成、音频路径映射），分别针对各自平台独立实现。

---

## 技术栈

| 层面 | 技术 |
|------|------|
| 框架 | 微信小程序原生框架 (WXML / WXSS / JS) |
| 音频 | `wx.createInnerAudioContext()` |
| 数据持久化 | `wx.setStorageSync` / `wx.getStorageSync` |
| 页面间通信 | `getApp().globalData` |
| 语音合成 | 预生成 MP3，使用 edge-tts (zh-CN-XiaoxiaoNeural) |
| 开发工具 | 微信开发者工具 |

---

## 目录结构

```
miniprogram/
├── app.js                          # 入口：全局数据初始化
├── app.json                        # 小程序配置（页面路由、导航栏）
├── app.wxss                        # 全局样式（CSS 变量、基础组件样式）
├── audio/                          # 预生成 MP3（16 个，与 web 版共用同一套）
│   ├── close-eyes.mp3
│   ├── dawn.mp3
│   ├── evil-*.mp3                  # 坏人阵营相关音频（6 个变体）
│   ├── merlin-close-eyes.mp3
│   ├── merlin-*.mp3                # 梅林识人相关音频（5 个变体）
│   ├── percival-close-eyes.mp3
│   └── percival.mp3
├── components/
│   ├── progress-bar/               # 进度条组件
│   │   ├── progress-bar.js
│   │   ├── progress-bar.json
│   │   ├── progress-bar.wxml
│   │   └── progress-bar.wxss
│   └── step-dots/                  # 步骤指示器组件
│       ├── step-dots.js
│       ├── step-dots.json
│       ├── step-dots.wxml
│       └── step-dots.wxss
├── pages/
│   ├── setup/                      # 设置页：选人数/角色，预览剧本
│   │   ├── setup.js
│   │   ├── setup.json
│   │   ├── setup.wxml
│   │   └── setup.wxss
│   └── host/                       # 主持页：执行夜间流程
│       ├── host.js
│       ├── host.json
│       ├── host.wxml
│       └── host.wxss
├── utils/
│   ├── audio-manager.js            # 音频播放封装
│   └── config.js                   # 游戏逻辑（角色配置、剧本生成、音频映射）
├── ai/
│   └── SKILL.md                    # Claude Code AI 技能描述
├── project.config.json             # 微信开发者工具项目配置
└── project.private.config.json     # 私人配置（不进入版本控制）
```

---

## 页面流程

```
┌──────────────┐     ┌──────────────┐
│   设置页面    │────▶│   主持页面    │
│  选择人数    │     │  执行流程    │
│  选择角色    │     │  语音引导    │
│  设置暂停    │     │  手动推进    │
│  预览剧本    │     └──────┬───────┘
│  游戏规则    │            │ 结束/重来
│  开始主持    │            ▼
└──────────────┘     ┌──────────────┐
                     │   设置页面    │
                     │  (重新配置)  │
                     └──────────────┘
```

两个页面通过 `getApp().globalData` 传递配置数据：
- `playerCount` — 玩家人数 (5-10)
- `mordred` — 是否启用莫德雷德变体
- `oberon` — 是否启用奥伯伦变体
- `pauseDuration` — 暂停时长（秒）

---

## 全局入口

### app.js

初始化 `globalData`，设置默认配置：

```js
globalData: {
  playerCount: 7,
  mordred: false,
  oberon: false,
  pauseDuration: 5
}
```

### app.json

注册页面路由和导航栏样式：

- 页面顺序决定首页（`pages/setup/setup` 为首页）
- 导航栏标题"阿瓦隆主持"，深色背景 `#1a1a2e`，白色文字

### app.wxss

定义全局 CSS 变量和基础样式类：

- 主题色变量：`--bg-primary: #1a1a2e`、`--accent: #e8d5b7`（金色）、`--green: #5a9e6f`、`--red: #c0392b`
- 通用卡片样式 `.card`
- 按钮样式 `.btn`、`.btn-primary`、`.btn-secondary`
- 开关样式 `.toggle`

---

## 页面：设置页 (pages/setup)

### 功能

1. **玩家人数选择**：5-10 人圆形按钮
2. **角色配置展示**：显示当前人数下的蓝方/红方角色
3. **变体规则**（7-10 人局）：莫德雷德、奥伯伦开关（互斥逻辑处理）
4. **暂停时长**：+/- 步进器调节
5. **剧本预览**：按游戏环节分组展示所有步骤
6. **游戏规则**：弹窗展示根据当前配置定制的规则说明（人数、角色能力含变体说明、任务流程、胜利条件），防止背景页面穿透滚动
7. **开始主持**：保存配置并跳转到主持页面

### 核心逻辑 (setup.js)

**数据加载**：
- `onLoad()` 从 `app.globalData` 恢复上次配置
- 暂停时长优先从 `wx.getStorageSync('pauseDuration')` 读取

**渲染 (render)**：
- 根据 `playerCount`、`mordred`、`oberon` 调用 `utils/config.js` 的 `goods()` 和 `evils()` 计算角色列表
- 调用 `gen()` 生成剧本步骤，再调用 `previewGroups()` 分组用于展示

**互斥规则**：
- 7-9 人局仅 1 个"爪牙"槽位，莫德雷德和奥伯伦互斥
- 10 人局有 2 个"爪牙"槽位，两者可同时启用
- 人数变化时自动重置变体状态（`onCount` 中调用 `render()`）

**持久化**：
- 暂停时长通过 `wx.setStorageSync('pauseDuration', val)` 保存

**导航**：
- `onStart()` 将当前配置写入 `app.globalData`，销毁可能存在的音频上下文，然后 `wx.redirectTo` 跳转主持页

**游戏规则弹窗**：
- `buildRules()` 根据当前人数和角色选择动态生成规则内容
- 梅林描述随莫德雷德开关变化："开局看到所有坏人" / "开局看到所有坏人（除莫德雷德）"
- 弹窗通过 `catchtouchmove="noop"` 阻止背景页面滚动
- 规则内容在 `scroll-view` 中可独立滚动，底部"已阅"按钮绝对定位

---

## 页面：主持页 (pages/host)

### 功能

1. **执行夜间的 11 个步骤**（3 个可暂停确认环节）
2. **自动播放音频**（可切换为手动模式）
3. **暂停倒计时**：在需要等待玩家互动的环节自动倒计时
4. **手动推进**：点击台词文本或"下一步"按钮
5. **分享**：支持微信分享（分享标题包含玩家人数）

### 夜间流程（11 步）

| 步骤 | 环节 | 台词 | 类型 |
|------|------|------|------|
| 0 | 天黑闭眼 | 所有人请闭眼 | 自动 |
| 1 | 阵营相识 | 坏人请睁眼，互相确认身份 | 自动 |
| 2 | 阵营相识 | 请确认所有坏人身份 | **暂停** |
| 3 | 阵营相识 | 坏人请闭眼 | 自动 |
| 4 | 梅林识人 | 坏人竖起拇指，梅林请睁眼 | 自动 |
| 5 | 梅林识人 | 请梅林确认坏人身份 | **暂停** |
| 6 | 梅林识人 | 梅林请闭眼，坏人收回拇指 | 自动 |
| 7 | 派西维尔辨人 | 梅林和莫甘娜竖起拇指，派西维尔请睁眼 | 自动 |
| 8 | 派西维尔辨人 | 请派西维尔确认梅林和莫甘娜 | **暂停** |
| 9 | 派西维尔辨人 | 派西维尔请闭眼，收回拇指 | 自动 |
| 10 | 天亮 | 天亮了，所有人请睁眼 | 自动 |

**步骤 2、5、8 为暂停步骤**，不播放音频，显示倒计时后自动推进。

### 核心逻辑 (host.js)

**初始化 (onLoad)**：
- 从 `app.globalData` 读取配置
- 调用 `config.gen()` 生成 11 个步骤
- 调用 `audioManager.create()` 创建音频上下文
- 调用 `showSec(0)` 展示第一步

**步骤展示 (showSec)**：
- 更新当前索引、环节标签、台词文本
- 更新进度条百分比和步骤圆点位置
- 如果开启了自动播放，调用 `playSec()`

**音频播放 (playSec)**：
- 通过 `config.audioPath()` 获取音频文件路径
- 无音频的步骤直接跳到暂停或自动推进逻辑
- 调用 `audioManager.play(src, onEnd, onError)`
- 播放成功：音频结束后触发回调，暂停步骤进入倒计时，非暂停步骤自动推进
- 播放失败：显示提示信息，等待用户手动点击

**暂停倒计时 (startPause)**：
- `setInterval` 每秒更新剩余秒数显示
- `setTimeout` 到期后自动调用 `advance()` 推进
- 不播放任何音频，仅靠 UI 倒计时

**手动推进 (onAdvance / onTapText)**：
- 停止当前音频 (`audioManager.stop()`)
- 清除所有计时器 (`clearTimers()`)
- 推进到下一步或标记完成

**完成 (done)**：
- 隐藏"下一步"和自动播放开关
- 显示"主持完成"和"重新开始"按钮
- 可分享结果

**生命周期**：
- `onUnload()` 销毁音频上下文 (`audioManager.destroy()`)
- `onShareAppMessage()` 返回分享配置

---

## 组件

### progress-bar

水平进度条，支持 CSS 过渡动画。

**属性**：

| 属性 | 类型 | 说明 |
|------|------|------|
| percent | Number | 进度百分比 (0-100) |

**样式**：3px 高，圆角，金色填充 (`#e8d5b7`)，灰色轨道 (`#3a3a5c`)。

### step-dots

步骤圆点指示器，显示当前进度位置。

**属性**：

| 属性 | 类型 | 说明 |
|------|------|------|
| total | Number | 总步骤数 |
| current | Number | 当前步骤索引 (0-based) |

**圆点状态**：
- 普通：灰色 (`#3a3a5c`)，10px 圆形
- 活跃 (`active`)：金色 (`#e8d5b7`)，当前步骤
- 完成 (`done`)：绿色 (`#5a9e6f`)，已完成的步骤

---

## 工具模块

### utils/config.js

共享游戏逻辑，被两个页面引用。

**导出函数**：

| 函数 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `goods(count)` | 玩家人数 | 角色名数组 | 好人方角色列表 |
| `evils(count, mordred, oberon)` | 人数 + 变体标志 | 角色名数组 | 坏人方角色列表（含变体替换） |
| `gen(count, mordred, oberon, pause)` | 全部配置 | 步骤对象数组 | 生成 11 个步骤的完整剧本 |
| `roleAudioKey(roles)` | 角色名数组 | 字符串 | 角色名拼接为音频文件名片段 |
| `audioPath(count, mordred, oberon, stepIndex)` | 配置 + 步骤索引 | 路径字符串 | 返回音频文件路径，无音频时返回 `''` |
| `previewGroups(steps)` | 步骤数组 | 分组数组 | 将连续同环节步骤合并，用于剧本预览 |

**CFG 角色配置**：

```js
CFG = {
  5:  { good: ['梅林', '派西维尔', '忠臣'],                evil: ['刺客', '莫甘娜'],             min: 0 },
  6:  { good: ['梅林', '派西维尔', '忠臣', '忠臣'],         evil: ['刺客', '莫甘娜'],             min: 0 },
  7:  { good: ['梅林', '派西维尔', '忠臣', '忠臣'],         evil: ['刺客', '莫甘娜', '爪牙'],      min: 1 },
  8:  { good: ['梅林', '派西维尔', '忠臣', '忠臣', '忠臣'],  evil: ['刺客', '莫甘娜', '爪牙'],      min: 1 },
  9:  { good: ['梅林', '派西维尔', '忠臣', '忠臣', '忠臣', '忠臣'], evil: ['刺客', '莫甘娜', '爪牙'], min: 1 },
  10: { good: ['梅林', '派西维尔', '忠臣', '忠臣', '忠臣', '忠臣'], evil: ['刺客', '莫甘娜', '爪牙', '爪牙'], min: 2 },
}
```

**音频文件名命名规则**：
- 步骤 1（坏人睁眼）：`evil-{角色键用-连接}.mp3`，例如 `evil-assassin-morgana-minion.mp3`
- 步骤 4（梅林识人）：`merlin-{坏人角色键用-连接}.mp3`，例如 `merlin-assassin-morgana-mordred.mp3`
- 固定音频（不受配置影响）直接返回固定文件名

### utils/audio-manager.js

封装微信 `InnerAudioContext`，提供统一的播放接口。

**API**：

| 方法 | 说明 |
|------|------|
| `create()` | 创建音频上下文，设置 `obeyMuteSwitch = false` |
| `destroy()` | 销毁音频上下文 |
| `play(src, onEnd, onError)` | 播放指定音频，支持结束/错误回调；使用 `runToken` 防止过期回调 |
| `stop()` | 停止播放并递增 `runToken` |

**关键设计**：
- `obeyMuteSwitch = false` 确保 iOS 静音开关开启时仍能播放
- `runToken` 机制：每次 `play()` 记录当前 token，回调中校验 token 是否匹配，防止快速切换音频时前一个音频的回调误触发

---

## 音频系统

### 音频文件（16 个 MP3）

使用 Python 脚本 `tools/generate_audio.py` 通过 `edge-tts` 库（zh-CN-XiaoxiaoNeural 语音，语速 -10%）预生成。

音频覆盖所有人数 (5-10) 和变体（莫德雷德、奥伯伦）的组合。部分组合共享同一音频文件（例如 7 人局含莫德雷德与 8 人局含莫德雷德使用相同的 `evil-*.mp3`）。

### 播放策略

- **自动模式**（默认）：每步音频播放完毕后自动推进到下一步；暂停步骤自动倒计时
- **手动模式**：关闭自动播放开关，每步需点击"下一步"按钮或点击台词文本推进
- **降级处理**：音频加载/播放失败时，显示提示信息，用户手动点击推进即可，不影响主持流程

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

---

## 开发指南

### 环境准备

1. 下载并安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开工具，选择"导入项目"，指向 `miniprogram/` 目录
3. 填写 AppID（`wx204299628099ac7f`）或使用测试号

### 本地开发

1. 在微信开发者工具中直接编辑代码，支持热重载
2. 音频文件在 `miniprogram/audio/` 目录，无需额外配置
3. 模拟器中可完整测试音频播放和页面跳转

### 生成音频

如需重新生成音频，在项目根目录运行：

```bash
cd tools
pip install edge-tts
python generate_audio.py
```

生成的 MP3 会输出到 `tools/audio/`，需手动复制到 `miniprogram/audio/` 和根目录的 `audio/`。

### 目录注意事项

- `audio/` 目录下的 MP3 不入库（通过 `.gitignore` 忽略），需本地生成
- `project.private.config.json` 为私人配置文件，不入库

---

## 与 Web 版的差异

| 方面 | Web 版 | 小程序版 |
|------|--------|----------|
| 文件结构 | 单文件 `index.html` | 多文件模块化 |
| 页面流程 | 三步视图（配置→预览→主持） | 两页面（设置→主持），预览与设置同页 |
| 视图切换 | DOM 显示/隐藏 | 页面路由 (`wx.redirectTo`) |
| 音频 API | `<audio>` 元素 | `wx.createInnerAudioContext()` |
| 状态管理 | JS 闭包变量 + `localStorage` | `getApp().globalData` + `wx.setStorageSync` |
| 组件复用 | 无 | WXML 自定义组件 |
| 分享 | 不支持 | 微信分享 (`onShareAppMessage`) |
| 音频绕过静音 | 不保证 | `obeyMuteSwitch = false` |
| 游戏逻辑 | 内联在 HTML | `utils/config.js` 模块复用 |
| 游戏规则 | JS 动态生成 HTML 注入弹窗 | WXML 模板 + `buildRules()` 数据绑定 |

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-06-09 | 初始版本，完整实现设置页、主持页、组件、音频管理、游戏逻辑模块 |
| 2026-06-11 | 设置页增加游戏规则弹窗，替换测试声音按钮；规则内容根据人数和角色动态定制 |
