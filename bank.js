// Life Partner — 銀行（専属の銀行担当の乃亜。通帳と明細。耐えるモード → 通常モード）
'use strict';
const Bank = (() => {
  const ymJ = k => `${k.slice(0, 4)}年${+k.slice(5, 7)}月`;
  const n = v => Math.round(v || 0).toLocaleString();
  function peek() {
    const m = Data.moneyNow();
    return `<span class="k">今日使える</span><b class="v">${m.set ? yen(m.perDay) : '—'}</b><span class="s">${m.unpaid.length ? `未払い ${m.unpaid.length}件` : `給料日まで ${m.days}日`}</span>`;
  }
  // 通帳の行（財布に合わせた時点から、残高を積み上げる）
  function ledger() {
    const mo = Data.money(); if (!mo.cash) return [];
    let bal = mo.cash.amt;
    const rows = [{ date:mo.cash.at.slice(0, 10), memo:'手元に合わせ', out:null, inn:null, bal, id:null }];
    Data.of('money').filter(r => r.at > mo.cash.at && r.amt && r.kind !== 'cash').sort((a, b) => a.at.localeCompare(b.at)).forEach(r => {
      const plus = r.kind === 'in'; bal += plus ? r.amt : -r.amt;
      rows.push({ date:r.date, memo:r.text.replace(/（.*?）/g, ''), out:plus ? null : r.amt, inn:plus ? r.amt : null, bal, id:r.id });
    });
    return rows.slice(-12);
  }

  async function render(el) {
    const m = Data.moneyNow(), mo = Data.money(), endure = m.mode === 'endure', g = m.goal, f = m.flow, p = Data.profile();
    const rows = ledger();
    el.innerHTML = `
      <div class="pb-cover">${Deco.tape('tr')}<small>LIFE PARTNER BANK</small><b>普通預金通帳</b><span>${esc(p.name || 'ようへい')} 様</span>
        <i class="pb-mode ${endure ? 'endure' : 'normal'}">${endure ? '耐えるモード' : '通常モード'}</i></div>
      <div class="atm"><small>本日ご利用いただける金額</small><b id="atmNum"></b><span>給料日 ${D.md(m.payday)} まで　あと ${m.days} 日</span>
        <div class="atm-b"><button id="cashSet">財布に合わせる</button><button id="outAdd">支出を入れる</button><button id="saveAdd">貯金に入れる</button></div></div>
      ${endure && !m.unpaid.length ? '<button class="pb-next" id="toNormal">未払いがなくなりました。通常モードへ</button>' : ''}
      <section class="pb-sec"><h4>お取引明細</h4>
        ${rows.length ? `<table class="ledger"><tr><th>日付</th><th>摘要</th><th>お支払</th><th>お預り</th><th>残高</th></tr>
        ${rows.map(r => `<tr ${r.id ? `data-tx="${r.id}"` : ''}><td>${r.date.slice(5).replace('-', '/')}</td><td>${esc(r.memo)}</td><td>${r.out ? n(r.out) : ''}</td><td>${r.inn ? n(r.inn) : ''}</td><td class="${r.bal < 0 ? 'neg' : ''}">${n(r.bal)}</td></tr>`).join('')}</table>
        <p class="mini">行をタップすると、その記録を消せます。</p>` : '<p class="mini">まだ記録がありません。「財布に合わせる」から始めてください。</p>'}</section>
      <section class="pb-sec"><h4>未払い<button class="pb-add" id="unAdd">追加</button></h4>
        ${mo.unpaid.length ? mo.unpaid.slice().sort((a, b) => a.done - b.done).map(u => `<div class="bill${u.done ? ' paid' : ''}" data-un="${u.id}"><div><b>${esc(u.name)}</b><small>${u.done ? `${D.md(u.doneAt.slice(0, 10))} お支払い済み` : '期限なし　払ったらタップ'}</small></div><em>${yen(u.amt)}</em>${u.done ? Stamp('済', 'in red') : '<span class="bill-mi">未</span>'}</div>`).join('') : '<p class="mini">未払いはありません。</p>'}</section>
      <section class="pb-sec"><h4>${D.md(m.payday)} のお給料日明細</h4>
        <table class="slip">
          <tr><td>お振込み（手取り）</td><td>${n(f.take)}</td></tr>
          ${mo.fixed.map(x => `<tr class="tap" data-fx="${x.id}"><td>　${esc(x.name)}　<small>毎月${x.day}日</small></td><td>−${n(x.amt)}</td></tr>`).join('')}
          ${f.unpaid ? `<tr class="hot"><td>　未払いのお支払い</td><td>−${n(f.unpaid)}</td></tr>` : ''}
          <tr><td>　なぜか消えるお金（見込み）</td><td>−${n(f.leak)}</td></tr>
          ${f.save ? `<tr><td>　貯金の取り分け</td><td>−${n(f.save)}</td></tr>` : ''}
          <tr class="sum"><td>次の1か月で使える</td><td>${n(f.rest)}</td></tr>
          <tr class="sum2"><td>1日あたり</td><td>${n(f.perDay)}</td></tr></table>
        <div class="pb-links"><button id="fxAdd">固定費を足す</button><button id="baseEdit">手取り・給料日を直す</button></div></section>
      <section class="pb-sec"><h4>なぜか消えたお金</h4>
        <div class="pb-3"><div><small>今週</small><b>${yen(Data.leakWeek())}</b></div><div><small>今月</small><b>${yen(Data.leakMonth())}</b></div><div><small>見込み／月</small><b>${yen(mo.leak)}</b></div></div>
        <p class="mini">財布に合わせたとき、記録より少なかった分がここに入ります。使ったら一言（「コンビニ800」など）で入れると減っていきます。</p>
        <button class="pb-vault" id="vaultGo"><b>貸金庫を開く</b><small>ID・パスワードと、月額・課金の見直し</small></button></section>
      <section class="pb-sec"><h4>定期預金（貯金）${endure ? '<small>耐えるモードの間はお休み</small>' : ''}</h4>
        <div class="goal"><div class="gbar"><i style="--w:${Math.round(g.pct * 100)}%"></i></div>
        <p><b>${yen(g.saved)}</b>　/ ${yen(g.amt)}　${ymJ(g.to)}まで</p><p class="mini">${g.started ? `残り${g.months}か月。毎月 ${yen(g.monthly)} ずつ。` : `${ymJ(g.from)}から開始。毎月 ${yen(g.monthly)} ずつ。`}</p></div></section>
      <section class="pb-sec"><h4>買いたいもの<button class="pb-add" id="wantAdd">追加</button></h4>
        ${mo.wants.length ? mo.wants.slice().sort((a, b) => (b.prio || 1) - (a.prio || 1)).map(w => `<div class="want tap" data-want="${w.id}"><i class="prio p${w.prio || 1}"><b></b><b></b><b></b></i><span>${esc(w.name)}</span><em>${w.price ? yen(w.price) : ''}</em>${endure ? '<small>待ち</small>' : ''}</div>`).join('') : '<p class="mini">まだありません。</p>'}</section>
      <button class="pb-mode-sw" id="modeSw">${endure ? '手動で通常モードにする' : '耐えるモードに戻す'}</button>`;
    setTimeout(() => printNum($('atmNum'), m.set ? yen(m.perDay) : '—'), 250);
  }

  async function addMoney(kind) {
    const v = await form(kind === 'in' ? '入金を入れる' : '支出を入れる', [{ k:'text', label:'なにに', ph:'コンビニ' }, { k:'amt', label:'金額（円）', type:'number' }]);
    if (v && v.amt) await Data.add({ domain:'money', kind, text:v.text || (kind === 'in' ? '入金' : '支出'), amt:v.amt });
  }

  function bind() {
    $('panelBody').addEventListener('click', async e => {
      if (App.tab() !== 'bank') return;
      const id = (e.target.closest('[id]') || {}).id, m = Data.money();
      if (id === 'cashSet') {
        const v = await form('財布に合わせる', [{ k:'amt', label:'今の手元（財布と、使っていい口座の合計）', type:'number' }]);
        if (v && v.amt != null) { const diff = await Data.setCash(v.amt); if (diff > 0) Talk.open('bank', { first:`記録より${yen(diff)}少ないね。……どこで使ったか、思い出せたら教えて。責めてないから。`, face:'worry' }); else toast('手元に合わせました'); }
        return;
      }
      if (id === 'outAdd') return addMoney('out');
      if (id === 'saveAdd') { const v = await form('貯金に入れる', [{ k:'amt', label:'金額（円）', type:'number' }]); if (v && v.amt) { await Data.addSaving(v.amt); Sound.se('coin'); Talk.open('bank', { first:`${yen(v.amt)}、貯金に入れたよ。……ふたりのぶん、ちゃんと増えてる。`, face:'shy' }); } return; }
      if (id === 'unAdd') { const v = await form('未払いを足す', [{ k:'name', label:'なにの', ph:'家賃（1か月分）' }, { k:'amt', label:'金額（円）', type:'number' }]); if (v && v.name) { m.unpaid.push({ id:uid(), name:v.name, amt:v.amt || 0, done:false, at:new Date().toISOString() }); await Data.saveMoney(); } return; }
      const un = e.target.closest('[data-un]'); if (un) {
        const u = m.unpaid.find(x => x.id === un.dataset.un);
        if (!u.done) {
          if (!(await ask(`「${u.name}」${yen(u.amt)}を、お支払い済みにしますか？`, '払った', 'まだ', 'normal'))) return;
          await Data.payUnpaid(u.id); Sound.se('coin'); haptic();
          const left = m.unpaid.filter(x => !x.done).length;
          Talk.open('bank', { first:left ? `「${u.name}」、完了。……よくがんばった。あと${left}件ね。` : `「${u.name}」、完了。未払い、ぜんぶなくなったよ。……ほんとに、えらい。`, face:'happy' });
        } else menu(u.name, [{ label:'まだ払っていないに戻す', fn:() => Data.payUnpaid(u.id) }, { label:'この未払いを消す', danger:true, fn:async () => { m.unpaid = m.unpaid.filter(x => x.id !== u.id); await Data.saveMoney(); } }]);
        return;
      }
      const tx = e.target.closest('[data-tx]'); if (tx) { const r = Data.get(tx.dataset.tx); if (r) menu(`${r.text}　${yen(r.amt)}`, [{ label:'この記録を消す', danger:true, fn:async () => { const c = Object.assign({}, r); await Data.remove(r.id); toast('消しました', 4000, { label:'元に戻す', fn:() => Data.add(c) }); } }]); return; }
      const fx = e.target.closest('[data-fx]'); if (fx) {
        const x = m.fixed.find(f => f.id === fx.dataset.fx);
        const v = await form('固定費を直す', [{ k:'name', label:'名前', value:x.name }, { k:'day', label:'引き落とし日', type:'number', value:x.day }, { k:'amt', label:'金額（円）', type:'number', value:x.amt }], '保存', { del:'この固定費を消す' });
        if (v && v._del) { m.fixed = m.fixed.filter(f => f.id !== x.id); await Data.saveMoney(); toast('消しました'); }
        else if (v) { Object.assign(x, { name:v.name || x.name, day:clamp(v.day || 25, 1, 31), amt:v.amt || 0 }); await Data.saveMoney(); }
        return;
      }
      if (id === 'fxAdd') { const v = await form('固定費を足す', [{ k:'name', label:'名前', ph:'サブスク' }, { k:'day', label:'引き落とし日', type:'number', value:25 }, { k:'amt', label:'金額（円）', type:'number' }]); if (v && v.name) { m.fixed.push({ id:uid(), name:v.name, day:clamp(v.day || 25, 1, 31), amt:v.amt || 0 }); await Data.saveMoney(); } return; }
      if (id === 'baseEdit') { const v = await form('手取り・給料日', [{ k:'takehome', label:'毎月の手取り（円）', type:'number', value:m.takehome }, { k:'payday', label:'給料日', type:'number', value:m.payday }, { k:'leak', label:'なぜか消えるお金の見込み（円／月）', type:'number', value:m.leak }]); if (v) { Object.assign(m, { takehome:v.takehome || 0, payday:clamp(v.payday || 25, 1, 31), leak:v.leak || 0 }); await Data.saveMoney(); } return; }
      if (id === 'wantAdd') { const v = await form('買いたいもの', [{ k:'name', label:'なに' }, { k:'price', label:'値段（円）', type:'number' }, { k:'prio', label:'どれくらい欲しい', type:'select', options:[['3', 'すごく'], ['2', 'わりと'], ['1', 'いつか']], value:'2' }]); if (v && v.name) { m.wants.push({ id:uid(), name:v.name, price:v.price || 0, prio:+v.prio, at:new Date().toISOString() }); await Data.saveMoney(); } return; }
      const wd = e.target.closest('[data-want]'); if (wd) { const w = m.wants.find(x => x.id === wd.dataset.want); menu(w.name, [{ label:'買えた・もういらない（消す）', danger:true, fn:async () => { m.wants = m.wants.filter(x => x.id !== w.id); await Data.saveMoney(); } }]); return; }
      if (id === 'toNormal' || id === 'modeSw') {
        const to = m.mode === 'endure' ? 'normal' : 'endure';
        if (await ask(to === 'normal' ? '通常モードに切り替えますか？ 貯金の取り分けが始まります。' : '耐えるモードに戻しますか？', '切り替える', 'やめる')) { m.mode = to; await Data.saveMoney(); if (to === 'normal') Talk.open('bank', { first:'通常モード、スタート。……ここからは、貯める番だね。', face:'smile' }); }
        return;
      }
      if (id === 'vaultGo') return Vault.open();
    });
  }
  return { bind, peek, render };
})();
