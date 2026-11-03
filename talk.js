// Life Partner — 乃亜と話す（ノベルゲーム風のメッセージ窓）
'use strict';
const Talk = (() => {
  let tab = 'home', listen = false, log = [], typing = null, busy = false;
  const TOPIC = {
    home:'雑談。今日あったこと、気分、なんでも。',
    desk:'秘書として。予定・やること・アイデアの整理、文面の下書き、段取りの相談。',
    clinic:'医者として。体調、睡眠、お酒、タバコ、気持ちの相談。診断はしない。',
    bank:'銀行の担当として。お金のやりくり、未払い、買いたいもの、貯金の相談。責めない。',
    room:'自室で。生活データベースの登録・見直し、持ち物、部屋のこと。',
  };
  const CHIPS = {
    home:['ただいま', '今日つかれた', 'なんか話そ'],
    desk:['今日なにすればいい？', '明日の準備', 'アイデア聞いて'],
    clinic:['最近ねむれない', '飲みすぎたかも', 'ちょっとしんどい'],
    bank:['今月だいじょうぶ？', '欲しいものある', '未払いどうしよう'],
    room:['登録したいものある', '見直ししよ', 'この部屋寒い'],
  };
  const w = () => $('talk');

  // 1文字ずつ出す（タップで最後まで）。表情は全画面の乃亜で変わる
  function type(text, face = 'normal') {
    const t = $('twText'); $('twNext').classList.remove('on');
    if (typing) typing.done();
    Stage.face(face); $('stage').classList.add('speaking'); Sound.duck(true);
    return new Promise(done => {
      let i = 0; t.textContent = '';
      const fin = () => { clearInterval(iv); t.textContent = text; $('stage').classList.remove('speaking'); Sound.duck(false); typing = null; $('twNext').classList.add('on'); done(); };
      const iv = setInterval(() => { i++; t.textContent = text.slice(0, i); if (i % 2 === 0) Sound.se('type'); if (i >= text.length) fin(); }, 38);
      typing = { done:fin };
    });
  }
  async function say(lines, face) {
    lines = [].concat(lines);
    for (let n = 0; n < lines.length; n++) { log.push({ who:'noa', text:lines[n] }); await type(lines[n], face); if (n < lines.length - 1) await sleep(900); }
    DB.set('talk:' + D.today(), log.slice(-40));
  }
  // 前の日までにようへいが話したこと（会話の続きに使う）
  async function past() {
    const out = [];
    for (let i = 1; i <= 3; i++) { const l = await DB.get('talk:' + D.add(D.today(), -i), []); l.filter(m => m.who === 'me').slice(-4).forEach(m => out.push(`${D.label(D.add(D.today(), -i))}：${m.text}`)); }
    return out.slice(-8);
  }

  async function open(t, opt = {}) {
    tab = t || App.tab(); listen = !!opt.listen;
    log = await DB.get('talk:' + D.today(), []);
    w().dataset.tab = tab;
    $('twChips').innerHTML = (opt.chips || CHIPS[tab] || []).map(c => `<button>${esc(c)}</button>`).join('');
    $('twForm').hidden = !!opt.script; $('twChips').hidden = !!opt.script;
    $('twMode').textContent = listen ? '聞くだけ' : TABS[tab].name;
    $('twMe').classList.remove('on');
    w().classList.add('on'); $('app').classList.add('talking'); App.setPanel(false);
    if (opt.script) return;
    await say([opt.first || Noa.pick(Noa.tap[tab])], opt.face || 'normal');
  }
  function close() { if (typing) typing.done(); w().classList.remove('on'); $('app').classList.remove('talking'); $('twChoice').innerHTML = ''; Stage.face('normal'); }

  async function send(text) {
    text = (text || '').trim(); if (!text || busy) return;
    busy = true; $('twIn').value = ''; $('twIn').blur(); $('twMe').textContent = text; $('twMe').classList.add('on');
    log.push({ who:'me', text });
    $('twText').innerHTML = '<span class="dots"><i></i><i></i><i></i></span>'; $('twNext').classList.remove('on');
    let r = null;
    if (Api.ready()) {
      const dms = Data.pick(text);
      r = await Api.call('talk', { tab, topic:TOPIC[tab], listen, log:log.slice(-16), past:await past(), snap:Data.snapshot(), usual:Data.usualText(), ctx:Data.context(dms, ['plan', 'todo'], 6) });
    }
    if (r && r.lines && r.lines.length) {
      await say(r.lines, r.face || 'normal');
      let n = 0;
      for (const x of r.notes || []) {
        if (x.life && LIFE[x.life]) { await Data.lifeAdd({ dm:x.life, cat:x.cat || '', name:x.text, val:x.val || '', state:'guess' }); n++; }
        else if (x.text) { await Data.add({ domain:DOMAINS[x.domain] ? x.domain : 'other', kind:x.kind || '', text:x.text, date:x.date || D.today(), time:x.time || '', due:x.due || '', state:'guess', src:'talk' }, true); n++; }
      }
      if (n) { Data.touch(); toast('話したことを、記録に残しました'); }
    } else {
      await say([listen ? Noa.pick(['……うん。聞いてる。', 'そっか。……それで？', 'うん。ゆっくりでいいよ。']) : Noa.pick(['……ふーん。そっか。', '今はAIにつながってないから、短くしか返せないけど……ちゃんと聞いてるよ。'])], listen ? 'normal' : 'blank');
    }
    busy = false;
  }

  // 台本つきの会話（ストレスチェックなど）。steps：[{text, face, choices:[[値, ラベル]]}] → 選んだ値の配列
  async function script(steps, opt = {}) {
    await open(opt.tab || 'clinic', { script:true });
    const ans = [];
    for (const s of steps) {
      await type(s.text, s.face || 'normal');
      ans.push(await new Promise(ok => {
        $('twChoice').innerHTML = s.choices.map(([v, l]) => `<button data-v="${v}">${esc(l)}</button>`).join('');
        $('twChoice').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; Sound.se('tap'); haptic(); $('twChoice').innerHTML = ''; ok(+b.dataset.v); };
      }));
    }
    $('twForm').hidden = false; $('twChips').hidden = false;
    return ans;
  }

  function bind() {
    $('twX').onclick = close;
    $('twText').onclick = () => { if (typing) typing.done(); };
    $('twForm').onsubmit = e => { e.preventDefault(); send($('twIn').value); };
    $('twChips').onclick = e => { const b = e.target.closest('button'); if (b) send(b.textContent); };
    // 乃亜をタップすると話せる（顔のあたり）
    $('stage').addEventListener('click', () => { const a = $('app').classList; if (!a.contains('talking') && !a.contains('panel-open') && !a.contains('splashing')) { Sound.se('tap'); open(App.tab()); } });
  }
  return { bind, open, close, say, script, type, past, isOpen:() => w().classList.contains('on') };
})();
