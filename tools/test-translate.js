// 离线验证翻译函数：把 preload.js 的 electron 依赖打桩后 require，直接调 translateText
// 用法：node tools/test-translate.js
// 想看别的句子，改下面的 CASES 数组即可。返回 [null] 表示未命中（原文会保持英文）。
const fs = require('fs');
const path = require('path');
const os = require('os');

const PRELOAD = path.join(process.env.APPDATA, 'AntigravityChinesePatch', 'preload.js');
if (!fs.existsSync(PRELOAD)) {
  console.error(`找不到 ${PRELOAD}`);
  console.error('请先安装一个基础汉化补丁（见 README 的「安装」一节）。');
  process.exit(1);
}

const CASES = [
  // 动态模板
  'See 9 more',
  'See 4 more',
  'Install Firebase',
  'Add Notion',
  'Details for Firebase',
  'See more in Productivity & Project Management',
  'Shortcut Ctrl+K for Open Conversation Picker',
  'Remove shortcut Ctrl+K for Open Conversation Picker',
  'Add shortcut for Open Conversation Picker',
  'Select model, current: Gemini 4 Neon Medium',
  'Where the agent runs, current: This Computer',
  'Agent permissions preset selector, current: Request Review',
  'Select project, current: No Project',
  'Dismiss suggestion',
  'More actions for Google Docs',
  'Advanced Settings',
  'Google Workspace Settings',
  'Show 2 breakdowns',
  'Rules: 2,885 tokens',
  'Hey Alex, what should we build today?',
  'Welcome back, Alex. Where should we pick up?',
  // 静态字典
  'Thinking effort',
  'Low',
  'Medium',
  'High',
  'Agents',
  'Terminal',
  'Sign in',
  'Core tools and knowledge required to develop for Android.',
  'Science Overview',
  'Chemistry',
  // 应当保持英文（品牌名）
  'Canva',
  'Figma',
];

// 打桩 electron：preload.js 顶层有 require('electron')
let src = fs.readFileSync(PRELOAD, 'utf8');
src = src.replace(
  /require\(\s*['"]electron['"]\s*\)/g,
  '({ ipcRenderer: { on(){}, send(){} }, contextBridge: { exposeInMainWorld(){} } })'
);
const tmp = path.join(os.tmpdir(), 'preload_test_' + Date.now() + '.cjs');
fs.writeFileSync(tmp, src, 'utf8');

let m;
try {
  m = require(tmp);
} finally {
  fs.unlinkSync(tmp);
}

if (typeof m.translateText !== 'function') {
  console.error('preload.js 没有导出 translateText —— 补丁可能不完整');
  process.exit(1);
}

let miss = 0;
for (const t of CASES) {
  const r = m.translateText(t);
  if (r === null) miss++;
  console.log((r === null ? '[未命中]' : r) + '   <<< ' + t);
}

const dictSize = m.dictionary ? Object.keys(m.dictionary).length : 0;
const tplSize = m.DYNAMIC_TEMPLATES ? m.DYNAMIC_TEMPLATES.length : 0;
console.log('---');
console.log(`字典 ${dictSize} 条，动态模板 ${tplSize} 条，未命中 ${miss}/${CASES.length}`);
