// Life Partner — 自室（メイドの乃亜。PC画面ふうの、登録と設定の場所）
'use strict';
const Room = (() => {
  let app = '', dm = 'home';
  const APPS = [
    ['work', '仕事', '<rect x="4" y="7" width="16" height="12" rx="2"/><path d="M9 7V5h6v2M4 12h16"/>'],
    ['todo', 'やること', '<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 9l2 2 4-4M8 15h8"/>'],
    ['life', '生活DB', '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>'],
    ['profile', 'プロフィール', '<circle cx="12" cy="9" r="3.5"/><path d="M5 20c1-4 4-5.5 7-5.5s6 1.5 7 5.5"/>'],
    ['people', 'ひと', '<circle cx="9" cy="9" r="3"/><circle cx="16.5" cy="10" r="2.5"/><path d="M3.5 19c.8-3.4 3-4.8 5.5-4.8s4.7 1.4 5.5 4.8M14 15c2.6-.4 5 .8 6 4"/>'],
    ['settings', '設定', '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'],
  ];
  const AREAS = { '大阪（北浜）':[34.69, 135.51], 大阪:[34.69, 135.50], 東京:[35.68, 139.69], 京都:[35.01, 135.77], 神戸:[34.69, 135.20] };

  function peek() { return `<span>生活DB <b>${Data.life().length}</b></span><span>見直し ${Data.stale(99).length}件</span>`; }

  async function render(el) {
    const now = new Date();
    el.innerHTML = `<div class="pc hud"><div class="pc-h"><b class="dot"></b>NOA OS<span>${app ? `<button class="pc-back" data-app="">‹ デスクトップ</button>` : ''}</span><em>${p2(now.getHours())}:${p2(now.getMinutes())}</em></div><div class="pc-b" id="pcBody"></div></div>`;
    const b = $('pcBody');
    if (!app) {
      b.innerHTML = `<div class="wel">WELCOME BACK<small>${esc((Data.profile().call || 'ようへい').toUpperCase())}</small></div>
        <div class="apps">${APPS.map(([k, l, svg]) => `<button class="app" data-app="${k}"><svg viewBox="0 0 24 24">${svg}</svg><b>${l}</b>${k === 'life' && Data.stale(99).length ? `<i class="badge">${Data.stale(99).length}</i>` : ''}</button>`).join('')}</div>`;
      return;
    }
    await ({ work, todo, life, profile, people, settings })[app](b);
  }

  // ===== 仕事 =====
  async function work(b) {
    const plans = Data.plans(D.today(), 30).filter(r => r.work), todos = Data.todos().filter(r => r.work), ideas = Data.of('idea').filter(r => r.work).slice(-10).reverse(), lw = Data.lifeOf('work');
    b.innerHTML = `<h4>仕事 <button class="add" data-wadd="plan">予定＋</button><button class="add" data-wadd="todo">やること＋</button><button class="add" data-wadd="idea">アイデア＋</button></h4>
      <div class="rows">${plans.map(r => `<div class="row"><i class="tb desk">予定</i><span>${esc(r.text)}</span><em>${D.label(r.date)} ${r.time}</em><button class="del" data-rm="${r.id}">✕</button></div>`).join('')}
      ${todos.map(r => `<div class="row x" data-rid="${r.id}"><button class="ck"></button><span>${esc(r.text)}</span><em>${r.due ? D.label(r.due) + 'まで' : ''}</em></div>`).join('')}
      ${ideas.map(r => `<div class="row"><i class="tb room">アイデア</i><span>${esc(r.text)}</span><em>${D.md(r.date)}</em><button class="del" data-rm="${r.id}">✕</button></div>`).join('')}
      ${!plans.length && !todos.length && !ideas.length ? '<p class="mini">仕事の予定・やること・アイデアはまだありません。</p>' : ''}</div>
      <h4>仕事の基本</h4><div class="rows">${lw.map(x => `<button class="row" data-le="${x.id}"><span>${esc(x.name)}</span><em>${esc(x.val)}</em></button>`).join('')}</div>`;
  }
  // ===== やること・家事 =====
  async function todo(b) {
    const td = Data.todos().filter(r => !r.work), ch = Data.chores();
    b.innerHTML = `<h4>やること <button class="add" data-tadd>＋</button></h4>
      <div class="rows">${td.map(r => `<div class="row x" data-rid="${r.id}"><button class="ck"></button><span>${esc(r.text)}</span><em>${r.due ? D.label(r.due) + 'まで' : ''}</em><button class="del" data-rm="${r.id}">✕</button></div>`).join('') || '<p class="mini">ありません。</p>'}</div>
      <h4>家事のくり返し <button class="add" data-cadd>＋</button></h4>
      <div class="rows">${ch.map(c => `<div class="row x" data-chore="${c.id}"><button class="ck"></button><span>${esc(c.name)}<small>${c.every}日ごと・前回${c.last ? D.md(c.last) : '不明'}</small></span><em class="${Data.choreDue(c) <= D.today() ? 'hot' : ''}">次 ${D.label(Data.choreDue(c))}</em><button class="mini-b" data-cedit="${c.id}">直す</button></div>`).join('')}</div>
      <p class="mini">チェックした日から数えて、次の日を出します（曜日では決めません）。</p>`;
  }
  // ===== 生活データベース =====
  async function life(b) {
    const items = Data.lifeOf(dm), st = Data.stale(5), cats = [...new Set(items.map(x => x.cat || ''))];
    b.innerHTML = `${st.length ? `<div class="review hud"><b>見直し</b><span class="mini">これ、まだ合ってる？</span>${st.map(x => `<div class="rv" data-id="${x.id}"><span>${esc(LIFE[x.dm])}：${esc(x.name)}${x.val ? '／' + esc(x.val) : ''}${x.state !== 'sure' ? `<i class="st ${x.state}">${STATES[x.state]}</i>` : ''}</span><div><button data-rv="ok">合ってる</button><button data-rv="edit">変わった</button><button data-rv="gone">もうない</button></div></div>`).join('')}</div>` : ''}
      <div class="chips">${Object.entries(LIFE).map(([k, v]) => `<button data-dm="${k}" class="${k === dm ? 'on' : ''}">${v}<small>${k === 'people' ? Data.people().length : Data.lifeOf(k).length}</small></button>`).join('')}</div>
      ${dm === 'people' ? '<p class="mini">ひとは「ひと」アプリで管理しています。</p><button class="btn w" data-app="people">ひとを開く</button>' : `
      <h4>${LIFE[dm]} <button class="add" data-ladd>＋</button></h4>
      ${cats.map(c => `${c ? `<h5>${esc(c)}</h5>` : ''}<div class="cards">${items.filter(x => (x.cat || '') === c).map(x => `<button class="card" data-le="${x.id}"><b>${esc(x.name)}</b>${x.val ? `<span>${esc(x.val)}</span>` : ''}${x.state !== 'sure' ? `<i class="st ${x.state}">${STATES[x.state]}</i>` : ''}</button>`).join('')}</div>`).join('') || '<p class="mini">まだありません。＋か、写真で登録できます。</p>'}`}`;
  }
  async function lifeEdit(x) {
    const isNew = !x; x = x || { dm, cat:'', name:'', val:'', state:'sure' };
    const v = await form(isNew ? `${LIFE[dm]}に足す` : '直す', [
      { k:'dm', label:'分野', type:'select', options:Object.entries(LIFE).filter(([k]) => k !== 'people'), value:x.dm },
      { k:'cat', label:'区分（なくてもよい）', value:x.cat, ph:'アウター' }, { k:'name', label:'名前', value:x.name }, { k:'val', label:'中身（色・場所・数など）', value:x.val },
      { k:'state', label:'状態', type:'select', options:Object.entries(STATES), value:x.state }], '保存', isNew ? '' : '<button class="link danger" data-v="0" id="lifeDel">消す</button>');
    if (!v || !v.name) return;
    if (isNew) await Data.lifeAdd(v); else await Data.lifeSet(x.id, v);
  }
  // ===== プロフィール =====
  async function profile(b) {
    const p = Data.profile(), r = await radar(), recs = Data.of('todo').length + Data.of('plan').length + Data.of('money').length + Data.of('food').length + Data.life().length;
    const talks = (await DB.keys()).filter(k => String(k).startsWith('talk:')).length, lv = 1 + Math.floor(Math.sqrt(recs / 4)), exp = recs % 20;
    b.innerHTML = `<div class="prof hud"><div class="pf-top">${Face.img('smile', 'md')}<div><b>${esc(p.name || 'ようへい')}</b><span>${esc(p.job || '')}</span><i>${esc(p.one || '「……ちゃんと見てるから。」')}</i></div></div>
      <div class="pf-lv"><span>Lv.<b>${lv}</b></span><div class="gbar"><i style="--w:${exp * 5}%"></i></div><span>乃亜との絆 <b>${Math.min(10, 1 + Math.floor(talks / 3))}</b></span></div>
      <div class="pf-mid">${radarSvg(r)}<div class="pf-l">${r.map(x => `<div><span>${x.l}</span><b>${x.v}</b><small>${esc(x.why)}</small></div>`).join('')}</div></div>
      <div class="pf-f"><div><small>誕生日</small>${esc(p.birthday || '—')}</div><div><small>住んでいるところ</small>${esc(p.live || '—')}</div><div><small>好きなもの</small>${esc(p.like || '—')}</div><div><small>最近のゲーム</small>${esc(Data.lifeOf('play').filter(x => x.cat === '最近').map(x => x.name).join('・') || '—')}</div></div>
      <button class="btn w sm" data-pedit>プロフィールを直す</button></div>
      <p class="mini">レーダーは記録から自動で計算します（5が良い状態）。</p>`;
  }
  async function radar() {
    const ds = await Data.days(7), sl = ds.map(d => Data.sleepH(d.c)).filter(x => x != null), m = Data.moneyNow();
    const avgSl = sl.length ? sl.reduce((a, b) => a + b, 0) / sl.length : null;
    const meals = ds.reduce((s, d) => s + ['am', 'pm', 'night'].filter(k => (d.c.meals || {})[k] === 'ate').length, 0);
    const done = Data.doneSince(D.add(D.today(), -7)).length, open = Data.todos().length;
    const met = Data.people().filter(p => p.lastMet && p.lastMet >= D.add(D.today(), -14)).length + Data.plans(D.add(D.today(), -7), 7).filter(r => Data.people().some(p => r.text.includes(p.name))).length;
    const sc = (v, a) => clamp(Math.round(v), 1, 5);
    return [
      { l:'睡眠', v:avgSl == null ? 1 : sc((avgSl - 4) / 3 * 4 + 1), why:avgSl == null ? '記録なし' : `平均${avgSl.toFixed(1)}h` },
      { l:'ご飯', v:sc(meals / 14 * 4 + 1), why:`7日で${meals}食` },
      { l:'お金', v:!m.set ? 1 : sc((m.unpaid.length ? 1 : 3) + (m.perDay >= 1000 ? 2 : m.perDay >= 300 ? 1 : 0)), why:m.unpaid.length ? `未払い${m.unpaid.length}件` : '未払いなし' },
      { l:'やること', v:sc(done + open ? done / (done + open) * 4 + 1 : 3), why:`7日で${done}件完了` },
      { l:'つながり', v:sc(met * 1.5 + 1), why:`2週間で${met}回` },
    ];
  }
  function radarSvg(r) {
    const n = r.length, c = 75, R = 52, pt = (i, k) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [c + Math.cos(a) * R * k, c + Math.sin(a) * R * k]; };
    let g = ''; for (let k = 1; k <= 5; k++) g += `<polygon points="${r.map((_, i) => pt(i, k / 5).join(',')).join(' ')}" class="rg"/>`;
    g += `<polygon points="${r.map((x, i) => pt(i, x.v / 5).join(',')).join(' ')}" class="rv"/>`;
    r.forEach((x, i) => { const [tx, ty] = pt(i, 1.28); g += `<text x="${tx}" y="${ty + 4}" class="rt">${x.l}</text>`; });
    return `<svg viewBox="0 0 150 150" class="radar">${g}</svg>`;
  }
  // ===== ひと =====
  async function people(b) {
    const ps = Data.people().slice().sort((a, b) => (b.lastMet || '').localeCompare(a.lastMet || ''));
    b.innerHTML = `<h4>ひと <button class="add" data-padd>＋</button></h4>
      <div class="rows">${ps.map(p => `<button class="row" data-pe="${p.id}"><span class="av">${esc([...(p.name || '?')][0])}</span><span>${esc(p.name)}<small>${esc(p.rel || '')}</small></span><em>${p.lastMet ? `${D.diff(p.lastMet, D.today())}日前に会った` : ''}${p.birthday ? `<br>誕生日 ${esc(p.birthday)}` : ''}</em></button>`).join('') || '<p class="mini">まだいません。</p>'}</div>
      <p class="mini">「のあ（後輩）」は、乃亜とは別の人として扱います。</p>`;
  }
  async function personEdit(p) {
    const isNew = !p; p = p || { name:'', rel:'', birthday:'', lastMet:'', next:'', like:'', memo:'' };
    const v = await form(isNew ? 'ひとを足す' : p.name, [{ k:'name', label:'名前', value:p.name }, { k:'rel', label:'関係', value:p.rel, ph:'SCSK時代の友人' }, { k:'birthday', label:'誕生日（月/日）', value:p.birthday, ph:'4/22' },
      { k:'lastMet', label:'最後に会った日', type:'date', value:p.lastMet }, { k:'next', label:'次に話したいこと', type:'area', value:p.next }, { k:'like', label:'好きなもの・苦手なもの', value:p.like }, { k:'memo', label:'メモ', type:'area', value:p.memo }],
      '保存', isNew ? '' : '<button class="link danger" data-v="0" id="pDel">この人を消す</button>');
    if (!v || !v.name) return;
    await Data.personSet(Object.assign({}, p, v, isNew ? { id:uid() } : {}));
  }
  // ===== 設定 =====
  async function settings(b) {
    const area = await DB.get('area', { name:'大阪' }), map = await DB.get('bgmMap', {}), tracks = await DB.get('tracks', []);
    const imgs = []; for (const n of ['home_1', 'home_2', 'home_3', 'desk_1', 'clinic_1', 'bank_1', 'room_1', 'face_normal', 'title_1']) imgs.push([n, !!(await Pic.find(n))]);
    b.innerHTML = `<h4>AI（GASのウェブアプリ）</h4>
      <input id="aU" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(CFG.api && CFG.api.url || '')}"><input id="aK" type="password" placeholder="合言葉（ACCESS_KEY）" value="${esc(CFG.api && CFG.api.key || '')}">
      <div class="inrow"><button class="btn" id="aSave">保存</button><button class="btn w" id="aTest">つながるか確かめる</button></div><p class="mini" id="aMsg"></p>
      <h4>天気のエリア</h4><div class="chips">${Object.keys(AREAS).map(n => `<button data-area="${n}" class="${area.name === n ? 'on' : ''}">${n}</button>`).join('')}<button data-area="gps">今いる場所</button></div>
      <h4>アプリ</h4>
      <div class="row"><span>Face IDでロック</span><button class="sw ${CFG.lock ? 'on' : ''}" id="swLock"></button></div>
      <div class="row"><span>BGM</span><button class="sw ${CFG.bgm ? 'on' : ''}" id="swBgm"></button></div>
      <h4>BGM（端末に保存。公開リポジトリには置かない）</h4>
      <label class="btn w sm">音源を読み込む<input type="file" id="bgmIn" accept="audio/*" multiple hidden></label>
      <div class="rows">${tracks.map(t => `<div class="row"><span>${esc(t.name)}</span><button class="del" data-tdel="${t.id}">✕</button></div>`).join('') || '<p class="mini">まだありません。</p>'}</div>
      ${tracks.length ? Object.keys(TABS).map(k => `<label class="fl"><span>${TABS[k].name}</span><select data-bgm="${k}"><option value="">なし</option>${tracks.map(t => `<option value="${t.id}"${map[k] === t.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>`).join('') : ''}
      <h4>絵の状態</h4><div class="imgs">${imgs.map(([n, ok]) => `<span class="${ok ? 'ok' : ''}">${n}</span>`).join('')}</div>
      <p class="mini">絵は index.html と同じ場所（または img フォルダ）に、決まった名前で置くと切り替わります。</p>
      <h4>控え</h4>
      <div class="inrow"><button class="btn w" id="ex">書き出す</button><label class="btn w">読み込む<input type="file" id="im" accept="application/json,.json" hidden></label></div>
      <p class="mini">初期データ（初期データ_乃亜.json）もここから読み込みます。最後の書き出し：${esc(await DB.get('lastBackup', '—'))}</p>
      <p class="mini">Life Partner ${VERSION}</p>`;
  }

  async function onClick(e) {
    if (App.tab() !== 'room') return;
    const ap = e.target.closest('[data-app]'); if (ap) { app = ap.dataset.app; Sound.se('tap'); return render($('panelBody')); }
    const d = e.target.closest('[data-dm]'); if (d) { dm = d.dataset.dm; return render($('panelBody')); }
    const le = e.target.closest('[data-le]'); if (le) return lifeEdit(Data.life().find(x => x.id === le.dataset.le));
    if (e.target.closest('[data-ladd]')) return lifeEdit(null);
    const rv = e.target.closest('[data-rv]'); if (rv) {
      const id = rv.closest('.rv').dataset.id, x = Data.life().find(i => i.id === id);
      if (rv.dataset.rv === 'ok') await Data.lifeSet(id, { state:'sure' });
      if (rv.dataset.rv === 'edit') return lifeEdit(x);
      if (rv.dataset.rv === 'gone') await Data.lifeDel(id);
      return;
    }
    const pe = e.target.closest('[data-pe]'); if (pe) return personEdit(Data.people().find(p => p.id === pe.dataset.pe));
    if (e.target.closest('[data-padd]')) return personEdit(null);
    if (e.target.closest('[data-pedit]')) {
      const p = Data.profile();
      const v = await form('プロフィール', [{ k:'name', label:'名前', value:p.name }, { k:'call', label:'乃亜からの呼ばれ方', value:p.call || 'ようへい' }, { k:'job', label:'仕事', value:p.job }, { k:'birthday', label:'誕生日', value:p.birthday }, { k:'live', label:'住んでいるところ', value:p.live }, { k:'like', label:'好きなもの', value:p.like }, { k:'one', label:'ひとこと', value:p.one }]);
      if (v) await Data.setProfile(Object.assign({}, p, v)); return;
    }
    const ck = e.target.closest('.ck'); if (ck) {
      const row = ck.closest('.row'); Sound.se('ok'); haptic(); row.classList.add('done');
      if (row.dataset.rid) await Data.update(row.dataset.rid, { status:'done', doneAt:new Date().toISOString() });
      if (row.dataset.chore) await Data.choreDone(row.dataset.chore);
      return;
    }
    const rm = e.target.closest('[data-rm]'); if (rm) return Data.remove(rm.dataset.rm);
    const wa = e.target.closest('[data-wadd]'); if (wa) {
      const k = wa.dataset.wadd;
      const v = await form(k === 'plan' ? '仕事の予定' : k === 'todo' ? '仕事のやること' : '仕事のアイデア', k === 'plan' ? [{ k:'text', label:'内容' }, { k:'date', label:'日付', type:'date', value:D.today() }, { k:'time', label:'時刻', type:'time' }] : k === 'todo' ? [{ k:'text', label:'内容' }, { k:'due', label:'期限', type:'date' }] : [{ k:'text', label:'アイデア', type:'area' }]);
      if (v && v.text) await Data.add({ domain:k, kind:k, text:v.text, date:v.date || D.today(), time:v.time || '', due:v.due || '', work:true });
      return;
    }
    if (e.target.closest('[data-tadd]')) { const v = await form('やること', [{ k:'text', label:'内容' }, { k:'due', label:'期限', type:'date' }]); if (v && v.text) await Data.add({ domain:'todo', kind:'todo', text:v.text, due:v.due || '' }); return; }
    if (e.target.closest('[data-cadd]')) { const v = await form('家事のくり返し', [{ k:'name', label:'名前', ph:'掃除' }, { k:'every', label:'何日ごと', type:'number', value:7 }]); if (v && v.name) { Data.chores().push({ id:uid(), name:v.name, every:v.every || 7, last:null }); await Data.saveChores(); } return; }
    const ce = e.target.closest('[data-cedit]'); if (ce) {
      const c = Data.chores().find(x => x.id === ce.dataset.cedit);
      const v = await form(c.name, [{ k:'name', label:'名前', value:c.name }, { k:'every', label:'何日ごと', type:'number', value:c.every }, { k:'last', label:'前回', type:'date', value:c.last || '' }]);
      if (v) { Object.assign(c, { name:v.name || c.name, every:v.every || c.every, last:v.last || null }); await Data.saveChores(); } return;
    }
    // 設定
    const id = e.target.id;
    if (id === 'aSave') { CFG.api = { url:$('aU').value.trim(), key:$('aK').value.trim() }; await saveCfg(); toast('保存しました'); return; }
    if (id === 'aTest') { CFG.api = { url:$('aU').value.trim(), key:$('aK').value.trim() }; $('aMsg').textContent = '確かめています…'; const r = await Api.call('budget', {}, { retry:1, timeout:20000 }); $('aMsg').textContent = r && r.budget ? `つながりました。今月のAI：${Math.round(r.budget.spent)}円／上限${r.budget.limit}円` : 'つながりませんでした。URLと合言葉を確認してください'; return; }
    if (id === 'swBgm') { CFG.bgm = !CFG.bgm; await saveCfg(); App.playBgm(); return render($('panelBody')); }
    if (id === 'swLock') { if (!CFG.lock) { if (await Lock.setup()) { CFG.lock = true; await saveCfg(); toast('次から、開くときにFace IDを使います'); } } else { CFG.lock = false; await saveCfg(); } return render($('panelBody')); }
    if (id === 'ex') return exportData();
    const ar = e.target.closest('[data-area]'); if (ar) {
      const n = ar.dataset.area;
      if (n === 'gps') { navigator.geolocation.getCurrentPosition(async p => { await DB.set('area', { name:'今いる場所', lat:+p.coords.latitude.toFixed(2), lon:+p.coords.longitude.toFixed(2) }); await DB.del('weather'); Data.loadWeather(true); render($('panelBody')); }, () => toast('場所を取得できませんでした')); return; }
      await DB.set('area', { name:n, lat:AREAS[n][0], lon:AREAS[n][1] }); Data.loadWeather(true); return render($('panelBody'));
    }
    const tdl = e.target.closest('[data-tdel]'); if (tdl) { const tr = (await DB.get('tracks', [])).filter(t => t.id !== tdl.dataset.tdel); await DB.set('tracks', tr); await DB.blobDel(tdl.dataset.tdel); Sound.forget(tdl.dataset.tdel); return render($('panelBody')); }
  }
  async function onChange(e) {
    if (App.tab() !== 'room') return;
    if (e.target.id === 'im') {
      const f = e.target.files[0]; if (!f) return;
      const j = JSON.parse(await f.text()).kind;
      if (!(await ask(j === 'seed' ? '初期データを読み込みます。生活DB・ひと・お金・いつもの・家事を、ファイルの中身に置き換えます。' : '今のデータを消して、控えの中身に置き換えます。よいですか？', '読み込む', 'やめる'))) return;
      try { await importData(f); toast('読み込みました。再起動します'); setTimeout(() => location.reload(), 900); } catch (err) { toast(String(err.message || err)); }
    }
    if (e.target.id === 'bgmIn') {
      const tr = await DB.get('tracks', []);
      for (const f of e.target.files) { const id = uid(); await DB.blobPut(id, f.name, f); tr.push({ id, name:f.name.replace(/\.[^.]+$/, '') }); }
      await DB.set('tracks', tr); toast('読み込みました'); render($('panelBody'));
    }
    const s = e.target.closest('[data-bgm]'); if (s) { const map = await DB.get('bgmMap', {}); map[s.dataset.bgm] = s.value; await DB.set('bgmMap', map); App.playBgm(); }
  }
  function bind() {
    $('panelBody').addEventListener('click', onClick);
    $('panelBody').addEventListener('change', onChange);
    document.addEventListener('click', async e => {
      if (e.target.id === 'lifeDel') { const n = e.target.closest('.ask-in').querySelectorAll('input')[1].value; const x = Data.life().find(i => i.name === n); if (x) await Data.lifeDel(x.id); }
      if (e.target.id === 'pDel') { const n = e.target.closest('.ask-in').querySelector('input').value; const p = Data.people().find(i => i.name === n); if (p) await Data.personDel(p.id); }
    }, true);
  }
  return { bind, peek, render, reset:() => { app = ''; } };
})();
