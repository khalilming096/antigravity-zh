// 遍历点击指定文字序列，每步输出英文残留
// node _sweep.js "自定义项" "已安装" "技能" ...
const http = require('http');
function getJson(path) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: 9222, path }, r => {
      let b = ''; r.on('data', c => (b += c));
      r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}
const COLLECT = `(() => {
  const out = [];
  const SKIP = new Set(['SCRIPT','STYLE','NOSCRIPT','TEMPLATE','CANVAS','SVG','MATH','OBJECT','EMBED','CODE','PRE','KBD','SAMP','VAR','TEXTAREA']);
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const p = n.parentElement; if (!p) continue;
    if (SKIP.has(p.tagName)) continue;
    if (p.closest('.monaco-editor,.view-lines,.cm-editor,xterm,[contenteditable="true"]')) continue;
    const t = (n.nodeValue || '').trim();
    if (!t || t.length < 2) continue;
    if (!/[A-Za-z]{3,}/.test(t)) continue;
    // 纯品牌/模型名/代码 白名单
    if (/^(Antigravity|antigravity|Gemini[\\w .]*|Claude[\\w .]*|GPT[\\w .]*|Google[\\w &.]*|GitHub|GitLab|VS Code|Firebase|Notion|Context7|Linear|Dynatrace|Stripe|Canva|Figma|invideo|Mobbin|Atlassian Teamwork Graph CLI|ClickUp|Docusign|Dropbox|Granola|Cloudflare|Netlify|Railway|Spacefast|Vercel|Wix|Arize AX|Auth0|Base44|Better Stack|Browserbase|Clerk|Bigin|Databricks|Intercom|Levels\\.fyi|Semrush|Looker|cobrief|Descrybe Legal Engine|Chrome DevTools|Android CLI|Robotics|n8n|Any\\.do|Google Antigravity SDK|Mass Spectrometry|Chemistry|Genomics|Structural Biology|Scientific Literature|Science Overview|Swarm|Tokless.*|How To Use.*|https?:.*|Ctrl\\+.*|Alt\\+.*|Shift.*)$/.test(t)) continue;
    out.push(t);
  }
  const attrs = [];
  document.querySelectorAll('[aria-label],[title]').forEach(el => {
    for (const a of ['aria-label','title']) {
      const v = el.getAttribute(a);
      if (v && /[A-Za-z]{3,}/.test(v) && !/^(Antigravity|Swarm|Ctrl|Alt)/.test(v)) attrs.push(a + ': ' + v);
    }
  });
  return JSON.stringify({ texts: [...new Set(out)], attrs: [...new Set(attrs)] });
})()`;
const clickJs = (label) => `(() => {
  const t = ${JSON.stringify('')} + ${JSON.stringify(label)};
  const cands = [...document.querySelectorAll('*')].filter(el => (el.textContent||'').trim() === t);
  if (!cands.length) return 'NOTFOUND';
  const el = cands[cands.length-1];
  const r = el.getBoundingClientRect();
  const o = { bubbles:true, cancelable:true, view:window, clientX:r.left+r.width/2, clientY:r.top+r.height/2 };
  el.dispatchEvent(new PointerEvent('pointerdown', o));
  el.dispatchEvent(new MouseEvent('mousedown', o));
  el.dispatchEvent(new PointerEvent('pointerup', o));
  el.dispatchEvent(new MouseEvent('mouseup', o));
  el.dispatchEvent(new MouseEvent('click', o));
  return 'OK';
})()`;

(async () => {
  const steps = process.argv.slice(2);
  const list = await getJson('/json/list');
  const page = list.find(t => t.type === 'page' && t.title === 'Antigravity');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  const send = (m, p) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  ws.addEventListener('message', ev => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result); } });
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.exceptionDetails) return 'EXC: ' + (r.exceptionDetails.exception?.description || '').slice(0, 200);
    return r.result.value;
  };
  const dump = async (title) => {
    const v = await ev(COLLECT);
    const d = JSON.parse(v);
    console.log('\n########## ' + title + '  (text=' + d.texts.length + ', attr=' + d.attrs.length + ')');
    d.texts.forEach(t => console.log('  T ' + t.slice(0, 180)));
    d.attrs.forEach(t => console.log('  A ' + t.slice(0, 180)));
  };
  await dump('初始');
  for (const s of steps) {
    const r = await ev(clickJs(s));
    await new Promise(r2 => setTimeout(r2, 1800));
    console.log('\n>>> click "' + s + '" => ' + r);
    await dump(s);
  }
  ws.close();
})();
