# 阿瓦隆主持人开发文档

## 概述

单页 Web 应用，用于阿瓦隆桌游线下局夜间环节主持。应用面向手机浏览器使用，部署在腾讯云 CloudBase 静态网站托管的 `avalon/` 目录下。

语音只使用预生成静态 MP3，通过页面中的 `<audio>` 播放。浏览器不支持或阻止音频播放时，用户仍可手动点击“下一步”完成流程。

## 技术栈

| 项 | 选型 |
|---|---|
| 前端 | 原生 HTML/CSS/JS |
| 音频播放 | 静态 MP3 + `<audio>` |
| 音频生成 | `tools/generate_audio.py` + `edge-tts` |
| 部署 | 腾讯云 CloudBase 静态网站托管 |
| 本地存储 | `localStorage` 保存暂停时长 |

## 文件结构

```text
game/
├── index.html               # 页面、样式和前端逻辑
├── audio/                   # 预生成静态 MP3，当前 16 个
├── tools/
│   ├── generate_audio.py    # 静态音频生成脚本
│   └── generate_qr.py       # 访问二维码生成脚本
└── DEV.md                   # 开发文档
```

## 页面流程

```text
角色配置 -> 剧本预览 -> 主持执行
    ^           |          |
    |-------- 返回修改      |
    |------------ 结束/重新开始
```

### 角色配置

- 选择 5-10 人，默认 7 人。
- 展示好人方和坏人方角色。
- 7-9 人局可选择莫德雷德或奥伯伦，二者互斥。
- 10 人局可同时选择莫德雷德和奥伯伦。
- 可设置暂停时长，默认 5 秒，范围 1-60 秒。

### 剧本预览

- 根据人数和角色选项生成夜间流程。
- “测试声音”播放 `audio/close-eyes.mp3`。
- “开始主持”进入执行页并播放第一段音频。

### 主持执行

- 展示当前环节、台词、进度条和步骤圆点。
- 自动播放开启时，按环节播放静态 MP3。
- 暂停环节不播放音频，只按暂停时长倒计时。
- “下一步”停止当前音频或倒计时并进入下一环节。
- 点击中间台词区域也会进入下一步。

## 角色配置

`CFG` 定义基础人数配置：

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

`evils()` 会按选项替换坏人列表中的爪牙：

- 莫德雷德：`爪牙 -> 莫德雷德`
- 奥伯伦：`爪牙 -> 奥伯伦`

## 夜间流程

`gen()` 生成 11 个步骤，其中 3 个是无音频暂停步骤。

| 索引 | 环节 | 音频 |
|---:|---|---|
| 0 | 天黑闭眼 | 所有人闭眼 |
| 1 | 阵营相识 | 除奥伯伦外坏人睁眼 |
| 2 | 阵营相识 | 暂停确认 |
| 3 | 阵营相识 | 闭眼 |
| 4 | 梅林识人 | 除莫德雷德外坏人竖大拇指，梅林睁眼 |
| 5 | 梅林识人 | 暂停等待 |
| 6 | 梅林识人 | 梅林闭眼，收回大拇指 |
| 7 | 派西维尔辨人 | 梅林和莫甘娜竖大拇指，派西维尔睁眼 |
| 8 | 派西维尔辨人 | 暂停等待 |
| 9 | 派西维尔辨人 | 派西维尔闭眼，收回大拇指 |
| 10 | 天亮 | 所有人睁眼 |

关键过滤规则：

- 阵营相识名单：`evils()` 去掉 `奥伯伦`。
- 梅林识人竖拇指名单：`evils()` 去掉 `莫德雷德`。

## 音频播放

核心函数：

- `audioSrc(stepIndex)`：根据当前配置返回 MP3 路径。
- `playAudio(src, onEnd)`：播放静态 MP3，播放结束后回调。
- `stopAudio()`：停止当前音频并清空 `<audio>`。
- `testSound()`：播放 `audio/close-eyes.mp3`。

自动推进：

```text
playSec(i)
  -> playAudio(audioSrc(i), onEnd)
  -> 有音频: 播放结束后进入下一步
  -> 无音频暂停: 倒计时后进入下一步
```

如果音频加载或播放失败，页面显示提示并等待用户手动点击“下一步”。

## 音频文件

当前生成 16 个唯一 MP3。

固定音频：

```text
close-eyes.mp3
evil-close-eyes.mp3
merlin-close-eyes.mp3
percival.mp3
percival-close-eyes.mp3
dawn.mp3
```

动态音频按实际可见角色组合命名：

```text
evil-assassin-morgana.mp3
evil-assassin-morgana-minion.mp3
evil-assassin-morgana-mordred.mp3
merlin-assassin-morgana.mp3
merlin-assassin-morgana-oberon.mp3
```

角色 key：

| 角色 | key |
|---|---|
| 刺客 | `assassin` |
| 莫甘娜 | `morgana` |
| 爪牙 | `minion` |
| 莫德雷德 | `mordred` |
| 奥伯伦 | `oberon` |

## 生成音频

安装依赖：

```powershell
python -m pip install --user edge-tts
```

重新生成：

```powershell
python tools\generate_audio.py
```

脚本会删除 `audio/*.mp3` 并重新生成当前需要的 16 个 MP3。音色为 `zh-CN-XiaoxiaoNeural`，语速为 `-10%`。

修改台词、角色组合或命名规则时，需要同时检查：

- `index.html` 中的 `audioSrc()`
- `tools/generate_audio.py` 中的 `audio_name()`

## CloudBase 部署

环境：

```text
环境 ID: zl0312-7ghdq45zda52ea30
静态网站域名: https://zl0312-7ghdq45zda52ea30-1251698841.tcloudbaseapp.com
应用路径: /avalon/index.html
```

部署页面：

```powershell
tcb hosting deploy index.html avalon/index.html -e zl0312-7ghdq45zda52ea30
```

部署音频：

```powershell
tcb hosting deploy audio avalon/audio -e zl0312-7ghdq45zda52ea30
```

清理远端旧音频目录：

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

## 验证清单

- 页面脚本语法正确。
- `audio/` 下存在 16 个 MP3。
- `tools/generate_audio.py` 期望的文件名都能在 `audio/` 中找到。
- “测试声音”可以播放 `close-eyes.mp3`。
- 主持流程能按 11 个步骤自动或手动推进。
