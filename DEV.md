# 阿瓦隆线下主持人 - 开发文档

## 概述

单页 Web 应用，用于阿瓦隆桌游线下局夜间环节的主持。应用面向移动端使用，部署在腾讯云 CloudBase 静态网站托管的 `avalon/` 目录下。

当前语音方案是：

1. 优先播放预生成的静态 MP3 音频，兼容微信/QQ 等内置浏览器。
2. 静态音频不可用时，退回浏览器 Web Speech API。
3. 如果两者都失败，页面仍可手动点击“下一步”完成主持流程。

## 技术栈

| 项 | 选型 |
|---|---|
| 前端 | 原生 HTML/CSS/JS，零运行时依赖 |
| 主语音方案 | 静态 MP3，通过 `<audio>` 播放 |
| 兜底语音方案 | 浏览器 Web Speech API (`SpeechSynthesis`) |
| 音频生成 | `tools/generate_audio.py` + `edge-tts` |
| 部署 | 腾讯云 CloudBase 静态网站托管 |
| 存储 | `localStorage` 保存浏览器 TTS 音色偏好 |

## 文件结构

```text
game/
├── index.html               # 页面、样式和前端逻辑
├── audio/                   # 预生成静态 MP3，当前 20 个
├── tools/
│   └── generate_audio.py    # 静态音频生成脚本
└── DEV.md                   # 开发文档
```

## 页面流程

3 个视图，通过 CSS `.hidden` 切换。

```text
角色配置页 -> 剧本预览页 -> 主持执行页
     ^             |              |
     |---------- 返回修改          |
     |---------------- 结束/重新开始
```

### 视图 1：角色配置页

- 选择玩家人数：5-10 人，默认 7 人。
- 展示好人方/坏人方角色配置。
- 7 人及以上可替换爪牙为莫德雷德或奥伯伦。
- 浏览器 TTS 音色选择仍保留，仅作为静态音频失败后的兜底。

### 视图 2：剧本预览页

- 展示根据当前人数和角色选项生成的夜间流程。
- 提供“测试声音”按钮，直接播放 `audio/close-eyes.mp3`，用于检查当前浏览器是否允许点击后播放音频。
- 点击“开始主持”进入执行页并立即播放第一段静态音频。

### 视图 3：主持执行页

- 显示当前环节标题、台词、进度条和步骤圆点。
- 自动朗读开启时，按环节播放静态 MP3。
- 阵营相识环节播放结束后等待 5 秒倒计时。
- “下一步”会停止当前音频并跳到下一环节。
- “结束”会停止音频和计时器，返回配置页。

## 核心数据

### 角色配置 `CFG`

```js
const CFG = {
  5:  { good:['梅林','派西维尔','忠臣'], evil:['刺客','莫甘娜'], min:0 },
  6:  { good:['梅林','派西维尔','忠臣','忠臣'], evil:['刺客','莫甘娜'], min:0 },
  7:  { good:['梅林','派西维尔','忠臣','忠臣'], evil:['刺客','莫甘娜','爪牙'], min:1 },
  8:  { good:['梅林','派西维尔','忠臣','忠臣','忠臣'], evil:['刺客','莫甘娜','爪牙'], min:1 },
  9:  { good:['梅林','派西维尔','忠臣','忠臣','忠臣','忠臣'], evil:['刺客','莫甘娜','爪牙'], min:1 },
  10: { good:['梅林','派西维尔','忠臣','忠臣','忠臣','忠臣'], evil:['刺客','莫甘娜','爪牙','爪牙'], min:2 },
};
```

`min` 表示可替换爪牙数量：

- `0`：不显示莫德雷德/奥伯伦选项。
- `1`：7-9 人局，莫德雷德和奥伯伦互斥。
- `2`：10 人局，可同时选择莫德雷德和奥伯伦。

### 坏人替换逻辑

`evils()` 从基础坏人列表复制一份并按顺序替换第一个可用的 `'爪牙'`：

- 勾选莫德雷德：`爪牙 -> 莫德雷德`
- 勾选奥伯伦：`爪牙 -> 奥伯伦`

## 夜间剧本

`gen()` 根据当前角色配置返回 6 个环节：

| 索引 | 环节 | 要点 |
|---:|---|---|
| 0 | 天黑闭眼 | 所有人闭眼握拳 |
| 1 | 阵营相识 | 除奥伯伦外坏人睁眼相识，播放后等待 5 秒 |
| 2 | 阵营相识 | 坏人闭眼 |
| 3 | 梅林识人 | 除莫德雷德外坏人竖大拇指 |
| 4 | 派西维尔辨人 | 梅林和莫甘娜竖大拇指，派西维尔睁眼辨认 |
| 5 | 天亮 | 所有人睁眼 |

关键过滤规则：

- 阵营相识名单：`evils()` 去掉 `'奥伯伦'`。
- 梅林识人竖拇指名单：`evils()` 去掉 `'莫德雷德'`。

## 静态音频方案

### 为什么使用静态音频

微信、QQ 等内置浏览器通常不支持或限制 `SpeechSynthesis`，网页无法强制开启。静态 MP3 通过 `<audio>` 播放，在用户点击后兼容性更高。

### 播放流程

核心函数：

- `audioSrc(stepIndex)`：根据当前人数、莫德雷德/奥伯伦选项和步骤索引返回 MP3 路径。
- `speak(texts, onEnd, src)`：优先播放静态 MP3，失败后调用 `speakWithBrowser()`。
- `speakWithBrowser(text, token, done)`：使用 Web Speech API 兜底。
- `testSound()`：点击“测试声音”时播放固定音频 `audio/close-eyes.mp3`。

自动推进流程：

```text
playSec(i)
  -> speak(sec.txt, onEnd, audioSrc(i))
  -> 静态 MP3 播放结束
  -> 有 delay: 倒计时 5 秒后 showSec(i+1)
  -> 无 delay: 直接 showSec(i+1)
```

### 音频复用

旧版本按“人数 + 角色选项 + 步骤”生成 90 个文件。当前版本按实际台词复用，只保留 20 个唯一 MP3，总大小约 1.2 MB。

固定环节音频：

```text
close-eyes.mp3
evil-close-eyes.mp3
percival.mp3
dawn.mp3
```

动态环节按角色组合命名，例如：

```text
evil-assassin-morgana.mp3
evil-assassin-morgana-oberon-note.mp3
merlin-assassin-morgana-mordred-note.mp3
merlin-assassin-morgana-oberon-mordred-note.mp3
```

命名规则：

- 角色英文 key 定义在 `ROLE_AUDIO_KEY`：
  - `刺客 -> assassin`
  - `莫甘娜 -> morgana`
  - `爪牙 -> minion`
  - `莫德雷德 -> mordred`
  - `奥伯伦 -> oberon`
- 阵营相识音频前缀：`evil-`
- 梅林识人音频前缀：`merlin-`
- 包含奥伯伦不参与相识说明时追加：`-oberon-note`
- 包含莫德雷德不可见说明时追加：`-mordred-note`

## 生成音频

首次使用需要安装生成依赖：

```powershell
python -m pip install --user edge-tts
```

重新生成所有音频：

```powershell
python tools\generate_audio.py
```

脚本会删除 `audio/*.mp3` 中的旧文件，并重新生成 20 个唯一音频。生成使用 `zh-CN-XiaoxiaoNeural`，语速 `-10%`。

修改台词、角色组合或命名规则时，需要同时检查：

- `index.html` 中的 `audioSrc()`
- `tools/generate_audio.py` 中的 `audio_name()`

两处规则必须保持一致。

## 移动端音频注意事项

- 内置浏览器可能只允许用户手势直接触发音频播放。
- “开始主持”和“测试声音”都绑定了 `touchend` 和 `click`。
- `<audio>` 使用 `playsinline` 和 `webkit-playsinline`。
- 如果“测试声音”无声，说明当前浏览器阻止了 `<audio>` 播放或音频未加载成功。
- 如果“测试声音”有声但主持无声，应优先检查 `audioSrc()` 是否返回了存在的文件。

## CloudBase 部署

当前环境：

```text
环境 ID: zl0312-7ghdq45zda52ea30
静态网站域名: https://zl0312-7ghdq45zda52ea30-1251698841.tcloudbaseapp.com
应用路径: /avalon/index.html
```

只部署到 `avalon/`，不要上传到根目录，避免影响其它 CloudBase 应用。

部署页面：

```powershell
tcb hosting deploy index.html avalon/index.html -e zl0312-7ghdq45zda52ea30
```

部署音频目录：

```powershell
tcb hosting deploy audio avalon/audio -e zl0312-7ghdq45zda52ea30
```

如果需要清理旧音频目录：

```powershell
tcb hosting delete avalon/audio --dir -e zl0312-7ghdq45zda52ea30
```

查看部署结果：

```powershell
tcb hosting list avalon -e zl0312-7ghdq45zda52ea30
```

访问地址：

```text
https://zl0312-7ghdq45zda52ea30-1251698841.tcloudbaseapp.com/avalon/index.html
```

如遇 CDN 缓存，可加版本参数验证：

```text
https://zl0312-7ghdq45zda52ea30-1251698841.tcloudbaseapp.com/avalon/index.html?v=audio2
```

## 验证清单

发布前建议检查：

- `node` 解析页面脚本无语法错误。
- `audio/` 下存在 20 个 MP3。
- `tools/generate_audio.py` 生成文件名和 `index.html` 的 `audioSrc()` 一致。
- `tcb hosting list avalon` 显示 `avalon/index.html` 和 `avalon/audio/*.mp3`。
- 远端 `audio/close-eyes.mp3` 返回 `200` 和 `Content-Type: audio/mpeg`。
- 手机上先点击“测试声音”，确认当前浏览器允许音频播放。
