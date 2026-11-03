// Life Partner — 金庫（Favoriteの「アカウント」を移植。中身はすべて暗号化して、この端末だけに保存）
// 「データ鍵」を、マスターパスワードとFace ID（パスキーのPRF）の2通りで包んで保存する
'use strict';
const Vault = (() => {
  let vault = null, key = null, raw = null, list = [], state = 'setup', leftAt = 0;
  const ITER = 310000, AUTO = 60000;
  const te = new TextEncoder(), td = new TextDecoder();
  const b64 = buf => { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const rnd = n => crypto.getRandomValues(new Uint8Array(n));
  async function pwKey(pw, salt, iter) {
    const base = await crypto.subtle.importKey('raw', te.encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name:'PBKDF2', salt, iterations:iter, hash:'SHA-256' }, base, { name:'AES-GCM', length:256 }, false, ['encrypt', 'decrypt']);
  }
  async function prfKey(out) {
    const base = await crypto.subtle.importKey('raw', out, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name:'HKDF', hash:'SHA-256', salt:te.encode('life-partner'), info:te.encode('vault-v1') }, base, { name:'AES-GCM', length:256 }, false, ['encrypt', 'decrypt']);
  }
  async function seal(k, bytes) { const iv = rnd(12); return { iv:b64(iv), ct:b64(await crypto.subtle.encrypt({ name:'AES-GCM', iv }, k, bytes)) }; }
  async function unseal(k, b) { return new Uint8Array(await crypto.subtle.decrypt({ name:'AES-GCM', iv:unb64(b.iv) }, k, unb64(b.ct))); }
  async function useRaw(r) { raw = r; key = await crypto.subtle.importKey('raw', r, 'AES-GCM', false, ['encrypt', 'decrypt']); }

  // ===== Face ID（パスキー＋PRF） =====
  const canPasskey = () => !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
  async function assertPrf(credId, salt) {
    const a = await navigator.credentials.get({ publicKey:{ challenge:rnd(32), rpId:location.hostname, allowCredentials:[{ type:'public-key', id:credId }], userVerification:'required', timeout:60000, extensions:{ prf:{ eval:{ first:salt } } } } });
    const r = a.getClientExtensionResults(), out = r.prf && r.prf.results && r.prf.results.first;
    if (!out) throw new Error('noprf');
    return out;
  }
  async function registerFace() {
    const salt = rnd(32);
    const cred = await navigator.credentials.create({ publicKey:{ challenge:rnd(32), rp:{ name:'Life Partner', id:location.hostname }, user:{ id:rnd(16), name:'Life Partner', displayName:'Life Partner（金庫）' },
      pubKeyCredParams:[{ type:'public-key', alg:-7 }, { type:'public-key', alg:-257 }], authenticatorSelection:{ authenticatorAttachment:'platform', residentKey:'required', userVerification:'required' },
      timeout:60000, extensions:{ prf:{ eval:{ first:salt } } } } });
    const ext = cred.getClientExtensionResults();
    let out = ext.prf && ext.prf.results && ext.prf.results.first;
    if (!out) { if (ext.prf && ext.prf.enabled === false) throw new Error('noprf'); out = await assertPrf(cred.rawId, salt); }
    return { credId:b64(cred.rawId), salt:b64(salt), box:await seal(await prfKey(out), raw) };
  }

  // ===== 保存 =====
  const saveVault = () => DB.set('vault', vault);
  async function saveList() { const items = []; for (const e of list) items.push(Object.assign({ id:e.id }, await seal(key, te.encode(JSON.stringify(e))))); await DB.set('vaultItems', items); }
  async function loadList() { list = []; for (const r of await DB.get('vaultItems', [])) { try { list.push(JSON.parse(td.decode(await unseal(key, r)))); } catch (e) {} } }

  // ===== パスワードの点検 =====
  function strength(p) {
    if (!p) return 0;
    const cls = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(p)).length;
    let s = (p.length >= 8) + (p.length >= 12) + (p.length >= 16) + Math.max(0, cls - 1);
    if (/^(.)\1+$/.test(p) || /password|qwerty|1234|abcd|1111|0000/i.test(p)) s = Math.min(s, 1);
    return Math.min(4, s);
  }
  function audit() { const cnt = {}; list.forEach(e => { if (e.pass) cnt[e.pass] = (cnt[e.pass] || 0) + 1; }); return new Set(list.filter(e => (e.pass && strength(e.pass) <= 1) || (e.pass && cnt[e.pass] > 1)).map(e => e.id)); }
  function gen(len = 16) {
    const sets = ['abcdefghijkmnopqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', '!@#$%&*?-_+='], all = sets.join('');
    const r = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
    let p; do { p = Array.from({ length:len }, () => all[r(all.length)]).join(''); } while (!sets.every(s => [...p].some(c => s.includes(c))));
    return p;
  }

  // ===== 画面 =====
  function open() {
    const el = h(`<div class="qs" id="vault"><div class="qs-in vault-in"><header><b>金庫 <small>VAULT</small></b><button class="x">${IC('x')}</button></header><div class="qs-body" id="vBody"></div><footer id="vFoot"></footer></div></div>`);
    $('app').appendChild(el);
    el.querySelector('.x').onclick = close;
    el.addEventListener('click', onClick);
    if (state === 'open' && leftAt && Date.now() - leftAt > AUTO) lockNow();
    render();
    if (state === 'locked' && vault && vault.prf) unlockFace();
  }
  function close() { const v = $('vault'); if (v) v.remove(); leftAt = Date.now(); setTimeout(() => { if (!$('vault') && Date.now() - leftAt >= AUTO - 50) lockNow(); }, AUTO); }
  function lockNow() { key = raw = null; list = []; if (vault) state = 'locked'; }
  function render() {
    const b = $('vBody'), f = $('vFoot'); if (!b) return;
    if (state === 'setup') {
      b.innerHTML = `<div class="gate"><p><b>金庫をつくる</b></p><p class="mini">ID・パスワード・月額をまとめて暗号化し、このiPhoneの中だけに保存します。マスターパスワードを忘れて、Face IDも使えなくなると取り出せません。</p>
        <input id="vp1" type="password" placeholder="マスターパスワード（8文字以上）" autocomplete="new-password"><input id="vp2" type="password" placeholder="もう一度" autocomplete="new-password">
        ${canPasskey() ? '<label class="chk"><input type="checkbox" id="vFace" checked>Face IDで開けるようにする</label>' : ''}<button class="btn" id="vMk">つくる</button></div>`;
      f.innerHTML = ''; return;
    }
    if (state === 'locked') {
      b.innerHTML = `<div class="gate"><p><b>ロック中</b></p>${vault.prf ? '<button class="btn" id="vFaceGo">Face IDで開く</button>' : ''}
        <input id="vpw" type="password" placeholder="マスターパスワード" autocomplete="current-password"><button class="btn w" id="vPwGo">パスワードで開く</button></div>`;
      f.innerHTML = ''; return;
    }
    const bad = audit(), monthly = list.reduce((s, e) => s + (+e.fee || 0), 0);
    b.innerHTML = `<div class="nums3"><div><small>登録</small><b>${list.length}</b></div><div><small>月額の合計</small><b>${yen(monthly)}</b></div><div><small>要チェック</small><b>${bad.size}</b></div></div>
      <p class="mini">月額や課金のあるものに金額を入れておくと、銀行の「なぜか消えるお金」の手がかりになります。</p>
      <div class="rows">${list.slice().sort((a, b) => (+b.fee || 0) - (+a.fee || 0) || (a.name || '').localeCompare(b.name || '', 'ja')).map(e => `<button class="row" data-ve="${e.id}"><span>${esc(e.name)}<small>${esc(e.user || '')}</small></span><em>${e.fee ? yen(e.fee) + '/月' : ''}</em>${bad.has(e.id) ? '<i class="warn">!</i>' : ''}</button>`).join('') || '<p class="mini">まだありません。</p>'}</div>`;
    f.innerHTML = `<button class="btn w" id="vLock">ロック</button><button class="btn" id="vAdd">＋ 追加</button>`;
  }
  async function edit(e) {
    const isNew = !e; e = e || { name:'', user:'', pass:'', url:'', fee:'', memo:'' };
    const v = await form(isNew ? 'アカウントを追加' : e.name, [
      { k:'name', label:'サービス名', value:e.name, ph:'例：NIKKE' }, { k:'user', label:'ID・メールアドレス', value:e.user },
      { k:'pass', label:'パスワード', value:e.pass || (isNew ? gen() : ''), noFocus:true }, { k:'fee', label:'月額・課金（円/月）', type:'number', value:e.fee },
      { k:'url', label:'URL', value:e.url }, { k:'memo', label:'メモ', type:'area', value:e.memo }], '保存', isNew ? {} : { del:'このアカウントを消す' });
    if (v && v._del) { if (await ask(`「${e.name}」を消しますか？`, '消す', 'やめる')) { list = list.filter(x => x.id !== e.id); await saveList(); render(); toast('消しました'); } return; }
    if (!v || state !== 'open') return;
    if (!v.name) return toast('サービス名を入れてください');
    const obj = Object.assign({}, e, v, { updated:Date.now() }, isNew ? { id:uid() } : {});
    const i = list.findIndex(x => x.id === obj.id); if (i >= 0) list[i] = obj; else list.push(obj);
    await saveList(); render();
    if (obj.pass && strength(obj.pass) <= 1) toast('そのパスワード、弱いかも。変えとこ');
  }
  async function onClick(ev) {
    const id = ev.target.id;
    if (id === 'vMk') {
      const a = $('vp1').value, b = $('vp2').value;
      if (a.length < 8) return toast('8文字以上にしてください');
      if (a !== b) return toast('2つのパスワードが違います');
      await useRaw(rnd(32)); const salt = rnd(16);
      vault = { v:1, iter:ITER, salt:b64(salt), pw:await seal(await pwKey(a, salt, ITER), raw), prf:null };
      if ($('vFace') && $('vFace').checked) { try { vault.prf = await registerFace(); } catch (e) { toast('Face IDは使えないので、パスワードで開きます'); } }
      await saveVault(); list = []; await saveList(); state = 'open'; render(); toast('金庫をつくりました'); return;
    }
    if (id === 'vFaceGo') return unlockFace();
    if (id === 'vPwGo') {
      try { await useRaw(await unseal(await pwKey($('vpw').value, unb64(vault.salt), vault.iter), vault.pw)); await loadList(); state = 'open'; render(); }
      catch (e) { toast('パスワードが違います'); $('vpw').value = ''; }
      return;
    }
    if (id === 'vLock') { lockNow(); render(); return; }
    if (id === 'vAdd') return edit(null);
    const r = ev.target.closest('[data-ve]'); if (r) return edit(list.find(x => x.id === r.dataset.ve));
  }
  async function unlockFace() {
    try { const out = await assertPrf(unb64(vault.prf.credId), unb64(vault.prf.salt)); await useRaw(await unseal(await prfKey(out), vault.prf.box)); await loadList(); state = 'open'; render(); }
    catch (e) { /* パスワードで開ける */ }
  }
  async function init() { vault = await DB.get('vault', null); state = vault ? 'locked' : 'setup'; }
  // アプリのロック用：金庫は開かずに、本人かどうかだけ確かめる（同じマスターパスワード・Face IDを使う）
  const gate = {
    ready:() => !!vault,
    face:() => !!(vault && vault.prf && canPasskey()),
    async tryFace() { const out = await assertPrf(unb64(vault.prf.credId), unb64(vault.prf.salt)); await unseal(await prfKey(out), vault.prf.box); return true; },
    async tryPw(pw) { await unseal(await pwKey(pw, unb64(vault.salt), vault.iter), vault.pw); return true; },
  };
  return { init, open, gate, monthly:() => state === 'open' ? list.reduce((s, e) => s + (+e.fee || 0), 0) : null };
})();
