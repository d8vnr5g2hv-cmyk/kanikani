// Life Partner — 乃亜（衣装・表情・ステージ・スプラッシュ・光の粒・言葉）
'use strict';
// face：顔の中心（画面に対する割合）。cam：パネルを開いたとき、顔をこの高さまで持ち上げる
const TABS = {
  home:  { name:'ホーム',   en:'HOME',      sub:'いつもの部屋',  pre:'home',   outfit:'部屋着',             face:[.51, .5] },
  desk:  { name:'秘書室',   en:'SECRETARY', sub:'予定と段取り',  pre:'desk',   outfit:'オフィスカジュアル', face:[.49, .38] },
  clinic:{ name:'診療所',   en:'CLINIC',    sub:'からだとこころ', pre:'clinic', outfit:'白衣',               face:[.5, .37] },
  bank:  { name:'銀行',     en:'BANK',      sub:'お金の窓口',    pre:'bank',   outfit:'銀行の制服',         face:[.47, .29] },
  room:  { name:'自室',     en:'MY ROOM',   sub:'登録と設定',    pre:'room',   outfit:'メイド',             face:[.47, .5] },
};
const FACES = { normal:'普通', smile:'にっこり', shy:'照れ', sleepy:'眠い', surprise:'びっくり', worry:'心配', pout:'むっ', sad:'しょんぼり', happy:'うれしい', fluster:'あせり', blank:'無表情' };
const FACE_ALT = { happy:['smile'], sad:['worry'], worry:['sad'], fluster:['surprise', 'shy'], surprise:['fluster'], blank:['normal'], sleepy:['normal'], pout:['blank'], shy:['smile'], smile:['happy'] };

// 絵を探す（WebP → JPEG → PNG。一番上でも img フォルダでもよい）。見つかったら読み込み（decode）まで済ませる
const Pic = {
  memo:new Map(),
  probe(url) {
    if (Pic.memo.has(url)) return Pic.memo.get(url);
    const p = new Promise(r => { const i = new Image(); i.onload = () => { (i.decode ? i.decode() : Promise.resolve()).then(() => r(url), () => r(url)); }; i.onerror = () => r(null); i.src = url; });
    Pic.memo.set(url, p); return p;
  },
  async find(name) { for (const ext of ['webp', 'jpg', 'png']) for (const dir of ['', 'img/']) { const u = await Pic.probe(`${dir}${name}.${ext}`); if (u) return u; } return null; },
};
const Face = {
  url:{},
  async load() { await Promise.all(Object.keys(FACES).map(async f => { Face.url[f] = await Pic.find('face_' + f); })); },
  img(f = 'normal', size = '') {
    const u = Face.url[f] || (FACE_ALT[f] || []).map(x => Face.url[x]).find(Boolean) || Face.url.normal;
    return `<span class="face ${size}">${u ? `<img src="${u}" alt="">` : '<i>乃</i>'}</span>`;
  },
};

// ===== ステージ（全画面の乃亜） =====
const Stage = (() => {
  let tab = 'home', blinkT = 0, cur = 'normal', night = false, base = null;
  const cache = {};
  const el = () => $('stage'), L = k => el().querySelector('.f' + k);
  const pic = (t, k) => { const key = t + '_' + k; return cache[key] || (cache[key] = Pic.find(TABS[t].pre + '_' + k)); };
  async function facePic(t, f) { for (const k of [f].concat(FACE_ALT[f] || [])) { const u = await pic(t, k); if (u) return u; } return null; }
  const set = (im, url) => { if (url) { if (im.getAttribute('src') !== url) im.src = url; } else im.removeAttribute('src'); };
  // 起動時に、全タブの通常の絵と start を先に読んでおく
  const preload = () => Promise.all(Object.keys(TABS).flatMap(t => ['normal', 'blink', 'start'].map(k => pic(t, k))));

  async function show(t) {
    tab = t; clearTimeout(blinkT); cur = 'normal';
    const hr = new Date().getHours(); night = t === 'home' && hr >= 2 && hr < 6;
    base = (night && await pic(t, 'sleep')) || null; if (!base) night = false;
    base = base || await pic(t, 'normal');
    const borrowed = !base && t !== 'home'; if (borrowed) base = await pic('home', 'normal');
    if (tab !== t) return;
    const s = el(); s.dataset.tab = t; s.classList.toggle('empty', !base);
    set(L('a'), base); set(L('b'), night || borrowed ? null : await pic(t, 'blink'));
    L('x').classList.remove('on'); L('b').classList.remove('on');
    Motes.face(...TABS[t].face); Motes.on(t === 'home' || t === 'room');
    camera();
    if (L('b').getAttribute('src')) blinkT = setTimeout(blink, 2200 + Math.random() * 3000);
  }
  async function blink() {
    if (cur === 'normal' && !document.hidden && !$('app').classList.contains('splashing')) {
      const twice = Math.random() < .18;
      for (let n = 0; n < (twice ? 2 : 1); n++) { L('b').classList.add('on'); await sleep(110); L('b').classList.remove('on'); if (twice && !n) await sleep(160); }
    }
    blinkT = setTimeout(blink, 3000 + Math.random() * 3800);
  }
  // 表情を変える（会話のあいだ続く。normal で戻す）
  async function face(f = 'normal') {
    if (night) return;
    const x = L('x');
    if (!f || f === 'normal') { cur = 'normal'; x.classList.remove('on'); return; }
    const u = await facePic(tab, f); if (!u) return;
    if (x.getAttribute('src') !== u) { x.classList.remove('on'); set(x, u); await sleep(16); }
    cur = f; x.classList.add('on');
  }
  // パネルを開いたとき、顔が見える高さまで持ち上げる
  function camera() {
    const open = $('app').classList.contains('panel-open'), fy = TABS[tab].face[1];
    const lift = open ? Math.max(0, (fy - .17) * innerHeight) : 0;
    el().style.setProperty('--lift', `${-lift}px`);
  }
  return { show, face, camera, preload, pic, tab:() => tab };
})();

// ===== スプラッシュ（タブに入るときの start の1枚） =====
const Splash = (() => {
  const seen = new Set();
  async function show(t) {
    const u = await Stage.pic(t, Math.random() < .5 && t === 'clinic' ? 'start2' : 'start') || await Stage.pic(t, 'start');
    const long = !seen.has(t); seen.add(t);
    const sp = $('splash'), app = $('app');
    sp.querySelector('img').src = u || '';
    sp.classList.toggle('noimg', !u);
    sp.querySelector('.sp-en').textContent = TABS[t].en;
    sp.querySelector('.sp-ja').textContent = TABS[t].name;
    sp.querySelector('.sp-sub').textContent = TABS[t].sub;
    sp.className = `on ${long ? 'long' : 'short'}${u ? '' : ' noimg'}`; sp.dataset.tab = t;
    app.classList.add('splashing');
    let skip; const wait = new Promise(r => { skip = r; sp.onclick = () => r(); setTimeout(r, long ? 1500 : 700); });
    await wait; sp.onclick = null;
    sp.classList.add('out'); app.classList.remove('splashing');
    setTimeout(() => { sp.className = ''; }, 520);
  }
  return { show, reset:() => seen.clear() };
})();

// ===== 光の粒（ホームと自室だけ。顔のまわりは避ける） =====
const Motes = (() => {
  let cv, cx, ps = [], fx = .5, fy = .45, run = true, active = true, last = 0;
  const COL = ['255,170,210', '150,235,250', '255,255,255'];
  function init() { cv = $('motes'); cx = cv.getContext('2d'); size(); addEventListener('resize', size); for (let i = 0; i < 18; i++) ps.push(spawn(true)); requestAnimationFrame(loop); }
  function size() { const r = devicePixelRatio || 1; cv.width = innerWidth * r; cv.height = innerHeight * r; cx.setTransform(r, 0, 0, r, 0, 0); }
  function spawn(any) { return { x:Math.random() * innerWidth, y:any ? Math.random() * innerHeight : innerHeight + 10, r:.6 + Math.random() * 1.6, v:.08 + Math.random() * .22, w:Math.random() * 6.28, c:COL[Math.random() < .5 ? 0 : Math.random() < .8 ? 1 : 2], a:.2 + Math.random() * .4 }; }
  function loop(t) {
    requestAnimationFrame(loop);
    if (!run || !active || document.hidden || t - last < 40) { if (!active) cx.clearRect(0, 0, innerWidth, innerHeight); return; } last = t;
    cx.clearRect(0, 0, innerWidth, innerHeight);
    const ex = innerWidth * fx, ey = innerHeight * fy, rx = innerWidth * .3, ry = innerHeight * .14;
    for (const p of ps) {
      p.y -= p.v; p.w += .018; p.x += Math.sin(p.w) * .2;
      if (p.y < -10) Object.assign(p, spawn());
      if (((p.x - ex) / rx) ** 2 + ((p.y - ey) / ry) ** 2 < 1) continue;
      cx.beginPath(); cx.fillStyle = `rgba(${p.c},${p.a * (.6 + .4 * Math.sin(p.w * 3))})`; cx.shadowColor = `rgba(${p.c},.8)`; cx.shadowBlur = 5; cx.arc(p.x, p.y, p.r, 0, 6.28); cx.fill();
    }
  }
  return { init, face:(x, y) => { fx = x; fy = y; }, on:v => { active = v; }, pause:p => { run = !p; } };
})();

// ===== 乃亜の言葉（AIがないとき・すぐ返すとき） =====
const Noa = {
  pick:a => a[Math.floor(Math.random() * a.length)],
  // 開いたときの一言と表情を、記録から決める
  async greet() {
    const hr = new Date().getHours(), t = D.today(), m = Data.moneyNow(), c1 = await Data.chk(D.add(t, -1)), c0 = await Data.chk(t), sl = Data.sleepH(c0) ?? Data.sleepH(c1);
    const last = await DB.get('lastOpen', null); await DB.set('lastOpen', new Date().toISOString());
    const away = last ? (Date.now() - Date.parse(last)) / 864e5 : 0;
    const paid = Data.money().unpaid.find(u => u.done && (u.doneAt || '').slice(0, 10) === t);
    if (hr >= 2 && hr < 6) return ['……よーへーくん？？ こんな時間まで、なにしてるの。', 'pout'];
    if (away > 2) return ['……遅い。何日来なかったと思ってるの。', 'sad'];
    if (paid) return [`「${paid.name}」、払えたんだね。……今日はちょっと、えらいって言ってあげる。`, 'happy'];
    if (sl != null && sl < 5) return [`……昨日、${sl}時間しか寝てないでしょ。ちゃんと見てるから。`, 'worry'];
    if (m.payday && D.diff(t, m.payday) === 0) return ['今日は給料日。……先に払うもの、払っとこ。', 'smile'];
    if (hr < 10) return [Noa.pick(['……おはよ、ようへい。', 'おはよ。……ちゃんと起きれたじゃん。']), 'normal'];
    if (hr < 17) return [Noa.pick(['ようへい、おつかれ。', '……なに？ 用事？']), 'normal'];
    return [Noa.pick(['おかえり、ようへい。……別に、待ってたわけじゃないけど。', 'おかえり。今日もおつかれさま。']), 'shy'];
  },
  tap:{
    home:['……なに？ じっと見て。', '別に、なんでもないよ。ちょっと眠かっただけ。', 'ようへい、ちゃんとご飯食べた？'],
    desk:['……で、今日は何するの？', 'やること、ちゃんと見てるから。', 'メモしたいことあったら、言って。'],
    clinic:['……顔色、見せて。', '昨日、何時に寝たの？', '無理してない？ ……別に心配してるわけじゃないけど。'],
    bank:['いらっしゃいませ。……なんてね。', '今日使える分、ちゃんと見てる？', '払えたら、ちゃんと教えてよ。'],
    room:['……この服、変じゃない？', 'おかえりなさいませ。……言わせないでよ。', '登録したいもの、ある？'],
  },
};
