const fs = require('fs');
const path = require('path');
const P = path.join(process.env.APPDATA, 'AntigravityChinesePatch', 'preload.js');
let t = fs.readFileSync(P, 'utf8');
let n = 0;
// 修复被多转义的正则：/^See\\s+(\\d+)\\s+more$/i -> /^See\s+(\d+)\s+more$/i
const BAD = 'regex: /^See\\\\s+(\\\\d+)\\\\s+more$/i';
const GOOD = 'regex: /^See\\s+(\\d+)\\s+more$/i';
if (t.indexOf(BAD) >= 0) { t = t.split(BAD).join(GOOD); n++; }
// 其余模板也检查一遍多重转义
const pairs = [
  ['regex: /^(\\\\d+)\\\\s+more$/i', 'regex: /^(\\d+)\\s+more$/i'],
  ['regex: /^Add\\\\s+(.+)$/i', 'regex: /^Add\\s+(.+)$/i'],
  ['regex: /^Details for\\\\s+(.+)$/i', 'regex: /^Details for\\s+(.+)$/i'],
  ['regex: /^Install\\\\s+(.+)$/i', 'regex: /^Install\\s+(.+)$/i'],
  ['regex: /^See more in\\\\s+(.+)$/i', 'regex: /^See more in\\s+(.+)$/i'],
  ['regex: /^Uninstall\\\\s+(.+)$/i', 'regex: /^Uninstall\\s+(.+)$/i'],
  ['regex: /^Remove\\\\s+(.+)$/i', 'regex: /^Remove\\s+(.+)$/i'],
  ['regex: /^Open\\\\s+(.+)$/i', 'regex: /^Open\\s+(.+)$/i'],
];
for (const [bad, good] of pairs) {
  if (t.indexOf(bad) >= 0) { t = t.split(bad).join(good); n++; }
}
fs.writeFileSync(P + '.bak-regex-' + Date.now(), fs.readFileSync(P), 'utf8');
fs.writeFileSync(P, t, 'utf8');
console.log('fixed regex', n);
