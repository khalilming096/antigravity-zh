const fs = require('fs');
const path = require('path');
const P = path.join(process.env.APPDATA, 'AntigravityChinesePatch', 'preload.js');
let t = fs.readFileSync(P, 'utf8');

const MARK = 'const DYNAMIC_TEMPLATES = [';
const i0 = t.indexOf(MARK);
if (i0 < 0) { console.error('marker missing'); process.exit(1); }
const i1 = t.indexOf('\n  ];', i0);
if (i1 < 0) { console.error('end missing'); process.exit(1); }

const BT = String.fromCharCode(96);
const q = (s) => BT + s + BT;

// 顺序很重要：具体优先，泛化在后
const body = [
  'const DYNAMIC_TEMPLATES = [',
  // —— 具体模板 ——
  '    { regex: /^Shortcut\\s+(.+?)\\s+for\\s+(.+)$/i, format: (m) => ' + q('\\u5feb\\u6377\\u952e ${m[1]}\\uff0c\\u7528\\u4e8e${trPart(m[2])}') + ' },',
  '    { regex: /^Remove shortcut\\s+(.+?)\\s+for\\s+(.+)$/i, format: (m) => ' + q('\\u79fb\\u9664\\u5feb\\u6377\\u952e ${m[1]}\\uff0c\\u7528\\u4e8e${trPart(m[2])}') + ' },',
  '    { regex: /^Add shortcut for\\s+(.+)$/i, format: (m) => ' + q('\\u4e3a${trPart(m[1])}\\u6dfb\\u52a0\\u5feb\\u6377\\u952e') + ' },',
  '    { regex: /^([^,]+),\\s*current:\\s*(.+)$/i, format: (m) => ' + q('${trPart(m[1])}\\uff0c\\u5f53\\u524d\\uff1a${trPart(m[2])}') + ' },',
  '    { regex: /^Details for\\s+(.+)$/i, format: (m) => ' + q('${trPart(m[1])} \\u7684\\u8be6\\u60c5') + ' },',
  '    { regex: /^See more in\\s+(.+)$/i, format: (m) => ' + q('\\u67e5\\u770b\\u201c${trPart(m[1])}\\u201d\\u4e2d\\u7684\\u66f4\\u591a\\u5185\\u5bb9') + ' },',
  '    { regex: /^Learn\\s+more\\s+about\\s+(.+)$/i, format: (m) => ' + q('\\u4e86\\u89e3\\u5173\\u4e8e ${m[1]} \\u7684\\u66f4\\u591a\\u4fe1\\u606f') + ' },',
  '    { regex: /^Open\\s+(.+)\\s+Preferences$/i, format: (m) => ' + q('\\u6253\\u5f00 ${trPart(m[1])} \\u504f\\u597d\\u8bbe\\u7f6e') + ' },',
  '    { regex: /^Open\\s+(.+)\\s+Settings$/i, format: (m) => ' + q('\\u6253\\u5f00 ${trPart(m[1])} \\u8bbe\\u7f6e') + ' },',
  '    { regex: /^Choose\\s+a\\s+predefined\\s+(.+)\\s+for\\s+the\\s+agent\\.(.*)$/i, format: (m) => ' + q('\\u4e3a\\u667a\\u80fd\\u4f53\\u9009\\u62e9\\u9884\\u8bbe\\u7684 ${m[1]}\\u3002${m[2]}') + ' },',
  '    { regex: /^Scan\\s+the\\s+code\\s+to\\s+(.+)$/i, format: (m) => ' + q('\\u626b\\u63cf\\u4e8c\\u7ef4\\u7801\\u4ee5 ${m[1]}') + ' },',
  '    { regex: /^Hey\\s+([^,]+),\\s*what\\s+should\\s+we\\s+build\\s+today\\?$/i, format: (m) => ' + q('\\u563f ${m[1]}\\uff0c\\u4eca\\u5929\\u60f3\\u6784\\u5efa\\u70b9\\u4ec0\\u4e48\\uff1f') + ' },',
  '    { regex: /^Welcome\\s+back,\\s*(.+?)\\.\\s*Where\\s+should\\s+we\\s+pick\\s+up\\?$/i, format: (m) => ' + q('\\u6b22\\u8fce\\u56de\\u6765\\uff0c${m[1]}\\u3002\\u4ece\\u54ea\\u91cc\\u7ee7\\u7eed\\uff1f') + ' },',
  '    { regex: /^Good\\s+to\\s+see\\s+you,\\s*(.+?)\\.\\s*What\'s\\s+next\\?$/i, format: (m) => ' + q('\\u5f88\\u9ad8\\u5174\\u89c1\\u5230\\u4f60\\uff0c${m[1]}\\u3002\\u63a5\\u4e0b\\u6765\\u505a\\u4ec0\\u4e48\\uff1f') + ' },',
  '    { regex: /^Card\\s+(\\d+)\\s+of\\s+(\\d+)$/i, format: (m) => ' + q('\\u7b2c ${m[1]} \\u5f20\\uff0c\\u5171 ${m[2]} \\u5f20') + ' },',
  '    { regex: /^Show\\s+(\\d+)\\s+more$/i, format: (m) => ' + q('\\u663e\\u793a\\u66f4\\u591a ${m[1]} \\u9879') + ' },',
  '    { regex: /^(\\d+)\\s+comments?$/i, format: (m) => ' + q('${m[1]} \\u6761\\u8bc4\\u8bba') + ' },',
  // —— 泛化模板（必须最后） ——
  '    { regex: /^Install\\s+(.+)$/i, format: (m) => ' + q('\\u5b89\\u88c5 ${trPart(m[1])}') + ' },',
  '    { regex: /^Uninstall\\s+(.+)$/i, format: (m) => ' + q('\\u5378\\u8f7d ${trPart(m[1])}') + ' },',
  '    { regex: /^Add\\s+(.+)$/i, format: (m) => ' + q('\\u6dfb\\u52a0 ${trPart(m[1])}') + ' },',
  '    { regex: /^Remove\\s+(.+)$/i, format: (m) => ' + q('\\u79fb\\u9664 ${trPart(m[1])}') + ' },',
  '    { regex: /^See\\s+(\\d+)\\s+more$/i, format: (m) => ' + q('\\u67e5\\u770b\\u53e6\\u5916 ${m[1]} \\u4e2a') + ' },',
  '    { regex: /^(\\d+)\\s+more$/i, format: (m) => ' + q('\\u53e6\\u5916 ${m[1]} \\u4e2a') + ' },',
  '    { regex: /^Open\\s+(.+)$/i, format: (m) => ' + q('\\u6253\\u5f00 ${trPart(m[1])}') + ' },',
  '  ];',
].join('\n');

t = t.slice(0, i0) + body + t.slice(i1 + '\n  ];'.length);
fs.writeFileSync(P + '.bak-tplreorder-' + Date.now(), fs.readFileSync(P), 'utf8');
fs.writeFileSync(P, t, 'utf8');
console.log('rewritten, len', t.length);
