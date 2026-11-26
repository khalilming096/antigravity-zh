// 校验 app.asar 里是否已注入汉化补丁，并统计字典/模板条数
// 用法：node _check_asar.js [path\to\app.asar]
// 不传参数时自动探测 Antigravity 安装目录。
const fs = require('fs');
const path = require('path');

function detectAsar() {
  const cands = [];
  if (process.env.LOCALAPPDATA) {
    cands.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'antigravity', 'resources', 'app.asar'));
  }
  if (process.env.ProgramFiles) {
    cands.push(path.join(process.env.ProgramFiles, 'Antigravity', 'resources', 'app.asar'));
  }
  return cands.find(p => fs.existsSync(p));
}

const asar = process.argv[2] || detectAsar();
if (!asar || !fs.existsSync(asar)) {
  console.error('找不到 app.asar，请手动传入路径：node _check_asar.js <path>');
  process.exit(1);
}

const buf = fs.readFileSync(asar);
const headerSize = buf.readUInt32LE(4);   // header 区总长（含 4 字节 pickle 前缀）
const jsonSize = buf.readUInt32LE(12);    // 真正的 header JSON 长度
const dataStart = 8 + headerSize;         // 数据区起点

// header JSON 尾部有 pickle 对齐 padding，必须截到最后一个 '}' 才能 JSON.parse
let headerJson = buf.slice(16, 16 + jsonSize).toString('utf8');
headerJson = headerJson.slice(0, headerJson.lastIndexOf('}') + 1);
const root = JSON.parse(headerJson);

function find(node, cur) {
  for (const k of Object.keys(node.files)) {
    const v = node.files[k];
    const p = cur ? cur + '/' + k : k;
    if (v.files) {
      const r = find(v, p);
      if (r) return r;
    } else if (p.endsWith('dist/preload.js')) {
      return { p, v };
    }
  }
  return null;
}

const hit = find(root, '');
if (!hit) {
  console.error('asar 里没有 dist/preload.js');
  process.exit(1);
}

// 关键：offset 是字符串，必须 Number() 转换，否则 + 会变成字符串拼接
const start = dataStart + Number(hit.v.offset);
const data = buf.slice(start, start + Number(hit.v.size)).toString('utf8');

console.log('asar:', asar);
console.log('asar size:', buf.length, '| dataStart:', dataStart);
console.log('preload entry size:', hit.v.size, '| extracted:', data.length);
console.log('marker present:', data.includes('// Antigravity Chinese Localization Patch'));

const dictBody = (data.match(/const dictionary\s*=\s*\{([\s\S]*?)\n\};/) || [])[1] || '';
const lines = dictBody.split('\n').filter(l => l.trim());
console.log('字典条目:', lines.length);
console.log('动态模板:', (data.match(/regex:\s*\//g) || []).length);

for (const p of ['\\u667a\\u80fd\\u4f53', 'Hey\\s+([^,]+)', 'translateTextRun']) {
  console.log('probe', p, '->', data.includes(p));
}

const outFile = path.join(__dirname, '_asar_preload.js');
fs.writeFileSync(outFile, data, 'utf8');
console.log('落盘', outFile, data.length, '字符');
