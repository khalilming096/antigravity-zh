// sync-hans.js —— 从社区汉化项目同步最新字典，合并进本地 preload.js 并强制重打补丁
// 用法：node sync-hans.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const HANS_REPO = 'yuexps/Antigravity-Hans';
const HANS_FILES = [
  'resources/src/dict/common.json',
  'resources/src/dict/chat-agent.json',
  'resources/src/dict/settings.json',
  'resources/src/dict/marketplace.json',
  'resources/src/dict/ide.json',
];
const PRELOAD = path.join(process.env.APPDATA, 'AntigravityChinesePatch', 'preload.js');
const CACHE = path.join(__dirname, '_hans');

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'antigravity-hans-sync' } }, res => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 5) {
        res.resume();
        return get(res.headers.location, redirects + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode + ' ' + url)); }
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', c => (buf += c));
      res.on('end', () => resolve(buf));
    }).on('error', reject);
  });
}

function flatten(obj, out) {
  if (Array.isArray(obj)) {
    if (typeof obj[0] === 'string' && typeof obj[1] === 'string') out[obj[0]] = obj[1];
    return out;
  }
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object') flatten(v, out);
    else if (typeof v === 'string') out[k] = v;
  }
  return out;
}

(async () => {
  if (!fs.existsSync(PRELOAD)) {
    console.error(`找不到 preload.js：${PRELOAD}`);
    console.error('请先安装反重力汉化补丁（本脚本是在已有补丁上做增量同步，不会从零创建）。');
    process.exit(1);
  }
  fs.mkdirSync(CACHE, { recursive: true });
  const remote = {};
  for (const f of HANS_FILES) {
    const name = path.basename(f);
    const url = `https://raw.githubusercontent.com/${HANS_REPO}/HEAD/${f}`;
    try {
      const txt = await get(url);
      fs.writeFileSync(path.join(CACHE, name), txt, 'utf8');
      const flat = flatten(JSON.parse(txt), {});
      Object.assign(remote, flat);
      console.log(`  ✔ ${name.padEnd(20)} ${Object.keys(flat).length} 条`);
    } catch (e) {
      console.log(`  ✘ ${name.padEnd(20)} ${e.message}（跳过）`);
    }
  }
  if (!Object.keys(remote).length) {
    console.error('远程字典一条都没拿到，中止（本地 preload.js 未改动）');
    process.exit(1);
  }
  console.log(`\n远程字典合计 ${Object.keys(remote).length} 条`);

  const pre = fs.readFileSync(PRELOAD, 'utf8');
  const body = pre.match(/const dictionary\s*=\s*\{([\s\S]*?)\n\};/)[1];
  const lineRe = /^\s*"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$/;
  const dict = new Map();
  for (const line of body.split('\n')) {
    const m = line.match(lineRe);
    if (m) { try { dict.set(JSON.parse('"' + m[1] + '"'), JSON.parse('"' + m[2] + '"')); } catch (e) {} }
  }
  const before = dict.size;

  // 本地词典里属于用户自建的条目：远程没有就保留（不被清空）
  let added = 0, updated = 0;
  for (const [k, v] of Object.entries(remote)) {
    if (dict.has(k)) { if (dict.get(k) !== v) updated++; } else added++;
    dict.set(k, v);
  }
  console.log(`本地原有 ${before} 条 → 覆盖 ${updated} 条、新增 ${added} 条 → 现 ${dict.size} 条`);

  // 模型名与品牌名保持英文
  const MODEL = ['Gemini', 'Claude', 'Orchestrator', 'Mendel', 'Hydrogen', 'Flash', 'Imagen', 'Veo', 'GPT', 'Llama', 'Nano Banana'];
  let restored = 0;
  for (const [k, v] of Array.from(dict.entries())) {
    if (v === k) continue;
    const lost = MODEL.filter(m => k.includes(m) && !v.includes(m));
    if (lost.length && k.length <= 30 && !MODEL.some(m => v.includes(m))) { dict.set(k, k); restored++; }
  }
  if (restored) console.log(`模型名被误译 → 还原英文 ${restored} 条`);

  const KEEP = new Set(['Google', 'GitHub', 'GitLab', 'VS Code', 'Antigravity', 'Gemini', 'Jetski', 'Firebase',
    'Flask', 'Mermaid', 'Electron', 'WSL', 'Linux', 'macOS', 'MacOS', 'Windows', 'Chrome',
    'Google Docs', 'Google Sheets', 'Google Slides', 'Google Drive', 'Google Chrome', 'Google Chat',
    'Google Cloud', 'Slack', 'Stripe', 'Notion', 'Figma', 'Sentry', 'Linear', 'github.com',
    'image/png', 'gh auth login', 'Pro', 'Flash', 'Flash Lite', 'Orchestrator']);
  const KEEP_PREFIX = ['Web (', 'Electron (', 'Extension (', 'Google ', 'e.g', 'E.g', 'example:',
    'has_', 'run_command', 'view_file', 'mdb/', 'antigravity.', 'priority in [', 'description.'];
  for (const k of KEEP) dict.delete(k);
  for (const k of Array.from(dict.keys())) if (KEEP_PREFIX.some(p => k.startsWith(p))) dict.delete(k);

  // 本地补充：远程没有、或在 MODEL 还原时被误还原成纯英文的话术（模型名仍保留英文）
  const SUPPLEMENT = {
    'Orchestrator Settings': 'Orchestrator 设置',
    'Orchestrator Model': 'Orchestrator 模型',
    'Choose the models Orchestrator uses to plan and execute work.': '选择 Orchestrator 用来规划与执行工作的模型。',
    'The voice used in Voice mode. Powered by Gemini Live.': '语音模式下使用的声音，由 Gemini Live 驱动。',
    'On this page': '本页内容',
    'Dictation languages': '听写语言',
    'Selected element preview': '所选元素预览',
    'Too many surveys': '问卷请求过于频繁',
    'True changes vs the parent workspace': '与父工作区相比的真实变更',
    'Sign in in your browser, then paste the authorization code shown on the callback page.':
      '在浏览器中登录，然后粘贴回调页面上显示的授权码。',
    'script source must not be empty': '脚本源码不能为空',
    'image for comment': '评论图片',
    'image for artifact level comment': '产物级评论图片',
    'Match when the principal belongs to the specified MDB group.': '当主体属于指定的 MDB 组时匹配。',
    'Best-of-N Started': 'Best-of-N 已开始',
    'Best-of-N Ended': 'Best-of-N 已结束',
    'Not suitable for Best-of-N': '不适合 Best-of-N',
    'Previous chats live under a deprecated Google3 Project': '此前的对话位于已弃用的 Google3 项目下',
    'Google3 projects are deprecated': 'Google3 项目已弃用',
    'Google3 projects are being deprecated. Select a CitC workspace instead.':
      'Google3 项目正在弃用，请改选 CitC 工作区。',
    'Select CitC workspace': '选择 CitC 工作区',
    'CitC Workspace': 'CitC 工作区',
    'Cog Workspace': 'Cog 工作区',
    'ABFS Workspace (Alpha)': 'ABFS 工作区（Alpha）',
    'Git-on-Borg repository used when creating a new Cog workspace from your initial prompt (e.g., chromium/chromium/src or android/platform/superproject).':
      '从初始提示词创建新的 Cog 工作区时使用的 Git-on-Borg 仓库（例如 chromium/chromium/src 或 android/platform/superproject）。',
    'Run Jetski Live on the ELMO composite voice actor.': '在 ELMO 合成语音角色上运行 Jetski Live。',
    'Thinking Effort': '推理强度',
    'Reasoning effort': '推理强度',
    'Sign in': '登录',
    'Sign Out': '退出登录',
    'Copy code': '复制代码',
    'Copy link': '复制链接',
    'Show more': '显示更多',
    'Show less': '收起',
    // 空状态整句（React 会把 "No " + noun + " yet" 拆成多个文本节点，合并后按整句查表）
    'No automations yet': '暂无自动化',
    'No automations yet.': '暂无自动化。',
    'No MCP servers yet': '暂无 MCP 服务器',
    'No MCP servers yet. Use Add to browse the store.': '暂无 MCP 服务器。点击「添加」浏览商店。',
    'No skills or rules yet': '暂无技能或规则',
    'No skills or rules yet.': '暂无技能或规则。',
    'No skills or rules match this filter.': '没有技能或规则匹配此筛选条件。',
    'No custom agents yet': '暂无自定义智能体',
    'No custom agents yet.': '暂无自定义智能体。',
    'No apps connected yet': '暂无已连接的应用',
    'No apps connected yet. Connect one from Marketplace.': '暂无已连接的应用。请从应用市场连接一个。',
    'No apps found for': '未找到应用：',
    'No apps available.': '暂无可用应用。',
    'No instances yet': '暂无实例',
    'No instances yet.': '暂无实例。',
    'No commits yet': '暂无提交',
    'No resources added yet': '暂无已添加的资源',
    'No resources added yet.': '暂无已添加的资源。',
    'No folders added yet': '暂无已添加的文件夹',
    'No folders added yet.': '暂无已添加的文件夹。',
    'No hosts in ~/.ssh/config yet': '~/.ssh/config 中暂无主机',
    'No MCP servers available.': '暂无可用 MCP 服务器。',
    'No automations': '暂无自动化',
    'Loading customizations...': '正在加载自定义项…',
    'Create with Prompt': '通过提示词创建',
    'Custom Agent Error:': '自定义智能体错误：',
    'MCP Servers': 'MCP 服务器',
    'Add': '添加',
    // 原生右键菜单项（经 window:show-context-menu IPC 传给主进程构建 Electron 原生菜单）
    'Mark Unread': '标记为未读',
    'Mark Read': '标记为已读',
    'Resolve': '解决',
    'Return to Inbox': '返回收件箱',
    'Save As': '另存为',
    'Print': '打印',
    'Inspect': '检查',
    'Translate': '翻译',
    'Rename Folder': '重命名文件夹',
    'Move to': '移动到',
    'Disable': '禁用',
    'Uninstall': '卸载',
    'Properties': '属性',
    // 权限确认对话框选项
    'Yes, and always allow in this conversation': '是的，并在此对话中始终允许',
    'Yes, and always allow': '是的，并始终允许',
  };
  let supplemented = 0;
  for (const [k, v] of Object.entries(SUPPLEMENT)) { dict.set(k, v); supplemented++; }
  if (supplemented) console.log(`本地补充 ${supplemented} 条`);

  // 本地补充字典（插件市场远端目录文案 + 快捷键命令名 + aria-label 片段 + 插件分类）
  for (const name of ['extra.json', 'extra2.json', 'extra3.json', 'extra4.json']) {
    const extraPath = path.join(__dirname, 'dict', name);
    if (!fs.existsSync(extraPath)) continue;
    const extra = JSON.parse(fs.readFileSync(extraPath, 'utf8'));
    let n = 0;
    for (const [k, v] of Object.entries(extra)) { dict.set(k, v); n++; }
    console.log(`dict/${name} 补充 ${n} 条`);
  }

  // 术语统一：凡是原文含 agent 的条目，译文里的「代理」一律改「智能体」（proxy 语境才用「代理」）
  let agentFixed = 0;
  for (const [k, v] of Array.from(dict.entries())) {
    if (!/agent/i.test(k) || !/代理/.test(v)) continue;
    const nv = v.replace(/子代理/g, '子智能体').replace(/代理/g, '智能体');
    dict.set(k, nv);
    agentFixed++;
  }
  if (agentFixed) console.log(`术语统一 agent→智能体 ${agentFixed} 条`);

  const esc = s => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
    .replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')) + '"';
  const lines = [];
  for (const [k, v] of dict) lines.push('    ' + esc(k) + ': ' + esc(v) + ',');
  const newDict = 'const dictionary = {\n' + lines.join('\n') + '\n};';
  const oldDict = pre.match(/const dictionary\s*=\s*\{[\s\S]*?\n\};/)[0];

  fs.writeFileSync(PRELOAD + '.bak-' + Date.now(), pre, 'utf8');
  let out = pre.replace(oldDict, newDict);

  // 原生右键菜单翻译 hook（幂等注入）
  // 渲染进程通过 window.electronNative.showContextMenu(items) → ipcRenderer.invoke
  // ('window:show-context-menu', items) 把菜单模板交给主进程构建 Electron 原生菜单。
  // DOM 注入够不着原生菜单，必须在 preload 层 hook IPC，递归翻译 items[].label。
  if (out.indexOf('window:show-context-menu') < 0) {
    const anchor = '  // 13. Global CommonJS Exports for testing';
    if (out.indexOf(anchor) >= 0) {
      const hook = [
        '  // 13.5 Native context menu translation (Electron native menu)',
        '  (function () {',
        '    try {',
        '      if (typeof electron_1 === \'undefined\' || !electron_1.ipcRenderer ||',
        '          typeof electron_1.ipcRenderer.invoke !== \'function\') return;',
        '      const origInvoke = electron_1.ipcRenderer.invoke.bind(electron_1.ipcRenderer);',
        '      function trMenuItems(items, depth) {',
        '        if (!Array.isArray(items) || depth > 8) return;',
        '        for (const it of items) {',
        '          if (!it || typeof it !== \'object\') continue;',
        '          if (typeof it.label === \'string\') {',
        '            const t = translateText(it.label);',
        '            if (t !== null && t !== undefined && t !== it.label) it.label = t;',
        '          }',
        '          if (Array.isArray(it.submenu)) trMenuItems(it.submenu, depth + 1);',
        '        }',
        '      }',
        '      electron_1.ipcRenderer.invoke = function (channel) {',
        '        try {',
        '          if (channel === \'window:show-context-menu\' && arguments.length > 1) {',
        '            trMenuItems(arguments[1], 0);',
        '          }',
        '        } catch (e) {}',
        '        return origInvoke.apply(null, arguments);',
        '      };',
        '    } catch (e) {}',
        '  })();',
        '',
      ].join('\n');
      out = out.replace(anchor, hook + anchor);
      console.log('已注入原生右键菜单翻译 hook');
    } else {
      console.log('未找到 hook 注入锚点，跳过右键菜单 hook');
    }
  } else {
    console.log('右键菜单 hook 已存在，跳过');
  }

  fs.writeFileSync(PRELOAD, out, 'utf8');
  console.log(`\npreload.js 已写入（${dict.size} 条）`);

  // 强制重打补丁
  const { spawnSync } = require('child_process');
  const w = path.join(process.env.APPDATA, 'AntigravityChinesePatch', 'watcher.ps1');
  if (!fs.existsSync(w)) {
    console.log(`\n未找到 ${w}`);
    console.log('preload.js 已更新，但需要你自己触发重打补丁（例如重启 watcher 或手动重新注入）。');
    return;
  }
  const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', w, '-Force'],
    { encoding: 'utf8' });
  process.stdout.write(r.stdout || '');
  if (r.stderr) process.stderr.write(r.stderr);
  console.log(r.status === 0 ? '\n补丁已重打 ✅ 重启 Antigravity 生效' : '\n补丁重打失败 ❌');
})();
