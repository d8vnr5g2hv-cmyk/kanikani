// Life Partner（乃亜版）— 土台：小物・日付・保存・AI・音・控え
'use strict';
const VERSION = '3.0';
const $ = id => document.getElementById(id);
const p2 = n => String(n).padStart(2, '0');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const yen = n => (n < 0 ? '-' : '') + '¥' + Math.abs(Math.round(n || 0)).toLocaleString();
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const haptic = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ===== 日付 =====
const D = {
  key:d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`,
  today:() => D.key(new Date()),
  parse:k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d || 1); },
  add:(k, n) => { const d = D.parse(k); d.setDate(d.getDate() + n); return D.key(d); },
  diff:(a, b) => Math.round((D.parse(b) - D.parse(a)) / 864e5),   // b − a（日）
  md:k => { const d = D.parse(k); return `${d.getMonth() + 1}/${d.getDate()}`; },
  dow:k => '日月火水木金土'[D.parse(k).getDay()],
  label:k => { const n = D.diff(D.today(), k); return n === 0 ? '今日' : n === 1 ? '明日' : n === 2 ? 'あさって' : n === -1 ? '昨日' : `${D.md(k)}（${D.dow(k)}）`; },
  hm:() => { const d = new Date(); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; },
  now:() => `${D.today()}（${D.dow(D.today())}）${D.hm()}`,
  period:() => { const x = new Date().getHours(); return x >= 4 && x < 11 ? 'am' : x >= 11 && x < 17 ? 'pm' : 'night'; },
  week:k => { const d = D.parse(k || D.today()), w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return D.key(d); },   // 月曜はじまり
  ym:k => (k || D.today()).slice(0, 7),
  // "26:00" のような時刻を分に（24時をこえてもよい）
  min:t => { if (!t) return null; const [a, b] = t.split(':').map(Number); return a * 60 + (b || 0); },
  fmtMin:m => `${p2(Math.floor(m / 60) % 24)}:${p2(m % 60)}`,
};

// ===== 小さな保存（端末ごとの軽い設定） =====
const LS = {
  get:k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set:(k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
};

// ===== 本保存（IndexedDB）。rec＝できごとの記録、kv＝まとまったデータ、blob＝音源 =====
const DB = (() => {
  let db = null;
  function open() {
    if (db) return Promise.resolve(db);
    return new Promise((ok, ng) => {
      const r = indexedDB.open('life-partner-noa', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('rec')) { const s = d.createObjectStore('rec', { keyPath:'id' }); s.createIndex('domain', 'domain'); }
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv', { keyPath:'k' });
        if (!d.objectStoreNames.contains('blob')) d.createObjectStore('blob', { keyPath:'id' });
      };
      r.onsuccess = () => { db = r.result; ok(db); };
      r.onerror = () => ng(r.error);
    });
  }
  const tx = async (store, mode, fn) => { const d = await open(); return new Promise((ok, ng) => { const t = d.transaction(store, mode), s = t.objectStore(store); const r = fn(s); t.oncomplete = () => ok(r && r.result); t.onerror = () => ng(t.error); }); };
  return {
    open,
    get:(k, def = null) => tx('kv', 'readonly', s => s.get(k)).then(r => r ? r.v : def),
    set:(k, v) => tx('kv', 'readwrite', s => s.put({ k, v })),
    del:k => tx('kv', 'readwrite', s => s.delete(k)),
    keys:() => tx('kv', 'readonly', s => s.getAllKeys()),
    put:rec => tx('rec', 'readwrite', s => s.put(rec)),
    remove:id => tx('rec', 'readwrite', s => s.delete(id)),
    all:() => tx('rec', 'readonly', s => s.getAll()),
    clear:() => Promise.all([tx('rec', 'readwrite', s => s.clear()), tx('kv', 'readwrite', s => s.clear())]),
    blobPut:(id, name, data) => tx('blob', 'readwrite', s => s.put({ id, name, data })),
    blobGet:id => tx('blob', 'readonly', s => s.get(id)),
    blobDel:id => tx('blob', 'readwrite', s => s.delete(id)),
    blobList:() => tx('blob', 'readonly', s => s.getAllKeys()),
  };
})();

// ===== 設定 =====
const CFG = { api:null, bgm:true, lock:false, vol:.35 };
// 曲の一覧：リポジトリの bgm_list.json（はじめから入っている曲）＋ 端末に読み込んだ曲
const Tracks = {
  list:null,
  async all() {
    if (!Tracks.list) { try { const r = await fetch('bgm_list.json', { cache:'no-cache' }); Tracks.list = r.ok ? (await r.json()).map(t => ({ id:'url:' + t.file, name:t.name, builtin:true })) : []; } catch (e) { Tracks.list = []; } }
    return Tracks.list.concat(await DB.get('tracks', []));
  },
  // はじめての起動で、おすすめの割り当てを入れる（あとで自由に変えられる）
  async defaults() {
    if (await DB.get('bgmMap')) return;
    try { const r = await fetch('bgm_list.json', { cache:'no-cache' }); if (!r.ok) return; const map = {}; (await r.json()).forEach(t => (t.for || []).forEach(k => { map[k] = 'url:' + t.file; })); await DB.set('bgmMap', map); } catch (e) {}
  },
};
async function loadCfg() { Object.assign(CFG, await DB.get('cfg', {}) || {}); }
const saveCfg = () => DB.set('cfg', { api:CFG.api, bgm:CFG.bgm, lock:CFG.lock, vol:CFG.vol });

// ===== トースト・確認・入力（下から出るシート） =====
function toast(t, ms = 2400, act = null) {
  const e = $('toast');
  e.innerHTML = `<span>${esc(t)}</span>${act ? `<button>${esc(act.label)}</button>` : ''}`;
  e.className = 'on';
  if (act) e.querySelector('button').onclick = () => { e.className = ''; act.fn(); };
  clearTimeout(e._t); e._t = setTimeout(() => { e.className = ''; }, act ? Math.max(ms, 4500) : ms);
}
// シートを開いて、閉じたときに値を返す
function sheet(html, onReady) {
  return new Promise(ok => {
    const el = h(`<div class="sh"><div class="sh-in">${html}</div></div>`);
    const close = v => { el.classList.remove('on'); setTimeout(() => el.remove(), 320); ok(v); };
    el.addEventListener('click', e => { if (e.target === el) close(null); });
    $('app').appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
    onReady && onReady(el, close);
  });
}
function ask(text, yes = 'はい', no = 'いいえ', face = '') {
  return sheet(`${face ? `<div class="sh-who">${Face.img(face, 'sm')}<b>乃亜</b></div>` : ''}<p class="sh-q">${esc(text)}</p>
    <div class="sh-b"><button class="btn w" data-v="0">${esc(no)}</button><button class="btn" data-v="1">${esc(yes)}</button></div>`,
    (el, close) => el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => close(b.dataset.v === '1'))).then(v => !!v);
}
// fields：[{k, label, type, value, options, ph}] → 値のオブジェクト。やめたら null。opt.del があれば「消す」→ { _del:true }
function form(title, fields, okLabel = '保存', opt = {}) {
  const f = fields.map((x, i) => {
    const v = x.value == null ? '' : x.value;
    const inp = x.type === 'select' ? `<select data-i="${i}">${x.options.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(v) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`
      : x.type === 'area' ? `<textarea data-i="${i}" rows="3" placeholder="${esc(x.ph || '')}">${esc(v)}</textarea>`
      : `<input data-i="${i}" type="${x.type || 'text'}" value="${esc(v)}" placeholder="${esc(x.ph || '')}"${x.type === 'number' ? ' inputmode="numeric"' : ''}${x.type === 'password' ? ' autocomplete="off"' : ''}>`;
    return `<label class="fl"><span>${esc(x.label)}</span>${inp}</label>`;
  }).join('');
  return sheet(`<div class="sh-h"><button class="sh-x" data-v="x">やめる</button><b>${esc(title)}</b><button class="sh-ok" data-v="ok">${esc(okLabel)}</button></div><div class="sh-body">${f}${opt.del ? `<button class="sh-del" data-v="del">${esc(opt.del)}</button>` : ''}</div>`,
    (el, close) => {
      el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
        if (b.dataset.v === 'x') return close(null);
        if (b.dataset.v === 'del') return close({ _del:true });
        const out = {}; el.querySelectorAll('[data-i]').forEach(n => { const x = fields[+n.dataset.i]; out[x.k] = x.type === 'number' ? (n.value === '' ? null : Number(n.value)) : n.value.trim(); });
        close(out);
      });
      setTimeout(() => { const i = el.querySelector('input,textarea'); if (i && !(fields[0] && fields[0].noFocus)) i.focus(); }, 340);
    });
}
// メニュー（項目を選ぶ）。items：[{label, fn, danger}]
function menu(title, items) {
  return sheet(`<b class="sh-mt">${esc(title)}</b>${items.map((x, i) => `<button class="sh-mi${x.danger ? ' danger' : ''}" data-i="${i}">${esc(x.label)}${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</button>`).join('')}<button class="sh-mi cancel" data-i="-1">閉じる</button>`,
    (el, close) => el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { close(null); const x = items[+b.dataset.i]; if (x) setTimeout(x.fn, 200); }));
}

// ===== AI（GASのウェブアプリ） =====
const Api = {
  ready:() => !!(CFG.api && CFG.api.url && CFG.api.key),
  async call(action, body = {}, opt = {}) {
    if (!Api.ready()) return null;
    for (let n = 0; n < (opt.retry || 2); n++) {
      try {
        const ac = new AbortController(), to = setTimeout(() => ac.abort(), opt.timeout || 60000);
        const res = await fetch(CFG.api.url, { method:'POST', cache:'no-store', signal:ac.signal, body:JSON.stringify(Object.assign({ key:CFG.api.key, action, now:D.now() }, body)) });
        clearTimeout(to);
        const j = JSON.parse(await res.text());
        if (j.error === 'budget') { toast('今月のAIの予算を使い切りました'); return null; }
        if (j.error === 'key') { toast('合言葉が違うみたいです（自室 → 設定）'); return null; }
        if (j.error) throw new Error(j.error + ' ' + (j.detail || ''));
        return j;
      } catch (e) { console.warn(action, e); await sleep(900 * (n + 1)); }
    }
    return null;
  },
};

// ===== 音（BGMは端末に保存した音源。効果音は合成） =====
const Sound = (() => {
  let ctx = null, gain = null, node = null, cur = '';
  const bufs = new Map();
  function init() {
    if (ctx) return;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination); } catch (e) { ctx = null; }
  }
  function wake() { init(); if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); }
  function ramp(v, t) { const n = ctx.currentTime; gain.gain.cancelScheduledValues(n); gain.gain.setValueAtTime(gain.gain.value, n); gain.gain.linearRampToValueAtTime(v, n + t); }
  async function buf(id) {
    if (bufs.has(id)) return bufs.get(id);
    // url: で始まるものはリポジトリに置いた曲、それ以外は端末に読み込んだ曲
    const src = id.startsWith('url:') ? fetch(id.slice(4)).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      : DB.blobGet(id).then(r => { if (!r) throw new Error('none'); return r.data.arrayBuffer ? r.data.arrayBuffer() : r.data; });
    const p = src
      .then(a => new Promise((ok, ng) => ctx.decodeAudioData(a.slice ? a.slice(0) : a, ok, ng)));
    bufs.set(id, p); p.catch(() => bufs.delete(id));
    return p;
  }
  // id：blobストアの音源id（なければ止める）
  async function bgm(id) {
    init(); if (!ctx) return;
    if (!CFG.bgm || !id) return stop();
    if (id === cur && node) { ramp(CFG.vol, .6); return; }
    cur = id;
    try {
      const b = await buf(id); if (cur !== id) return;
      if (node) { const o = node; ramp(0, .4); setTimeout(() => { try { o.stop(); } catch (e) {} }, 420); await sleep(420); }
      const n = ctx.createBufferSource(); n.buffer = b; n.loop = true; n.connect(gain); n.start(); node = n; ramp(CFG.vol, 1.2);
    } catch (e) { cur = ''; }
  }
  function stop(t = .6) { if (!ctx || !node) { cur = ''; return; } const n = node; node = null; cur = ''; ramp(0, t); setTimeout(() => { try { n.stop(); } catch (e) {} }, t * 1000 + 50); }
  function duck(on) { if (ctx && node) ramp(on ? CFG.vol * .3 : CFG.vol, .3); }
  function se(type = 'tap') {
    init(); if (!ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    const P = { tap:[880, .05, .05], ok:[1320, .12, .07], coin:[1760, .18, .08], warn:[440, .2, .07], type:[2400, .015, .015] }[type] || [880, .05, .05];
    o.type = 'sine'; o.frequency.setValueAtTime(P[0], t); if (type === 'ok' || type === 'coin') o.frequency.setValueAtTime(P[0] * 1.5, t + .06);
    g.gain.setValueAtTime(P[2], t); g.gain.exponentialRampToValueAtTime(.0001, t + P[1]);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + P[1] + .02);
  }
  return { wake, bgm, stop, duck, se, forget:id => bufs.delete(id) };
})();

// ===== 控え（書き出し・読み込み）と、初期データ =====
async function exportData() {
  const kv = {}; for (const k of await DB.keys()) kv[k] = await DB.get(k);
  const data = { app:'life-partner', kind:'backup', version:VERSION, at:new Date().toISOString(), rec:await DB.all(), kv };
  const blob = new Blob([JSON.stringify(data)], { type:'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `life-partner_${D.today()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  await DB.set('lastBackup', D.today());
}
// 控え（kind:backup）は全部入れ替え。初期データ（kind:seed）は、その分野だけ入れ替える
async function importData(file) {
  const j = JSON.parse(await file.text());
  if (j.app !== 'life-partner') throw new Error('Life Partnerのファイルではありません');
  if (j.kind === 'seed') {
    for (const k of ['life', 'people', 'money', 'usual', 'chores', 'profile', 'area']) if (j[k] != null) await DB.set(k, j[k]);
    for (const r of j.rec || []) await DB.put(r);
    return 'seed';
  }
  if (!j.kv) throw new Error('控えの中身がありません');
  await DB.clear();
  for (const r of j.rec || []) await DB.put(r);
  for (const [k, v] of Object.entries(j.kv || {})) await DB.set(k, v);
  return 'backup';
}
