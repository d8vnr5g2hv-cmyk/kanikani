// Life Partner — 起動・タブ（スプラッシュつき）・パネル・ロック
'use strict';
const App = (() => {
  let tab = 'home', started = false, day = '', open = false, hiddenAt = 0, moving = false;
  const MOD = { home:Home, desk:Desk, clinic:Clinic, bank:Bank, room:Room };

  // タブを移る：UIを下げる → start のスプラッシュ → いつもの乃亜 → UIが戻る
  async function go(t, openPanel = false, splash = true) {
    if (!MOD[t] || moving) return;
    const changed = t !== tab;
    if (!changed && !openPanel) return;
    moving = true;
    if (changed) {
      Talk.close(); setPanel(false);
      tab = t; $('app').dataset.tab = t;
      document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === t));
      if (t === 'room') Room.reset();
      const sp = splash ? Splash.show(t) : null;
      await Stage.show(t); playBgm(); await refresh();
      if (sp) await sp;
    }
    if (openPanel) setPanel(true);
    moving = false;
  }
  async function refresh() {
    $('stripText').innerHTML = MOD[tab].peek();
    if (MOD[tab].peekFill) MOD[tab].peekFill();
    if (open) { const y = $('panelBody').scrollTop; await MOD[tab].render($('panelBody')); $('panelBody').scrollTop = y; }
  }
  function setPanel(v) {
    open = !!v; $('app').classList.toggle('panel-open', open);
    $('panel').dataset.tab = tab;
    if (open) { MOD[tab].render($('panelBody')); $('panelBody').scrollTop = 0; }
    Stage.camera();
  }
  async function playBgm() { const map = await DB.get('bgmMap', {}); Sound.bgm(map[tab] || map.home || ''); }

  function bindPanel() {
    $('strip').addEventListener('click', e => { if (e.target.closest('#fab')) return; Sound.se('tap'); setPanel(!open); });
    $('panelX').onclick = () => { Sound.se('tap'); setPanel(false); };
    // 下へスワイプで閉じる（いちばん上までスクロールしているとき）
    let y0 = null;
    $('panel').addEventListener('touchstart', e => { y0 = $('panelBody').scrollTop <= 0 || e.target.closest('.pn-h') ? e.touches[0].clientY : null; }, { passive:true });
    $('panel').addEventListener('touchend', e => { if (y0 != null && e.changedTouches[0].clientY - y0 > 90) setPanel(false); y0 = null; }, { passive:true });
  }

  // 戻ってきたとき：10分以上ならロック、3分以上ならそのタブのスプラッシュ
  function bindResume() {
    document.addEventListener('visibilitychange', async () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      if (!started) return;
      const away = Date.now() - hiddenAt;
      if (D.today() !== day) { day = D.today(); Data.autoMoney(); Splash.reset(); }
      if (CFG.lock && Vault.gate.ready() && away > 10 * 60e3) await relock();
      if (away > 3 * 60e3) { Splash.show(tab); Stage.show(tab); refresh(); }
    });
  }
  function relock() {
    return new Promise(done => {
      const el = h(`<div id="lockCover"><div class="lk-in"><b>LIFE PARTNER</b><span>ロック中</span>${Vault.gate.face() ? '<button class="btn" id="lkFace">Face IDで開く</button>' : ''}<form id="lkPw"><input type="password" placeholder="マスターパスワード"><button class="btn w">開く</button></form></div></div>`);
      document.body.appendChild(el);
      const ok = () => { el.classList.add('off'); setTimeout(() => el.remove(), 400); done(); };
      const face = async () => { try { await Vault.gate.tryFace(); ok(); } catch (e) {} };
      if (Vault.gate.face()) { $('lkFace').onclick = face; face(); }
      $('lkPw').onsubmit = async e => { e.preventDefault(); try { await Vault.gate.tryPw(e.target.querySelector('input').value); ok(); } catch (err) { toast('パスワードが違います'); } };
    });
  }

  async function enter() {
    started = true; day = D.today();
    $('app').classList.add('live');
    await Splash.show('home');
    let g = null;
    if (Api.ready()) g = await Api.call('greet', { snap:Data.snapshot(), past:await Talk.past(), local:(await Noa.greet())[0] }, { retry:1, timeout:9000 });
    const [t, f] = g && g.text ? [g.text, g.face || 'normal'] : await Noa.greet();
    Talk.open('home', { first:t, face:f });
    if (!Data.life().length) setTimeout(() => toast('自室 → 設定 → 読み込む から、初期データを入れてください', 5000), 4000);
  }

  async function boot() {
    await DB.open(); await loadCfg(); await Data.load(); await Vault.init(); await Tracks.defaults();
    await Promise.all([Face.load(), Stage.preload()]);
    [Input, Talk, Home, Desk, Clinic, Bank, Room].forEach(m => m.bind());
    bindPanel(); bindResume(); Motes.init(); Home.start();
    $('tabs').onclick = e => { const b = e.target.closest('button'); if (b) { Sound.se('tap'); haptic(); go(b.dataset.v); } };
    document.addEventListener('pointerdown', () => Sound.wake(), { capture:true, passive:true });
    Data.onChange(() => { if (started) refresh(); });
    Data.loadWeather();
    if (await Data.autoMoney()) setTimeout(() => toast('給料の入金と引き落としを記録しました。違っていたら、銀行で財布に合わせてください', 5000), 3000);
    $('app').dataset.tab = 'home'; await Stage.show('home'); await refresh();
    const to = new URLSearchParams(location.search).get('go');
    if (to && MOD[to] && !CFG.lock) { history.replaceState(null, '', location.pathname); $('title').remove(); started = true; day = D.today(); $('app').classList.add('live'); go(to); }
    else Title.init(enter);
    addEventListener('resize', () => Stage.camera());
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  return { boot, go, refresh, tab:() => tab, started:() => started, playBgm, setPanel };
})();
window.addEventListener('DOMContentLoaded', () => App.boot().catch(e => { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre style="position:fixed;bottom:0;left:0;right:0;background:#fff;color:#c00;font-size:11px;z-index:999;white-space:pre-wrap">${esc(e.stack || e)}</pre>`); }));
