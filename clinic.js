// Life Partner — 診療所（専属医の乃亜。からだ・こころ・カルテ）
'use strict';
const Clinic = (() => {
  let seg = 'body';
  const MEAL = { '':'—', ate:'食べた', coffee:'コーヒー', skip:'抜いた' };
  const MEAL_NEXT = { '':'ate', ate:'coffee', coffee:'skip', skip:'' };
  const MOOD = [[5, '😄'], [4, '🙂'], [3, '😐'], [2, '😞'], [1, '😣']];

  // ===== 質問票 =====
  const K6 = { title:'今週のチェック（K6）', note:'この1週間で、次のことをどれくらい感じましたか。',
    q:['神経過敏に感じた', '絶望的だと感じた', 'そわそわ、落ち着かなく感じた', '気分が沈み込んで、何が起こっても気が晴れないように感じた', '何をするのも骨折りだと感じた', '自分は価値のない人間だと感じた'],
    c:[[0, '全くない'], [1, '少しだけ'], [2, 'ときどき'], [3, 'たいてい'], [4, 'いつも']] };
  // 職業性ストレス簡易調査票（簡略版23項目）
  const BJ = { title:'今月のチェック（職業性ストレス簡易調査票・簡略版）',
    parts:[
      { name:'A 仕事について', note:'あなたの仕事について、最もあてはまるものを選んでください。', c:['そうだ', 'まあそうだ', 'ややちがう', 'ちがう'],
        q:[['非常にたくさんの仕事をしなければならない', 'load', 0], ['時間内に仕事が処理しきれない', 'load', 0], ['一生懸命働かなければならない', 'load', 0],
           ['自分のペースで仕事ができる', 'ctrl', 1], ['自分で仕事の順番・やり方を決めることができる', 'ctrl', 1], ['職場の仕事の方針に自分の意見を反映できる', 'ctrl', 1]] },
      { name:'B 最近1か月の状態', note:'最近1か月間のあなたの状態について、最もあてはまるものを選んでください。', c:['ほとんどなかった', 'ときどきあった', 'しばしばあった', 'ほとんどいつもあった'],
        q:['ひどく疲れた', 'へとへとだ', 'だるい', '気がはりつめている', '不安だ', '落着かない', 'ゆううつだ', '何をするのも面倒だ', '気分が晴れない', '食欲がない', 'よく眠れない'].map(t => [t, 'react', 2]) },
      { name:'C 周りの人について', note:'次の人たちについて、最もあてはまるものを選んでください。', c:['非常に', 'かなり', '多少', '全くない'],
        q:[['上司と、どのくらい気軽に話ができますか', 'boss', 0], ['職場の同僚と、どのくらい気軽に話ができますか', 'peer', 0],
           ['困ったとき、上司はどのくらい頼りになりますか', 'boss', 0], ['困ったとき、職場の同僚はどのくらい頼りになりますか', 'peer', 0],
           ['個人的な問題を相談したら、上司はどのくらいきいてくれますか', 'boss', 0], ['個人的な問題を相談したら、職場の同僚はどのくらいきいてくれますか', 'peer', 0]] },
    ] };
  // 点数：A負担（そうだ=4）、Aコントロール（そうだ=1）、B（なかった=1）、C（非常に=1）。高いほどストレスが大きい
  function bjScore(ans) {
    const s = { load:0, ctrl:0, react:0, boss:0, peer:0 }; let i = 0;
    BJ.parts.forEach(p => p.q.forEach(([, k, mode]) => { const a = ans[i++]; s[k] += mode === 0 ? 4 - a : mode === 1 ? a + 1 : a + 1; }));
    const ac = s.load + s.ctrl + s.boss + s.peer;
    return Object.assign(s, { ac, high:s.react >= 31 || (s.react >= 23 && ac >= 39) });
  }
  const k6Level = n => n >= 13 ? ['かなり大きい', 'bad'] : n >= 10 ? ['大きめ', 'warn'] : n >= 5 ? ['少したまっている', 'mid'] : ['落ち着いている', 'ok'];
  const HELP = `<div class="help hud"><b>話せる場所</b><p>こころの健康相談統一ダイヤル <a href="tel:0570064556">0570-064-556</a>（つながる時間は都道府県によって違います）</p><p>しんどさが続くときは、かかりつけ医や心療内科に相談してください。</p></div>`;

  function peek() {
    return `<span id="ckPeek">からだとこころ</span><span>今日のチェック</span>`;
  }
  async function peekFill() {
    const c = await Data.chk(D.today()), st = await Data.stDaily(), sl = Data.sleepH(c), e = $('ckPeek');
    if (e) { e.innerHTML = `睡眠 <b>${sl != null ? sl + 'h' : '—'}</b>`; e.nextElementSibling.textContent = st ? `チェック済（${st.sum}/12）` : '今日のチェックまだ'; }
  }

  async function render(el) {
    el.innerHTML = `<div class="seg big" id="ckSeg"><button data-seg="body">からだ</button><button data-seg="mind">こころ</button><button data-seg="karte">カルテ</button></div><div id="ckBody"></div>`;
    el.querySelectorAll('[data-seg]').forEach(b => b.classList.toggle('on', b.dataset.seg === seg));
    if (seg === 'body') await body($('ckBody'));
    if (seg === 'mind') await mind($('ckBody'));
    if (seg === 'karte') await karte($('ckBody'));
    peekFill();
  }

  // ===== からだ =====
  async function body(el) {
    const t = D.today(), c = await Data.chk(t), meals = c.meals || {};
    el.innerHTML = `
      <div class="sec"><h3><small>SLEEP</small>昨夜の睡眠<span class="mini">つまみを回す</span></h3><div id="dial"></div></div>
      <div class="sec"><h3><small>MEALS</small>ご飯<span class="mini">タップで切り替え</span></h3>
        <div class="meals">${[['am', '朝'], ['pm', '昼'], ['night', '夜']].map(([k, l]) => `<button data-meal="${k}" class="m-${meals[k] || 'none'}"><small>${l}</small><b>${MEAL[meals[k] || '']}</b></button>`).join('')}</div></div>
      <div class="sec"><h3><small>DRINK / SMOKE</small>お酒とタバコ</h3>
        <div class="cnt"><span>お酒（缶）</span><button data-cnt="drink" data-d="-1">−</button><b>${c.drink || 0}</b><button data-cnt="drink" data-d="1">＋</button></div>
        <div class="cnt"><span>タバコ（本）</span><button data-cnt="smoke" data-d="-1">−</button><b>${c.smoke || 0}</b><button data-cnt="smoke" data-d="1">＋</button><button data-cnt="smoke" data-d="5" class="s">＋5</button></div>
        <button class="btn w" id="usualDay">いつもの一日を入れる</button><p class="mini">朝は抜き、昼はコーヒー、夜は家、お酒2缶、タバコ15本。違うところだけ直してください。</p></div>
      <div class="sec"><h3><small>PRESCRIPTION</small>今日の処方箋</h3><div class="brief rx" id="rxBox">${Face.img('normal', 'sm')}<div class="bt"><span class="dots"><i></i><i></i><i></i></span></div></div></div>`;
    Dial.mount($('dial'), c.bed || '', c.wake || '', async (bed, wake) => { await Data.setChk(t, { bed, wake }); peekFill(); });
    rx();
  }
  async function rx() {
    const k = 'rx:' + D.today(); let r = await DB.get(k);
    if (!r && Api.ready()) {
      const ds = await Data.days(7), stats = ds.map(d => ({ day:d.day, sleep:Data.sleepH(d.c), bed:d.c.bed, meals:d.c.meals, drink:d.c.drink, smoke:d.c.smoke, mood:d.c.mood, check:d.st ? d.st.sum : null }));
      r = await Api.call('rx', { stats, snap:Data.snapshot(), ctx:Data.context(['body', 'vice', 'habit', 'food'], [], 0) }, { retry:1, timeout:25000 });
      if (r && r.text) await DB.set(k, r);
    }
    if (!r || !r.text) {
      const c1 = await Data.chk(D.add(D.today(), -1)), c0 = await Data.chk(D.today()), sl = Data.sleepH(c0);
      r = { face:'worry', text:sl != null && sl < 6 ? `睡眠${sl}時間。……今夜は25時までに横になって。お酒は1缶にしとこ。` : (c1.drink || 0) >= 3 ? '昨日は飲みすぎ。今日は水を3杯、お酒はなしでいこ。' : '昼はコーヒーだけなんでしょ。……夜はちゃんと食べて、水も飲んで。' };
    }
    if ($('rxBox')) $('rxBox').innerHTML = `${Face.img(r.face || 'normal', 'sm')}<div class="bt"><p>${esc(r.text)}</p></div>`;
  }

  // ===== こころ =====
  async function mind(el) {
    const c = await Data.chk(D.today()), st = await Data.stDaily(), k6 = await DB.get(Data.k6Key()), bj = await DB.get(Data.bjsqKey());
    const prevK6 = await DB.get('k6:' + D.week(D.add(D.today(), -7)));
    const worry = (k6 && k6.score >= 13) || (k6 && prevK6 && k6.score >= 10 && prevK6.score >= 10) || (bj && bj.s && bj.s.high);
    el.innerHTML = `
      <div class="sec"><h3><small>MOOD</small>今の気分</h3><div class="moods">${MOOD.map(([v, e]) => `<button data-mood="${v}" class="${c.mood === v ? 'on' : ''}">${e}</button>`).join('')}</div></div>
      <div class="sec"><h3><small>CHECK</small>ストレスチェック</h3>
        <div class="rows">
          <button class="row" id="stDay"><i class="tb clinic">毎日</i><span>乃亜と3問（気分・疲れ・イライラ）</span><em>${st ? `済 ${st.sum}/12` : 'まだ'}</em></button>
          <button class="row" id="stK6"><i class="tb clinic">毎週</i><span>K6（6問）</span><em>${k6 ? `${k6.score}/24 ${k6Level(k6.score)[0]}` : 'まだ'}</em></button>
          <button class="row" id="stBJ"><i class="tb clinic">毎月</i><span>職業性ストレス簡易調査票（23問）</span><em>${bj ? (bj.s.high ? '負担が大きめ' : '済') : 'まだ'}</em></button>
        </div>
        ${bj ? bjBars(bj.s) : ''}
        <p class="mini">どれも診断ではなく、今の状態を知るための目安です。</p>
        ${worry ? HELP : ''}</div>
      <div class="sec"><h3><small>CARE</small>ひと休み</h3>
        <div class="rows"><button class="row" id="listen"><i class="tb clinic">聞くだけ</i><span>乃亜はアドバイスせずに聞く</span></button>
        <button class="row" id="breath"><i class="tb clinic">1分</i><span>一緒に呼吸する</span></button></div></div>`;
  }
  const bjBars = s => `<div class="bars">${[['仕事の量', s.load, 3, 12], ['自分で決められなさ', s.ctrl, 3, 12], ['心とからだの反応', s.react, 11, 44], ['上司の支えの少なさ', s.boss, 3, 12], ['同僚の支えの少なさ', s.peer, 3, 12]]
    .map(([l, v, lo, hi]) => `<div class="bar"><span>${l}</span><i style="--w:${Math.round((v - lo) / (hi - lo) * 100)}%"></i><em>${v}</em></div>`).join('')}</div>`;

  async function dailyCheck() {
    const ans = await Talk.script([
      { text:'……ちょっとだけ聞かせて。今日の気分は？', face:'normal', choices:[[0, 'いい'], [1, 'まあまあ'], [2, 'ふつう'], [3, 'いまいち'], [4, 'しんどい']] },
      { text:'からだの疲れは？', face:'normal', choices:[[0, 'ぜんぜん'], [1, '少し'], [2, 'ふつう'], [3, 'けっこう'], [4, 'へとへと']] },
      { text:'イライラしたこと、あった？', face:'normal', choices:[[0, 'ない'], [1, '少し'], [2, 'ときどき'], [3, 'けっこう'], [4, 'ずっと']] },
    ], { tab:'clinic' });
    const sum = ans.reduce((a, b) => a + b, 0);
    await Data.setStDaily({ mood:ans[0], tired:ans[1], irr:ans[2], sum });
    let r = null;
    if (Api.ready()) r = await Api.call('care', { ans, sum, snap:Data.snapshot(), ctx:Data.context(['habit', 'vice'], ['plan', 'todo'], 4) }, { retry:1, timeout:20000 });
    const line = r && r.text ? r.text : sum >= 9 ? '……今日はかなりしんどかったね。もう何もしなくていいから、早めに寝よ。' : sum >= 5 ? 'ちょっと疲れてるね。お酒は少なめにして、あったかくして寝て。' : 'うん、悪くないじゃん。……その調子。';
    await Talk.say([line], r && r.face || (sum >= 5 ? 'worry' : 'smile'));
    if (App.tab() === 'clinic') render($('panelBody'));
  }

  // 質問票の画面（K6・BJSQ）
  function sheet(def, onDone) {
    const parts = def.parts || [{ name:'', note:def.note, c:def.c.map(x => x[1]), q:def.q.map(t => [t]) }];
    let n = 0;
    const el = h(`<div class="qs"><div class="qs-in hud"><header><b>${esc(def.title)}</b><button class="x">✕</button></header><div class="qs-body">
      ${parts.map(p => `${p.name ? `<h4>${esc(p.name)}</h4>` : ''}<p class="mini">${esc(p.note)}</p>${p.q.map(q => { const i = n++; return `<div class="qq" data-q="${i}"><p>${i + 1}. ${esc(q[0])}</p><div class="qc">${p.c.map((c, j) => `<button data-a="${j}">${esc(c)}</button>`).join('')}</div></div>`; }).join('')}`).join('')}
      </div><footer><span id="qsN">0/${n}</span><button class="btn" id="qsOk" disabled>結果を見る</button></footer></div></div>`);
    const ans = Array(n).fill(null);
    el.onclick = e => {
      if (e.target.closest('.x')) return el.remove();
      const b = e.target.closest('[data-a]'); if (b) {
        const qq = b.closest('.qq'), i = +qq.dataset.q; ans[i] = +b.dataset.a; Sound.se('tap');
        qq.querySelectorAll('[data-a]').forEach(x => x.classList.toggle('on', x === b)); qq.classList.add('done');
        const k = ans.filter(x => x != null).length; $('qsN').textContent = `${k}/${n}`; $('qsOk').disabled = k < n;
        const nx = el.querySelector(`.qq[data-q="${i + 1}"]`); if (nx && !nx.classList.contains('done')) nx.scrollIntoView({ behavior:'smooth', block:'center' });
      }
      if (e.target.closest('#qsOk')) { el.remove(); onDone(ans); }
    };
    $('app').appendChild(el);
  }
  async function doK6() {
    sheet(K6, async ans => {
      const score = ans.reduce((a, b) => a + b, 0); await DB.set(Data.k6Key(), { a:ans, score, at:new Date().toISOString() });
      const [lv] = k6Level(score);
      await Talk.open('clinic', { first:`今週は${score}点。心の負担は「${lv}」くらい。` + (score >= 10 ? '……無理しないで。ひとりで抱えないでね。' : '……教えてくれて、ありがと。'), face:score >= 10 ? 'worry' : 'normal' });
      render($('panelBody'));
    });
  }
  async function doBJ() {
    sheet(BJ, async ans => {
      const s = bjScore(ans); await DB.set(Data.bjsqKey(), { a:ans, s, at:new Date().toISOString() });
      await Talk.open('clinic', { first:s.high ? '……今月は、仕事の負担がかなり大きいみたい。カルテに残しといた。一緒に、減らせるところ探そ。' : '今月の結果、カルテに残しといた。……いつもおつかれさま。', face:s.high ? 'worry' : 'normal' });
      render($('panelBody'));
    });
  }
  function breath() {
    const el = h(`<div class="breath"><div class="bc"><i></i><b>吸って</b></div><p>一緒に。……ゆっくりでいいよ。</p><button class="btn w">やめる</button></div>`);
    $('app').appendChild(el); let n = 0, iv;
    const step = () => {
      if (n >= 6) { clearTimeout(iv); el.querySelector('p').textContent = 'うん、おつかれ。少し楽になった？'; setTimeout(() => el.remove(), 2600); return; }
      const c = el.querySelector('.bc'); c.className = 'bc in'; c.querySelector('b').textContent = '吸って';
      iv = setTimeout(() => { c.className = 'bc out'; c.querySelector('b').textContent = '吐いて'; iv = setTimeout(() => { n++; step(); }, 6000); }, 4000);
    };
    el.querySelector('button').onclick = () => { clearTimeout(iv); el.remove(); };
    setTimeout(step, 300);
  }

  // ===== カルテ =====
  async function karte(el) {
    const ds = await Data.days(14), k6s = [];
    for (let i = 7; i >= 0; i--) { const wk = D.week(D.add(D.today(), -7 * i)), v = await DB.get('k6:' + wk); if (v) k6s.push({ wk, v }); }
    const valid = ds.filter(d => Data.sleepH(d.c) != null), avg = valid.length ? Math.round(valid.reduce((s, d) => s + Data.sleepH(d.c), 0) / valid.length * 10) / 10 : null;
    const dr = ds.filter(d => d.c.drink != null), sm = ds.filter(d => d.c.smoke != null);
    el.innerHTML = `
      <div class="sec"><h3><small>KARTE</small>直近14日</h3>
        <div class="nums3"><div><small>平均睡眠</small><b>${avg != null ? avg + 'h' : '—'}</b></div><div><small>お酒/日</small><b>${dr.length ? (dr.reduce((s, d) => s + d.c.drink, 0) / dr.length).toFixed(1) : '—'}</b></div><div><small>タバコ/日</small><b>${sm.length ? Math.round(sm.reduce((s, d) => s + d.c.smoke, 0) / sm.length) : '—'}</b></div></div>
        <div class="karte"><table><tr><th>日</th><th>睡眠</th><th>就寝</th><th>ご飯</th><th>酒</th><th>煙</th><th>気分</th><th>点</th></tr>
        ${ds.slice().reverse().map(d => { const sl = Data.sleepH(d.c), m = d.c.meals || {}; return `<tr><td>${D.md(d.day)}<small>${D.dow(d.day)}</small></td><td class="${sl != null && sl < 6 ? 'bad' : ''}">${sl != null ? sl : '·'}</td><td>${d.c.bed || '·'}</td><td>${['am', 'pm', 'night'].map(k => m[k] === 'ate' ? '●' : m[k] === 'coffee' ? '◐' : m[k] === 'skip' ? '○' : '·').join('')}</td><td>${d.c.drink != null ? d.c.drink : '·'}</td><td>${d.c.smoke != null ? d.c.smoke : '·'}</td><td>${d.c.mood ? MOOD.find(x => x[0] === d.c.mood)[1] : '·'}</td><td class="${d.st && d.st.sum >= 9 ? 'bad' : ''}">${d.st ? d.st.sum : '·'}</td></tr>`; }).join('')}</table></div>
        <p class="mini">ご飯：●食べた ◐コーヒーだけ ○抜いた。点は毎日のチェック（12点満点、高いほどしんどい）。</p></div>
      <div class="sec"><h3><small>K6</small>週ごとのチェック</h3>${k6s.length ? `<div class="bars">${k6s.map(x => `<div class="bar"><span>${D.md(x.wk)}の週</span><i class="${k6Level(x.v.score)[1]}" style="--w:${Math.round(x.v.score / 24 * 100)}%"></i><em>${x.v.score}</em></div>`).join('')}</div>` : '<p class="mini">まだありません。</p>'}</div>
      <div class="sec"><h3><small>FINDINGS</small>乃亜の所見</h3><div class="brief">${Face.img('normal', 'sm')}<div class="bt"><p>${esc(finding(avg, ds))}</p></div></div></div>`;
  }
  function finding(avg, ds) {
    const late = ds.filter(d => d.c.bed && (D.min(d.c.bed) < 5 * 60)).length, dr = ds.filter(d => (d.c.drink || 0) >= 3).length;
    if (avg == null) return 'まだ記録が少ないから、なにも言えない。……まずは睡眠だけでいいから、毎朝入れて。';
    return [avg < 6 ? `平均睡眠は${avg}時間。足りてない。` : `平均睡眠は${avg}時間。`, late ? `14日のうち${late}日は、1時を過ぎて寝てる。` : '', dr ? `3缶以上の日が${dr}日。` : '', '……少しずつでいいから、寝る時間を前にしよ。'].filter(Boolean).join('');
  }

  function bind() {
    $('panelBody').addEventListener('click', async e => {
      if (App.tab() !== 'clinic') return;
      const sg = e.target.closest('[data-seg]'); if (sg) { seg = sg.dataset.seg; Sound.se('tap'); return render($('panelBody')); }
      const ml = e.target.closest('[data-meal]'); if (ml) { const c = await Data.chk(D.today()), m = Object.assign({}, c.meals || {}); m[ml.dataset.meal] = MEAL_NEXT[m[ml.dataset.meal] || '']; await Data.setChk(D.today(), { meals:m }); Sound.se('tap'); return; }
      const ct = e.target.closest('[data-cnt]'); if (ct) { const c = await Data.chk(D.today()), k = ct.dataset.cnt; await Data.setChk(D.today(), { [k]:Math.max(0, (c[k] || 0) + +ct.dataset.d) }); Sound.se('tap'); return; }
      if (e.target.closest('#usualDay')) { await Data.setChk(D.today(), { meals:{ am:'skip', pm:'coffee', night:'ate' }, drink:2, smoke:15 }); toast('いつもの一日を入れました'); return; }
      const md = e.target.closest('[data-mood]'); if (md) { await Data.setChk(D.today(), { mood:+md.dataset.mood }); Sound.se('ok'); return; }
      if (e.target.closest('#stDay')) return dailyCheck();
      if (e.target.closest('#stK6')) return doK6();
      if (e.target.closest('#stBJ')) return doBJ();
      if (e.target.closest('#listen')) return Talk.open('clinic', { listen:true, first:'……うん。今日は聞くだけにする。話して。', chips:[] });
      if (e.target.closest('#breath')) return breath();
    });
  }
  return { bind, peek, peekFill, render, dailyCheck };
})();

// ===== 睡眠ダイヤル（24時間の輪。ピンク＝寝た時刻、シアン＝起きた時刻） =====
const Dial = (() => {
  const R = 96, C = 130, toA = m => m / 1440 * Math.PI * 2 - Math.PI / 2, pt = (m, r = R) => [C + Math.cos(toA(m)) * r, C + Math.sin(toA(m)) * r];
  function mount(el, bed, wake, onSave) {
    let b = bed ? D.min(bed) % 1440 : 26 * 60 - 1440, w = wake ? D.min(wake) : 7 * 60 + 45, set = !!(bed && wake), drag = null;
    function draw() {
      const span = ((w - b) % 1440 + 1440) % 1440, [bx, by] = pt(b), [wx, wy] = pt(w), large = span > 720 ? 1 : 0;
      el.innerHTML = `<svg viewBox="0 0 260 260" class="dial${set ? '' : ' unset'}">
        <circle cx="${C}" cy="${C}" r="${R}" class="ring"/>
        ${Array.from({ length:24 }, (_, i) => { const [x1, y1] = pt(i * 60, R - 12), [x2, y2] = pt(i * 60, R - (i % 6 ? 16 : 20)); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="tick"/>`; }).join('')}
        ${[0, 6, 12, 18].map(hr => { const [x, y] = pt(hr * 60, R - 32); return `<text x="${x}" y="${y + 4}" class="hl">${hr}</text>`; }).join('')}
        <path d="M${bx} ${by} A${R} ${R} 0 ${large} 1 ${wx} ${wy}" class="arc"/>
        <circle cx="${bx}" cy="${by}" r="13" class="kb" data-k="b"/><text x="${bx}" y="${by + 4}" class="ki">☾</text>
        <circle cx="${wx}" cy="${wy}" r="13" class="kw" data-k="w"/><text x="${wx}" y="${wy + 4}" class="ki">☀</text>
        <text x="${C}" y="${C - 8}" class="big">${Math.floor(span / 60)}<tspan>時間</tspan>${span % 60 ? `${span % 60}<tspan>分</tspan>` : ''}</text>
        <text x="${C}" y="${C + 18}" class="sub">${D.fmtMin(b)} → ${D.fmtMin(w)}</text></svg>
        <div class="dial-b">${set ? '<span class="mini">記録しました</span>' : '<button class="btn sm" data-dsave>この時間で記録</button><span class="mini">いつもの時間を表示中</span>'}</div>`;
    }
    const minAt = (x, y) => { const r = el.querySelector('svg').getBoundingClientRect(), dx = (x - r.left) / r.width * 260 - C, dy = (y - r.top) / r.height * 260 - C; let a = Math.atan2(dy, dx) + Math.PI / 2; if (a < 0) a += Math.PI * 2; return Math.round(a / (Math.PI * 2) * 1440 / 5) * 5 % 1440; };
    const save = () => { set = true; onSave(D.fmtMin(b), D.fmtMin(w)); draw(); };
    el.onpointerdown = e => { const k = e.target.closest('[data-k]'); if (!k) return; drag = k.dataset.k; el.setPointerCapture(e.pointerId); e.preventDefault(); };
    el.onpointermove = e => { if (!drag) return; const m = minAt(e.clientX, e.clientY); if (drag === 'b') b = m; else w = m; draw(); };
    el.onpointerup = () => { if (drag) { drag = null; save(); } };
    el.onclick = e => { if (e.target.closest('[data-dsave]')) save(); };
    el.style.touchAction = 'none';
    draw();
  }
  return { mount };
})();
