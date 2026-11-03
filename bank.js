// Life Partner — 銀行（専属の銀行担当の乃亜。耐えるモード → 通常モード）
'use strict';
const Bank = (() => {
  const ymJ = k => `${k.slice(0, 4)}年${+k.slice(5, 7)}月`;
  function peek() {
    const m = Data.moneyNow();
    return `<span>今日使える <b>${m.set ? yen(m.perDay) : '—'}</b></span><span>${m.unpaid.length ? `未払い ${m.unpaid.length}件` : `給料日まで ${m.days}日`}</span>`;
  }

  async function render(el) {
    const m = Data.moneyNow(), mo = Data.money(), endure = m.mode === 'endure', g = m.goal, t = D.today();
    const outs = Data.of('money').filter(r => r.date === t && (r.kind === 'out' || r.kind === 'in')).reverse();
    const f = m.flow, allPaid = !m.unpaid.length;
    el.innerHTML = `
      <div class="mode hud ${endure ? 'endure' : 'normal'}"><small>${endure ? 'ENDURE MODE' : 'NORMAL MODE'}</small><b>${endure ? '耐えるモード' : '通常モード'}</b>
        <p>${endure ? '目的は、未払いをなくして給料日までつなぐこと。' : '目的は、2027年7月に50万円。'}</p>
        ${endure && allPaid ? '<button class="btn sm" id="toNormal">未払いがなくなった。通常モードへ</button>' : ''}</div>
      <div class="sec"><h3><small>TODAY</small>今日使える額</h3>
        <div class="big"><b>${m.set ? yen(m.perDay) : '—'}</b><small>給料日（${D.md(m.payday)}）まで ${m.days}日</small></div>
        <div class="rows"><div class="row"><span>手元（記録から計算）</span><em>${m.set ? yen(m.left) : '未設定'}</em><button class="mini-b" id="cashSet">財布に合わせる</button></div>
        ${m.before.length ? `<div class="row"><span>給料日より前の引き落とし</span><em>−${yen(m.beforeSum)}</em></div>` : ''}
        <div class="row"><span>今日使った</span><em>${yen(m.outToday)}</em><button class="mini-b" id="outAdd">支出を入れる</button></div></div>
        ${outs.length ? `<div class="rows sub">${outs.map(r => `<div class="row"><span>${esc(r.text)}</span><em>${r.kind === 'in' ? '+' : '−'}${yen(r.amt)}</em><button class="del" data-rm="${r.id}">✕</button></div>`).join('')}</div>` : ''}</div>
      <div class="sec"><h3><small>UNPAID</small>未払い<button class="add" id="unAdd">＋</button></h3>
        <div class="rows">${mo.unpaid.length ? mo.unpaid.slice().sort((a, b) => a.done - b.done).map(u => `<div class="row x${u.done ? ' done' : ''}" data-un="${u.id}"><button class="ck${u.done ? ' on' : ''}"></button><span>${esc(u.name)}</span><em>${yen(u.amt)}</em>${u.done ? `<small>${D.md(u.doneAt.slice(0, 10))} 完了</small>` : ''}<button class="del" data-undel="${u.id}">✕</button></div>`).join('') : '<p class="mini">未払いはありません。</p>'}</div>
        <p class="mini">期限はありません。払ったらチェックで完了です。</p></div>
      <div class="sec"><h3><small>PAYDAY FLOW</small>${D.md(m.payday)}の流れ</h3>
        <div class="flow">
          <div><span>手取り</span><b>${yen(f.take)}</b></div>
          <div><span>固定費（${mo.fixed.map(x => esc(x.name)).join('・')}）</span><b>−${yen(f.fixed)}</b></div>
          ${f.unpaid ? `<div class="hot"><span>未払いを払う</span><b>−${yen(f.unpaid)}</b></div>` : ''}
          <div><span>なぜか消えるお金（見込み）</span><b>−${yen(f.leak)}</b></div>
          ${f.save ? `<div><span>貯金を先に取り分ける</span><b>−${yen(f.save)}</b></div>` : ''}
          <div class="sum"><span>次の1か月で使える</span><b>${yen(f.rest)}</b></div>
          <div class="sum2"><span>1日あたり</span><b>${yen(f.perDay)}</b></div></div>
        <div class="rows">${mo.fixed.map(x => `<div class="row" data-fx="${x.id}"><span>${esc(x.name)}</span><em>毎月${x.day}日 ${yen(x.amt)}</em><button class="mini-b" data-fxedit="${x.id}">直す</button></div>`).join('')}</div>
        <button class="link" id="fxAdd">＋ 固定費を足す</button>　<button class="link" id="baseEdit">手取り・給料日を直す</button></div>
      <div class="sec"><h3><small>LEAK</small>なぜか消えたお金</h3>
        <div class="nums3"><div><small>今週</small><b>${yen(Data.leakWeek())}</b></div><div><small>今月</small><b>${yen(Data.leakMonth())}</b></div><div><small>見込み/月</small><b>${yen(mo.leak)}</b></div></div>
        <p class="mini">財布に合わせたとき、記録より少なかった分がここに入ります。使ったら一言（「コンビニ800」など）で入れると、消える分が減っていきます。</p>
        <button class="btn w" id="vaultGo">金庫を開く（月額・課金の見直し）</button></div>
      <div class="sec"><h3><small>SAVINGS</small>貯金 ${endure ? '<span class="mini">耐えるモードの間は待機</span>' : ''}</h3>
        <div class="goal"><div class="gbar"><i style="--w:${Math.round(g.pct * 100)}%"></i></div><p><b>${yen(g.saved)}</b> / ${yen(g.amt)}（${ymJ(g.to)}まで）</p>
        <p class="mini">${g.started ? `残り${g.months}か月。毎月 ${yen(g.monthly)} ずつ。` : `${ymJ(g.from)}から開始。毎月 ${yen(g.monthly)} ずつ。`}</p>
        <button class="btn sm" id="saveAdd">貯金に入れる</button></div></div>
      <div class="sec"><h3><small>WISH LIST</small>買いたいもの<button class="add" id="wantAdd">＋</button></h3>
        <div class="rows">${mo.wants.length ? mo.wants.map(w => `<div class="row"><span>${'★'.repeat(w.prio || 1)} ${esc(w.name)}</span><em>${w.price ? yen(w.price) : ''}</em>${endure ? '<small>待ち</small>' : ''}<button class="del" data-wdel="${w.id}">✕</button></div>`).join('') : '<p class="mini">まだありません。</p>'}</div></div>
      <button class="link" id="modeSw">${endure ? '（手動で通常モードにする）' : '（耐えるモードに戻す）'}</button>`;
  }

  async function addMoney(kind) {
    const v = await form(kind === 'in' ? '入金を入れる' : '支出を入れる', [{ k:'text', label:'なにに', ph:'コンビニ' }, { k:'amt', label:'金額（円）', type:'number' }]);
    if (v && v.amt) await Data.add({ domain:'money', kind, text:v.text || (kind === 'in' ? '入金' : '支出'), amt:v.amt });
  }

  function bind() {
    $('panelBody').addEventListener('click', async e => {
      if (App.tab() !== 'bank') return;
      const id = e.target.id, m = Data.money();
      if (id === 'cashSet') {
        const v = await form('財布に合わせる', [{ k:'amt', label:'今の手元（財布と、使っていい口座の合計）', type:'number' }]);
        if (v && v.amt != null) { const diff = await Data.setCash(v.amt); if (diff > 0) Talk.open('bank', { first:`記録より${yen(diff)}少ないね。……どこで使ったか、思い出せたら教えて。責めてないから。`, face:'worry' }); else toast('合わせました'); }
        return;
      }
      if (id === 'outAdd') return addMoney('out');
      if (id === 'unAdd') { const v = await form('未払いを足す', [{ k:'name', label:'なにの', ph:'家賃（1か月分）' }, { k:'amt', label:'金額（円）', type:'number' }]); if (v && v.name) { m.unpaid.push({ id:uid(), name:v.name, amt:v.amt || 0, done:false, at:new Date().toISOString() }); await Data.saveMoney(); } return; }
      const un = e.target.closest('[data-un] .ck'); if (un) {
        const uidv = un.closest('[data-un]').dataset.un; await Data.payUnpaid(uidv); Sound.se('coin'); haptic();
        const u = m.unpaid.find(x => x.id === uidv);
        if (u && u.done) { const left = m.unpaid.filter(x => !x.done).length; Talk.open('bank', { first:left ? `「${u.name}」、完了。……よくがんばった。あと${left}件ね。` : `「${u.name}」、完了。未払い、ぜんぶなくなったよ。……ほんとに、えらい。`, face:'smile' }); }
        return;
      }
      const ud = e.target.closest('[data-undel]'); if (ud) { if (await ask('この未払いを消しますか？', '消す', 'やめる')) { m.unpaid = m.unpaid.filter(x => x.id !== ud.dataset.undel); await Data.saveMoney(); } return; }
      const fe = e.target.closest('[data-fxedit]'); if (fe) {
        const x = m.fixed.find(f => f.id === fe.dataset.fxedit);
        const v = await form('固定費を直す', [{ k:'name', label:'名前', value:x.name }, { k:'day', label:'引き落とし日', type:'number', value:x.day }, { k:'amt', label:'金額（円）', type:'number', value:x.amt }], '保存', '<button class="link danger" data-v="0" id="fxDel">この固定費を消す</button>');
        if (v) { Object.assign(x, { name:v.name || x.name, day:clamp(v.day || 25, 1, 31), amt:v.amt || 0 }); await Data.saveMoney(); }
        return;
      }
      if (id === 'fxAdd') { const v = await form('固定費を足す', [{ k:'name', label:'名前', ph:'サブスク' }, { k:'day', label:'引き落とし日', type:'number', value:25 }, { k:'amt', label:'金額（円）', type:'number' }]); if (v && v.name) { m.fixed.push({ id:uid(), name:v.name, day:clamp(v.day || 25, 1, 31), amt:v.amt || 0 }); await Data.saveMoney(); } return; }
      if (id === 'baseEdit') { const v = await form('手取り・給料日', [{ k:'takehome', label:'毎月の手取り（円）', type:'number', value:m.takehome }, { k:'payday', label:'給料日', type:'number', value:m.payday }, { k:'leak', label:'なぜか消えるお金の見込み（円/月）', type:'number', value:m.leak }]); if (v) { Object.assign(m, { takehome:v.takehome || 0, payday:clamp(v.payday || 25, 1, 31), leak:v.leak || 0 }); await Data.saveMoney(); } return; }
      if (id === 'saveAdd') { const v = await form('貯金に入れる', [{ k:'amt', label:'金額（円）', type:'number' }]); if (v && v.amt) { await Data.addSaving(v.amt); Sound.se('coin'); Talk.open('bank', { first:`${yen(v.amt)}、貯金に入れたよ。……ふたりのぶん、ちゃんと増えてる。`, face:'shy' }); } return; }
      if (id === 'wantAdd') { const v = await form('買いたいもの', [{ k:'name', label:'なに' }, { k:'price', label:'値段（円）', type:'number' }, { k:'prio', label:'どれくらい欲しい', type:'select', options:[['3', '★★★ すごく'], ['2', '★★ わりと'], ['1', '★ いつか']], value:'2' }]); if (v && v.name) { m.wants.push({ id:uid(), name:v.name, price:v.price || 0, prio:+v.prio, at:new Date().toISOString() }); await Data.saveMoney(); } return; }
      const wd = e.target.closest('[data-wdel]'); if (wd) { m.wants = m.wants.filter(x => x.id !== wd.dataset.wdel); await Data.saveMoney(); return; }
      const rm = e.target.closest('[data-rm]'); if (rm) return Data.remove(rm.dataset.rm);
      if (id === 'toNormal' || id === 'modeSw') {
        const to = m.mode === 'endure' ? 'normal' : 'endure';
        if (await ask(to === 'normal' ? '通常モードに切り替えますか？ 貯金の取り分けが始まります。' : '耐えるモードに戻しますか？', '切り替える', 'やめる')) { m.mode = to; await Data.saveMoney(); if (to === 'normal') Talk.open('bank', { first:'通常モード、スタート。……ここからは、貯める番だね。', face:'smile' }); }
        return;
      }
      if (id === 'vaultGo') return Vault.open();
    });
    // 固定費を消す（フォームの中のボタン）
    document.addEventListener('click', async e => {
      if (e.target.id !== 'fxDel') return;
      const box = e.target.closest('.ask-in'), name = box && box.querySelector('input') && box.querySelector('input').value;
      const m = Data.money(); m.fixed = m.fixed.filter(f => f.name !== name); await Data.saveMoney(); toast('消しました');
    }, true);
  }
  return { bind, peek, render };
})();
