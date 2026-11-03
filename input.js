// Life Partner — 一言入力（＋）と、乃亜の復唱。どこから入れても同じ記録に入る
'use strict';
const Input = (() => {
  let hint = '', busy = false, last = [];
  const HINT = { desk:'todo', clinic:'health', bank:'money', room:'idea', home:'' };

  // ===== AIがないときの簡易の振り分け =====
  const z2h = s => String(s).replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  const toNum = s => Number(z2h(s).replace(/[,，]/g, ''));
  function amountOf(t) {
    const z = z2h(t);
    let m = z.match(/([0-9][0-9,.]*)\s*(万|千)?\s*円/) || z.match(/([0-9][0-9,.]*)\s*(万|千)/);
    if (m) { let n = toNum(m[1]); if (m[2] === '万') n *= 10000; if (m[2] === '千') n *= 1000; return Math.round(n) || null; }
    const all = [...z.matchAll(/(^|[^0-9\/:：])([0-9][0-9,]*)(?![0-9,]*\s*(時|日|月|分|半|曜|回|:|：|\/|人|個|件|本|缶|杯|h|時間))/g)].map(x => toNum(x[2])).filter(n => n >= 50);
    return all.length ? all[all.length - 1] : null;
  }
  function dateOf(t) {
    const td = D.today(); t = z2h(t);
    if (/あさって/.test(t)) return D.add(td, 2);
    if (/明日|あした/.test(t)) return D.add(td, 1);
    if (/今日|きょう|今夜/.test(t)) return td;
    let m = t.match(/(\d{1,2})[\/月](\d{1,2})日?/);
    if (m) { const y = new Date().getFullYear(); let k = `${y}-${p2(+m[1])}-${p2(+m[2])}`; if (k < D.add(td, -30)) k = `${y + 1}-${p2(+m[1])}-${p2(+m[2])}`; return k; }
    m = t.match(/(月|火|水|木|金|土|日)曜/);
    if (m) { const w = '日月火水木金土'.indexOf(m[1]); if (/来週/.test(t)) return D.add(D.week(td), 7 + (w + 6) % 7); const n = (w - D.parse(td).getDay() + 7) % 7; return D.add(td, n || 7); }
    return null;
  }
  function timeOf(t) { const m = z2h(t).match(/(\d{1,2})\s*(?::|：|時)\s*(\d{2})?(半)?/); if (!m || +m[1] > 29) return ''; return `${p2(+m[1])}:${m[3] ? '30' : p2(+(m[2] || 0))}`; }
  const strip = t => t.replace(/今日|明日|あさって|(\d{1,2})[\/月](\d{1,2})日?|来週|(月|火|水|木|金|土|日)曜日?|\d{1,2}\s*(?::|：|時)\s*(\d{2})?半?(から)?/g, '').trim();
  function parseLocal(text) {
    let t = text.trim();
    const us = Data.usuals();
    if (/いつもの/.test(t) && us.length) t = t.replace(/いつもの/, us[0].text);
    const amt = amountOf(t), date = dateOf(t), time = timeOf(t), items = [], work = /仕事|会社|セミナー|資料|上司/.test(t);
    if (/財布|手元|残高|残り/.test(t) && amt != null) return { items:[{ domain:'money', kind:'cash', text:`手元 ${yen(amt)}`, amt }], echo:`手元${yen(amt)}ね。合わせといた。`, face:'normal' };
    if (/貯金/.test(t) && amt) return { items:[{ domain:'money', kind:'save', text:'貯金', amt }], echo:`${yen(amt)}、貯金に入れたよ。……えらいじゃん。`, face:'smile' };
    if (/滞納|未払い/.test(t) && amt) return { items:[{ domain:'money', kind:'unpaid', text:t.replace(/滞納|未払い|[0-9０-９,，]+\s*(万|千)?\s*円?/g, '').trim() || '未払い', amt }], echo:'未払いに入れた。払えたら、銀行でチェックしてね。', face:'normal' };
    if (/欲しい|ほしい|買いたい/.test(t)) return { items:[{ domain:'money', kind:'want', text:t.replace(/が?欲しい|が?ほしい|を?買いたい|[0-9０-９,，]+\s*(万|千)?\s*円?/g, '').trim() || t, amt }], echo:'買いたいものに入れといた。……今は待ちね。', face:'normal' };
    if (/毎月/.test(t) && amt) {
      const day = +(z2h(t).match(/(\d{1,2})日/) || [0, 25])[1], name = t.replace(/毎月|\d{1,2}日|[0-9０-９,，]+\s*(万|千)?\s*円?/g, '').trim() || '支払い';
      return { items:[{ domain:'money', kind:'fixed', text:name, amt, fixed:{ name, day, amt } }], echo:`毎月${day}日の「${name}」、固定費に入れたよ。`, face:'normal' };
    }
    if (/アイデア|思いつ|ひらめ|メモ/.test(t)) items.push({ domain:'idea', kind:'idea', text:t.replace(/^(アイデア|メモ)[:：\s]*/, ''), work });
    else if (/しといて|やっといて|考えといて|教えて/.test(t)) items.push({ domain:'todo', kind:'ask', text:t, due:date || '', work });
    else if (/まで/.test(t)) items.push({ domain:'todo', kind:'todo', text:t.replace(/^.*?まで\s*/, '') || t, due:date || D.today(), work });
    else if (/しんど|疲れ|眠い|頭痛|頭が痛|体調|寝不足|だるい|熱っぽ|風邪/.test(t) && !time) items.push({ domain:'health', kind:'mood', text:t });
    else if (/給料|入金|もらった|収入/.test(t) && amt) items.push({ domain:'money', kind:'in', text:t, amt });
    else if (amt && !time) {
      items.push({ domain:'money', kind:'out', text:t, amt });
      if (/食|飯|ラーメン|弁当|カフェ|コーヒー|昼|夜|朝|出前|マック|ピザ/.test(t)) items.push({ domain:'food', kind:'food', text:t.replace(/[0-9０-９,，]+\s*(万|千)?\s*円?\s*$/, '').trim() || t });
    } else if (date || time) items.push({ domain:'plan', kind:'plan', text:strip(t) || t, date:date || D.today(), time, work });
    else if (/食べた|飲んだ|ラーメン|ご飯|朝食|夕食|出前|チーズ/.test(t)) items.push({ domain:'food', kind:'food', text:t });
    else if (/やる|やらな|出す|返信|提出|買う|行く/.test(t)) items.push({ domain:'todo', kind:'todo', text:t, due:date || '', work });
    else items.push({ domain:hint && DOMAINS[hint] ? hint : 'other', kind:'', text:t });
    const it = items[0];
    const echo = it.domain === 'plan' ? `${D.label(it.date)}${it.time ? 'の' + it.time : ''}「${it.text}」ね。前の日に言うから。`
      : it.domain === 'todo' ? (it.kind === 'ask' ? `「${t}」、引き受けた。` : `「${it.text}」、やることに入れたよ${it.due ? `。${D.label(it.due)}まで` : ''}。`)
      : it.domain === 'idea' ? 'メモしといた。……悪くないじゃん。'
      : it.domain === 'money' ? `${yen(it.amt)}${it.kind === 'in' ? '、入ったんだ。よかったね。' : 'ね。つけといた。'}`
      : it.domain === 'food' ? `「${it.text}」ね。ご飯に入れたよ。`
      : it.domain === 'health' ? '……そっか。今日は早めに休んで。からだに入れとく。'
      : `「${t}」、覚えとく。`;
    return { items, echo, face:it.domain === 'health' ? 'worry' : 'normal' };
  }

  // ===== 保存 =====
  async function save(items, src = 'input') {
    const saved = [], m = Data.money();
    for (const x of items || []) {
      if (!x || !x.text && !x.amt) continue;
      if (x.kind === 'cash' && x.amt != null) { const diff = await Data.setCash(x.amt); saved.push({ domain:'money', kind:'cash', text:x.text, virtual:true, diff }); continue; }
      if (x.kind === 'save' && x.amt) { await Data.addSaving(x.amt); saved.push({ domain:'money', kind:'save', text:'貯金', virtual:true }); continue; }
      if (x.kind === 'fixed' && x.fixed) { m.fixed.push({ id:uid(), name:String(x.fixed.name || x.text).slice(0, 20), day:clamp(+x.fixed.day || 25, 1, 31), amt:Math.round(+x.fixed.amt || +x.amt || 0) }); await Data.saveMoney(); saved.push({ domain:'money', kind:'fixed', text:x.text, virtual:true }); continue; }
      if (x.kind === 'unpaid') { m.unpaid.push({ id:uid(), name:String(x.text).slice(0, 30), amt:Math.round(+x.amt || 0), done:false, at:new Date().toISOString() }); await Data.saveMoney(); saved.push({ domain:'money', kind:'unpaid', text:x.text, virtual:true }); continue; }
      if (x.kind === 'want') { m.wants.push({ id:uid(), name:String(x.text).slice(0, 30), price:Math.round(+x.amt || 0), prio:2, at:new Date().toISOString() }); await Data.saveMoney(); saved.push({ domain:'money', kind:'want', text:x.text, virtual:true }); continue; }
      if (x.life) { await Data.lifeAdd({ dm:x.life, cat:x.cat || '', name:x.text, val:x.val || '', state:x.state || 'guess' }); saved.push({ domain:'life', kind:x.life, text:x.text, virtual:true }); continue; }
      saved.push(await Data.add({ domain:x.domain, kind:x.kind || '', text:x.text, amt:x.amt, date:x.date || D.today(), time:x.time || '', due:x.due || '', state:x.state || 'sure', work:!!x.work, src }, true));
    }
    return saved;
  }
  const TAG = s => s.domain === 'life' ? `生活DB・${LIFE[s.kind] || ''}` : { cash:'手元', save:'貯金', fixed:'固定費', unpaid:'未払い', want:'買いたい', ask:'お願い', idea:'アイデア' }[s.kind] || DOMAINS[s.domain] || '記録';

  // ===== 画面 =====
  function open(h0) {
    hint = h0 != null ? h0 : (HINT[App.tab()] || ''); Sound.wake();
    const us = Data.usuals();
    $('inUsual').innerHTML = us.map((u, i) => `<button data-u="${i}">${esc(u.text)}</button>`).join('');
    $('inHint').textContent = '予定・お金・ご飯・やること・アイデア、なんでも一言で。写真もOK';
    $('inSheet').classList.add('on');
    setTimeout(() => $('inText').focus(), 60);
  }
  function close() { $('inSheet').classList.remove('on'); $('inText').blur(); }

  async function submit(text, img) {
    if (busy) return; text = (text || '').trim(); if (!text && !img) return;
    busy = true; close(); $('inText').value = '';
    showEcho('……', 'normal', [], true);
    let r = null;
    if (Api.ready()) {
      const dms = Data.pick(text || '写真');
      r = await Api.call(img ? 'photo' : 'sort', { text, img, hint, tab:App.tab(), usual:Data.usualText(), ctx:Data.context(dms, ['plan', 'todo'], 6), snap:Data.snapshot() });
    }
    if (!r || !Array.isArray(r.items)) { if (img) { busy = false; hideEcho(); toast('写真から読み取るには、AIの設定が必要です'); return; } r = parseLocal(text); }
    const saved = await save(r.items, img ? 'photo' : 'input');
    last = saved.filter(x => !x.virtual);
    Data.touch();
    const cash = saved.find(s => s.kind === 'cash' && s.diff > 0);
    showEcho((r.echo || '覚えたよ') + (cash ? `\n記録より${yen(cash.diff)}少ないね。……どこで消えたか、あとで一緒に探そ。` : ''), r.face || 'normal', saved);
    Sound.se('ok'); haptic();
    busy = false;
  }

  // ===== 復唱 =====
  let echoT = 0;
  function showEcho(text, face, saved, wait) {
    const e = $('echo');
    e.innerHTML = `<div class="echo-b">${Face.img(face, 'sm')}<div class="echo-t"><b>乃亜</b>
      <p>${saved.map(s => `<span class="tag">${esc(TAG(s))}</span>`).join('')}${wait ? '<span class="dots"><i></i><i></i><i></i></span>' : esc(text).replace(/\n/g, '<br>')}</p>
      ${wait || !last.length ? '' : '<small>違っていたら、ここをタップして直す</small>'}</div></div>`;
    e.className = 'on'; clearTimeout(echoT);
    if (!wait) echoT = setTimeout(hideEcho, 7000);
  }
  function hideEcho() { $('echo').className = ''; }

  // ===== 直す =====
  function fix() {
    if (!last.length) return hideEcho();
    hideEcho();
    const opts = Object.entries(DOMAINS).filter(([k]) => k !== 'proposal').map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    sheet(`<div class="sh-h"><button class="sh-x" data-x>やめる</button><b>直す</b><button class="sh-ok" data-ok>保存</button></div><div class="sh-body">
      ${last.map((r, i) => `<div class="fixr" data-i="${i}"><select>${opts}</select><input value="${esc(r.text)}"><input class="amt" inputmode="numeric" placeholder="金額" value="${r.amt || ''}"><button class="mini-b g" data-del="${i}">消す</button></div>`).join('')}</div>`,
      (el, close) => {
        el.querySelectorAll('.fixr').forEach((row, i) => { row.querySelector('select').value = last[i].domain; });
        el.addEventListener('click', async e => {
          if (e.target.closest('[data-x]')) return close(null);
          const d = e.target.closest('[data-del]'); if (d) { const i = +d.dataset.del; await Data.remove(last[i].id); d.parentNode.remove(); last[i] = null; return; }
          if (e.target.closest('[data-ok]')) {
            for (const row of el.querySelectorAll('.fixr')) { const r = last[+row.dataset.i]; if (!r) continue; const [s, t, a] = [row.querySelector('select'), row.querySelector('input'), row.querySelector('.amt')]; await Data.update(r.id, { domain:s.value, text:t.value, amt:a.value ? Number(a.value) : null }); }
            last = last.filter(Boolean); close(true); toast('直しました'); Data.touch();
          }
        });
      });
  }

  // ===== 写真（長い辺を1024pxに縮めて送る） =====
  function photo(file) {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 1024 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      submit($('inText').value || '', c.toDataURL('image/jpeg', .8).split(',')[1]);
    };
    img.src = url;
  }

  function bind() {
    $('fab').onclick = () => open();
    $('inSheet').onclick = e => { if (e.target === $('inSheet')) close(); const u = e.target.closest('[data-u]'); if (u) { const x = Data.usuals()[+u.dataset.u]; const i = $('inText'); i.value = (i.value ? i.value + ' ' : '') + x.text; i.focus(); } };
    $('inForm').onsubmit = e => { e.preventDefault(); submit($('inText').value); };
    $('inPhoto').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) { close(); photo(f); } };
    $('echo').onclick = fix;
  }
  return { bind, open, close, submit, parseLocal };
})();
