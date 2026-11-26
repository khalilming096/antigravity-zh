// 通用 CDP 工具：node _cdp.js <action> [arg]
//   _cdp.js text              列出当前可见英文文本
//   _cdp.js click "<文字>"     点击包含该文字的最内层可点击元素
//   _cdp.js eval "<js>"       执行 JS 并打印结果
const http = require('http');

function getJson(path) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: 9222, path }, r => {
      let b = '';
      r.on('data', c => (b += c));
      r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}

const COLLECT = `(() => {
  const out = [];
  const SKIP = new Set(['SCRIPT','STYLE','NOSCRIPT','TEMPLATE','CANVAS','SVG','MATH','OBJECT','EMBED','CODE','PRE','KBD','SAMP','VAR','TEXTAREA']);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const p = n.parentElement;
    if (!p) continue;
    if (SKIP.has(p.tagName)) continue;
    if (p.closest('.monaco-editor,.view-lines,.cm-editor,xterm,[contenteditable="true"]')) continue;
    const t = (n.nodeValue || '').trim();
    if (!t || t.length < 2) continue;
    if (!/[A-Za-z]{2,}/.test(t)) continue;
    const r = p.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    out.push(t);
  }
  const attrs = [];
  document.querySelectorAll('input,textarea,[placeholder],[title],[aria-label]').forEach(el => {
    for (const a of ['placeholder','title','aria-label']) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v && /[A-Za-z]{2,}/.test(v)) attrs.push(a + ': ' + v);
    }
  });
  return JSON.stringify({ texts: [...new Set(out)], attrs: [...new Set(attrs)] });
})()`;

const clickJs = (label) => `(() => {
  const target = ${JSON.stringify(label)};
  const cands = [...document.querySelectorAll('*')].filter(el => {
    const t = (el.textContent || '').trim();
    return t === target;
  });
  if (!cands.length) return 'NOTFOUND';
  const el = cands[cands.length - 1];
  const r = el.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, view: window, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  el.dispatchEvent(new MouseEvent('mousedown', opts));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  el.dispatchEvent(new MouseEvent('mouseup', opts));
  el.dispatchEvent(new MouseEvent('click', opts));
  return 'OK ' + el.tagName + ' ' + Math.round(r.left) + ',' + Math.round(r.top);
})()`;

(async () => {
  const action = process.argv[2] || 'text';
  const arg = process.argv[3] || '';
  const list = await getJson('/json/list');
  const page = list.find(t => t.type === 'page' && t.title === 'Antigravity');
  if (!page) { console.error('Antigravity page not found'); process.exit(1); }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const send = (method, params) => new Promise((res, rej) => {
    const mid = ++id;
    pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
    }
  });
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });

  let expr;
  if (action === 'text') expr = COLLECT;
  else if (action === 'click') expr = clickJs(arg);
  else if (action === 'eval') expr = arg;
  else { console.error('unknown action'); process.exit(1); }

  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: false });
  if (r.exceptionDetails) { console.error('EXC ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description)); process.exit(1); }
  const val = r.result.value;

  if (action === 'text') {
    const data = JSON.parse(val);
    console.log('=== 可见英文文本 (' + data.texts.length + ') ===');
    data.texts.forEach(t => console.log('  ' + t));
    if (data.attrs.length) {
      console.log('=== 属性 (' + data.attrs.length + ') ===');
      data.attrs.forEach(t => console.log('  ' + t));
    }
  } else {
    console.log(String(val));
  }
  ws.close();
})();
