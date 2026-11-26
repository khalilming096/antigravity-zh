# antigravity-zh

给 [Antigravity](https://antigravity.google)（Google 的 AI 编程 IDE / 桌面端）做**全中文界面**的工具集。

适配版本：**v2.35.2**（此前 2.35.x 均可用）。

---

## 为什么需要它

Antigravity 的界面是 Electron + React，**完全没有 i18n 框架**——12.21 MB 的 `/main.js` 里，`react-intl` / `useTranslation` / `IntlProvider` / `FormattedMessage` / `defineMessages` 出现 **0 次**。也就是说官方没有留接口，出不出中文包完全取决于 Google 想不想改架构，短期内不可能。

唯一可行的路是 DOM 文本替换：在 preload 阶段注入一段脚本，用 MutationObserver 盯着 DOM，把英文节点换成中文。

社区已经有人做这件事：[yuexps/Antigravity-Hans](https://github.com/yuexps/Antigravity-Hans)（字典 2767 条）。

**本项目不是另一个汉化补丁**，而是在它之上解决四个它没解决的问题：

| 问题 | 本项目 |
|---|---|
| 改了字典不生效（watcher 只判断 marker 在不在） | `patch.sha256` 哈希指纹，不一致就重打，另有 `-Force` |
| 带插值的句子全部漏译（`Shortcut Ctrl+K for Open Conversation Picker`） | 35 条 `DYNAMIC_TEMPLATES` 正则模板 + `trPart()` 片段翻译 |
| React 把一句话拆成多个文本节点，译成半中半英 | `translateTextRun()` 合并相邻文本节点后整句查表 |
| 模型名被误译（`Orchestrator` → 「编排器」） | `MODEL` 白名单自动还原英文 |

最终：**3985 条字典 + 35 条模板**，界面覆盖率约 95%。

---

## 效果

| 位置 | 翻译后 |
|---|---|
| 首页问候 | `嘿 Alex，今天想构建点什么?` / `很高兴见到你，Alex。接下来做什么?` |
| 侧栏 | `新建对话` `自动化` `自定义` `项目` `对话` `16小时前` |
| 设置页 11 个标签 | `常规` `应用` `外观` `快捷键` `通知` `模型` `浏览器` `项目` `对话` `提供反馈` `账户` |
| 模型页 | `模型与用量` `套餐` `模型积分` `Orchestrator 设置` `Orchestrator 模型` `执行器模型` `剩余每周额度` |
| 快捷键页 | `快捷键 Ctrl+K，用于打开对话选择器` / `移除快捷键 Ctrl+K，...` |
| 无障碍标签 | `智能体运行位置，当前：此计算机` / `选择模型，当前：Gemini 4 Neon Medium` |
| Token 提示 | `规则：2,885 个 token` / `技能：389 个 token` / `MCP 工具：1,666 个 token` |

模型名与品牌名**不译**（这是刻意的，不是漏译）：

- 模型：`Gemini 4 Neon` / `Gemini 4 Hydrogen` / `Gemini 3.8 Flash` / `Gemini Flash Next` / `Orchestrator` / `Claude Opus 5.5` / `Flash` / `Flash Lite` / `Pro` / `Default (Gemini Pro)` / `Default (Mendel)`
- 品牌：Google / GitHub / VS Code / Antigravity / Gemini / Firebase / Notion / Linear / Stripe / Vercel / Wix / Canva / Figma …
- 代码标识符、URL、按键（`Ctrl+K`）

---

## 安装

### 前置

本工具是**增量同步层**，建立在一个已经能工作的汉化补丁之上。所以先装一个基础补丁，再跑本项目的 `sync.js` 把字典升级上来。

可选的基础补丁：

- [yuexps/Antigravity-Hans](https://github.com/yuexps/Antigravity-Hans) —— 本项目的字典来源，同源，兼容性最好
- [haoze-evolluling/AntigravityCN](https://github.com/haoze-evolluling/AntigravityCN)
- [zhonghugo/antigravity-zh](https://github.com/zhonghugo/antigravity-zh)

任意一个装好后，`%APPDATA%\AntigravityChinesePatch\` 下应该存在：

```
preload.js      ← 字典 + 注入逻辑
watcher.ps1     ← 监听官方更新、自动重打 asar
watcher.log
```

### 升级到本项目的字典

```powershell
git clone https://github.com/khalilming096/antigravity-zh.git
cd antigravity-zh
node sync.js
```

`sync.js` 会：

1. 拉上游字典（`yuexps/Antigravity-Hans` 的 5 个 json，缓存进 `_hans/`）
2. 读现有 `preload.js` 的字典，**远程覆盖 + 本地独有保留**
3. 走 `MODEL` 白名单，把被误译的模型名还原成英文
4. 应用 `SUPPLEMENT`（62 条人工钉死的条目，修远程字典的错译和漏译）
5. 加载 `dict/extra*.json`（4 个本地补充字典）
6. 术语统一：原文含 `agent` 的条目，译文里的「代理」一律改「智能体」（proxy 语境才用「代理」）
7. 写回 `preload.js`（纯 ASCII `\uXXXX` 转义，避免编码问题）
8. 调 `powershell -File watcher.ps1 -Force` 重打 asar

输出示例：

```
  ✔ common.json          1182 条
  ✔ chat-agent.json       710 条
  ✔ settings.json         543 条
  ✔ marketplace.json      124 条
  ✔ ide.json              208 条

远程字典合计 2767 条
本地原有 3985 条 → 覆盖 5 条、新增 14 条 → 现 3999 条
模型名被误译 → 还原英文 3 条
本地补充 62 条
dict/extra.json 补充 28 条
dict/extra2.json 补充 68 条
dict/extra3.json 补充 8 条
dict/extra4.json 补充 39 条
术语统一 agent→智能体 31 条

preload.js 已写入（3989 条）
[WARN] Patch code changed. Re-patching...
[SUCCESS] Auto-healing successfully applied in-place (<50ms)!

补丁已重打 ✅ 重启 Antigravity 生效
```

**最后一步必须手动做：重启 Antigravity。** watcher 只改磁盘上的 `app.asar`，正在跑的进程还在用旧的。

### 官方更新后

不用管。`watcher.ps1` 监听 `resources` 目录，官方更新覆盖 asar 后 **600ms 内自动重打**，日志里会看到：

```
[WARN] Unpatched official Google release detected ... Auto-healing...
[SUCCESS] Auto-healing successfully applied in-place (<50ms)!
```

但**还是得自己重启一次 App**——watcher 不会替你重启。

---

## 原理

### 注入点

Antigravity 的 `app.asar` 里有 `dist/preload.js`（Electron preload，在页面脚本之前执行）。补丁就追加在这个文件末尾，用一个 mark 分隔原文与补丁：

```js
// ... 原始 preload 内容 ...
// Antigravity Chinese Localization Patch
// ... 补丁正文（字典 + 模板 + walker + observer）...
```

`watcher.ps1` 里的 C# `UniversalAsarEngine.InjectPreloadInPlace` 做的事：找到 `dist/preload.js` 条目 → 若已含 marker 则先截断到 marker 之前 → 追加新补丁 → 改写 asar 头部的 size / offset。**幂等**，可以反复跑。

### 翻译流程

```
translateText(text)
  ├─ 1. 精确查 dictionary            ← 3985 条静态字典
  ├─ 2. normalize 后再查（trim / 折叠空白 / 处理省略号）
  └─ 3. 逐条匹配 DYNAMIC_TEMPLATES   ← 35 条正则，捕获组可插值
     未命中 → 返回 null（不改动原文）
```

`DYNAMIC_TEMPLATES` 的**数组顺序有意义**：具体模板必须排在泛化模板之前，否则 `/^Open\s+(.+)$/` 会把 `/^Open\s+(.+)\s+Settings$/` 全吃掉。

### 三个关键函数

**`trPart(s)` —— 片段翻译**

模板里捕获到的片段本身可能是一条字典项：

```js
Shortcut Ctrl+K for Open Conversation Picker
  → 快捷键 Ctrl+K，用于打开对话选择器
```

只查静态字典、**不递归模板**（否则死循环）。也可以传 `null` 表示原文就是字典键、无须插值。

**`translateTextRun(el)` —— 多文本节点合并**

React 经常把一句话拆成相邻的多个文本节点：

```js
// bundle 里实际长这样：
E.createElement("p", null, "No ", V0.emptyMessagePlural, " yet")
```

逐节点 `translateText` 只会命中 `No`：字典里 `No` → 「否」，于是页面显示「**否** automations yet」。

`translateTextRun(el)` 扫描 `childNodes` 里连续的 `type === 3` 节点，拼接后整句查表，命中则写回第一个节点、其余清空。触发条件：至少 2 个连续文本节点、拼接后 `length <= 140`、含字母。

调用位置在 `walk()` 的元素分支里、`translateAttributes(node, SAFE_ATTRS)` 之后。

**`trPart` 与 `translateTextRun` 必须幂等**——`sync.js` 重跑会重写整个字典，但不会碰这两个函数；如果你自己改 `preload.js`，写完记得 `node --check`。

### 不碰的区域

`BYPASS_ANCESTOR_SELECTOR` 里的元素整体跳过，避免改坏代码：

```
.monaco-editor  .view-lines  .cm-editor  pre  code  .xterm
textarea  [contenteditable="true"]  ...
```

`IGNORE_TAGS`：`SCRIPT STYLE NOSCRIPT TEMPLATE CANVAS SVG MATH OBJECT EMBED`
`CODE_OR_INPUT_TAGS`：`PRE CODE KBD SAMP VAR TEXTAREA`

属性只译这三种：`placeholder` / `title` / `aria-label`（`SAFE_ATTRS`），其余属性一律不动。

---

## 工具

### `tools/check-asar.js`

校验补丁是否真的注入了 asar、字典条数与模板数对不对。

```powershell
node tools/check-asar.js                    # 自动探测安装目录
node tools/check-asar.js C:\path\app.asar   # 或手动指定
```

输出：

```
asar: C:\Users\...\resources\app.asar
asar size: 7136348 | dataStart: 309056
preload entry size: 451461 | extracted: 451461
marker present: true
字典条目: 3985
动态模板: 35
probe \u667a\u80fd\u4f53 -> true
probe Hey\s+([^,]+) -> true
probe translateTextRun -> true
```

### `tools/test-translate.js`

离线测翻译函数，**不用重启 App**。

```powershell
node tools/test-translate.js
```

做法：读 `preload.js`，把 `require('electron')` 打桩成空对象，写临时 `.cjs` 后 `require`，直接调导出的 `translateText(t)`。返回 `null` 即未命中。

自己加测试用例直接改文件里的 `CASES` 数组。

### `tools/cdp.js` / `cdp-nav.js` / `sweep.js`

用 Chrome DevTools Protocol 操作运行中的 App，比截图 + 模拟点击可靠得多（不受 DPI 缩放影响）。

先带调试端口启动：

```powershell
$env:ELECTRON_RUN_AS_NODE = $null   # 某些终端会话会继承这个变量，Electron 会变成 Node 模式秒退
Stop-Process -Name Antigravity,language_server -Force -ErrorAction SilentlyContinue
Start-Process "$env:LOCALAPPDATA\Programs\antigravity\Antigravity.exe" -ArgumentList "--remote-debugging-port=9222"
Start-Sleep 32
```

然后：

```powershell
node tools/cdp.js text                              # 列出页面上所有可见英文残留
node tools/cdp.js click "设置"                       # 点按钮（纯 DOM 事件）
node tools/cdp.js eval "document.title"             # 任意 JS 求值
node tools/cdp-nav.js settings-nav-item-Models      # 按 data-testid 切设置页并 dump
node tools/sweep.js "设置" "模型"                    # 连续点多步，每步 dump
```

设置页的 `data-testid`：

```
settings-nav-item-General   -App   -Appearance   -Shortcuts   -Notifications
settings-nav-item-Models    -Browser   -antigravity   -Conversations
settings-nav-item-Provide Feedback   -Account
```

短词（「应用」「外观」）用 `click` 会 NOTFOUND 或点错，用 `cdp-nav.js` 按 testid 切。

### `tools/patch-templates.js` / `patch-runmerge.js` / `fix-regex.js`

这三个是**一次性修复脚本**，用于把某个特性补进已有的 `preload.js`。都有幂等检查，重复跑安全。

- `patch-templates.js`：整段重建 `DYNAMIC_TEMPLATES`，保证「具体在前」的顺序
- `patch-runmerge.js`：注入 `translateTextRun` 函数及其调用
- `fix-regex.js`：修复被多重转义的正则（见下方踩坑 #2）

装完基础补丁后想手动补上这些特性，按 `fix-regex` → `patch-runmerge` → `patch-templates` 顺序跑。

---

## 文件

```
antigravity-zh/
├── sync.js                  ← 主脚本：拉远程字典 + 合并 + 重打补丁
├── dict/
│   ├── extra.json           ← 28 条：插件市场远端目录长描述
│   ├── extra2.json          ← 68 条：快捷键命令名 + aria 片段
│   ├── extra3.json          ←  8 条：aria-label 拼装片段
│   └── extra4.json          ← 39 条：插件分类标题
└── tools/
    ├── check-asar.js        ← 校验注入结果
    ├── test-translate.js    ← 离线测 translateText
    ├── cdp.js               ← CDP：text / click / eval
    ├── cdp-nav.js           ← CDP：按 testid 切页
    ├── sweep.js             ← CDP：连续多步 dump
    ├── patch-templates.js   ← 重建 DYNAMIC_TEMPLATES
    ├── patch-runmerge.js    ← 注入 translateTextRun
    └── fix-regex.js         ← 修正被多转义的正则
```

---

## 踩坑记录

这些都是实际踩过、卡了很久的，写下来省得重踩。

### 注入与打包

**1. 改了字典不重打补丁**

原版 `watcher.ps1` 的判定是 `Select-String -Path $asar -Pattern $patchMarker -Quiet` —— marker 在就跳过。也就是说 `preload.js` 改成什么样都不会生效，除非先手动删掉 asar 里的 marker。

修法：`patch.sha256` 存补丁代码的 SHA256，每次比对，不一致就重打；另加 `-Force` 开关。

**2. 正则被多重转义**

在生成脚本里嵌套模板字符串时，`\s` 会被写成 `\\s`，落盘成字面反斜杠 + 字母 s，模板彻底失效**而且不报错**——表现是「我明明加了模板，就是没反应」。

教训：生成写进 `preload.js` 的 JS 代码时，用 `String.fromCharCode(96)` 拼反引号、`.join('\n')` 拼数组，别直接嵌套模板字符串。现有代码里已经有 `fix-regex.js` 兜这个。

**3. `Object.keys(Map)` 恒为 `0`**

```js
const dict = new Map();
Object.keys(dict).length   // 0，永远
dict.size                  // 正确
```

**4. asar header 的 `offset` 是字符串**

```js
dataStart + hit.v.offset          // "309056" + "4990791" = 字符串拼接
dataStart + Number(hit.v.offset)  // 正确
```

症状是提取出来 0 字节，或者解析出乱码。

**5. asar header JSON 尾部有 pickle 对齐 padding**

直接 `JSON.parse` 会报 `SyntaxError: Unexpected non-whitespace character after JSON at position 309038`。必须先截到最后一个 `}`：

```js
headerJson = headerJson.slice(0, headerJson.lastIndexOf('}') + 1);
```

完整公式：

```js
const headerSize = buf.readUInt32LE(4);   // header 区总长
const jsonSize   = buf.readUInt32LE(12);  // header JSON 长度
const dataStart  = 8 + headerSize;        // 数据区起点
const headerJson = buf.slice(16, 16 + jsonSize).toString('utf8');
```

**6. 改完必须重启 App**

watcher 改的是磁盘上的 `app.asar`。已经跑起来的进程早把 preload 加载进内存了，不重启看不到任何变化。曾经因为这个误判为「补丁没生效」，反复重打了好几轮。

**7. `ELECTRON_RUN_AS_NODE=1` 会让 Antigravity 秒退**

某些终端 / CI 会话会继承这个环境变量，Electron 检测到就以 Node 模式启动，然后 exit 0、无任何输出。命令行启动前：

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
```

### 翻译逻辑

**8. 模板顺序决定命中**

`/^Open\s+(.+)$/` 排在 `/^Open\s+(.+)\s+Settings$/` 前面，后者永远不执行。`DYNAMIC_TEMPLATES` 是数组，顺序有意义。

**9. React 拆句**

见上面 `translateTextRun` 一节。「否 automations yet」这个 bug 就是这么来的。

**10. 含插值的句子不能进静态字典**

`Hey {name}, what should we build today?` 里的 `{name}` 是运行时填的，静态字典永远匹配不上，必须走正则模板。

**11. 插件市场的长描述不在 bundle 里**

`_ui_main.js`（12.21 MB）里找不到那些文案——它们是运行时从远端目录 JSON 拉下来渲染的。只能先用 CDP 抓一遍 DOM，把文案固化进 `dict/extra.json`。

**12. `node -e "..."` 在 PowerShell 里会被吃引号和反斜杠**

正则会变得面目全非，还容易触发 `ParserError`。一律写成 `.js` 文件再 `node file.js`。

**13. `.ps1` 不带 UTF-8 BOM 会被按 GBK 解析**

中文直接语法错误，报错信息还看不出根因。写 PowerShell 脚本必须：

```powershell
[IO.File]::WriteAllText($path, $text, [Text.UTF8Encoding]::new($true))
```

### 验证手段

**14. 125% DPI 缩放下坐标必须 ×1.25**

主屏逻辑分辨率 2048×1152、物理 2560×1440，DPI=120。`SetCursorPos` 用的是物理像素，用逻辑坐标点会偏。

更彻底的办法：**别截图，用 CDP 派发 DOM 事件**——完全绕开 DPI 和窗口焦点问题。

**15. `SetForegroundWindow` 经常静默失败**

单独调基本没戏，要组合：

```csharp
ShowWindow(h, 9);                    // SW_RESTORE
SetWindowPos(h, HWND_TOPMOST, ...);
BringWindowToTop(h);
SetForegroundWindow(h);
```

即便如此也可能失败。CDP 不需要焦点，所以没有这个问题。

**16. `Invoke-RestMethod` 在 PS 5.1 里按 Latin-1 解 JSON**

Clash 的 API 返回中文全是乱码。改用：

```powershell
$wc = New-Object Net.WebClient
$wc.Encoding = [Text.Encoding]::UTF8
$wc.DownloadString($url)
```

---

## 授权

本项目代码 MIT。

字典内容来自 [yuexps/Antigravity-Hans](https://github.com/yuexps/Antigravity-Hans)，其授权见该仓库。`sync.js` 只是运行时拉取，不内置其字典。

## 免责

修改 `app.asar` 属于修改第三方软件本体。Antigravity 官方更新会覆盖它（本项目靠 watcher 自动恢复）。仅在个人机器上使用，自行评估风险。
