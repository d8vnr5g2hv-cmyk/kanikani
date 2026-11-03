// Life Partner — ホーム（部屋着の乃亜。ロック画面と、各タブの要点）
'use strict';
const Home = (() => {
  let tick = 0;
  const WD = '日月火水木金土';
  function clock() {
    const d = new Date();
    $('hmDate').textContent = `${d.getMonth() + 1}月${d.getDate()}日 ${WD[d.getDay()]}曜日`;
    $('hmTime').innerHTML = `${p2(d.getHours())}<i>:</i>${p2(d.getMinutes())}<small>${p2(d.getSeconds())}</small>`;
  }
  function weather() {
    const w = Data.weather();
    $('hmWx').innerHTML = w ? `${wxIcon(w.code)}<b>${w.now}°</b><span>${esc(w.area)}　${w.days[0].min}° / ${w.days[0].max}°　降水 ${w.days[0].rain}%</span>` : '';
  }
  function start() { clearInterval(tick); clock(); tick = setInterval(clock, 1000); Data.onChange(k => { if (k === 'weather' || k === 'all') weather(); }); weather(); }

  function peek() {
    const m = Data.moneyNow(), p = Data.nextPlan();
    return `<span class="k">今日使える</span><b class="v">${m.set ? yen(m.perDay) : '—'}</b><span class="s">${p ? `${D.label(p.date)}${p.time ? ' ' + p.time : ''}　${esc(p.text)}` : '予定なし'}</span>`;
  }

  async function render(el) {
    const m = Data.moneyNow(), p = Data.nextPlan(), td = Data.todos(), c = await Data.chk(D.today()), st = await Data.stDaily(), sl = Data.sleepH(c);
    const al = await Data.alerts(), stale = Data.stale(99).length, w = Data.weather();
    el.innerHTML = `
      <div class="hm-brief" id="hmBrief">${Face.img('normal', 'md')}<div class="bt"><span class="dots"><i></i><i></i><i></i></span></div></div>
      ${al.length ? `<div class="hm-al">${al.map(a => `<div class="al tap" data-go="${a.tab}">${Face.img(a.f, 'sm')}<p>${esc(a.text)}</p><button class="x" data-seen="${a.id}">${IC('x')}</button></div>`).join('')}</div>` : ''}
      <h3 class="hd">各タブの要点</h3>
      <div class="hm-grid">
        <button class="hm-t" data-go="desk"><small>秘書室</small><b>${td.length}<i>件</i></b><span>${p ? `${D.label(p.date)} ${esc(p.text)}` : '予定なし'}</span></button>
        <button class="hm-t" data-go="clinic"><small>診療所</small><b>${sl != null ? sl : '—'}<i>時間</i></b><span>${st ? `今日のチェック ${st.sum}/12` : '今日のチェックまだ'}</span></button>
        <button class="hm-t" data-go="bank"><small>銀行</small><b>${m.set ? yen(m.perDay) : '—'}</b><span>${m.unpaid.length ? `未払い ${m.unpaid.length}件` : `給料日まで ${m.days}日`}</span></button>
        <button class="hm-t" data-go="room"><small>自室</small><b>${Data.life().length}<i>件</i></b><span>見直し ${stale}件</span></button>
      </div>
      ${w ? `<h3 class="hd">天気　<small>${esc(w.area)}</small></h3><div class="hm-wx">${w.days.map((d, i) => `<div>${wxIcon(d.code)}<b>${['今日', '明日', 'あさって'][i]}</b><span>${d.min}° / ${d.max}°</span><small>降水 ${d.rain}%</small></div>`).join('')}</div>` : ''}`;
    brief();
  }
  function localBrief() {
    const m = Data.moneyNow(), p = Data.nextPlan(), td = Data.todos(), w = Data.weather(), per = D.period(), out = [];
    if (per === 'am') { if (p && p.date === D.today()) out.push(`今日は${p.time ? p.time + 'から' : ''}「${p.text}」。`); if (w) out.push(`最高${w.days[0].max}度${w.days[0].rain >= 50 ? '。傘いるよ' : ''}。`); }
    if (m.set) out.push(`今日使えるのは${yen(m.perDay)}まで。`);
    if (td.length) out.push(`やることは${td.length}つ。まず「${td[0].text}」から。`);
    if (per === 'night') out.push('今日もおつかれ。……ちゃんと寝てね。');
    return { lines:out.slice(0, 3), face:'normal' };
  }
  async function brief() {
    const k = `brief:${D.today()}:${D.period()}`;
    let b = await DB.get(k);
    if (!b && Api.ready()) { b = await Api.call('brief', { period:D.period(), snap:Data.snapshot(), ctx:Data.context(['habit', 'bed', 'clothes'], ['plan', 'todo'], 6) }, { retry:1, timeout:25000 }); if (b && b.lines) await DB.set(k, b); }
    if (!b || !b.lines) b = localBrief();
    const box = $('hmBrief'); if (!box) return;
    box.innerHTML = `${Face.img(b.face || 'normal', 'md')}<div class="bt">${b.intro ? `<b>${esc(b.intro)}</b>` : ''}${(b.lines || []).map(l => `<p>${esc(l)}</p>`).join('')}</div>`;
  }

  function bind() {
    $('panelBody').addEventListener('click', async e => {
      if (App.tab() !== 'home') return;
      const s = e.target.closest('[data-seen]'); if (s) { e.stopPropagation(); await Data.seeAlert(s.dataset.seen); s.closest('.al').remove(); return; }
      const g = e.target.closest('[data-go]'); if (g) App.go(g.dataset.go, true);
    });
  }
  return { bind, start, peek, render, weather };
})();
