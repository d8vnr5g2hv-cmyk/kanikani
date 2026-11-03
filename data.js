// Life Partner — データ：できごとの記録・生活データベース・お金・からだ・ストレス
'use strict';
// できごとの記録（rec）
const DOMAINS = { plan:'予定', todo:'やること', idea:'アイデア', money:'お金', food:'ご飯', health:'からだ', people:'ひと', play:'遊び', other:'できごと', proposal:'提案' };
// 生活データベースの分野
const LIFE = { home:'住まい', bed:'寝具', appl:'家電', clothes:'衣服', vice:'嗜好品', food:'ご飯', body:'体', habit:'習慣', money:'お金', work:'仕事', people:'ひと', play:'遊び' };
const STATES = { sure:'確定', guess:'推定', check:'未確定' };

const Data = (() => {
  let recs = [], life = [], people = [], money = null, usual = [], chores = [], profile = {}, weather = null, hooks = [], syncT = 0;
  const MONEY0 = { payday:25, takehome:0, fixed:[], leak:0, mode:'endure', cash:null, unpaid:[], paid:{}, goal:{ amt:500000, from:'2026-12', to:'2027-07', saved:0, log:[] }, wants:[], leaks:[] };

  async function load() {
    recs = await DB.all();
    life = await DB.get('life', []);
    people = await DB.get('people', []);
    money = Object.assign({}, MONEY0, await DB.get('money', {}));
    usual = await DB.get('usual', []);
    chores = await DB.get('chores', []);
    profile = await DB.get('profile', {});
    weather = await DB.get('weather', null);
  }
  const onChange = f => hooks.push(f);
  function changed(what) { hooks.forEach(f => { try { f(what); } catch (e) { console.error(e); } }); clearTimeout(syncT); syncT = setTimeout(sync, 8000); }

  // ===== できごとの記録 =====
  function norm(r) {
    const o = Object.assign({ id:uid(), domain:'other', kind:'', text:'', amt:null, date:D.today(), time:'', due:'', status:'open', state:'sure', work:false, src:'input', at:new Date().toISOString() }, r);
    if (!DOMAINS[o.domain]) o.domain = 'other';
    o.amt = o.amt != null && o.amt !== '' ? Math.round(Number(o.amt)) || null : null;
    o.text = String(o.text || '').slice(0, 300);
    return o;
  }
  async function add(r, quiet) { const o = norm(r); recs.push(o); await DB.put(o); if (!quiet) changed(o.domain); return o; }
  async function update(id, patch) { const o = recs.find(x => x.id === id); if (!o) return; Object.assign(o, patch); await DB.put(o); changed(o.domain); return o; }
  async function remove(id) { const i = recs.findIndex(x => x.id === id); if (i < 0) return; const d = recs[i].domain; recs.splice(i, 1); await DB.remove(id); changed(d); }
  const of = dm => recs.filter(r => r.domain === dm);
  const get = id => recs.find(r => r.id === id);

  function plans(from = D.today(), days = 14) {
    const to = D.add(from, days);
    return of('plan').filter(r => r.status !== 'drop' && r.date >= from && r.date <= to).sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')));
  }
  const nextPlan = () => { const t = D.today(), now = D.hm(); return plans(t, 30).find(r => r.date > t || !r.time || r.time >= now) || null; };
  const todos = () => of('todo').filter(r => r.status === 'open').sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.at.localeCompare(b.at));
  const doneSince = k => of('todo').filter(r => r.status === 'done' && (r.doneAt || '').slice(0, 10) >= k);

  // ===== 生活データベース =====
  const lifeOf = dm => life.filter(x => x.dm === dm);
  async function saveLife() { await DB.set('life', life); changed('life'); }
  async function lifeAdd(x) { const o = Object.assign({ id:uid(), dm:'home', cat:'', name:'', val:'', state:'sure', at:new Date().toISOString(), seen:D.today() }, x); life.push(o); await saveLife(); return o; }
  async function lifeSet(id, patch) { const o = life.find(x => x.id === id); if (!o) return; Object.assign(o, patch, { seen:D.today() }); await saveLife(); return o; }
  async function lifeDel(id) { life = life.filter(x => x.id !== id); await saveLife(); }
  // 見直し：30日以上確かめていないもの（推定・未確定は先に）
  function stale(n = 5) {
    const lim = D.add(D.today(), -30);
    return life.filter(x => (x.seen || '0') < lim || x.state !== 'sure').sort((a, b) => (a.state === 'sure') - (b.state === 'sure') || (a.seen || '').localeCompare(b.seen || '')).slice(0, n);
  }
  const lifeLine = x => `・${x.cat ? x.cat + '／' : ''}${x.name}${x.val ? '：' + x.val : ''}${x.state !== 'sure' ? `（${STATES[x.state]}）` : ''}`;

  // ===== ひと =====
  async function savePeople() { await DB.set('people', people); changed('people'); }
  async function personSet(p) { const i = people.findIndex(x => x.id === p.id); if (i < 0) people.push(Object.assign({ id:uid() }, p)); else people[i] = p; await savePeople(); }
  async function personDel(id) { people = people.filter(x => x.id !== id); await savePeople(); }
  const personLine = p => `・${p.name}${p.rel ? `（${p.rel}）` : ''}${p.lastMet ? ` 最後に会った日${D.md(p.lastMet)}` : ''}${p.memo ? '：' + p.memo : ''}`;

  // ===== お金 =====
  function dayIn(ymk, day) { const [y, m] = ymk.split('-').map(Number), last = new Date(y, m, 0).getDate(); return `${ymk}-${p2(Math.min(day, last))}`; }
  const nextMonth = ymk => { const [y, m] = ymk.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${p2(m + 1)}`; };
  const monthsBetween = (a, b) => { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1) + 1; };
  function nextPayday() { const t = D.today(), k = dayIn(D.ym(t), money.payday || 25); return k > t ? k : dayIn(nextMonth(D.ym(t)), money.payday || 25); }
  const fixedSum = () => money.fixed.reduce((s, f) => s + (+f.amt || 0), 0);
  const unpaidOpen = () => money.unpaid.filter(u => !u.done);
  // 記録から計算した、今の手元
  function leftNow() {
    if (!money.cash) return null;
    let left = money.cash.amt;
    of('money').forEach(r => { if (r.at > money.cash.at && r.amt && r.kind !== 'cash') left += r.kind === 'in' ? r.amt : r.kind === 'save' ? -r.amt : -r.amt; });
    return left;
  }
  function goalInfo() {
    const g = money.goal || MONEY0.goal, t = D.ym();
    const startYm = t > g.from ? t : g.from, months = Math.max(1, monthsBetween(startYm, g.to));
    const rest = Math.max(0, g.amt - (g.saved || 0));
    return { amt:g.amt, saved:g.saved || 0, to:g.to, from:g.from, months, monthly:Math.ceil(rest / months / 100) * 100, started:t >= g.from, pct:Math.min(1, (g.saved || 0) / g.amt) };
  }
  function moneyNow() {
    const t = D.today(), pd = nextPayday(), days = Math.max(1, D.diff(t, pd));
    // 給料日より前に引き落とされる固定費（給料日と同じ日のものは、給料から払う）
    const before = money.fixed.filter(f => { const d = dayIn(D.ym(t), +f.day || 25); return d >= t && d < pd && !money.paid[f.id + ':' + D.ym(t)]; });
    const beforeSum = before.reduce((s, f) => s + (+f.amt || 0), 0);
    const left = leftNow(), outToday = of('money').filter(r => r.kind === 'out' && r.date === t && r.src !== 'auto' && r.src !== 'pay').reduce((s, r) => s + (r.amt || 0), 0);
    const unpaid = unpaidOpen(), unpaidSum = unpaid.reduce((s, u) => s + (+u.amt || 0), 0);
    const perDay = left == null ? null : Math.max(0, Math.floor((left - beforeSum) / days / 10) * 10);
    // 給料日の流れ
    const g = goalInfo(), saveAmt = money.mode === 'normal' && g.started ? g.monthly : 0;
    const flow = { take:money.takehome, fixed:fixedSum(), unpaid:unpaidSum, leak:money.leak || 0, save:saveAmt };
    flow.rest = flow.take - flow.fixed - flow.unpaid - flow.leak - flow.save;
    const monthDays = D.diff(pd, dayIn(nextMonth(D.ym(pd)), money.payday || 25));
    flow.perDay = Math.max(0, Math.floor(flow.rest / Math.max(1, monthDays) / 10) * 10);
    return { set:left != null, left, perDay, days, payday:pd, before, beforeSum, outToday, unpaid, unpaidSum, flow, mode:money.mode, goal:g };
  }
  async function saveMoney() { await DB.set('money', money); changed('money'); }
  // 給料日の入金と、固定費の引き落としを自動で記録する（財布に合わせた日より後のものだけ）
  async function autoMoney() {
    if (!money.cash) return 0;
    const t = D.today(), ymk = D.ym(t), since = money.cash.at.slice(0, 10); let n = 0;
    const pd = dayIn(ymk, money.payday || 25);
    if (money.takehome && t >= pd && pd > since && !money.paid['salary:' + ymk]) {
      money.paid['salary:' + ymk] = true; n++;
      await add({ domain:'money', kind:'in', text:'給料（自動）', amt:money.takehome, date:pd, src:'auto', at:pd + 'T08:00:00+09:00' }, true);
    }
    for (const f of money.fixed) {
      const d = dayIn(ymk, +f.day || 25), key = f.id + ':' + ymk;
      if (t >= d && d > since && !money.paid[key]) { money.paid[key] = true; n++; await add({ domain:'money', kind:'out', text:`${f.name}（引き落とし・自動）`, amt:f.amt, date:d, payKey:key, src:'auto', at:d + 'T08:30:00+09:00' }, true); }
    }
    if (n) { await DB.set('money', money); changed('money'); }
    return n;
  }
  // 財布の実額に合わせる。記録との差は「なぜか消えたお金」に残す
  async function setCash(amt) {
    const calc = leftNow();
    if (calc != null && calc - amt > 0) (money.leaks = money.leaks || []).push({ at:new Date().toISOString(), amt:calc - amt });
    money.cash = { amt:Math.round(amt), at:new Date().toISOString() };
    await saveMoney();
    return calc == null ? null : calc - amt;
  }
  const leakWeek = () => (money.leaks || []).filter(x => x.at.slice(0, 10) >= D.add(D.today(), -7)).reduce((s, x) => s + x.amt, 0);
  const leakMonth = () => (money.leaks || []).filter(x => x.at.slice(0, 7) === D.ym()).reduce((s, x) => s + x.amt, 0);
  async function payUnpaid(id) {
    const u = money.unpaid.find(x => x.id === id); if (!u) return;
    u.done = !u.done; u.doneAt = u.done ? new Date().toISOString() : null;
    if (u.done) await add({ domain:'money', kind:'out', text:`${u.name}（未払いを支払い）`, amt:u.amt, src:'pay', payId:u.id }, true);
    else { const r = recs.find(x => x.payId === u.id); if (r) await remove(r.id); }
    await saveMoney();
  }
  async function payFixed(f) {
    const key = f.id + ':' + D.ym();
    if (money.paid[key]) { delete money.paid[key]; const r = recs.find(x => x.payKey === key); if (r) await remove(r.id); }
    else { money.paid[key] = true; await add({ domain:'money', kind:'out', text:`${f.name}（引き落とし）`, amt:f.amt, payKey:key, src:'pay' }, true); }
    await saveMoney();
  }
  async function addSaving(amt) {
    const g = money.goal; g.saved = (g.saved || 0) + amt; (g.log = g.log || []).push({ at:new Date().toISOString(), amt });
    await add({ domain:'money', kind:'save', text:'貯金', amt, src:'pay' }, true); await saveMoney();
  }

  // ===== 家事のくり返し（やった日から数える） =====
  async function saveChores() { await DB.set('chores', chores); changed('chores'); }
  const choreDue = c => !c.last ? D.today() : D.add(c.last, c.every || 2);
  async function choreDone(id) { const c = chores.find(x => x.id === id); if (!c) return; c.last = D.today(); await saveChores(); }

  // ===== からだ（1日ごと） =====
  const chk = k => DB.get('chk:' + k, {});
  async function setChk(k, patch) { const c = Object.assign(await chk(k), patch); await DB.set('chk:' + k, c); changed('health'); return c; }
  const sleepH = c => { if (!c.bed || !c.wake) return null; let b = D.min(c.bed), w = D.min(c.wake); if (b >= 24 * 60) b -= 24 * 60; let m = w - b; if (m <= 0) m += 24 * 60; return Math.round(m / 6) / 10; };
  async function days(n = 7, end = D.today()) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) { const d = D.add(end, -i); out.push({ day:d, c:await chk(d), st:await DB.get('st:' + d, null) }); }
    return out;
  }

  // ===== ストレス =====
  const stDaily = k => DB.get('st:' + (k || D.today()), null);
  const setStDaily = v => DB.set('st:' + D.today(), Object.assign({ at:new Date().toISOString() }, v)).then(() => changed('stress'));
  const k6Key = () => 'k6:' + D.week();
  const bjsqKey = () => 'bj:' + D.ym();

  // ===== いつもの =====
  const usuals = () => usual.slice();
  async function setUsual(list) { usual = list; await DB.set('usual', usual); changed('usual'); }

  // ===== 天気（Open-Meteo：キー不要。1時間に1回まで） =====
  async function loadWeather(force) {
    if (!force && weather && Date.now() - weather.t < 36e5) return weather;
    const area = await DB.get('area', { name:'大阪', lat:34.69, lon:135.50 });
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${area.lat}&longitude=${area.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=Asia%2FTokyo&forecast_days=3`;
      const j = await (await fetch(u)).json();
      weather = { t:Date.now(), area:area.name, now:Math.round(j.current.temperature_2m), code:j.current.weather_code,
        days:j.daily.time.map((d, i) => ({ day:d, max:Math.round(j.daily.temperature_2m_max[i]), min:Math.round(j.daily.temperature_2m_min[i]), rain:j.daily.precipitation_probability_max[i], code:j.daily.weather_code[i] })) };
      await DB.set('weather', weather); changed('weather');
    } catch (e) {}
    return weather;
  }
  const wIcon = c => c == null ? '' : c <= 1 ? '☀' : c <= 3 ? '⛅' : c <= 48 ? '☁' : c <= 67 || (c >= 80 && c <= 82) ? '☂' : c <= 77 || c >= 85 && c <= 86 ? '❄' : '⚡';
  const weatherText = () => !weather ? '' : `${weather.area}：今${weather.now}℃。` + weather.days.slice(0, 2).map((d, i) => `${i ? '明日' : '今日'}${d.min}〜${d.max}℃・降水${d.rain}%`).join('、');

  // ===== AIに渡す材料 =====
  const KEYS = [
    [/寒|暑|部屋|布団|毛布|家具|家電|エアコン|こたつ|引っ越|掃除|洗濯|カーテン|ベッド/, ['home', 'bed', 'appl', 'habit']],
    [/服|着る|着て|コート|ジャケット|ダウン|靴|スーツ|パジャマ/, ['clothes']],
    [/金|円|払|給料|貯金|買|節約|返済|家賃|滞納|カード|欲しい/, ['money']],
    [/寝|眠|体|頭|痛|疲|しんど|風邪|酒|飲|体重|運動|タバコ|煙草|吸/, ['body', 'vice', 'habit']],
    [/食|ご飯|飯|ラーメン|昼|夜|朝|腹|弁当|出前|マック|ピザ/, ['food']],
    [/仕事|会社|上司|セミナー|資料|出勤|通勤/, ['work', 'habit']],
    [/ゲーム|ブルアカ|鳴潮|ブロスタ|NIKKE|ニケ|イーフト|カオゼロ|リバリバ|アニメ|漫画|サッカー/, ['play']],
    [/友|飲み|母|兄|さん|ちゃん|くん|後輩|会う/, ['people']],
  ];
  function pick(text) {
    const s = new Set();
    KEYS.forEach(([re, ds]) => { if (re.test(text)) ds.forEach(d => s.add(d)); });
    people.forEach(p => { if (p.name && text.includes(p.name)) s.add('people'); });
    return [...s];
  }
  const line = r => `・${r.state !== 'sure' ? `[${STATES[r.state] || r.state}]` : ''}${r.date ? D.md(r.date) : ''}${r.time ? ' ' + r.time : ''} ${r.text}${r.amt ? `（${yen(r.amt)}）` : ''}${r.due ? `〔期限${D.md(r.due)}〕` : ''}`;
  // 生活データベース（選んだ分野）＋直近の記録
  function context(lifeDms = [], recDms = ['plan', 'todo'], per = 10) {
    const parts = [];
    lifeDms.forEach(dm => {
      if (dm === 'people') { if (people.length) parts.push('【ひと】\n' + people.map(personLine).join('\n')); return; }
      const l = lifeOf(dm); if (l.length) parts.push(`【${LIFE[dm]}】\n` + l.map(lifeLine).join('\n'));
    });
    recDms.forEach(dm => {
      let list = of(dm);
      if (dm === 'plan') list = plans(D.add(D.today(), -2), 21);
      if (dm === 'todo') list = todos();
      list = list.slice(-per);
      if (list.length) parts.push(`【最近の${DOMAINS[dm]}】\n` + list.map(line).join('\n'));
    });
    return parts.join('\n');
  }
  const usualText = () => usual.length ? '【いつもの】' + usual.map(u => u.text).join('、') : '';
  function snapshot() {
    const m = moneyNow(), t = D.today();
    return {
      today:D.now(),
      money:`${m.mode === 'endure' ? '耐えるモード' : '通常モード'}。給料日（${D.md(m.payday)}）まで${m.days}日。` + (m.set ? `手元${yen(m.left)}、1日${yen(m.perDay)}まで、今日使った${yen(m.outToday)}` : '手元は未設定') + (m.unpaid.length ? `。未払い：${m.unpaid.map(u => `${u.name}${yen(u.amt)}`).join('、')}` : ''),
      plans:plans(t, 2).map(r => `${D.label(r.date)}${r.time ? ' ' + r.time : ''} ${r.text}`).join('、'),
      todos:todos().slice(0, 6).map(r => r.text + (r.due ? `（${D.label(r.due)}まで）` : '')).join('、'),
      chores:chores.map(c => `${c.name}：${D.label(choreDue(c))}`).join('、'),
      weather:weatherText(), usual:usual.map(u => u.text).join('、'),
    };
  }

  // ===== 全タブ横断の一覧（秘書室） =====
  async function crossList() {
    const t = D.today(), out = [], m = moneyNow();
    plans(t, 7).forEach(r => out.push({ when:r.date, time:r.time, tab:r.work ? 'room' : 'desk', kind:'予定', text:r.text, id:r.id }));
    todos().forEach(r => out.push({ when:r.due || '', tab:r.work ? 'room' : 'desk', kind:r.work ? '仕事' : 'やること', text:r.text, id:r.id, todo:true }));
    m.unpaid.forEach(u => out.push({ when:'', tab:'bank', kind:'未払い', text:`${u.name} ${yen(u.amt)}`, unpaid:u.id }));
    if (m.payday && D.diff(t, m.payday) <= 1) out.push({ when:D.add(m.payday, -1), tab:'bank', kind:'お金', text:'口座の残高を確かめる（明日の引き落とし前）' });
    chores.forEach(c => { const d = choreDue(c); if (d <= D.add(t, 1)) out.push({ when:d, tab:'room', kind:'家事', text:c.name, chore:c.id }); });
    if (!(await stDaily())) out.push({ when:t, tab:'clinic', kind:'こころ', text:'今日のチェック（乃亜が3つ聞く）' });
    if (!(await DB.get(k6Key()))) out.push({ when:'', tab:'clinic', kind:'こころ', text:'今週のチェック（K6・6問）' });
    return out.sort((a, b) => (a.when || '9999').localeCompare(b.when || '9999') || (a.time || '').localeCompare(b.time || ''));
  }

  // ===== 乃亜の声かけ（その日に1回ずつ） =====
  async function alerts() {
    const out = [], m = moneyNow(), t = D.today(), hr = new Date().getHours();
    if (hr >= 2 && hr < 5) out.push({ id:'late', f:'pout', tab:'clinic', text:'……よーへーくん？？ もう寝る時間、とっくに過ぎてるんだけど。' });
    if (m.payday && D.diff(t, m.payday) === 1) out.push({ id:'pay-eve', f:'normal', tab:'bank', text:'明日は給料日で、引き落としの日。……口座、いまのうちに見といて。' });
    if (m.set && m.perDay != null && m.perDay < 300 && m.days > 2) out.push({ id:'money-low', f:'worry', tab:'bank', text:`給料日まで${m.days}日。今日はお金を使わない日にしよ。……一緒にがんばろ。` });
    const due = todos().filter(r => r.due && r.due <= D.add(t, 1));
    if (due.length) out.push({ id:'due-' + due[0].id, f:'normal', tab:'desk', text:`「${due[0].text}」、${due[0].due < t ? '期限すぎてるよ' : D.label(due[0].due) + 'まで'}。……今のうちにやっとこ。` });
    const c1 = await chk(D.add(t, -1)), s1 = sleepH(c1);
    if (s1 != null && s1 < 5) out.push({ id:'sleep', f:'worry', tab:'clinic', text:`昨日の睡眠、${s1}時間。……今夜は早めに寝て。お願い。` });
    const w = weather && weather.days && weather.days[1];
    if (w && w.min <= 8) out.push({ id:'cold', f:'worry', tab:'desk', text:`明日の朝は${w.min}℃。黒ダウンで出てね。寝るときもあったかくして。` });
    if (w && w.rain >= 60) out.push({ id:'rain', f:'normal', tab:'desk', text:`明日は雨（${w.rain}%）。傘、忘れないで。` });
    const seen = await DB.get('seen:' + t, []);
    return out.filter(a => !seen.includes(a.id));
  }
  async function seeAlert(id) { const k = 'seen:' + D.today(), s = await DB.get(k, []); s.push(id); await DB.set(k, s); }

  // ===== GASへ要約を送る（通知を作るため） =====
  async function sync() { if (Api.ready()) Api.call('sync', { snap:snapshot() }, { retry:1, timeout:20000 }); }

  return { load, onChange, touch:() => changed('all'), add, update, remove, of, get, plans, nextPlan, todos, doneSince, line,
    life:() => life, lifeOf, lifeAdd, lifeSet, lifeDel, stale, lifeLine,
    people:() => people, personSet, personDel,
    money:() => money, moneyNow, saveMoney, autoMoney, setCash, leakWeek, leakMonth, payUnpaid, payFixed, addSaving, goalInfo, fixedSum,
    chores:() => chores, saveChores, choreDue, choreDone,
    chk, setChk, sleepH, days, stDaily, setStDaily, k6Key, bjsqKey,
    usuals, setUsual, profile:() => profile, setProfile:async p => { profile = p; await DB.set('profile', p); changed('profile'); },
    loadWeather, weather:() => weather, wIcon, weatherText, pick, context, usualText, snapshot, crossList, alerts, seeAlert, sync };
})();
