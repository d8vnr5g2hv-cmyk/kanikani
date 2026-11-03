// Life Partner — 乃亜と話す（乃亜をタップすると出るメッセージ窓）
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
    bank:['今月やばい？', '欲しいものある', '滞納どうしよう'],
    room:['登録したいものある', '見直ししよ', 'この部屋寒い'],
  };
  const w = () => $('talk');
  const el$talk = on => $('stage').classList.toggle('speaking', on);

  // 1文字ずつ出す（タップで飛ばす）
  function type(text, face = 'normal') {
    const t = $('twText'); $('twFace').innerHTML = Face.img(face, 'md');
    if (typing) { clearInterval(typing.iv); typing.done(); }
    return new Promise(done => {
      let i = 0; t.textContent = ''; Stage.face(face, 0); el$talk(true); Sound.duck(true);
      const fin = () => { clearInterval(iv); t.textContent = text; el$talk(false); Sound.duck(false); typing = null; done(); };
      const iv = setInterval(() => { i++; t.textContent = text.slice(0, i); if (i % 3 === 0) Sound.se('type'); if (i >= text.length) fin(); }, 32);
      typing = { iv, done:fin };
    });
  }
  async function say(lines, face) { for (const l of [].concat(lines)) { log.push({ who:'noa', text:l }); await type(l, face); if (lines.length > 1) await sleep(700); } saveLog(); }
  const saveLog = () => DB.set('talk:' + D.today(), log.slice(-40));

  async function open(t, opt = {}) {
    tab = t || App.tab(); listen = !!opt.listen;
    log = await DB.get('talk:' + D.today(), []);
    $('twChips').innerHTML = (opt.chips || CHIPS[tab] || []).map(c => `<button>${esc(c)}</button>`).join('');
    $('twForm').hidden = !!opt.script;
    w().classList.add('on'); $('app').classList.add('talking');
    $('twMode').textContent = listen ? '聞くだけ' : TABS[tab].name;
    if (opt.script) return;
    const first = opt.first || Noa.pick(Noa.tap[tab]);
    await say([first], opt.face || 'normal');
  }
  function close() { w().classList.remove('on'); $('app').classList.remove('talking'); $('twChoice').innerHTML = ''; el$talk(false); Stage.face('normal'); }

  async function send(text) {
    text = (text || '').trim(); if (!text || busy) return;
    busy = true; $('twIn').value = ''; $('twMe').textContent = text; $('twMe').classList.add('on');
    log.push({ who:'me', text });
    $('twText').innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    let r = null;
    if (Api.ready()) {
      const dms = Data.pick(text);
      r = await Api.call('talk', { tab, topic:TOPIC[tab], listen, log:log.slice(-16), snap:Data.snapshot(), usual:Data.usualText(), ctx:Data.context(dms, ['plan', 'todo'], 6) });
    }
    if (r && r.lines && r.lines.length) {
      await say(r.lines, r.face || 'normal');
      for (const n of r.notes || []) {
        if (n.life && LIFE[n.life]) await Data.lifeAdd({ dm:n.life, cat:n.cat || '', name:n.text, val:n.val || '', state:'guess' });
        else if (n.text) await Data.add({ domain:DOMAINS[n.domain] ? n.domain : 'other', kind:n.kind || '', text:n.text, date:n.date || D.today(), time:n.time || '', due:n.due || '', state:n.state || 'guess', src:'talk' }, true);
      }
      if ((r.notes || []).length) { Data.touch(); toast('話したことを、記録に残しました'); }
    } else {
      await say([listen ? Noa.pick(['……うん。聞いてる。', 'そっか。……それで？', 'うん。ゆっくりでいいよ。']) : Noa.pick(['……ふーん。そっか。', 'AIがつながってないから、今はこれくらいしか言えないけど……ちゃんと聞いてるよ。'])], 'normal');
    }
    busy = false;
  }

  // 台本つきの会話（ストレスチェックなど）。steps：[{text, face, choices:[[値, ラベル]]}] → 選んだ値の配列
  async function script(steps, opt = {}) {
    await open(opt.tab || 'clinic', { script:true, chips:[] });
    const ans = [];
    for (const s of steps) {
      await type(s.text, s.face || 'normal');
      ans.push(await new Promise(ok => {
        $('twChoice').innerHTML = s.choices.map(([v, l]) => `<button data-v="${v}">${esc(l)}</button>`).join('');
        $('twChoice').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; Sound.se('tap'); $('twChoice').innerHTML = ''; ok(+b.dataset.v); };
      }));
    }
    return ans;
  }

  function bind() {
    $('twX').onclick = close;
    $('twText').onclick = () => { if (typing) typing.done(); };
    $('twForm').onsubmit = e => { e.preventDefault(); send($('twIn').value); };
    $('twChips').onclick = e => { const b = e.target.closest('button'); if (b) send(b.textContent); };
    $('stage').onclick = () => { if (!$('app').classList.contains('talking') && !$('app').classList.contains('panel-open')) { Sound.se('tap'); open(App.tab()); } };
  }
  return { bind, open, close, say, script, type, isOpen:() => w().classList.contains('on') };
})();
