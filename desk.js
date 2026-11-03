// Life Partner — 秘書室（まとめ・提案書・全タブの期限とやること・書き留め）
'use strict';
const Desk = (() => {
  const TABN = { desk:'秘書室', clinic:'診療所', bank:'銀行', room:'自室', home:'ホーム' };

  function peek() {
    const td = Data.todos(), p = Data.nextPlan(), op = Data.of('proposal').filter(r => r.status === 'open').length;
    return `<span>やること <b>${td.length}</b></span><span>${op ? `提案 ${op}件` : p ? `次：${D.label(p.date)} ${esc(p.text)}` : '予定なし'}</span>`;
  }

  async function render(el) {
    const list = await Data.crossList(), props = Data.of('proposal').filter(r => r.status === 'open' || r.status === 'hold').slice(-6).reverse();
    const ideas = Data.of('idea').slice(-5).reverse(), sum = await DB.get('sum:' + D.today());
    el.innerHTML = `
      <div class="sec"><h3><small>SUMMARY</small>まとめ</h3>
        <div class="seg" id="sumSeg"><button data-sum="am">朝</button><button data-sum="night">夜</button><button data-sum="week">今週</button></div>
        <div class="brief" id="sumBox">${sum ? sumHtml(sum) : '<div class="bt"><p class="mini">ボタンを押すと、乃亜がその時点の全タブをまとめます。</p></div>'}</div></div>
      <div class="sec"><h3><small>PROPOSALS</small>提案書<button class="add" id="propGo">提案をもらう</button></h3>
        ${props.length ? props.map(r => `<div class="prop hud${r.status === 'hold' ? ' hold' : ''}" data-id="${r.id}">
          <b>${esc(r.text)}</b>${r.why ? `<p><i>理由</i>${esc(r.why)}</p>` : ''}${r.alt ? `<p><i>代わりの案</i>${esc(r.alt)}</p>` : ''}
          <div class="pb"><button data-p="adopt">採用</button><button data-p="hold">${r.status === 'hold' ? '保留中' : '保留'}</button><button data-p="reject">却下</button></div></div>`).join('') : '<p class="mini">今は提案はありません。</p>'}</div>
      <div class="sec"><h3><small>ALL TABS</small>期限とやること<button class="add" data-add="todo">＋</button></h3>
        <div class="rows">${list.length ? list.map(x => `<div class="row x" ${x.id ? `data-rid="${x.id}"` : ''} ${x.chore ? `data-chore="${x.chore}"` : ''} ${x.unpaid ? 'data-go="bank"' : ''} ${!x.id && !x.chore && !x.unpaid ? `data-go="${x.tab}"` : ''}>
          ${x.todo || x.chore ? '<button class="ck" aria-label="完了"></button>' : '<span class="ck dot"></span>'}
          <span><i class="tb ${x.tab}">${esc(x.kind)}</i>${esc(x.text)}</span><em>${x.when ? D.label(x.when) + (x.time ? ' ' + x.time : '') : ''}</em></div>`).join('') : '<p class="mini">なにもありません。……ゆっくりしてていいよ。</p>'}</div></div>
      <div class="sec"><h3><small>NOTE</small>書き留め</h3>
        <form class="inrow" id="ideaForm"><input id="ideaIn" placeholder="思いついたこと、これするとか"><button class="btn">残す</button></form>
        <div class="rows">${ideas.map(r => `<div class="row"><span>${esc(r.text)}</span><em>${D.md(r.date)}</em><button class="del" data-rm="${r.id}">✕</button></div>`).join('')}</div></div>`;
  }
  const sumHtml = s => `${Face.img(s.face || 'normal', 'sm')}<div class="bt"><b>${esc(s.intro || '')}</b>${(s.lines || []).map(l => `<p>${esc(l)}</p>`).join('')}</div>`;

  // まとめ（朝・夜・今週）
  async function summary(kind) {
    $('sumBox').innerHTML = `${Face.img('normal', 'sm')}<div class="bt"><span class="dots"><i></i><i></i><i></i></span></div>`;
    let s = null;
    if (Api.ready()) {
      const days = await Data.days(7), stats = days.map(d => ({ day:d.day, sleep:Data.sleepH(d.c), drink:d.c.drink, smoke:d.c.smoke, mood:d.c.mood, st:d.st ? d.st.sum : null }));
      s = await Api.call('summary', { kind, snap:Data.snapshot(), stats, leak:Data.leakWeek(), done:Data.doneSince(D.add(D.today(), -7)).map(r => r.text), ctx:Data.context(['habit'], ['plan', 'todo', 'money', 'food'], 12) });
    }
    if (!s || !s.lines) {
      const m = Data.moneyNow(), td = Data.todos(), done = Data.doneSince(D.add(D.today(), kind === 'week' ? -7 : 0));
      s = { intro:kind === 'week' ? '今週のまとめ。' : kind === 'am' ? 'おはよ。今日のこと。' : '今日のまとめ。', face:'normal',
        lines:[`片づけたこと ${done.length}件、残り ${td.length}件。`, m.set ? `今日使えるのは${yen(m.perDay)}。給料日まで${m.days}日。` : '手元のお金を一度教えて。', kind === 'week' ? `記録にない出費は今週${yen(Data.leakWeek())}。` : (td[0] ? `次は「${td[0].text}」。` : '……今日はもう休んでいいよ。')] };
    }
    await DB.set('sum:' + D.today(), s);
    $('sumBox').innerHTML = sumHtml(s);
  }

  // 提案（AIがなければ、手元のルールで出す）
  async function localProposals() {
    const out = [], w = Data.weather(), m = Data.moneyNow(), kake = Data.lifeOf('bed').find(x => /掛け布団/.test(x.name));
    const noFuton = !kake || /ない|なし/.test(kake.val);
    if (w && w.days[1] && w.days[1].min <= 10 && noFuton) out.push({ key:'futon', text:'寝るときの寒さ対策をする', why:`明日の朝は${w.days[1].min}℃。寝具が毛布だけなので冷えやすい。`, alt:'エアコンを弱め（20℃前後）にして寝る。お金に余裕ができたら掛け布団を「買いたいもの」に。' });
    if (m.unpaid.length && m.days <= 7) out.push({ key:'unpaid-' + D.ym(), text:`給料日（${D.md(m.payday)}）は、入金を確かめてから未払いを先に払う`, why:`未払いが${yen(m.unpaidSum)}ある。後回しにすると、また次の月に残る。`, alt:'全額が難しければ、管理会社に分けて払えるか相談する。' });
    const days = await Data.days(5), late = days.filter(d => D.min(d.c.bed || '00:00') >= 25 * 60 || (d.c.bed && D.min(d.c.bed) < 5 * 60)).length;
    if (late >= 3) out.push({ key:'sleep-' + D.week(), text:'ゲームは25時で切り上げる', why:`この5日で、25時を過ぎて寝た日が${late}日。`, alt:'まずは平日だけ。休日の前はそのままでいい。' });
    const ch = Data.chores().find(c => c.name === '洗濯' && Data.choreDue(c) <= D.today());
    if (ch) out.push({ key:'laundry-' + D.today(), text:'今日は洗濯の日', why:'前に洗ってから2日たった。', alt:'今日がむずかしければ明日の朝に回す。' });
    return out;
  }
  async function propose() {
    toast('乃亜が考えています…');
    let list = null;
    if (Api.ready()) {
      const r = await Api.call('propose', { snap:Data.snapshot(), ctx:Data.context(['home', 'bed', 'appl', 'clothes', 'habit', 'money', 'vice', 'body'], ['plan', 'todo'], 8),
        held:Data.of('proposal').filter(x => x.status === 'hold' || x.status === 'reject').slice(-8).map(x => `${x.text}（${x.status === 'hold' ? '保留' : '却下'}）`) });
      if (r && Array.isArray(r.items)) list = r.items.map(x => ({ key:'ai-' + uid(), text:x.text, why:x.why, alt:x.alt }));
    }
    if (!list) list = await localProposals();
    const have = new Set(Data.of('proposal').map(r => r.key));
    let n = 0;
    for (const x of list) { if (!x.text || have.has(x.key)) continue; await Data.add({ domain:'proposal', kind:'proposal', key:x.key, text:x.text, why:x.why || '', alt:x.alt || '', status:'open', src:'noa' }, true); n++; }
    Data.touch(); toast(n ? `提案が${n}件あります` : '今は新しい提案はないみたい');
  }

  function bind() {
    $('panelBody').addEventListener('click', async e => {
      if (App.tab() !== 'desk') return;
      const s = e.target.closest('[data-sum]'); if (s) return summary(s.dataset.sum);
      if (e.target.closest('#propGo')) return propose();
      const pb = e.target.closest('[data-p]'); if (pb) {
        const id = pb.closest('.prop').dataset.id, st = pb.dataset.p; await Data.update(id, { status:st, decidedAt:new Date().toISOString() });
        Sound.se(st === 'adopt' ? 'ok' : 'tap');
        if (st === 'adopt') { const r = Data.get(id); await Data.add({ domain:'todo', kind:'todo', text:r.text, src:'proposal' }); toast('採用。やることに入れたよ'); }
        return;
      }
      const ck = e.target.closest('.ck:not(.dot)'); if (ck) {
        const row = ck.closest('.row'); Sound.se('ok'); haptic(); row.classList.add('done');
        if (row.dataset.rid) await Data.update(row.dataset.rid, { status:'done', doneAt:new Date().toISOString() });
        if (row.dataset.chore) await Data.choreDone(row.dataset.chore);
        return;
      }
      const g = e.target.closest('[data-go]'); if (g) return App.go(g.dataset.go, true);
      const rm = e.target.closest('[data-rm]'); if (rm) return Data.remove(rm.dataset.rm);
      const ad = e.target.closest('[data-add="todo"]'); if (ad) {
        const v = await form('やることを足す', [{ k:'text', label:'やること' }, { k:'due', label:'期限（なくてもよい）', type:'date' }, { k:'work', label:'種類', type:'select', options:[['0', 'ふだん'], ['1', '仕事']], value:'0' }]);
        if (v && v.text) await Data.add({ domain:'todo', kind:'todo', text:v.text, due:v.due || '', work:v.work === '1' });
      }
    });
    $('panelBody').addEventListener('submit', async e => {
      if (e.target.id !== 'ideaForm') return; e.preventDefault();
      const v = $('ideaIn').value.trim(); if (!v) return;
      await Data.add({ domain:'idea', kind:'idea', text:v }); toast('残しました');
    });
  }
  return { bind, peek, render };
})();
