(() => {
'use strict';
// ===================== TEMPEL LIRIK DI SINI =====================
// Satu baris = satu lirik:  [menit:detik.pecahan] teks lirik
// Format waktu yang terbaca:  [00:16.270]  |  0:16  |  0:16.27  |  0.16 (menit.detik)
// Baris tanpa teks = layar lirik dikosongkan pada waktu itu. Jangan pakai tanda backtick di dalam lirik.
// Lagu berdurasi 1:38 (98 detik); audio tetap jalan sampai habis walau lirik berhenti lebih awal.
const LYRICS_RAW = `
[00:00.000] 作词 : s0rrow
[00:01.000] 作曲 : s0rrow
[00:16.270]Every day we talk a little less
[00:19.718]It looks like you are losing interest
[00:23.732]These feelings I have for you
[00:26.831]But you don't feel the same
[00:28.708]So I'll pack all my things
[00:30.774]And go run far away
[00:32.797]You are, you are very pretty
[00:35.787]I'm so very ugly
[00:37.676]Will you even love me, anymore (love me)
[00:40.975]You can, you can live without me
[00:43.892]That makes me unhappy
[00:46.052]I should get a piercing through my heart
[00:49.229]What do you even want me to be
[00:52.703]You never ever pay attention to me
[00:56.688]So I'll close my blinds in misery
[01:00.535]And I'll wait for you for a couple of weeks
[01:05.310]You are, you are very pretty
[01:08.511]I'm so very ugly
[01:10.406]Will you even love me, anymore (love me)
[01:13.598]You can, you can live without me
[01:16.579]That makes me unhappy
[01:18.755]I should get a piercing through my heart 
`;
const HOT = [10, 20]; // nomor urut baris (mulai 0) yang diberi aksen merah redup
const HINT = 'Lirik belum diisi — tempel di LYRICS_RAW pada script.js.';
const $ = id => document.getElementById(id), au = $('au'), cv = $('fx'), root = document.documentElement;
const cx = cv.getContext && cv.getContext('2d');
const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
const on = (el, ev, fn, o) => el.addEventListener(ev, fn, o);
let lines = [], S = 'idle', fx = !rm, showLy = true, cur = -2, raf = 0, last = 0, W = 0, H = 0;
let rain = [], dust = [], sep = 0, drag = false, outro = 0;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ss = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const fmt = s => isFinite(s) && s >= 0 ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '--:--';
const setVar = (k, v) => root.style.setProperty(k, v.toFixed(3));

const D0 = 98; // durasi lagu 1:38; dipakai sampai metadata audio asli tersedia
const dur = () => isFinite(au.duration) && au.duration > 0 ? au.duration : D0;
function parseTime(s) {
  let m = /^(\d+):(\d{1,2}(?:\.\d+)?)$/.exec(s);
  if (m) return +m[1] * 60 + +m[2];
  m = /^(\d+)\.(\d+)$/.exec(s);
  return m && +m[1] <= 1 && m[2].length === 2 && +m[2] < 60 ? +m[1] * 60 + +m[2] : parseFloat(s);
}
function load() {
  const re = /^\s*\[?\s*(\d+:\d{1,2}(?:\.\d+)?|\d+\.\d+)\s*\]?\s*(.*)$/;
  lines = [];
  LYRICS_RAW.split('\n').forEach((row, n) => {
    if (!row.trim()) return;
    const m = re.exec(row);
    if (m) lines.push({ time: parseTime(m[1]), text: m[2].trim() });
    else console.warn('Baris lirik tanpa waktu diabaikan (baris ' + (n + 1) + ')');
  });
  lines.sort((a, b) => a.time - b.time);
}
const hasLy = () => lines.some(l => l.text);
function setS(s, label) {
  S = s; $('status').textContent = label || s.toUpperCase();
  const busy = s === 'playing' || s === 'buffering';
  $('pp').textContent = busy ? '❚❚' : '▶';
  $('pp').setAttribute('aria-label', busy ? 'Jeda' : 'Putar');
}
function msg(t, retry) { $('msg').textContent = t || ''; $('retry').hidden = !retry; }

function idx(t) { let i = -1; for (let k = 0; k < lines.length && t >= lines[k].time; k++) i = k; return i; }
function lyric(i) {
  if (i === cur) return; cur = i;
  const el = $('lyric'); el.classList.add('out');
  setTimeout(() => {
    if (cur !== i) return;
    const l = id => (showLy && lines[id]) ? lines[id].text : '';
    el.textContent = l(i); el.classList.toggle('hot', HOT.includes(i));
    $('prev').textContent = l(i - 1); $('next').textContent = l(i + 1);
    el.classList.remove('out');
  }, rm ? 0 : 280);
}
function sync() {
  const t = au.currentTime || 0, d = au.duration;
  $('tm').textContent = fmt(t) + ' / ' + fmt(dur());
  if (!drag && isFinite(d) && d > 0) $('sk').value = Math.round(t / d * 1000);
  lyric(idx(t));
  return t;
}

// Mood scene mengikuti posisi audio nyata (bukan timer buatan)
function mood(t, d) {
  let g = 1 - .55 * ss(16, 46, t);
  let b = t < 52.7 ? 0 : t < 60.5 ? ss(52.7, 60.5, t) : t < 65.3 ? 1 : 1 - .55 * ss(65.3, 72, t);
  let s = t < 65 ? ss(28.7, 36, t) : 1 - .5 * ss(65, 72, t);
  outro = ss(78.755, d, t); g = Math.max(.15, g - .3 * outro);
  if (S === 'ended') { g = .12; b = .6; }
  setVar('--g', g); setVar('--b', b); setVar('--s', s); setVar('--c', ss(40, 50, t));
}

function size() {
  const dpr = Math.min(devicePixelRatio || 1, fine ? 2 : 1.5);
  W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr;
  if (cx) cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const n = W < 600 ? 55 : 110, m = W < 600 ? 28 : 55;
  rain = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, l: 10 + Math.random() * 26, v: 380 + Math.random() * 520, a: .08 + Math.random() * .22 }));
  dust = Array.from({ length: m }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, r: .6 + Math.random() * 1.8, a: .1 + Math.random() * .35, p: Math.random() * 6.28, g: i % 2 }));
}
function draw(dt, now) {
  if (!cx) return;
  cx.clearRect(0, 0, W, H);
  if (!fx) return;
  const run = S === 'playing', al = S === 'ended' ? .35 : 1 - .6 * outro;
  cx.lineWidth = 1; cx.lineCap = 'round';
  for (const r of rain) {
    if (run) { r.y += r.v * dt; r.x -= r.v * dt * .18; if (r.y > H + r.l) { r.y = -r.l; r.x = Math.random() * W * 1.2; } if (r.x < -20) r.x = W + 10; }
    cx.strokeStyle = 'rgba(150,175,225,' + (r.a * al) + ')';
    cx.beginPath(); cx.moveTo(r.x, r.y); cx.lineTo(r.x + r.l * .18, r.y - r.l); cx.stroke();
  }
  for (const d of dust) { // dua kelompok partikel perlahan menjauh seiring lagu
    if (run) { d.p += dt * .4; d.y -= dt * (6 + d.r * 4); if (d.y < -5) d.y = H + 5; }
    const x = d.x + Math.sin(d.p) * 14 + (d.g ? 1 : -1) * sep * W * .16;
    cx.fillStyle = 'rgba(190,205,235,' + (d.a * (1 - .5 * sep) * al) + ')';
    cx.beginPath(); cx.arc(x, d.y, d.r, 0, 6.283); cx.fill();
  }
  // Garis equalizer DEKORATIF (bukan analisis audio real-time)
  const n = 44, bw = 3, gap = 5, x0 = W / 2 - n * (bw + gap) / 2, y0 = H * .5;
  for (let i = 0; i < n; i++) {
    const a = run ? .55 + .45 * Math.sin(now / 310 + i * .7) * Math.sin(now / 970 + i * .21) : .12;
    cx.fillStyle = 'rgba(127,155,208,' + ((.16 + .2 * a) * al) + ')';
    const h = 4 + a * a * 30; cx.fillRect(x0 + i * (bw + gap), y0 - h / 2, bw, h);
  }
}
function tick(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  const t = sync(), d = dur();
  sep += (ss(24, 46, t) - sep) * Math.min(1, dt * 2);
  mood(t, d);
  try { draw(dt, now); } catch (e) { console.error('Canvas error, efek dimatikan:', e); fx = false; }
}
// Satu loop rAF saja; berhenti saat pause/ended/error/tab tersembunyi
function frame(now) { tick(now); raf = (S === 'playing' || S === 'buffering') && !document.hidden ? requestAnimationFrame(frame) : 0; }
function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
const once = () => tick(performance.now());

function play() {
  const p = au.play();
  if (p) p.catch(e => {
    setS('paused');
    msg(e.name === 'NotAllowedError' ? 'Browser menahan pemutaran. Tekan Play lagi.' : 'Gagal memutar: ' + e.message, true);
  });
}
// Audio events: currentTime = sumber waktu utama
on(au, 'loadedmetadata', sync); on(au, 'durationchange', sync);
on(au, 'playing', () => { setS('playing'); msg(hasLy() ? '' : HINT); kick(); });
on(au, 'pause', () => { if (!au.ended && S !== 'error') { setS('paused'); once(); } });
on(au, 'waiting', () => { if (!au.paused) setS('buffering'); });
on(au, 'seeking', sync); on(au, 'seeked', () => { sync(); if (S !== 'playing') once(); });
on(au, 'timeupdate', () => { if (!raf) sync(); });
on(au, 'ended', () => { setS('ended'); msg('the night goes quiet'); once(); });
on(au, 'error', () => {
  setS('error'); const c = au.error && au.error.code;
  msg('Audio gagal dimuat' + (c ? ' (kode ' + c + ')' : '') + '. Periksa koneksi atau sumber audio.', true); once();
});
on(document, 'visibilitychange', () => { if (!document.hidden) { once(); if (S === 'playing') kick(); } });

// Kontrol
const enter = () => { $('gate').hidden = true; if (au.ended) au.currentTime = 0; play(); };
on($('enter'), 'click', enter);
on($('pp'), 'click', () => { $('gate').hidden = true; if (au.paused || au.ended) { if (au.ended) au.currentTime = 0; play(); } else au.pause(); });
on($('rs'), 'click', () => { $('gate').hidden = true; au.currentTime = 0; if (au.paused) play(); });
on($('retry'), 'click', () => { setS('idle', 'LOADING'); msg(''); au.load(); play(); });
on($('sk'), 'input', () => { drag = true; const d = au.duration; if (isFinite(d) && d > 0) { au.currentTime = $('sk').value / 1000 * d; sync(); } });
on($('sk'), 'change', () => { drag = false; });
on($('vl'), 'input', e => { au.volume = +e.target.value; au.muted = au.volume === 0; });
on($('mu'), 'click', () => { au.muted = !au.muted; $('mu').setAttribute('aria-pressed', au.muted); $('mu').textContent = au.muted ? 'MUTE' : 'VOL'; });
on($('ly'), 'click', () => { showLy = !showLy; $('ly').setAttribute('aria-pressed', showLy); $('ly').textContent = showLy ? 'Lyrics' : 'Show Lyrics'; cur = -2; sync(); });
on($('ef'), 'click', () => { fx = !fx; $('ef').setAttribute('aria-pressed', fx); once(); });
const zen = z => { document.body.classList.toggle('zen', z); $('unzen').hidden = !z; };
on($('zn'), 'click', () => zen(true)); on($('unzen'), 'click', () => zen(false));
on(document, 'keydown', e => {
  if (e.code === 'Space' && !/^(BUTTON|INPUT|TEXTAREA)$/.test(e.target.tagName)) { e.preventDefault(); $('pp').click(); }
  if (e.key === 'Escape') zen(false);
});
if (fine && !rm) on(window, 'pointermove', e => { setVar('--px', e.clientX / innerWidth - .5); setVar('--py', e.clientY / innerHeight - .5); }, { passive: true });
let rt; on(window, 'resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); once(); }, 150); });

au.volume = .8; load(); size(); setS('idle', 'READY'); msg(hasLy() ? '' : HINT); once();
})();
