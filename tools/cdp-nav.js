// 按 data-testid 点击并 dump 英文残留
// node _cdp_nav.js settings-nav-item-App
const http = require('http');
function getJson(p) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: 9222, path: p }, r => {
      let b = ''; r.on('data', c => (b += c)); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
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
    if (!p.offsetParent && p.tagName !== 'BODY') continue;
    const t = (n.nodeValue || '').trim();
    if (!t || t.length < 2 || !/[A-Za-z]{3,}/.test(t)) continue;
    out.push(t);
  }
  const attrs = [];
  document.querySelectorAll('[aria-label],[title]').forEach(el => {
    for (const a of ['aria-label','title']) {
      const v = el.getAttribute(a);
      if (v && /[A-Za-z]{3,}/.test(v)) attrs.push(a + ': ' + v);
    }
  });
  return JSON.stringify({ texts: [...new Set(out)], attrs: [...new Set(attrs)] });
})()`;

(async () => {
  const tid = process.argv[2];
  const list = await getJson('/json/list');
  const page = list.find(t => t.type === 'page' && t.title === 'Antigravity');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const pending = new Map();
  const send = (m, p) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  ws.addEventListener('message', ev => { const msg = JSON.parse(ev.data); if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result); } });
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.exceptionDetails) return 'EXC: ' + (r.exceptionDetails.exception?.description || '').slice(0, 300);
    return r.result.value;
  };
  const clickJs = `(() => {
    const el = document.querySelector('[data-testid="${tid}"]');
    if (!el) return 'NOTFOUND';
    const r = el.getBoundingClientRect();
    const o = { bubbles:true, cancelable:true, view:window, clientX:r.left+r.width/2, clientY:r.top+r.height/2 };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    el.dispatchEvent(new MouseEvent('mousedown', o));
    el.dispatchEvent(new PointerEvent('pointerup', o));
    el.dispatchEvent(new MouseEvent('mouseup', o));
    el.dispatchEvent(new MouseEvent('click', o));
    return 'OK';
  })()`;
  console.log('click', tid, '=>', await ev(clickJs));
  await new Promise(r => setTimeout(r, 2200));
  const d = JSON.parse(await ev(COLLECT));
  console.log('\n--- texts (' + d.texts.length + ') ---');
  d.texts.forEach(t => console.log('  T ' + t.slice(0, 200)));
  console.log('\n--- attrs (' + d.attrs.length + ') ---');
  d.attrs.forEach(t => console.log('  A ' + t.slice(0, 200)));
  ws.close();
})();
