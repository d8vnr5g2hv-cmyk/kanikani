// Life Partner — 共通の部品：線のアイコン・スワイプで片づける行・長押しで並べ替え・印・数字の印字
'use strict';
// ===== 線のアイコン（絵文字は使わない） =====
const IC = (() => {
  const P = {
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
    cloud:'<path d="M7 18h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.4A3.4 3.4 0 0 0 7 18z"/>',
    partly:'<circle cx="8.5" cy="8.5" r="3"/><path d="M8.5 2.8v1.4M2.8 8.5h1.4M4.5 4.5l1 1M12.5 4.5l-1 1"/><path d="M9 19h8.5a3.5 3.5 0 0 0 .3-7 4.8 4.8 0 0 0-9.2 1.3A2.9 2.9 0 0 0 9 19z"/>',
    rain:'<path d="M7 15h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.4A3.4 3.4 0 0 0 7 15z"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>',
    snow:'<path d="M7 15h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.4A3.4 3.4 0 0 0 7 15z"/><path d="M9 19h.01M12 21h.01M15 19h.01"/>',
    bolt:'<path d="M7 14h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.4A3.4 3.4 0 0 0 7 14z"/><path d="M12.5 15l-2 3.5h3l-2 3.5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>', chev:'<path d="M9 5l7 7-7 7"/>', back:'<path d="M15 5l-7 7 7 7"/>',
    check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>', cam:'<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.6"/>',
    home:'<path d="M4 11l8-7 8 7v9h-5.2v-6H9.2v6H4z"/>', desk:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M9 3v4M15 3v4M4 10h16M8 14h3"/>',
    clinic:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M9 11h6M12 8v6"/>',
    bank:'<path d="M3 9l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>', room:'<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
    // 気分（5段階）
    m5:'<circle cx="12" cy="12" r="9"/><path d="M8 13.5c1.2 2.2 6.8 2.2 8 0"/><path d="M8.5 9.5h.01M15.5 9.5h.01"/>',
    m4:'<circle cx="12" cy="12" r="9"/><path d="M8.5 14c1.5 1.2 5.5 1.2 7 0"/><path d="M8.5 9.5h.01M15.5 9.5h.01"/>',
    m3:'<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5h7"/><path d="M8.5 9.5h.01M15.5 9.5h.01"/>',
    m2:'<circle cx="12" cy="12" r="9"/><path d="M8.5 15.5c1.5-1.3 5.5-1.3 7 0"/><path d="M8.5 9.5h.01M15.5 9.5h.01"/>',
    m1:'<circle cx="12" cy="12" r="9"/><path d="M8.5 16c1.5-1.8 5.5-1.8 7 0"/><path d="M7.5 9l2 1M16.5 9l-2 1"/>',
  };
  return (k, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[k] || ''}</svg>`;
})();
const wxIcon = c => IC(c == null ? 'cloud' : c <= 1 ? 'sun' : c <= 3 ? 'partly' : c <= 48 ? 'cloud' : (c <= 67 || (c >= 80 && c <= 82)) ? 'rain' : (c <= 77 || (c >= 85 && c <= 86)) ? 'snow' : 'bolt');

// ===== スワイプで片づける行（右へ＝完了、左へ＝消す） =====
// 行：<div class="sw-row" data-id> <div class="sw-bg"><span class="l">完了</span><span class="r">消す</span></div> <div class="sw-fg">…</div> </div>
const Swipe = {
  bind(box, { done, del, tap }) {
    let row = null, x0 = 0, y0 = 0, dx = 0, mode = '';
    box.addEventListener('touchstart', e => {
      const r = e.target.closest('.sw-row'); if (!r || e.target.closest('button,input,select')) return;
      row = r; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; mode = '';
    }, { passive:true });
    box.addEventListener('touchmove', e => {
      if (!row) return;
      const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
      if (!mode) mode = Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my) ? 'x' : Math.abs(my) > 8 ? 'y' : '';
      if (mode !== 'x') return;
      dx = mx; row.classList.add('swiping');
      row.querySelector('.sw-fg').style.transform = `translateX(${dx}px)`;
      row.classList.toggle('to-done', dx > 70); row.classList.toggle('to-del', dx < -70);
    }, { passive:true });
    box.addEventListener('touchend', async () => {
      if (!row) return; const r = row; row = null; r.classList.remove('swiping');
      const fg = r.querySelector('.sw-fg');
      if (mode === 'x' && dx > 70 && done) { haptic(); Sound.se('ok'); fg.style.transform = 'translateX(110%)'; r.classList.add('leaving'); setTimeout(() => done(r.dataset.id, r), 260); }
      else if (mode === 'x' && dx < -70 && del) { haptic(); fg.style.transform = 'translateX(-110%)'; r.classList.add('leaving'); setTimeout(() => del(r.dataset.id, r), 260); }
      else fg.style.transform = '';
      r.classList.remove('to-done', 'to-del');
    });
    if (tap) box.addEventListener('click', e => { const r = e.target.closest('.sw-row'); if (r && !e.target.closest('button')) tap(r.dataset.id, r); });
  },
  row:(id, inner, cls = '') => `<div class="sw-row ${cls}" data-id="${id}"><div class="sw-bg"><span class="l">${IC('check')}完了</span><span class="r">消す</span></div><div class="sw-fg">${inner}</div></div>`,
};

// ===== 長押しで並べ替え =====
const Reorder = {
  bind(box, sel, onDone) {
    let it = null, t = 0, y0 = 0, ph = null, offs = 0;
    box.addEventListener('touchstart', e => {
      const r = e.target.closest(sel); if (!r) return;
      y0 = e.touches[0].clientY;
      t = setTimeout(() => {
        it = r; haptic(); const rc = r.getBoundingClientRect(); offs = y0 - rc.top;
        ph = h(`<div class="ro-ph" style="height:${rc.height}px"></div>`); r.after(ph);
        Object.assign(r.style, { position:'fixed', left:rc.left + 'px', top:rc.top + 'px', width:rc.width + 'px', zIndex:60 }); r.classList.add('lifted');
      }, 420);
    }, { passive:true });
    box.addEventListener('touchmove', e => {
      if (!it) { if (Math.abs(e.touches[0].clientY - y0) > 6) clearTimeout(t); return; }
      e.preventDefault();
      const y = e.touches[0].clientY; it.style.top = (y - offs) + 'px';
      const sib = [...box.querySelectorAll(sel)].filter(x => x !== it);
      const over = sib.find(x => { const b = x.getBoundingClientRect(); return y > b.top && y < b.bottom; });
      if (over) { const b = over.getBoundingClientRect(); y < b.top + b.height / 2 ? over.before(ph) : over.after(ph); }
    }, { passive:false });
    box.addEventListener('touchend', () => {
      clearTimeout(t); if (!it) return;
      ph.replaceWith(it); it.removeAttribute('style'); it.classList.remove('lifted'); it = null;
      onDone([...box.querySelectorAll(sel)].map(x => x.dataset.id));
    });
  },
};

// ===== 「乃亜」の印（ポンと押す） =====
const Stamp = (text = '乃亜', cls = '') => `<span class="stamp ${cls}"><svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="26"/><circle cx="30" cy="30" r="21.5" class="in"/><text x="30" y="${text.length > 2 ? 35 : 37}" text-anchor="middle">${esc(text)}</text></svg></span>`;

// ===== 数字を1文字ずつ印字する（銀行） =====
function printNum(el, text, step = 55) {
  if (!el) return; el.textContent = ''; let i = 0;
  const go = () => { if (i > text.length) return; el.textContent = text.slice(0, i++); if (i > 1) Sound.se('type'); setTimeout(go, step); };
  go();
}

// ===== テープと落書き（紙の画面の飾り） =====
const Deco = {
  tape:(cls = '') => `<i class="tape ${cls}"></i>`,
  // 乃亜の落書き（うさぎ・ハート・きらきら）
  doodle(k, cls = '') {
    const D = {
      rabbit:'<path d="M9 10C8 5 9 2 10.5 2.5S12 7 11.5 10M15 10c1-5 0-8-1.5-7.5S12 7 12.5 10"/><ellipse cx="12" cy="15" rx="6" ry="5"/><path d="M10 14.5h.01M14 14.5h.01M11.3 16.6c.4.4 1 .4 1.4 0"/>',
      heart:'<path d="M12 19s-6.5-4-6.5-8.5A3.5 3.5 0 0 1 12 8.6a3.5 3.5 0 0 1 6.5 1.9C18.5 15 12 19 12 19z"/>',
      sparkle:'<path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z"/>',
    };
    return `<svg class="doodle ${cls}" viewBox="0 0 24 24">${D[k] || ''}</svg>`;
  },
};

// ===== 押したときの反応（全ボタン共通） =====
document.addEventListener('pointerdown', e => { const b = e.target.closest('button,.tap'); if (b) { b.classList.add('pressed'); const up = () => { b.classList.remove('pressed'); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); }; addEventListener('pointerup', up); addEventListener('pointercancel', up); } }, { passive:true });
