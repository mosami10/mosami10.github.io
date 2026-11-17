import Lenis from 'lenis';
import { Scene } from './scene.js';
import { Sound } from './audio.js';
import { CS, ORDER, HUD, RATIO } from './data.js';

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const q = new URLSearchParams(location.search);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(pointer: coarse)').matches;
const mobile = touch || matchMedia('(max-width: 820px)').matches;
const sound = new Sound();
let scene = null, lenis = null;
const root = document.documentElement;

// ---------- kinetic type: split headings into words and letters ----------
function split(el) {
  let i = 0; const out = document.createDocumentFragment();
  const word = (txt) => { const w = document.createElement('span'); w.className = 'w'; for (const ch of txt) { const c = document.createElement('span'); c.className = 'ch'; c.style.setProperty('--i', i++); c.textContent = ch; w.appendChild(c); } return w; };
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach((p) => { if (!p) return; out.appendChild(/^\s+$/.test(p) ? document.createTextNode(' ') : word(p)); });
    else if (n.tagName === 'EM') { const last = out.lastChild; const c = document.createElement('span'); c.className = 'ch dot'; c.style.setProperty('--i', i++); c.textContent = n.textContent; (last && last.className === 'w' ? last : out).appendChild(c); }
    else if (n.tagName === 'SPAN') { const line = document.createElement('span'); line.className = 'ln'; n.childNodes.forEach((m) => { if (m.nodeType === 3) line.appendChild(word(m.textContent)); else { const c = document.createElement('span'); c.className = 'ch dot'; c.style.setProperty('--i', i++); c.textContent = m.textContent; line.lastChild ? line.lastChild.appendChild(c) : line.appendChild(c); } }); out.appendChild(line); }
    else out.appendChild(n.cloneNode(true));
  });
  el.setAttribute('aria-label', el.textContent); el.textContent = ''; el.appendChild(out);
}
$$('.split').forEach(split);

// ---------- build the project index and feature panels from data ----------
const idx = $('#index');
ORDER.forEach((k) => {
  const d = CS[k], b = document.createElement('button');
  b.className = 'row'; b.dataset.cs = k; if (d.imgs[0]) b.dataset.img = 'images/opt/' + d.imgs[0][0];
  b.innerHTML = `<span class="n">${k}</span><span class="t"><b>${d.title}</b><i>${d.sub}</i></span><span class="k">${d.kind}</span><span class="tags">${d.tags.slice(0, 3).map((t) => `<em>${t}</em>`).join('')}</span><span class="go">Open</span>`;
  idx.appendChild(b);
});
$$('[data-feature]').forEach((el) => {
  const d = CS[el.dataset.feature];
  $('.specs', el).innerHTML = d.specs.slice(0, 4).map(([v, l]) => `<div><b data-count="${v}">${v}</b><span>${l}</span></div>`).join('');
});
function countUp(el) {
  const m = el.dataset.count.match(/^([\d.]+)(.*)$/); if (!m || reduce) return;
  const end = parseFloat(m[1]), dec = (m[1].split('.')[1] || '').length, t0 = performance.now();
  (function f(now) { const p = Math.min(1, (now - t0) / 1400), e = 1 - Math.pow(1 - p, 4); el.textContent = (end * e).toFixed(dec) + m[2]; if (p < 1) requestAnimationFrame(f); })(t0);
}

// ---------- case study viewer ----------
const modal = $('#cs'); let curK = null, lastFocus = null, figs = [], lbI = -1;
const lb = $('#lb'), lbImg = $('#lb img');
function showFig(i) { lbI = (i + figs.length) % figs.length; const [f, c] = figs[lbI]; lbImg.classList.remove('in'); lbImg.src = 'images/opt/' + f; lbImg.alt = c; lbImg.onload = () => lbImg.classList.add('in'); $('#lb-cap').textContent = c; $('#lb-n').textContent = `Fig ${String(lbI + 1).padStart(2, '0')} / ${String(figs.length).padStart(2, '0')}`; lb.classList.add('open'); sound.blip(700, 0.06, 0.03); }
const closeFig = () => { lb.classList.remove('open'); lbI = -1; };
let sx = null; lb.addEventListener('pointerdown', (e) => { sx = e.clientX; }); lb.addEventListener('pointerup', (e) => { if (sx === null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) showFig(lbI + (dx < 0 ? 1 : -1)); else if (!e.target.closest('button,img')) closeFig(); });
function openCS(k) {
  const d = CS[k]; curK = k; lastFocus = document.activeElement;
  $('#cs-n').textContent = k + ' / 09'; $('#cs-title').textContent = d.title; $('#cs-kind').textContent = d.kind;
  $('#cs-tags').innerHTML = d.tags.map((t) => `<em>${t}</em>`).join('');
  $('#cs-specs').innerHTML = d.specs.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
  $('#cs-problem').innerHTML = d.problem; $('#cs-method').innerHTML = d.method; $('#cs-verdict').innerHTML = d.verdict;
  let n = 0; figs = [];
  $('#cs-gallery').innerHTML = [['r', 'Simulation and results'], ['c', 'CAD and geometry']].map(([g, label]) => {
    const list = d.imgs.filter((i) => (i[2] || 'r') === g); if (!list.length) return '';
    return `<div class="gh"><h3 class="mono">${label}</h3><span class="mono">${String(list.length).padStart(2, '0')} figures · tap to enlarge</span></div><div class="jg">` + list.map(([f, c]) => { figs.push([f, c]); n++;
      return `<figure class="${n === 1 ? 'lead' : ''}" style="--r:${RATIO[f] || 1.5};--d:${n}" data-fig="${n - 1}"><div><img loading="lazy" src="images/opt/${f}" alt="${c}"></div><figcaption><b>Fig ${String(n).padStart(2, '0')}</b>${c}</figcaption></figure>`; }).join('') + '</div>';
  }).join('');
  modal.classList.remove('open'); void modal.offsetWidth; modal.classList.add('open'); modal.scrollTop = 0; root.classList.add('lock'); lenis && lenis.stop(); $('#cs-close').focus({ preventScroll: true });
  sound.whoosh(); scene && scene.kick(0.8);
}
function closeCS() { modal.classList.remove('open'); root.classList.remove('lock'); lenis && lenis.start(); lastFocus && lastFocus.focus({ preventScroll: true }); }
const step = (n) => openCS(ORDER[(ORDER.indexOf(curK) + n + ORDER.length) % ORDER.length]);
document.addEventListener('click', (e) => {
  const fg = e.target.closest('[data-fig]'); if (fg) { showFig(+fg.dataset.fig); return; }
  if (e.target.closest('#lb-prev')) { showFig(lbI - 1); return; } if (e.target.closest('#lb-next')) { showFig(lbI + 1); return; } if (e.target.closest('#lb-close')) { closeFig(); return; }
  const o = e.target.closest('[data-cs]'); if (o) { closeFig(); openCS(o.dataset.cs); return; }
  if (e.target.closest('#cs-close')) closeCS();
  if (e.target.closest('#cs-prev')) step(-1);
  if (e.target.closest('#cs-next')) step(1);
  const a = e.target.closest('a[href^="#"]'); if (a) { const t = $(a.getAttribute('href')); if (t) { e.preventDefault(); lenis ? lenis.scrollTo(t, { duration: 1.4 }) : t.scrollIntoView({ behavior: 'smooth' }); } }
});
addEventListener('keydown', (e) => { if (lbI >= 0) { if (e.key === 'Escape') closeFig(); if (e.key === 'ArrowRight') showFig(lbI + 1); if (e.key === 'ArrowLeft') showFig(lbI - 1); return; } if (!modal.classList.contains('open')) return; if (e.key === 'Escape') closeCS(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });

// ---------- sound ----------
const sBtn = $('#sound');
const paint = () => { sBtn.classList.toggle('on', sound.on); sBtn.setAttribute('aria-pressed', sound.on); $('span', sBtn).textContent = sound.on ? 'Sound on' : 'Sound off'; };
sBtn.addEventListener('click', () => { sound.toggle(); paint(); });

// ---------- pointer: cursor, magnets, peek image, stirring the fluid, drag to spin ----------
const cur = $('#cur'), curL = $('#cur span'), peek = $('#peek'), peekImg = $('#peek img');
let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my, px = mx, py = my, pvx = 0, drag = null, hov = null;
const free = (t) => !t.closest('a,button,input,#cs,#gate,#lb,header');
function ripple(x, y) { const r = document.createElement('i'); r.className = 'rip'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.appendChild(r); r.addEventListener('animationend', () => r.remove()); }
addEventListener('pointerdown', (e) => {
  if (!free(e.target)) return;
  drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; root.classList.add('drag');
  scene && scene.burst(e.clientX, e.clientY); ripple(e.clientX, e.clientY); sound.blip(300 + Math.random() * 200, 0.14, 0.035);
});
addEventListener('pointermove', (e) => {
  mx = e.clientX; my = e.clientY;
  if (e.pointerType === 'mouse' && scene) scene.stir(mx, my, e.movementX, e.movementY);
  if (drag && drag.id === e.pointerId && scene) { scene.spin(e.clientX - drag.x, e.pointerType === 'mouse' ? e.clientY - drag.y : 0); drag.x = e.clientX; drag.y = e.clientY; }
  const t = e.target.closest ? e.target : document.body, h = t.closest('.row') ? 'row' : t.closest('a,button') ? 'link' : free(t) ? 'free' : '';
  if (h !== hov) { hov = h; cur.dataset.s = h; curL.textContent = h === 'row' ? 'Open' : ''; }
  const row = t.closest('.row');
  if (row && row.dataset.img) { if (peekImg.getAttribute('src') !== row.dataset.img) peekImg.src = row.dataset.img; peek.classList.add('on'); } else peek.classList.remove('on');
  const btn = t.closest('.btn'); if (btn && !touch) { const r = btn.getBoundingClientRect(); btn.style.transform = `translate(${(mx - r.left - r.width / 2) * 0.22}px,${(my - r.top - r.height / 2) * 0.32}px)`; btn._m = 1; }
  $$('.btn').forEach((b) => { if (b._m && b !== btn) { b.style.transform = ''; b._m = 0; } });
});
const endDrag = () => { drag = null; root.classList.remove('drag'); };
addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag);
// fingers stir the air even while the page scrolls
let tl = {};
addEventListener('touchstart', (e) => { for (const t of e.changedTouches) tl[t.identifier] = [t.clientX, t.clientY]; }, { passive: true });
addEventListener('touchmove', (e) => { if (!scene) return; for (const t of e.changedTouches) { const p = tl[t.identifier] || [t.clientX, t.clientY]; scene.stir(t.clientX, t.clientY, t.clientX - p[0], t.clientY - p[1], 1.4); tl[t.identifier] = [t.clientX, t.clientY]; } }, { passive: true });
addEventListener('touchend', (e) => { for (const t of e.changedTouches) delete tl[t.identifier]; }, { passive: true });
document.addEventListener('pointerover', (e) => { const r = e.target.closest && e.target.closest('.row, .btn, nav a'); if (r && r !== document._h) { document._h = r; sound.blip(r.classList.contains('row') ? 660 + ORDER.indexOf(r.dataset.cs) * 55 : 990, 0.07, 0.03); } });

// ---------- the rig: hold to brake, pick a duct ----------
const brakeB = $('#brake'), rt = $('#rt'), rr = $('#rr'), rmsg = $('#rig-msg'), rigEl = $('#rig');
const MSG = { none: 'No duct. Heat builds faster than the disc can shed it. In my CFD this case ran away to the solver limit.', dome: 'Dome duct. Three outlets spread the air across the disc face. It settles at 516.5 K.', scoop: 'Scoop duct. One focused outlet settles at 407.6 K: 109 K cooler than the dome, on 39% less air.' };
function hold(v) { if (!scene || !!v === scene.held) return; scene.setHeld(!!v); brakeB.classList.toggle('held', !!v); if (v) { navigator.vibrate && navigator.vibrate(12); sound.blip(140, 0.2, 0.06); } }
brakeB.addEventListener('pointerdown', (e) => { e.preventDefault(); brakeB.setPointerCapture(e.pointerId); hold(true); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach((n) => brakeB.addEventListener(n, () => hold(false)));
brakeB.addEventListener('contextmenu', (e) => e.preventDefault());
addEventListener('keydown', (e) => { if (e.code === 'Space' && stage === 'hero' && !e.target.closest('input,textarea,#cs') && !modal.classList.contains('open')) { e.preventDefault(); if (!e.repeat) hold(true); } });
addEventListener('keyup', (e) => { if (e.code === 'Space') hold(false); });
function setCfg(c) { $$('.rig-cfg button').forEach((b) => { const on = b.dataset.cfg === c; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); rmsg.textContent = MSG[c]; scene && scene.setCfg(c); sound.blip(520, 0.1, 0.035); }
$$('.rig-cfg button').forEach((b) => b.addEventListener('click', () => setCfg(b.dataset.cfg)));
rmsg.textContent = MSG.none;
const heatCol = (h) => { const c = h < 0.35 ? [238 + (255 - 238) * h / 0.35, 242 - 110 * h / 0.35, 245 - 190 * h / 0.35] : h < 0.8 ? [255, 132 + 40 * (h - 0.35) / 0.45, 55 - 30 * (h - 0.35) / 0.45] : [255, 172 + 70 * Math.min(1, (h - 0.8) / 0.4), 25 + 160 * Math.min(1, (h - 0.8) / 0.4)]; return `rgb(${c.map(Math.round).join(',')})`; };

// ---------- gate ----------
const gate = $('#gate');
function enter(withSound) {
  if (withSound) { sound.start(); sound.whoosh(); }
  paint(); gate.classList.add('gone'); root.classList.remove('lock'); document.body.classList.add('in'); lenis && lenis.start();
  scene && (scene.kick(1), scene.burst(innerWidth / 2, innerHeight / 2)); setTimeout(() => gate.remove(), 1500);
}
$('#enter-sound').addEventListener('click', () => enter(true));
$('#enter-quiet').addEventListener('click', () => enter(false));

// ---------- reveal on scroll, stage tracking, HUD ----------
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('seen'); $$('[data-count]', e.target).forEach(countUp); io.unobserve(e.target); } }), { threshold: 0.18 });
$$('.rv').forEach((el) => io.observe(el));
const stages = $$('main [data-stage]'), hud = $('#hud'), bar = $('#bar'), marqs = $$('.marq > div');
let stage = '', lastY = scrollY, vel = 0, mq = 0;
function setHud(s) { if (!hud) return; hud.innerHTML = (HUD[s] || HUD.free).map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join(''); }
function track() {
  const mid = innerHeight * 0.5; let s = 'free';
  for (const el of stages) { const r = el.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) { s = el.dataset.stage; break; } }
  if (s !== stage) { stage = s; setHud(s); if (s !== 'hero') hold(false); scene && scene.setStage(s); document.body.dataset.stage = s; if (scene) sound.blip(440, 0.12, 0.03); }
  const max = root.scrollHeight - innerHeight; bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
}
addEventListener('scroll', track, { passive: true }); addEventListener('resize', track);
const clk = $('#clock'); const tick = () => { clk.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date()); }; tick(); setInterval(tick, 30000);

// ---------- boot ----------
const pct = $('#pct');
async function boot() {
  let webgl = !reduce; if (webgl) { try { const c = document.createElement('canvas'); webgl = !!c.getContext('webgl2'); } catch (e) { webgl = false; } }
  if (webgl) {
    try { scene = new Scene($('#gl'), { mobile, lite: q.has('lite') }); await scene.load((p) => { pct.textContent = String(Math.round(p * 100)).padStart(3, '0'); }); }
    catch (e) { console.warn(e); scene = null; }
  }
  if (!scene) document.body.classList.add('nogl');
  if (!touch && !reduce) { lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 }); lenis.stop(); }
  pct.textContent = '100'; gate.classList.add('ready'); track();
  if (q.has('shot')) { enter(false); const t = $(`main [data-stage="${q.get('shot')}"]`) || $('#' + q.get('shot')); if (t) { lenis ? lenis.scrollTo(t, { immediate: true }) : t.scrollIntoView(); } if (q.has('cs')) openCS(q.get('cs')); if (q.has('cfg')) setCfg(q.get('cfg')); if (q.has('hold')) setTimeout(() => hold(true), +q.get('hold')); if (q.has('T') && scene) scene.T = +q.get('T'); $$('.rv').forEach((e) => e.classList.add('seen')); }
  const loop = (now) => {
    lenis && lenis.raf(now);
    const dy = scrollY - lastY; lastY = scrollY; vel += (dy - vel) * 0.15;
    cx += (mx - cx) * 0.18; cy += (my - cy) * 0.18; pvx += ((mx - px) - pvx) * 0.2; px += (mx - px) * 0.12; py += (my - py) * 0.12;
    cur.style.transform = `translate(${cx}px,${cy}px)`; peek.style.transform = `translate(${px}px,${py}px) rotate(${Math.max(-14, Math.min(14, pvx * 0.25))}deg)`;
    mq += 0.6 + Math.abs(vel) * 0.35; marqs.forEach((m, i) => { const w = m.scrollWidth / 2; m.style.transform = `translateX(${i % 2 ? -w + (mq % w) : -(mq % w)}px) skewX(${Math.max(-12, Math.min(12, vel * -0.4))}deg)`; });
    root.style.setProperty('--sk', Math.max(-6, Math.min(6, vel * 0.12)).toFixed(2));
    if (scene) {
      if (Math.abs(dy) > 1) { scene.scrollKick(dy); scene.kick(Math.min(0.06, Math.abs(dy) / 900)); }
      const s = scene.frame(); sound.update(Math.min(1, s.energy), s.onRig ? s.rpm / 1500 : 0, Math.min(1, s.hn), s.bite);
      rt.textContent = Math.round(s.T).toLocaleString('en-GB'); rr.textContent = (Math.round(s.rpm / 10) * 10).toLocaleString('en-GB'); rt.parentNode.style.color = heatCol(s.hn);
      rigEl.classList.toggle('run', s.T > 1000);
    }
    requestAnimationFrame(loop);
  }; requestAnimationFrame(loop);
}
boot();
