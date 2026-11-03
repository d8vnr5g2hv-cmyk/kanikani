// Life Partner — 秘書室（作戦室の電子画面。まとめ・提案書・全タブの期限とやること・書き留め）
'use strict';
const Desk = (() => {
  function peek() {
    const td = Data.todos(), p = Data.nextPlan(), op = Data.of('proposal').filter(r => r.status === 'open').length;
    return `<span class="k">やること</span><b class="v">${td.length}</b><span class="s">${op ? `新しい提案 ${op}件` : p ? `${D.label(p.date)}${p.time ? ' ' + p.time : ''}　${esc(p.text)}` : '予定なし'}</span>`;
  }

  async function render(el) {
    const list = await Data.crossList(), props = Data.of('proposal').filter(r => r.status === 'open' || r.status === 'hold').slice(-6).reverse();
    const ideas = Data.of('idea').slice(-6).reverse(), sum = await DB.get('sum:' + D.today()), now = new Date();
    const todoRows = Data.todos().map(r => ({ id:r.id, kind:r.work ? '仕事' : r.kind === 'ask' ? 'お願い' : 'やること', tab:r.work ? 'room' : 'desk', text:r.text, when:r.due })), other = list.filter(x => !x.todo);
    el.innerHTML = `
      <div class="hud-top"><span>OPERATIONS</span><em>${D.today().replace(/-/g, '.')}　${p2(now.getHours())}:${p2(now.getMinutes())}</em></div>
      <section class="hud-box"><h4><small>SUMMARY</small>まとめ</h4>
        <div class="seg"><button data-sum="am">朝</button><button data-sum="night">夜</button><button data-sum="week">今週</button></div>
        <div class="hud-brief" id="sumBox">${sum ? sumHtml(sum) : '<p class="mini">押すと、乃亜がその時点の全タブをまとめます。</p>'}</div></section>
      <section class="hud-box"><h4><small>PROPOSALS</small>提案書<button class="hud-act" id="propGo">提案をもらう</button></h4>
        ${props.length ? props.map((r, i) => `<div class="prop${r.status === 'hold' ? ' hold' : ''}" data-id="${r.id}"><span class="no">No.${p2(i + 1)}</span>
          <b>${esc(r.text)}</b>${r.why ? `<p><i>理由</i>${esc(r.why)}</p>` : ''}${r.alt ? `<p><i>代案</i>${esc(r.alt)}</p>` : ''}
          <div class="pb"><button data-p="adopt">採用</button><button data-p="hold">${r.status === 'hold' ? '保留中' : '保留'}</button><button data-p="reject">却下</button></div></div>`).join('') : '<p class="mini">今は提案はありません。</p>'}</section>
      <section class="hud-box"><h4><small>TASKS</small>やること<button class="hud-act" data-add="todo">追加</button></h4>
        <p class="mini">右へスワイプで完了、左へスワイプで消す。長押しで並べ替え。</p>
        <div class="sw-list" id="deskTodo">${todoRows.map(x => Swipe.row(x.id, `<i class="tag t-${x.tab}">${esc(x.kind)}</i><span class="tx">${esc(x.text)}</span><em>${x.when ? D.label(x.when) + 'まで' : ''}</em>`)).join('') || '<p class="mini">やることはありません。</p>'}</div></section>
      <section class="hud-box"><h4><small>ALL TABS</small>期限と予定</h4>
        <div class="hud-list">${other.map(x => `<button class="hl" ${x.chore ? `data-chore="${x.chore}"` : `data-go="${x.tab}"`}><i class="tag t-${x.tab}">${esc(x.kind)}</i><span class="tx">${esc(x.text)}</span><em>${x.when ? D.label(x.when) + (x.time ? ' ' + x.time : '') : ''}</em>${x.chore ? '<span class="done-b">済</span>' : ''}</button>`).join('') || '<p class="mini">なにもありません。……ゆっくりしてていいよ。</p>'}</div></section>
      <section class="hud-box"><h4><small>NOTES</small>書き留め</h4>
        <form class="inrow" id="ideaForm"><input id="ideaIn" placeholder="思いついたこと、これするとか"><button class="btn">残す</button></form>
        <div class="sw-list" id="deskIdea">${ideas.map(r => Swipe.row(r.id, `<span class="tx">${esc(r.text)}</span><em>${D.md(r.date)}</em>`, 'no-done')).join('')}</div></section>`;
    Swipe.bind($('deskTodo'), { done:id => complete(id), del:id => removeUndo(id) });
    Swipe.bind($('deskIdea'), { del:id => removeUndo(id) });
    Reorder.bind($('deskTodo'), '.sw-row', ids => ids.forEach((id, i) => Data.update(id, { order:i })));
  }
  const sumHtml = s => `${Face.img(s.face || 'normal', 'sm')}<div class="bt">${s.intro ? `<b>${esc(s.intro)}</b>` : ''}${(s.lines || []).map(l => `<p>${esc(l)}</p>`).join('')}</div>`;

  async function complete(id) { await Data.update(id, { status:'done', doneAt:new Date().toISOString() }); toast('完了にしました', 4000, { label:'元に戻す', fn:() => Data.update(id, { status:'open', doneAt:null }) }); }
  async function removeUndo(id) { const r = Object.assign({}, Data.get(id)); await Data.remove(id); toast('消しました', 4000, { label:'元に戻す', fn:() => Data.add(r) }); }

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
    if ($('sumBox')) $('sumBox').innerHTML = sumHtml(s);
  }

  async function localProposals() {
    const out = [], w = Data.weather(), m = Data.moneyNow(), kake = Data.lifeOf('bed').find(x => /掛け布団/.test(x.name));
    if (w && w.days[1] && w.days[1].min <= 10 && (!kake || /ない|なし/.test(kake.val))) out.push({ key:'futon-' + D.week(), text:'寝るときの寒さ対策をする', why:`明日の朝は${w.days[1].min}度。寝具が毛布だけなので冷えやすい。`, alt:'エアコンを弱め（20度前後）にして寝る。余裕ができたら掛け布団を「買いたいもの」に。' });
    if (m.unpaid.length && m.days <= 7) out.push({ key:'unpaid-' + D.ym(), text:`給料日（${D.md(m.payday)}）は、入金を確かめてから未払いを先に払う`, why:`未払いが${yen(m.unpaidSum)}ある。後回しにすると、また次の月に残る。`, alt:'全額が難しければ、管理会社に分けて払えるか相談する。' });
    const days = await Data.days(5), late = days.filter(d => d.c.bed && D.min(d.c.bed) < 5 * 60 && D.min(d.c.bed) >= 60).length;
    if (late >= 3) out.push({ key:'sleep-' + D.week(), text:'ゲームは25時で切り上げる', why:`この5日で、1時を過ぎて寝た日が${late}日。`, alt:'まずは平日だけ。休日の前はそのままでいい。' });
    const ch = Data.chores().find(c => c.name === '洗濯' && Data.choreDue(c) <= D.today());
    if (ch) out.push({ key:'laundry-' + D.today(), text:'今日は洗濯の日', why:'前に洗ってから2日たった。', alt:'今日がむずかしければ、明日の朝に回す。' });
    return out;
  }
  async function propose() {
    toast('乃亜が考えています');
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
      const ch = e.target.closest('[data-chore]'); if (ch) { Sound.se('ok'); await Data.choreDone(ch.dataset.chore); toast('済みにしました'); return; }
      const g = e.target.closest('[data-go]'); if (g) return App.go(g.dataset.go, true);
      if (e.target.closest('[data-add="todo"]')) {
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
  return { bind, peek, render, complete, removeUndo };
})();
