// Life Partner — ホーム（部屋着の乃亜。ロック画面ふうの日付・時計・天気と、各タブの要点）
'use strict';
const Home = (() => {
  let tick = 0;
  const WD = '日月火水木金土';
  function clock() {
    const d = new Date();
    $('hmDate').textContent = `${d.getMonth() + 1}月${d.getDate()}日 ${WD[d.getDay()]}曜日`;
    $('hmTime').innerHTML = `${p2(d.getHours())}:${p2(d.getMinutes())}<small>:${p2(d.getSeconds())}</small>`;
  }
  function weather() {
    const w = Data.weather();
    $('hmWx').innerHTML = w ? `<span class="wi">${Data.wIcon(w.code)}</span>${w.now}℃<small>${esc(w.area)}　${w.days[0].min}〜${w.days[0].max}℃・☂${w.days[0].rain}%</small>` : '<small>天気を読み込み中…</small>';
  }
  function start() { clearInterval(tick); clock(); weather(); tick = setInterval(clock, 1000); }

  function peek() {
    const m = Data.moneyNow(), p = Data.nextPlan();
    return `<span>今日使える <b>${m.set ? yen(m.perDay) : '—'}</b></span><span>${p ? `次：${D.label(p.date)}${p.time ? ' ' + p.time : ''} ${esc(p.text)}` : '予定なし'}</span>`;
  }

  async function render(el) {
    const m = Data.moneyNow(), p = Data.nextPlan(), td = Data.todos(), c = await Data.chk(D.today()), st = await Data.stDaily(), sl = Data.sleepH(c);
    const al = await Data.alerts(), stale = Data.stale(99).length, w = Data.weather();
    el.innerHTML = `
      ${al.map(a => `<div class="alert hud" data-al="${a.id}" data-go="${a.tab}">${Face.img(a.f, 'sm')}<p>${esc(a.text)}</p><button class="x" data-seen="${a.id}">✕</button></div>`).join('')}
      <div class="sec"><h3><small>BRIEFING</small>乃亜から</h3><div id="hmBrief" class="brief">${Face.img('normal', 'sm')}<div class="bt"><span class="dots"><i></i><i></i><i></i></span></div></div></div>
      <div class="sec"><h3><small>STATUS</small>各タブの要点</h3>
        <div class="rows">
          <button class="row go" data-go="desk"><i class="tb desk">秘書室</i><span>${p ? `${D.label(p.date)}${p.time ? ' ' + p.time : ''} ${esc(p.text)}` : '予定なし'}</span><em>やること${td.length}</em></button>
          <button class="row go" data-go="clinic"><i class="tb clinic">診療所</i><span>${sl != null ? `睡眠 ${sl}時間` : '睡眠：未入力'}</span><em>${st ? 'チェック済' : 'チェックまだ'}</em></button>
          <button class="row go" data-go="bank"><i class="tb bank">銀行</i><span>今日使える ${m.set ? yen(m.perDay) : '—'}</span><em>${m.unpaid.length ? `未払い${m.unpaid.length}` : `給料日まで${m.days}日`}</em></button>
          <button class="row go" data-go="room"><i class="tb room">自室</i><span>生活データベース ${Data.life().length}件</span><em>見直し${stale}</em></button>
        </div></div>
      ${w ? `<div class="sec"><h3><small>WEATHER</small>天気</h3><div class="wx3">${w.days.map((d, i) => `<div><b>${['今日', '明日', 'あさって'][i]}</b><span class="wi">${Data.wIcon(d.code)}</span><em>${d.min}〜${d.max}℃</em><small>☂${d.rain}%</small></div>`).join('')}</div></div>` : ''}`;
    brief();
  }

  // 乃亜のブリーフィング（朝・昼・夜で1回ずつ。AIがなければ手元で作る）
  function localBrief() {
    const m = Data.moneyNow(), p = Data.nextPlan(), td = Data.todos(), w = Data.weather(), per = D.period(), out = [];
    if (per === 'am') { if (p && p.date === D.today()) out.push(`今日は${p.time ? p.time + 'から' : ''}「${p.text}」。`); if (w) out.push(`最高${w.days[0].max}℃${w.days[0].rain >= 50 ? '、傘いるよ' : ''}。`); }
    if (m.set) out.push(`今日使えるのは${yen(m.perDay)}まで。`);
    if (td.length) out.push(`やることは${td.length}つ。まず「${td[0].text}」から。`);
    if (per === 'night') out.push('今日もおつかれ。……ちゃんと寝てね。');
    return { intro:Noa.hello()[0], lines:out.slice(0, 3), face:Noa.hello()[1] };
  }
  async function brief() {
    const box = $('hmBrief'); if (!box) return;
    const k = `brief:${D.today()}:${D.period()}`;
    let b = await DB.get(k);
    if (!b && Api.ready()) { b = await Api.call('brief', { period:D.period(), snap:Data.snapshot(), ctx:Data.context(['habit', 'bed', 'clothes'], ['plan', 'todo'], 6) }, { retry:1, timeout:25000 }); if (b && b.lines) await DB.set(k, b); }
    if (!b || !b.lines) b = localBrief();
    if (!$('hmBrief')) return;
    $('hmBrief').innerHTML = `${Face.img(b.face || 'normal', 'sm')}<div class="bt"><b>${esc(b.intro || '')}</b>${(b.lines || []).map(l => `<p>${esc(l)}</p>`).join('')}</div>`;
  }

  function bind() {
    $('panelBody').addEventListener('click', async e => {
      if (App.tab() !== 'home') return;
      const s = e.target.closest('[data-seen]'); if (s) { e.stopPropagation(); await Data.seeAlert(s.dataset.seen); s.closest('.alert').remove(); return; }
      const g = e.target.closest('[data-go]'); if (g) App.go(g.dataset.go, true);
    });
  }
  return { bind, start, peek, render, weather };
})();
