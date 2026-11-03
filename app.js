// Life Partner — 起動・タブ・パネル
'use strict';
const App = (() => {
  let tab = 'home', started = false, day = '', open = false;
  const MOD = { home:Home, desk:Desk, clinic:Clinic, bank:Bank, room:Room };

  async function go(t, openPanel) {
    if (!MOD[t]) t = 'home';
    const changed = t !== tab; tab = t;
    $('app').dataset.tab = t;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === t));
    $('hudTab').innerHTML = `<small>${TABS[t].en}</small>${TABS[t].name}`;
    if (changed) { Talk.close(); if (t === 'room') Room.reset(); }
    Stage.show(t, changed);
    playBgm();
    setPanel(openPanel != null ? openPanel : changed ? false : open);
    await refresh();
  }
  async function refresh() {
    $('peek').innerHTML = MOD[tab].peek();
    if (tab === 'clinic') Clinic.peekFill();
    if (open) { const y = $('panelBody').scrollTop; await MOD[tab].render($('panelBody')); $('panelBody').scrollTop = y; }
    if (tab === 'home') Home.weather();
  }
  function setPanel(v) {
    open = !!v; $('app').classList.toggle('panel-open', open);
    if (open) { MOD[tab].render($('panelBody')); $('panelBody').scrollTop = 0; }
  }
  async function playBgm() { const map = await DB.get('bgmMap', {}); Sound.bgm(map[tab] || map.home || ''); }

  // パネルは、つまみをタップ・上下にスワイプで開け閉め
  function bindPanel() {
    const p = $('panel'); let y0 = null;
    $('grab').onclick = () => { Sound.se('tap'); setPanel(!open); };
    p.addEventListener('touchstart', e => { if (e.target.closest('#grab,#peek') || (open && $('panelBody').scrollTop <= 0)) y0 = e.touches[0].clientY; }, { passive:true });
    p.addEventListener('touchend', e => { if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0; y0 = null; if (dy < -40 && !open) setPanel(true); else if (dy > 60 && open) setPanel(false); }, { passive:true });
    $('peek').onclick = () => { if (!open) { Sound.se('tap'); setPanel(true); } };
  }

  async function enter() {
    started = true; day = D.today();
    $('title').classList.add('off'); setTimeout(() => $('title').remove(), 700);
    Sound.wake(); await go('home'); Stage.show('home', true);
    const [t, f] = Noa.hello();
    setTimeout(() => Talk.open('home', { first:t, face:f }), 2300);
  }
  async function title() {
    // 起動画面：title と、各タブの start からランダムに1枚
    const pool = (await Promise.all(['title', 'home_start', 'desk_start', 'clinic_start', 'clinic_start2', 'bank_start', 'room_start'].map(n => Pic.find(n).then(u => u && [n, u])))).filter(Boolean);
    const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    const u = pick && pick[1], ub = pick && pick[0] === 'title' ? await Pic.find('title_blink') : null;
    if (u) {
      $('title').style.backgroundImage = `url("${u}")`; $('title').classList.add('img');
      if (ub) { const bl = h(`<div class="ti-blink" style="background-image:url('${ub}')"></div>`); $('title').prepend(bl);
        const loop = async () => { if (!$('title')) return; bl.classList.add('on'); await sleep(130); bl.classList.remove('on'); setTimeout(loop, 3000 + Math.random() * 3000); }; setTimeout(loop, 2000); }
    }
    $('title').onclick = async () => {
      Sound.wake();
      if (CFG.lock) { $('tiTap').textContent = 'Face IDで確認中…'; if (!(await Lock.check())) { $('tiTap').textContent = 'タップしてもう一度'; return; } }
      enter();
    };
  }

  async function boot() {
    await DB.open(); await loadCfg(); await Data.load(); await Face.load(); await Vault.init();
    [Input, Talk, Home, Desk, Clinic, Bank, Room].forEach(m => m.bind());
    $('stage').querySelector('.sil').innerHTML = Stage.sil;
    bindPanel(); Motes.init(); Home.start();
    $('tabs').onclick = e => { const b = e.target.closest('button'); if (b) { Sound.se('tap'); go(b.dataset.v); } };
    $('gearBtn').onclick = () => { go('room', true).then(() => { $('panelBody').querySelector('[data-app="settings"]') && $('panelBody').querySelector('[data-app="settings"]').click(); }); };
    document.addEventListener('pointerdown', () => Sound.wake(), { capture:true, passive:true });
    Data.onChange(() => { if (started) refresh(); });
    Data.loadWeather();
    const auto = async () => { if (await Data.autoMoney()) setTimeout(() => toast('給料の入金と引き落としを記録しました。違っていたら、銀行で財布に合わせてください', 4500), 1500); };
    auto();
    document.addEventListener('visibilitychange', () => { if (!document.hidden && started && D.today() !== day) { day = D.today(); auto(); refresh(); } });
    Stage.show('home'); $('app').dataset.tab = 'home';
    const to = new URLSearchParams(location.search).get('go');
    if (to && !CFG.lock) { history.replaceState(null, '', location.pathname); $('title').remove(); started = true; day = D.today(); go(to); }
    else title();
    if (!(await DB.get('seeded')) && !Data.life().length) setTimeout(() => started && toast('自室 → 設定 → 読み込む から、初期データを入れてください', 4000), 2500);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  return { boot, go, refresh, tab:() => tab, started:() => started, playBgm, setPanel };
})();
window.addEventListener('DOMContentLoaded', () => App.boot().catch(e => { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre style="position:fixed;bottom:0;left:0;right:0;background:#fff;color:#c00;font-size:11px;z-index:999;white-space:pre-wrap">${esc(e.stack || e)}</pre>`); }));
