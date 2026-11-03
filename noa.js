// Life Partner — 乃亜（衣装・表情・ステージ・光の粒）
'use strict';
// タブごとの衣装。絵は「<pre>_1〜3」（通常・半目・閉じ目）と「<pre>_talk」（口開き）
const TABS = {
  home:  { name:'ホーム',   en:'HOME',       pre:'home',   outfit:'部屋着',             face:[.51, .5] },
  desk:  { name:'秘書室',   en:'SECRETARY',  pre:'desk',   outfit:'オフィスカジュアル', face:[.49, .38] },
  clinic:{ name:'診療所',   en:'CLINIC',     pre:'clinic', outfit:'白衣',               face:[.5, .37] },
  bank:  { name:'銀行',     en:'BANK',       pre:'bank',   outfit:'銀行の制服',         face:[.47, .29] },
  room:  { name:'自室',     en:'MY ROOM',    pre:'room',   outfit:'メイド',             face:[.47, .5] },
};
const FACES = { normal:'普通', smile:'にっこり', shy:'照れ', sleepy:'眠い', surprise:'びっくり', worry:'心配', pout:'むっ', sad:'しょんぼり', happy:'うれしい', fluster:'あせり', blank:'無表情' };
// その衣装に表情の絵がないときの代わり
const FACE_ALT = { happy:['smile'], sad:['worry'], worry:['sad'], fluster:['surprise', 'shy'], surprise:['fluster'], blank:['normal'], sleepy:['normal'], pout:['blank'], shy:['smile'], smile:['happy'] };

// 絵があるか（.jpg → .png → .webp の順に探す）
const Pic = {
  memo:new Map(),
  probe(url) {
    if (Pic.memo.has(url)) return Pic.memo.get(url);
    const p = new Promise(r => { const i = new Image(); i.onload = () => r(url); i.onerror = () => r(null); i.src = url; });
    Pic.memo.set(url, p); return p;
  },
  async find(name) { for (const ext of ['jpg', 'png', 'webp']) { const u = await Pic.probe(`img/${name}.${ext}`); if (u) return u; } return null; },
};

// 表情アイコン（丸く切り抜いて表示）。絵がなければ色と文字
const Face = {
  url:{},
  async load() { for (const f of Object.keys(FACES)) Face.url[f] = await Pic.find('face_' + f); },
  img(f = 'normal', size = '') {
    const u = Face.url[f] || (FACE_ALT[f] || []).map(x => Face.url[x]).find(Boolean) || Face.url.normal;
    return `<span class="face ${size}">${u ? `<img src="${u}" alt="">` : `<i>乃</i>`}</span>`;
  },
};

// ===== ステージ（全画面の乃亜）=====
// 絵：<衣装>_normal（通常）・_blink（目を閉じた差分）・_start（タブに入ったときの1枚）・_start2・表情（_smile など）
// 表情は話している間だけ全画面で切り替わり、しばらくすると通常に戻る
const Stage = (() => {
  let tab = 'home', blinkT = 0, backT = 0, cur = 'normal', night = false;
  const cache = {};
  const el = () => $('stage'), L = k => el().querySelector('.f' + k);
  const SIL = `<svg viewBox="0 0 200 300" class="sil-svg"><defs><linearGradient id="sg" x1="0" x2="1"><stop offset="0" stop-color="var(--pink)"/><stop offset="1" stop-color="var(--cyan)"/></linearGradient></defs>
    <ellipse cx="100" cy="38" rx="34" ry="7" fill="none" stroke="var(--pink)" stroke-width="2" opacity=".8"/>
    <path d="M100 52 q4 -14 14 -10" fill="none" stroke="url(#sg)" stroke-width="2.4"/>
    <path d="M58 118 q-6 -60 42 -66 q48 6 42 66 q-4 22 -10 30 l-8 -24 q-24 10 -48 0 l-8 24 q-6 -8 -10 -30z" fill="rgba(255,140,190,.10)" stroke="url(#sg)" stroke-width="2"/>
    <circle cx="86" cy="104" r="4" fill="var(--pink)"/><circle cx="114" cy="104" r="4" fill="var(--cyan)"/>
    <path d="M40 300 q4 -96 60 -120 q56 24 60 120" fill="rgba(73,227,240,.06)" stroke="url(#sg)" stroke-width="2"/></svg>`;
  const pic = (t, k) => { const key = t + '_' + k; return cache[key] || (cache[key] = Pic.find(TABS[t].pre + '_' + k)); };
  // 表情の絵（なければ代わり → それもなければ null）
  async function facePic(t, f) { for (const k of [f].concat(FACE_ALT[f] || [])) { const u = await pic(t, k); if (u) return u; } return null; }

  async function show(t, withStart) {
    tab = t; clearTimeout(blinkT); clearTimeout(backT); cur = 'normal';
    const hr = new Date().getHours(); night = t === 'home' && hr >= 2 && hr < 6;
    let base = night ? await pic(t, 'sleep') : null;
    if (!base) { night = false; base = await pic(t, 'normal'); }
    let borrowed = false;
    if (!base && t !== 'home') { base = await pic('home', 'normal'); borrowed = !!base; }
    if (tab !== t) return;
    const s = el(); s.dataset.tab = t;
    s.querySelector('.sil').style.display = base ? 'none' : '';
    s.querySelector('.sil-note').textContent = base ? (borrowed ? `${TABS[t].outfit}の絵はまだ` : '') : `${TABS[t].outfit}の乃亜（絵はまだ）`;
    set(L('a'), base); L('a').classList.toggle('on', !!base);
    set(L('b'), !night && !borrowed ? await pic(t, 'blink') : null); L('b').classList.remove('on');
    L('x').classList.remove('on');
    const [fx, fy] = TABS[t].face; Motes.face(fx, fy);
    // タブに入ったときの1枚（ふわっと寄ってから、いつもの姿に）
    if (withStart && !night && !borrowed) {
      const starts = [await pic(t, 'start'), await pic(t, 'start2')].filter(Boolean);
      if (starts.length && tab === t) {
        const st = L('s'); set(st, starts[Math.floor(Math.random() * starts.length)]);
        st.classList.remove('out'); st.classList.add('on'); void st.offsetWidth; $('app').classList.add('starting'); setTimeout(() => $('app').classList.remove('starting'), 1900);
        backT = setTimeout(() => { st.classList.add('out'); setTimeout(() => st.classList.remove('on', 'out'), 700); }, 1700);
      }
    } else L('s').classList.remove('on');
    s.classList.remove('swap'); void s.offsetWidth; s.classList.add('swap');
    if (L('b').getAttribute('src')) blinkT = setTimeout(blink, 2500 + Math.random() * 3000);
  }
  function set(im, url) { if (url) { if (im.getAttribute('src') !== url) im.src = url; im.hidden = false; } else { im.hidden = true; im.removeAttribute('src'); } }
  async function blink() {
    if (cur === 'normal' && !L('s').classList.contains('on')) {
      const twice = Math.random() < .2;
      for (let n = 0; n < (twice ? 2 : 1); n++) { L('b').classList.add('on'); await sleep(120); L('b').classList.remove('on'); if (twice && !n) await sleep(170); }
    }
    blinkT = setTimeout(blink, 3200 + Math.random() * 3600);
  }
  // 表情を変える（hold ミリ秒たったら通常に戻す。0なら戻さない）
  async function face(f = 'normal', hold = 6000) {
    clearTimeout(backT);
    if (night) return;
    const x = L('x');
    if (!f || f === 'normal') { cur = 'normal'; x.classList.remove('on'); return; }
    const u = await facePic(tab, f);
    if (!u) return;
    set(x, u); cur = f; x.classList.add('on');
    if (hold) backT = setTimeout(() => face('normal'), hold);
  }
  return { show, face, talk:() => {}, has:() => !!L('a').getAttribute('src'), tab:() => tab, sil:SIL, reload:() => { for (const k in cache) delete cache[k]; Pic.memo.clear(); } };
})();

// ===== 光の粒（ピンクとシアン。顔のまわりは避ける） =====
const Motes = (() => {
  let cv, cx, ps = [], fx = .5, fy = .45, run = true, last = 0;
  const COL = ['255,140,195', '90,232,245', '255,255,255'];
  function init() {
    cv = $('motes'); cx = cv.getContext('2d'); size(); addEventListener('resize', size);
    for (let i = 0; i < 34; i++) ps.push(spawn(true));
    requestAnimationFrame(loop);
  }
  function size() { const r = devicePixelRatio || 1; cv.width = innerWidth * r; cv.height = innerHeight * r; cx.setTransform(r, 0, 0, r, 0, 0); }
  function spawn(any) { return { x:Math.random() * innerWidth, y:any ? Math.random() * innerHeight : innerHeight + 10, r:.6 + Math.random() * 2.2, v:.12 + Math.random() * .35, w:Math.random() * 6.28, c:COL[Math.random() < .45 ? 0 : Math.random() < .8 ? 1 : 2], a:.25 + Math.random() * .55 }; }
  function loop(t) {
    requestAnimationFrame(loop);
    if (!run || document.hidden || t - last < 33) return; last = t;
    cx.clearRect(0, 0, innerWidth, innerHeight);
    const ex = innerWidth * fx, ey = innerHeight * fy, rx = innerWidth * .26, ry = innerHeight * .12;
    for (const p of ps) {
      p.y -= p.v; p.w += .02; p.x += Math.sin(p.w) * .25;
      if (p.y < -10) Object.assign(p, spawn());
      const d = ((p.x - ex) / rx) ** 2 + ((p.y - ey) / ry) ** 2; if (d < 1) continue;
      const tw = .6 + .4 * Math.sin(p.w * 3);
      cx.beginPath(); cx.fillStyle = `rgba(${p.c},${p.a * tw})`; cx.shadowColor = `rgba(${p.c},.9)`; cx.shadowBlur = 6; cx.arc(p.x, p.y, p.r, 0, 6.28); cx.fill();
    }
  }
  return { init, face:(x, y) => { fx = x; fy = y; }, pause:p => { run = !p; } };
})();

// ===== 乃亜の言葉（AIがないとき・すぐ返すとき） =====
const Noa = {
  call:() => 'ようへい',
  pick:a => a[Math.floor(Math.random() * a.length)],
  hello() {
    const hr = new Date().getHours();
    if (hr >= 2 && hr < 5) return ['……まだ起きてるの？ よーへーくん？？', 'pout'];
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
