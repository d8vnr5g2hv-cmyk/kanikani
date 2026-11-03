// Life Partner — 起動画面（Favoriteの流れ）
// 流れ：暗いところから絵がうっすら → タッチ（タイトル曲）→ ロックがオンなら Face ID／マスターパスワード → 乃亜の部屋へ
'use strict';
const Title = (() => {
  let stage = 0, onEnter = null, blinkT = 0;
  async function init(enter) {
    onEnter = enter;
    const pool = (await Promise.all(['title', 'home_start', 'desk_start', 'clinic_start', 'clinic_start2', 'bank_start', 'room_start'].map(n => Pic.find(n).then(u => u && [n, u])))).filter(Boolean);
    const pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    const t = $('title');
    if (pick) {
      t.querySelector('.ti-img').style.backgroundImage = `url("${pick[1]}")`;
      if (pick[0] === 'title') { const ub = await Pic.find('title_blink'); if (ub) { const b = t.querySelector('.ti-blink'); b.style.backgroundImage = `url("${ub}")`; const loop = async () => { if (!$('title')) return; b.classList.add('on'); await sleep(120); b.classList.remove('on'); blinkT = setTimeout(loop, 2800 + Math.random() * 3200); }; blinkT = setTimeout(loop, 2600); } }
    }
    try { await Promise.race([document.fonts.ready, sleep(2500)]); } catch (e) {}
    t.classList.add('ready');
    t.onclick = tap;
  }
  async function tap(e) {
    if (e && e.target.closest('.ti-lock')) return;
    Sound.wake();
    if (stage === 0) {
      stage = 1; $('title').classList.add('go');
      const map = await DB.get('bgmMap', {}); if (map.title) Sound.bgm(map.title);
      if (CFG.lock && Vault.gate.ready()) return lock();
      await sleep(500); return finish();
    }
  }
  function lock() {
    const box = $('title').querySelector('.ti-lock');
    box.innerHTML = `${Vault.gate.face() ? `<button class="ti-face">${IC('check')}Face IDで開く</button>` : ''}<form class="ti-pw"><input type="password" placeholder="マスターパスワード" autocomplete="current-password"><button class="btn">開く</button></form><p class="ti-msg"></p>`;
    box.classList.add('on');
    const msg = t => box.querySelector('.ti-msg').textContent = t;
    const ok = () => { haptic(); box.classList.remove('on'); setTimeout(finish, 250); };
    const face = async () => { try { await Vault.gate.tryFace(); ok(); } catch (err) { msg('Face IDで開けませんでした。パスワードでも開けます'); } };
    if (Vault.gate.face()) { box.querySelector('.ti-face').onclick = face; face(); }
    box.querySelector('.ti-pw').onsubmit = async ev => { ev.preventDefault(); const i = box.querySelector('input'); try { await Vault.gate.tryPw(i.value); i.blur(); ok(); } catch (err) { i.value = ''; msg('パスワードが違います'); i.classList.add('shake'); setTimeout(() => i.classList.remove('shake'), 400); } };
  }
  function finish() {
    clearTimeout(blinkT);
    const t = $('title'); t.classList.add('off');
    setTimeout(() => t.remove(), 700);
    setTimeout(() => onEnter && onEnter(), 180);
  }
  return { init };
})();
