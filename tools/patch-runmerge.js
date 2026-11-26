const fs = require('fs');
const path = require('path');
const P = path.join(process.env.APPDATA, 'AntigravityChinesePatch', 'preload.js');
let t = fs.readFileSync(P, 'utf8');

const ANCHOR = '  // 8. Recursive DOM and Shadow DOM Walker';
if (t.indexOf(ANCHOR) < 0) { console.error('anchor not found'); process.exit(1); }

const RUN_FN = `  // 7.5 Merge a run of adjacent text nodes before translating.
  // React frequently renders UI copy as several sibling text nodes, e.g.
  //   "No " + {noun} + " yet"   ->  "No automations yet"
  // Translating each node separately turns "No" into "否" and leaves the rest
  // untouched. Union them first, translate the joined sentence, then write the
  // result back into the first node and blank the others.
  function translateTextRun(el) {
    if (!el || el.nodeType !== 1) return;
    const kids = el.childNodes;
    if (!kids || kids.length < 2) return;

    let i = 0;
    while (i < kids.length) {
      if (kids[i].nodeType !== 3) { i++; continue; }
      let j = i;
      let joined = '';
      while (j < kids.length && kids[j].nodeType === 3) {
        if (isBypassedNode(kids[j])) return;
        joined += kids[j].nodeValue || '';
        j++;
      }
      if (j - i >= 2) {
        const raw = joined;
        const trimmed = raw.trim();
        if (trimmed && trimmed.length <= 140 && /[A-Za-z]/.test(trimmed)) {
          const trans = translateText(trimmed);
          if (trans !== null && trans !== trimmed) {
            const start = raw.indexOf(trimmed);
            const prefix = start > 0 ? raw.slice(0, start) : '';
            const suffix = start > 0 ? raw.slice(start + trimmed.length) : '';
            kids[i].nodeValue = prefix + trans + suffix;
            for (let k = i + 1; k < j; k++) kids[k].nodeValue = '';
            i = j;
            continue;
          }
        }
      }
      i = j;
    }
  }

`;

t = t.replace(ANCHOR, RUN_FN + ANCHOR);

// 在元素分支里、遍历子节点之前调用
const CALL_ANCHOR = `      // Normal Element: Translate safe attributes
      translateAttributes(node, SAFE_ATTRS);`;
if (t.indexOf(CALL_ANCHOR) < 0) { console.error('call anchor not found'); process.exit(1); }
t = t.replace(CALL_ANCHOR, CALL_ANCHOR + `

      // Merge split-up text nodes ("No " + noun + " yet") before descending
      translateTextRun(node);`);

fs.writeFileSync(P + '.bak-runmerge-' + Date.now(), fs.readFileSync(P), 'utf8');
fs.writeFileSync(P, t, 'utf8');
console.log('patched preload.js, length', t.length);
