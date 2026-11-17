// Тірі атмосфера: бір canvas, әр теманың өз бөлшектері мен қозғалыстары.
// createAtmosphere(canvas, theme, {manual,width,height,dpr}) -> {step,draw,resize,destroy}
const TAU = Math.PI * 2, R = Math.random, rr = (a, b) => a + R() * (b - a), pick = (a) => a[(R() * a.length) | 0];
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const hx = (c, a) => { const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const SP = {};
function spr(c, soft) {
  const k = c + (soft ? 's' : '');
  if (SP[k]) return SP[k];
  const e = document.createElement('canvas'); e.width = e.height = 64;
  const g = e.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, hx(c, soft ? 0.9 : 1)); r.addColorStop(soft ? 0.5 : 0.35, hx(c, soft ? 0.45 : 0.35)); r.addColorStop(1, hx(c, 0));
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return (SP[k] = e);
}
const LEAF = new Path2D('M0 -1C.8 -.6 .8 .5 0 1C-.8 .5 -.8 -.6 0 -1Z');
const MAPLE = new Path2D('M0 -1L.25 -.45 .8 -.7 .55 -.1 1 .1 .3 .35 .3 1 0 .75 -.3 1 -.3 .35 -1 .1 -.55 -.1 -.8 -.7 -.25 -.45Z');
const PETAL = new Path2D('M0 -.7C.5 -1.1 1 -.4 .6 .5C.3 1 -.3 1 -.6 .5C-1 -.4 -.5 -1.1 0 -.7Z');
const HEART = new Path2D('M0 .8C-1.4-.2-.8-1 0-.4 .8-1 1.4-.2 0 .8Z');

// ── Риф тіршілігі: балықтар (өз дизайным), ұсақ балықтар, медуза ──────────────
function outline(c, w = 1.6) { c.strokeStyle = '#14202b'; c.lineWidth = w; c.lineJoin = 'round'; c.stroke(); }
function eye(c, x, y, r) {
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = '#fff'; c.fill(); outline(c, 1.1);
  c.beginPath(); c.arc(x + r * 0.28, y + r * 0.08, r * 0.52, 0, TAU); c.fillStyle = '#111'; c.fill();
  c.beginPath(); c.arc(x + r * 0.5, y - r * 0.2, r * 0.2, 0, TAU); c.fillStyle = '#fff'; c.fill();
}
// Қызғылт-сары жолақты риф балығы (клоун-балық типі), оңға қарап тұр
function drawClown(c, wag) {
  c.save(); c.translate(-20, 0); c.rotate(Math.sin(wag) * 0.38);
  c.beginPath(); c.moveTo(2, 0); c.quadraticCurveTo(-8, -15, -21, -11); c.quadraticCurveTo(-13, 0, -21, 11); c.quadraticCurveTo(-8, 15, 2, 0);
  c.fillStyle = '#FF8A1F'; c.fill(); outline(c); c.restore();
  c.beginPath(); c.moveTo(-10, -11); c.quadraticCurveTo(-1, -25, 13, -11); c.fillStyle = '#FF8A1F'; c.fill(); outline(c);
  const g = c.createRadialGradient(4, -6, 2, 0, 0, 28); g.addColorStop(0, '#FFB550'); g.addColorStop(1, '#F26A0C');
  c.beginPath(); c.ellipse(0, 0, 25, 15.5, 0, 0, TAU); c.fillStyle = g; c.fill();
  c.save(); c.clip();
  const bands = [[-9, 7], [8, 6]];
  c.fillStyle = '#FFFFFF'; bands.forEach(([x, w]) => c.fillRect(x - w / 2, -20, w, 40));
  c.strokeStyle = '#14202b'; c.lineWidth = 1.3;
  bands.forEach(([x, w]) => { c.beginPath(); c.moveTo(x - w / 2, -20); c.lineTo(x - w / 2, 20); c.moveTo(x + w / 2, -20); c.lineTo(x + w / 2, 20); c.stroke(); });
  c.restore();
  c.beginPath(); c.ellipse(0, 0, 25, 15.5, 0, 0, TAU); outline(c, 1.8);
  c.save(); c.translate(3, 6); c.rotate(Math.sin(wag * 1.4) * 0.5 - 0.3); c.beginPath(); c.ellipse(-4, 4, 8, 4.5, 0.4, 0, TAU); c.fillStyle = '#FF9A33'; c.fill(); outline(c, 1.2); c.restore();
  eye(c, 15, -3.5, 4.8);
  c.beginPath(); c.arc(20.5, 3.4, 3, 0.2, 1.7); c.strokeStyle = '#14202b'; c.lineWidth = 1.2; c.stroke();
}
// Көк-сары рифтік балық (хирург-балық типі)
function drawTang(c, wag) {
  c.save(); c.translate(-23, 0); c.rotate(Math.sin(wag) * 0.4);
  c.beginPath(); c.moveTo(3, 0); c.lineTo(-13, -17); c.quadraticCurveTo(-7, 0, -13, 17); c.closePath(); c.fillStyle = '#FFD42E'; c.fill(); outline(c); c.restore();
  c.beginPath(); c.moveTo(-16, -15); c.quadraticCurveTo(0, -30, 18, -13); c.lineTo(8, -10); c.lineTo(-10, -10); c.closePath(); c.fillStyle = '#1F4FC9'; c.fill(); outline(c, 1.3);
  c.beginPath(); c.moveTo(-14, 15); c.quadraticCurveTo(0, 27, 12, 13); c.lineTo(-6, 11); c.closePath(); c.fillStyle = '#1F4FC9'; c.fill(); outline(c, 1.3);
  const g = c.createRadialGradient(4, -8, 2, 0, 0, 30); g.addColorStop(0, '#62A2FF'); g.addColorStop(1, '#1E49C2');
  c.beginPath(); c.ellipse(0, 0, 26, 18, 0, 0, TAU); c.fillStyle = g; c.fill();
  c.save(); c.clip(); c.strokeStyle = '#0B1530'; c.lineWidth = 6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-12, -14); c.quadraticCurveTo(12, -12, 8, 0); c.quadraticCurveTo(4, 10, -14, 15); c.stroke(); c.restore();
  c.beginPath(); c.ellipse(0, 0, 26, 18, 0, 0, TAU); outline(c, 1.8);
  c.save(); c.translate(6, 7); c.rotate(Math.sin(wag * 1.4) * 0.5 - 0.2); c.beginPath(); c.ellipse(-3, 4, 9, 4.5, 0.4, 0, TAU); c.fillStyle = '#FFD42E'; c.fill(); outline(c, 1.2); c.restore();
  eye(c, 16, -4, 5.2);
  c.beginPath(); c.arc(22, 3.5, 2.6, 0.2, 1.6); c.strokeStyle = '#14202b'; c.lineWidth = 1.1; c.stroke();
}
function drawTiny(c, wag, col) {
  c.save(); c.translate(-8, 0); c.rotate(Math.sin(wag) * 0.5); c.beginPath(); c.moveTo(2, 0); c.lineTo(-7, -5); c.lineTo(-7, 5); c.closePath(); c.fillStyle = col; c.fill(); c.restore();
  c.beginPath(); c.ellipse(0, 0, 9, 5, 0, 0, TAU); c.fillStyle = col; c.fill();
  c.beginPath(); c.ellipse(-1, 2, 6, 2, 0, 0, TAU); c.fillStyle = 'rgba(255,255,255,.45)'; c.fill();
  c.beginPath(); c.arc(5, -1.2, 1.3, 0, TAU); c.fillStyle = '#10202a'; c.fill();
}


export function createAtmosphere(canvas, theme, opts = {}) {
  const ctx = canvas.getContext('2d');
  const S = { t: 0, W: 0, H: 0, wind: 0, rain: 0, storm: 0, dpr: 1, q: 1 };
  const LIGHT = new Set(['day', 'dawn', 'mint', 'autumn', 'winter', 'treasure', 'sakura', 'lavender', 'retro', 'clouds']);
  const comp = () => (LIGHT.has(theme) ? 'source-over' : 'lighter');
  // SVG-фонмен бірдей координата: телефонда фон төменгі 54%-ға тіркеледі (xMidYMax slice)
  const P = (x, y) => { const bh = S.W <= 640 ? S.H * 0.54 : S.H, sc = Math.max(S.W / 1000, bh / 700); return [(S.W - 1000 * sc) / 2 + x * sc, S.H - 700 * sc + y * sc, sc]; };
  const pos = (o, fx = 0.5, fy = 0.5) => (o.at ? P(o.at[0], o.at[1]) : [S.W * (o.fx ?? fx), S.H * (o.fy ?? fy), 1]);
  const N = (n) => Math.max(1, Math.round(n * S.q));
  const area = (o) => { const a = o.area || [0, 1, 0, 1]; return [a[0] * S.W, a[1] * S.W, a[2] * S.H, a[3] * S.H]; };

  const L = {
    stars(o) {
      let st = [], sh = null, nx = rr(2, 5);
      return {
        init() { st = Array.from({ length: N(o.n || 60) }, () => ({ x: R() * S.W, y: R() * S.H * (o.maxY || 0.75), r: rr(0.5, 1.8), ph: R() * TAU, sp: rr(0.8, 2.6), z: rr(0.2, 1) })); },
        step(dt) {
          if (o.drift) st.forEach((s) => { s.x += s.z * o.drift * dt; if (s.x > S.W) s.x = 0; });
          nx -= dt; if (o.shoot && nx < 0 && !sh) { sh = { x: rr(0.2, 0.9) * S.W, y: rr(0.02, 0.3) * S.H, l: 0 }; nx = rr(4, 9); }
          if (sh) { sh.l += dt; sh.x -= 420 * dt; sh.y += 190 * dt; if (sh.l > 1.1) sh = null; }
        },
        draw() {
          st.forEach((s) => { ctx.globalAlpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(s.ph + S.t * s.sp)); ctx.fillStyle = o.c; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); });
          if (sh) { const a = 1 - sh.l / 1.1, g = ctx.createLinearGradient(sh.x, sh.y, sh.x + 150, sh.y - 68); g.addColorStop(0, hx(o.sc || '#ffffff', a)); g.addColorStop(1, hx(o.sc || '#ffffff', 0)); ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x + 150, sh.y - 68); ctx.stroke(); }
        },
      };
    },
    snow(o) {
      let f = [];
      return {
        init() { f = Array.from({ length: N(o.n || 100) }, () => { const z = rr(0.3, 1); return { x: R() * S.W, y: R() * S.H, z, r: 1 + z * 3, ph: R() * TAU, sw: rr(0.6, 1.6) }; }); },
        step(dt) {
          S.storm = o.storm ? cl(Math.sin((S.t * TAU) / o.storm) * 1.5) : 0;
          f.forEach((s) => { s.y += (28 + 70 * s.z) * dt * (1 + S.storm * 0.5); s.x += (S.wind * 30 + S.storm * 170 + Math.sin(S.t * s.sw + s.ph) * 22) * s.z * dt; if (s.y > S.H + 6) { s.y = -6; s.x = R() * S.W; } if (s.x > S.W + 10) s.x = -10; if (s.x < -10) s.x = S.W + 10; });
          if (o.storm) S.stormA = S.storm;
        },
        draw() { if (S.storm) { ctx.fillStyle = hx('#dfeaf5', 0.22 * S.storm); ctx.fillRect(0, 0, S.W, S.H); } f.forEach((s) => { const d = s.r * 3.2; ctx.globalAlpha = 0.5 * s.z; ctx.drawImage(spr('#6f9cc4'), s.x - d * 0.7, s.y - d * 0.7, d * 1.4, d * 1.4); ctx.globalAlpha = 0.95; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.75, 0, TAU); ctx.fill(); }); },
      };
    },
    rain(o) {
      let d = [], ring = [];
      return {
        init() { d = Array.from({ length: N(o.n || 90) }, () => ({ x: R() * S.W, y: R() * S.H, v: rr(650, 1000), l: rr(12, 26), g: rr(0.86, 0.99) * S.H, c: o.cs ? pick(o.cs) : o.c })); },
        step(dt) {
          S.rain = o.cycle ? cl(Math.sin((S.t * TAU) / o.cycle - 1.2) * 1.6 + 0.2) : 1;
          const act = Math.floor(d.length * S.rain), sl = 0.25 + S.wind * 0.18;
          for (let i = 0; i < act; i++) { const p = d[i]; p.y += p.v * dt; p.x += p.v * sl * dt; if (p.y > p.g) { if (ring.length < 40 && R() < 0.5) ring.push({ x: p.x, y: p.y, r: 1, a: 0.5, c: p.c }); p.y = -20; p.x = R() * S.W * 1.2 - S.W * 0.1; p.g = rr(0.86, 0.99) * S.H; } }
          ring.forEach((r) => { r.r += 24 * dt; r.a -= 1.1 * dt; }); ring = ring.filter((r) => r.a > 0);
        },
        draw() {
          if (o.dim) { ctx.fillStyle = hx('#1c2540', o.dim * S.rain); ctx.fillRect(0, 0, S.W, S.H); }
          const act = Math.floor(d.length * S.rain), sl = 0.25 + S.wind * 0.18; ctx.lineCap = 'round'; ctx.lineWidth = 1.3;
          for (let i = 0; i < act; i++) { const p = d[i]; ctx.strokeStyle = hx(p.c, 0.55); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.l * sl, p.y - p.l); ctx.stroke(); }
          ring.forEach((r) => { ctx.strokeStyle = hx(r.c, r.a * 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * 1.6, r.r * 0.5, 0, 0, TAU); ctx.stroke(); });
        },
      };
    },
    leaf(o) {
      let a = [];
      const mk = (top) => ({ x: R() * S.W, y: top ? -20 : R() * S.H, s: rr(...o.s), vy: rr(26, 58), ph: R() * TAU, sw: rr(0.8, 1.8), rot: R() * TAU, vr: rr(-1.5, 1.5), c: pick(o.cs), fl: R() * TAU, m: o.shape === 'mix' ? (R() < 0.5 ? MAPLE : LEAF) : o.shape === 'petal' ? PETAL : LEAF });
      return {
        init() { a = Array.from({ length: N(o.n || 20) }, () => mk(false)); },
        step(dt) { a.forEach((l, i) => { l.y += l.vy * dt; l.x += (S.wind * 38 + Math.cos(S.t * l.sw + l.ph) * (o.sway || 34)) * dt; l.rot += l.vr * dt; l.fl += dt * 2.2; if (l.y > S.H + 24 || l.x > S.W + 40 || l.x < -40) a[i] = mk(true); }); },
        draw() { a.forEach((l) => { ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.rot + Math.sin(S.t * l.sw + l.ph) * 0.5); ctx.scale(l.s * (0.35 + 0.65 * Math.abs(Math.cos(l.fl))), l.s); ctx.fillStyle = l.c; ctx.globalAlpha = 0.9; ctx.fill(l.m); ctx.restore(); }); },
      };
    },
    float(o) {
      let a = [];
      const mk = (first) => {
        const [x0, x1, y0, y1] = area(o), s = rr(...(o.s || [3, 6])), at = o.at ? P(o.at[0], o.at[1]) : null;
        const rise = o.m === 'rise';
        return { x: at ? at[0] + rr(-14, 14) : rr(x0, x1), y: at ? at[1] : rise && !first ? S.H + 30 : rr(y0, y1), s, ph: R() * TAU, sp: rr(0.8, 2.2), v: rr(...(o.v || [10, 24])), hd: R() * TAU, c: o.cs ? pick(o.cs) : o.c, life: rr(2, 5), a: rr(...(o.a || [0.4, 0.9])) };
      };
      return {
        init() { a = Array.from({ length: N(o.n || 20) }, () => mk(true)); },
        step(dt) {
          a.forEach((p, i) => {
            if (o.m === 'rise') { p.y -= p.v * dt; p.x += Math.sin(S.t * p.sp + p.ph) * 14 * dt + S.wind * 8 * dt; p.life -= dt; if (p.y < -40 || (o.at && p.life < 0)) a[i] = mk(false); }
            else { p.hd += rr(-1, 1) * 2 * dt; p.x += Math.cos(p.hd) * p.v * 0.6 * dt + S.wind * 6 * dt; p.y += Math.sin(p.hd) * p.v * 0.4 * dt; if (p.x < -20) p.x = S.W + 20; if (p.x > S.W + 20) p.x = -20; if (p.y < -20) p.y = S.H + 20; if (p.y > S.H + 20) p.y = -20; }
          });
        },
        draw() {
          a.forEach((p) => {
            const bl = o.blink ? 0.35 + 0.65 * Math.max(0, Math.sin(S.t * p.sp + p.ph)) : 1;
            if (o.shape === 'dot' || o.shape === 'ember') { ctx.globalCompositeOperation = comp(); ctx.globalAlpha = p.a * bl * (o.at ? cl(p.life / 2) : 1); const d = p.s * 4; ctx.drawImage(spr(p.c), p.x - d / 2, p.y - d / 2, d, d); }
            else if (o.shape === 'bubble') { ctx.globalAlpha = p.a * 0.8; ctx.strokeStyle = p.c; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(p.x - p.s * 0.35, p.y - p.s * 0.35, p.s * 0.2, 0, TAU); ctx.fill(); }
            else if (o.shape === 'butterfly') { const fl = Math.abs(Math.sin(S.t * 9 + p.ph)); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.hd + Math.PI / 2); ctx.fillStyle = p.c; ctx.globalAlpha = 0.9; [-1, 1].forEach((sd) => { ctx.save(); ctx.scale(sd * (0.25 + fl), 1); ctx.beginPath(); ctx.ellipse(p.s * 0.6, -p.s * 0.3, p.s * 0.7, p.s * 0.45, -0.4, 0, TAU); ctx.ellipse(p.s * 0.5, p.s * 0.4, p.s * 0.45, p.s * 0.3, 0.4, 0, TAU); ctx.fill(); ctx.restore(); }); ctx.fillStyle = '#3a2a2a'; ctx.fillRect(-1, -p.s * 0.6, 2, p.s * 1.2); ctx.restore(); }
            else if (o.shape === 'lantern') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55; const d = p.s * 7; ctx.drawImage(spr('#FFB347'), p.x - d / 2, p.y - d / 2, d, d); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.95; ctx.fillStyle = '#F5A83A'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(p.x - p.s * 0.8, p.y - p.s, p.s * 1.6, p.s * 2, 4); else ctx.rect(p.x - p.s * 0.8, p.y - p.s, p.s * 1.6, p.s * 2); ctx.fill(); ctx.fillStyle = '#7a3b12'; ctx.fillRect(p.x - p.s * 0.8, p.y - p.s, p.s * 1.6, 2); ctx.fillRect(p.x - p.s * 0.8, p.y + p.s - 2, p.s * 1.6, 2); }
            else if (o.shape === 'balloon') { ctx.globalAlpha = 0.92; ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s * 0.8, p.s, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7a5a5a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y + p.s); ctx.quadraticCurveTo(p.x + 5 * Math.sin(S.t + p.ph), p.y + p.s * 1.6, p.x, p.y + p.s * 2.1); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(p.x - p.s * 0.3, p.y - p.s * 0.35, p.s * 0.18, p.s * 0.3, 0.5, 0, TAU); ctx.fill(); }
            else if (o.shape === 'note') { ctx.globalAlpha = p.a * cl(p.life / 1.2); ctx.fillStyle = p.c; ctx.font = `${Math.round(p.s * 3.4)}px serif`; ctx.textAlign = 'center'; ctx.fillText(p.ph > 3.1 ? '\u266A' : '\u266B', p.x, p.y); }
            else if (o.shape === 'heart') { ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s, p.s); ctx.fillStyle = p.c; ctx.globalAlpha = p.a * 0.7; ctx.fill(HEART); ctx.restore(); }
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
          });
        },
      };
    },
    cloud(o) {
      let a = [];
      const mk = (first) => { const s = rr(...o.s), [y0, y1] = o.y; return { x: first ? R() * S.W : -s * 2, y: rr(y0, y1) * S.H, s, v: rr(...o.v), pf: [[0, 0, 1], [0.55, 0.12, 0.75], [-0.5, 0.15, 0.7], [0.1, -0.2, 0.7]] }; };
      return {
        init() { a = Array.from({ length: N(o.n || 4) }, () => mk(true)); },
        step(dt) { a.forEach((c, i) => { c.x += c.v * dt * (1 + S.wind * 0.3); if (c.x > S.W + c.s * 2) a[i] = mk(false); }); },
        draw() { ctx.globalCompositeOperation = o.add ? 'lighter' : 'source-over'; ctx.globalAlpha = o.a; a.forEach((c) => c.pf.forEach(([dx, dy, k]) => { const w = c.s * k * 2.4, h = c.s * k * (o.flat || 1); ctx.drawImage(spr(o.cs ? o.cs[0] : o.c, true), c.x + dx * c.s - w / 2, c.y + dy * c.s - h / 2, w, h); })); },
      };
    },
    bird(o) {
      let fl = [], nx = 1;
      return {
        init() { fl = []; },
        step(dt) {
          nx -= dt; if (nx < 0 && fl.length < 2) { const dir = R() < 0.5 ? 1 : -1; fl.push({ x: dir > 0 ? -40 : S.W + 40, y: rr(0.08, 0.4) * S.H, dir, n: 3 + ((R() * 4) | 0), ph: R() * TAU }); nx = o.every * rr(0.7, 1.3); }
          fl.forEach((f) => { f.x += f.dir * 46 * dt; f.y += Math.sin(S.t * 0.5 + f.ph) * 4 * dt; }); fl = fl.filter((f) => f.x > -80 && f.x < S.W + 80);
        },
        draw() { ctx.strokeStyle = o.c; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; fl.forEach((f) => { for (let i = 0; i < f.n; i++) { const bx = f.x - f.dir * Math.ceil(i / 2) * 18, by = f.y + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 9, w = Math.sin(S.t * 7 + i + f.ph) * o.s * 0.8; ctx.beginPath(); ctx.moveTo(bx - o.s, by - w * 0.5 + 2); ctx.quadraticCurveTo(bx - o.s * 0.4, by - o.s * 0.5 - w, bx, by); ctx.quadraticCurveTo(bx + o.s * 0.4, by - o.s * 0.5 - w, bx + o.s, by - w * 0.5 + 2); ctx.stroke(); } }); },
      };
    },
    eagle(o) {
      let x = 0, y = 0, dir = 1;
      return {
        init() { x = S.W * 0.3; },
        step(dt) { const nx = S.W * (0.5 + 0.52 * Math.sin(S.t * 0.09)); dir = nx > x ? 1 : -1; x = nx; y = S.H * (0.16 + 0.05 * Math.sin(S.t * 0.17)) + Math.sin(S.t * 0.6) * 4; },
        draw() { const fl = Math.sin(S.t * 1.4) * 0.35 + Math.sin(S.t * 0.35) * 0.2, sc = Math.min(S.W / 390, 1.4) * 1.1; ctx.save(); ctx.translate(x, y); ctx.scale(dir * sc, sc); ctx.rotate(Math.sin(S.t * 0.4) * 0.06); ctx.fillStyle = hx('#05101f', 0.92);
          [-1, 1].forEach((sd) => { ctx.save(); ctx.scale(sd, 1); ctx.beginPath(); ctx.moveTo(0, -2); ctx.bezierCurveTo(14, -12 - fl * 26, 38, -16 - fl * 40, 64, -6 - fl * 52); ctx.lineTo(56, -2 - fl * 40); ctx.lineTo(60, 2 - fl * 30); ctx.lineTo(48, 3 - fl * 22); ctx.lineTo(50, 8 - fl * 14); ctx.bezierCurveTo(30, 6, 12, 10, 0, 12); ctx.fill(); ctx.restore(); });
          ctx.beginPath(); ctx.ellipse(0, 5, 6, 12, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(8, -8, 4.2, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(11, -9); ctx.lineTo(18, -6); ctx.lineTo(11, -5); ctx.fill(); ctx.beginPath(); ctx.moveTo(-4, 14); ctx.lineTo(0, 28); ctx.lineTo(4, 14); ctx.fill(); ctx.restore(); },
      };
    },
    aurora(o) {
      const gs = o.cs.map((c) => { const e = document.createElement('canvas'); e.width = 1; e.height = 128; const g = e.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, hx(c, 0)); gr.addColorStop(0.55, hx(c, 0.55)); gr.addColorStop(1, hx(c, 0)); g.fillStyle = gr; g.fillRect(0, 0, 1, 128); return e; });
      return { draw() { ctx.globalCompositeOperation = 'lighter'; gs.forEach((g, k) => { for (let x = 0; x < S.W; x += 6) { const y0 = S.H * (0.2 + k * 0.1) + Math.sin(x * 0.011 + S.t * (0.35 + k * 0.12) + k * 2) * S.H * 0.05, h = S.H * 0.3 * (0.65 + 0.35 * Math.sin(x * 0.02 - S.t * 0.5 + k)); ctx.globalAlpha = (0.32 + 0.2 * Math.sin(S.t * 0.3 + x * 0.004 + k)) * o.a; ctx.drawImage(g, x, y0 - h * 0.2, 7, h); } }); } };
    },
    smoke(o) {
      let a = [], nx = 0;
      return {
        init() { a = []; },
        step(dt) { nx -= dt; const [ax, ay, s] = P(...o.at); if (nx < 0) { a.push({ x: ax + rr(-3, 3), y: ay, r: 5 * s, l: 0 }); nx = 0.32; } a.forEach((p) => { p.l += dt; p.y -= 24 * dt * (P(0, 0)[2]); p.x += (S.wind * 20 + 8 + Math.sin(p.l * 2) * 6) * dt; p.r += 11 * dt; }); a = a.filter((p) => p.l < 5); },
        draw() { a.forEach((p) => { ctx.globalAlpha = o.a * (1 - p.l / 5) * cl(p.l * 2); const d = p.r * 2; ctx.drawImage(spr(o.c, true), p.x - d / 2, p.y - d / 2, d, d); }); },
      };
    },
    glow(o) {
      return { draw() { ctx.globalCompositeOperation = 'lighter'; o.pts.forEach((g, i) => { const [x, y, s] = g.at ? P(...g.at) : [S.W * g.fx, S.H * g.fy, 1], fk = g.flick === 0 ? 1 : 0.78 + 0.22 * Math.sin(S.t * 11 + i * 2) * Math.sin(S.t * 5.3 + i) + (g.pulse ? 0.2 * Math.sin(S.t * g.pulse + i) : 0); ctx.globalAlpha = cl(g.a * fk, 0, 1); const d = g.r * 2 * s; ctx.drawImage(spr(g.c), x - d / 2, y - d / 2, d, d); }); } };
    },
    sweep(o) {
      return { draw() { const dur = 1.8, p = (S.t % o.every) / dur; if (p > 1) return; const x = -S.W * 0.3 + p * S.W * 1.6, g = ctx.createLinearGradient(x, 0, x + S.W * 0.28, S.H * 0.25); g.addColorStop(0, hx(o.c, 0)); g.addColorStop(0.5, hx(o.c, o.a)); g.addColorStop(1, hx(o.c, 0)); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, S.W, S.H); } };
    },
    rays(o) {
      return { draw() { const [x, y, s] = o.at ? P(...o.at) : [S.W * o.fx, S.H * o.fy, 1], gate = o.gate === 'dry' ? 1 - S.rain : 1; ctx.globalCompositeOperation = comp(); for (let i = 0; i < (o.n || 6); i++) { const an = 1.15 + i * 0.22 + Math.sin(S.t * 0.12 + i) * 0.05 + (o.spin ? S.t * 0.03 : 0), w = 0.05 + 0.03 * Math.sin(S.t * 0.4 + i * 1.7), L2 = Math.max(S.W, S.H) * 1.6, g = ctx.createLinearGradient(x, y, x + Math.cos(an) * L2, y + Math.sin(an) * L2); g.addColorStop(0, hx(o.c, o.a * gate * (0.7 + 0.3 * Math.sin(S.t * 0.7 + i)))); g.addColorStop(1, hx(o.c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(an - w) * L2, y + Math.sin(an - w) * L2); ctx.lineTo(x + Math.cos(an + w) * L2, y + Math.sin(an + w) * L2); ctx.fill(); } } };
    },
    ripple(o) {
      let a = [], nx = 0;
      return {
        init() { a = []; },
        step(dt) { nx -= dt; if (nx < 0) { const [x0, x1, y0, y1] = area(o); a.push({ x: rr(x0, x1), y: rr(y0, y1), r: 2, a: 0.7 }); nx = o.every * rr(0.6, 1.4); } a.forEach((r) => { r.r += 16 * dt; r.a -= 0.4 * dt; }); a = a.filter((r) => r.a > 0); },
        draw() { ctx.lineWidth = 1.2; a.forEach((r) => { ctx.strokeStyle = hx(o.c, r.a); [1, 0.6].forEach((k) => { ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * k * 2, r.r * k * 0.6, 0, 0, TAU); ctx.stroke(); }); }); },
      };
    },
    sparkle(o) {
      let a = [];
      return {
        init() { const [x0, x1, y0, y1] = area(o); a = Array.from({ length: N(o.n || 12) }, () => ({ x: rr(x0, x1), y: rr(y0, y1), s: rr(...(o.s || [4, 9])), ph: R() * TAU, sp: rr(0.8, 2) })); },
        draw() { ctx.globalCompositeOperation = comp(); ctx.fillStyle = o.c; a.forEach((p) => { const k = Math.max(0, Math.sin(S.t * p.sp + p.ph)) ** 3; if (k < 0.02) return; ctx.globalAlpha = k; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 4 * 0); ctx.beginPath(); ctx.moveTo(0, -p.s * k); ctx.lineTo(p.s * 0.18, 0); ctx.lineTo(0, p.s * k); ctx.lineTo(-p.s * 0.18, 0); ctx.moveTo(-p.s * k, 0); ctx.lineTo(0, p.s * 0.18); ctx.lineTo(p.s * k, 0); ctx.lineTo(0, -p.s * 0.18); ctx.fill(); ctx.restore(); }); },
      };
    },
    waves(o) {
      return { draw() { for (let k = 0; k < (o.n || 3); k++) { const by = S.H * (o.y + k * 0.045); ctx.globalAlpha = o.a * (1 - k * 0.15); ctx.fillStyle = o.c; ctx.beginPath(); ctx.moveTo(0, S.H); for (let x = 0; x <= S.W + 10; x += 10) ctx.lineTo(x, by + Math.sin(x * 0.02 + S.t * (0.9 + k * 0.3) + k * 2) * (6 + k * 2) + Math.sin(x * 0.007 - S.t * 0.4) * 5); ctx.lineTo(S.W, S.H); ctx.fill(); ctx.strokeStyle = hx('#ffffff', 0.18 * o.a * 3); ctx.lineWidth = 1; ctx.stroke(); } } };
    },
    ornament(o) {
      return { draw() { ctx.lineWidth = 2.2; ctx.lineCap = 'round'; const m = o.m || 26; for (let x = 4; x < S.W; x += m) { const hl = Math.max(0, Math.sin(x / 70 - S.t * 1.8)); ctx.strokeStyle = hx(o.c, 0.3 + 0.6 * hl); ctx.fillStyle = hx(o.c, 0.3 + 0.6 * hl); [o.y ?? 12].concat(o.bottom ? [S.H - 12] : []).forEach((y) => { ctx.beginPath(); ctx.arc(x + 6, y, 6, Math.PI, 0); ctx.arc(x + 18, y, 6, Math.PI, 0, true); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 12, y - 9, 1.8, 0, TAU); ctx.fill(); }); } } };
    },
    grain(o) {
      let sc = 0;
      return { step(dt) { sc = R() < 0.03 ? 0.12 : Math.max(0, sc - dt); }, draw() { ctx.fillStyle = hx(o.c, 0.2); for (let i = 0; i < 70; i++) ctx.fillRect(R() * S.W, R() * S.H, 1.2, 1.2); if (sc > 0) { ctx.strokeStyle = hx('#ffffff', 0.35); ctx.beginPath(); const x = R() * S.W; ctx.moveTo(x, 0); ctx.lineTo(x + 2, S.H); ctx.stroke(); } ctx.fillStyle = hx('#ffcf8a', 0.025 + 0.02 * Math.sin(S.t * 9)); ctx.fillRect(0, 0, S.W, S.H); } };
    },
    carpet(o) {
      return { draw() { const T = 26, p = (S.t % T) / T, x = -60 + p * (S.W + 120), y = S.H * 0.3 + Math.sin(S.t * 0.8) * 12 + p * 30, tilt = Math.cos(S.t * 0.8) * 0.12; ctx.save(); ctx.translate(x, y); ctx.rotate(tilt + 0.05); ctx.fillStyle = '#8C2F6B'; ctx.beginPath(); ctx.moveTo(-30, -2 + Math.sin(S.t * 5) * 1.5); ctx.quadraticCurveTo(0, -6 + Math.sin(S.t * 4 + 1) * 3, 30, -2); ctx.lineTo(26, 6); ctx.quadraticCurveTo(0, 10 + Math.sin(S.t * 4) * 2, -26, 6); ctx.fill(); ctx.strokeStyle = '#F5C458'; ctx.lineWidth = 1.5; ctx.stroke(); for (let i = -24; i <= 24; i += 6) { ctx.beginPath(); ctx.moveTo(i, 7); ctx.lineTo(i + Math.sin(S.t * 6 + i) * 2, 12); ctx.stroke(); } ctx.fillStyle = '#F5C458'; ctx.fillRect(-4, -1, 8, 4); ctx.restore(); ctx.globalCompositeOperation = 'lighter'; for (let i = 1; i < 9; i++) { ctx.globalAlpha = 0.5 - i * 0.055; const d = 10 - i; ctx.drawImage(spr('#F5C458'), x - i * 9 - d / 2, y + 6 + Math.sin(S.t * 3 + i) * 3, d, d); } } };
    },
    // ── Риф ────────────────────────────────────────────────────────────────
    seaweed(o) {
      const blades = o.xs.map((x, i) => ({ x, h: o.h[0] + (((i * 37) % 11) / 11) * (o.h[1] - o.h[0]), ph: i * 1.7, w: 7 + (i % 3) * 2, c: o.cs[i % o.cs.length] }));
      return { draw() {
        ctx.lineCap = 'round'; ctx.globalAlpha = o.a;
        blades.forEach((b) => {
          const [bx, by, s] = P(b.x, o.y), N2 = 10, Ln = b.h * s; let px = bx, py = by; ctx.strokeStyle = b.c;
          for (let k = 1; k <= N2; k++) { const f = k / N2, x = bx + Math.sin(S.t * 1.3 + b.ph + f * 2.4) * 17 * s * f * f + S.wind * 5 * s * f, y = by - Ln * f; ctx.lineWidth = b.w * s * (1 - f * 0.75); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke(); px = x; py = y; }
        });
      } };
    },
    anemone(o) {
      return { draw() {
        const [cx, cy, s] = P(...o.at); ctx.lineCap = 'round';
        for (let i = 0; i < 17; i++) {
          const off = (i - 8) * 3.4 * s, L2 = (38 + (i % 3) * 8) * s, sw = Math.sin(S.t * 1.7 + i * 0.9) * 9 * s, dx = (i - 8) * 1.6 * s;
          const bx = cx + off, by = cy - Math.abs(i - 8) * 0.5 * s;
          ctx.strokeStyle = o.cs[i % o.cs.length]; ctx.lineWidth = 5.2 * s; ctx.globalAlpha = 0.95;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + dx * 0.5 + sw * 0.5, by - L2 * 0.55, bx + dx + sw, by - L2); ctx.stroke();
          ctx.fillStyle = '#FFE3F2'; ctx.beginPath(); ctx.arc(bx + dx + sw, by - L2, 2.7 * s, 0, TAU); ctx.fill();
        }
      } };
    },
    fish(o) {
      let f = null, bub = [];
      const k = () => Math.max(0.85, S.W / 390) * (o.size || 1);
      return {
        init() { f = { x: S.W * (o.x0 ?? 0.2), y: S.H * 0.7, fl: 1, dir: 1, ph: R() * TAU, nb: rr(0.5, 2), flip: rr(7, 13), vy: 0, tilt: 0, by: S.H * rr(...(o.band || [0.67, 0.77])) }; bub = []; },
        step(dt) {
          const sc = Math.max(0.85, S.W / 390), oy = f.y, ox = f.x;
          if (o.mode === 'home') {
            const [cx, cy, s] = P(...o.home), a = S.t * 0.5 + f.ph; f.x = cx + Math.sin(a) * o.rx * s; f.y = cy + Math.sin(a * 2) * o.ry * s; f.dir = Math.cos(a) >= 0 ? 1 : -1;
          } else {
            f.x += f.dir * o.v * sc * dt; f.flip -= dt;
            if (f.x > S.W - 50 * sc) f.dir = -1; else if (f.x < 50 * sc) f.dir = 1; else if (f.flip < 0) { f.dir = -f.dir; f.flip = rr(7, 13); }
            f.y = f.by + Math.sin(S.t * 0.8 + f.ph) * S.H * 0.035;
          }
          f.fl += (f.dir - f.fl) * Math.min(1, dt * 6);
          f.vy = dt > 0 ? (f.y - oy) / dt : 0; f.tilt = cl(f.vy * 0.012, -0.35, 0.35) * (Math.abs(f.fl) > 0.5 ? 1 : 0);
          f.nb -= dt; if (f.nb < 0) { bub.push({ x: f.x + f.dir * 24 * k(), y: f.y - 4 * k(), r: rr(1.6, 3.4), l: 0, ph: R() * TAU }); f.nb = rr(1.2, 2.8); }
          bub.forEach((b) => { b.l += dt; b.y -= 30 * dt; b.x += Math.sin(S.t * 3 + b.ph) * 8 * dt; }); bub = bub.filter((b) => b.l < 3.4);
          void ox;
        },
        draw() {
          ctx.globalAlpha = 1; ctx.save(); ctx.translate(f.x, f.y); ctx.scale(f.fl * k(), k()); ctx.rotate(f.tilt);
          (o.type === 'clown' ? drawClown : drawTang)(ctx, S.t * 9 + f.ph); ctx.restore();
          ctx.lineWidth = 1.1; bub.forEach((b) => { ctx.globalAlpha = cl(1 - b.l / 3.4) * 0.8; ctx.strokeStyle = '#D8F6FF'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); });
        },
      };
    },
    school(o) {
      let L2 = null, fs = [];
      return {
        init() { L2 = { x: S.W * 0.85, y: S.H * rr(...o.band), dir: -1, fl: -1, flip: rr(8, 14), by: 0 }; L2.by = L2.y; fs = Array.from({ length: o.n || 9 }, (_, i) => ({ ox: (i % 3) * 15 + R() * 8, oy: (((i / 3) | 0) - 1) * 13 + R() * 6, ph: R() * TAU, c: pick(o.cs) })); },
        step(dt) {
          const sc = Math.max(0.85, S.W / 390); L2.x += L2.dir * o.v * sc * dt; L2.flip -= dt;
          if (L2.x > S.W - 40) L2.dir = -1; else if (L2.x < 40) L2.dir = 1; else if (L2.flip < 0) { L2.dir = -L2.dir; L2.flip = rr(8, 14); }
          L2.fl += (L2.dir - L2.fl) * Math.min(1, dt * 4); L2.y = L2.by + Math.sin(S.t * 0.7) * S.H * 0.03;
        },
        draw() {
          const k = Math.max(0.85, S.W / 390) * (o.size || 0.7);
          fs.forEach((q) => { const x = L2.x - L2.fl * q.ox * k, y = L2.y + q.oy * k + Math.sin(S.t * 2.2 + q.ph) * 4 * k; ctx.save(); ctx.globalAlpha = 0.95; ctx.translate(x, y); ctx.scale(L2.fl * k, k); drawTiny(ctx, S.t * 12 + q.ph, q.c); ctx.restore(); });
        },
      };
    },
    jelly(o) {
      const js = o.xs.map((x, i) => ({ x, y: o.y + i * 30, ph: i * 2.1 }));
      return { draw() {
        ctx.globalCompositeOperation = 'lighter';
        js.forEach((j) => {
          const [bx, by, s] = P(j.x, j.y), x = bx + Math.sin(S.t * 0.3 + j.ph) * 14 * s, y = by + Math.sin(S.t * 0.5 + j.ph) * 16 * s, pu = 1 + 0.13 * Math.sin(S.t * 2.2 + j.ph), r = 17 * s * (o.size || 1);
          ctx.globalAlpha = 0.55; const g = ctx.createRadialGradient(x, y - r * 0.3, 1, x, y, r * 1.2); g.addColorStop(0, '#FFD0F2'); g.addColorStop(1, '#8A5CF0');
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r * pu, r * 0.8 / pu, 0, Math.PI, 0); ctx.quadraticCurveTo(x, y + r * 0.25, x - r * pu, y); ctx.fill();
          ctx.strokeStyle = '#E8B8FF'; ctx.lineWidth = 1.6 * s; ctx.lineCap = 'round'; ctx.globalAlpha = 0.5;
          for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * r * 0.32, y); ctx.quadraticCurveTo(x + i * r * 0.32 + Math.sin(S.t * 2 + i + j.ph) * 7 * s, y + r * 0.9, x + i * r * 0.32 + Math.sin(S.t * 2 + i * 1.3 + j.ph) * 9 * s, y + r * 1.8); ctx.stroke(); }
        });
      } };
    },

    vinyl(o) {
      return { draw() {
        const [cx, cy, s] = P(...o.at), r = o.r * s, ang = S.t * 2.4;
        ctx.save(); ctx.translate(cx, cy);
        ctx.fillStyle = 'rgba(40,24,18,.9)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1; [0.9, 0.78, 0.66, 0.54].forEach((f) => { ctx.beginPath(); ctx.arc(0, 0, r * f, 0, TAU); ctx.stroke(); });
        ctx.rotate(ang); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 0.95, -0.35, 0.05); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 0.95, Math.PI - 0.35, Math.PI + 0.05); ctx.fill();
        ctx.fillStyle = '#C0504F'; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, TAU); ctx.fill(); ctx.fillStyle = '#F6E7CF'; ctx.beginPath(); ctx.arc(r * 0.12, 0, r * 0.06, 0, TAU); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, 0, r * 0.04, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = '#8A6A48'; ctx.lineWidth = 2.6 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + r * 1.15, cy - r * 0.9); ctx.lineTo(cx + r * 0.5, cy - r * 0.15); ctx.stroke(); ctx.fillStyle = '#6A4A2E'; ctx.beginPath(); ctx.arc(cx + r * 1.15, cy - r * 0.9, 4 * s, 0, TAU); ctx.fill();
      } };
    },
  };

  const N1 = (k, o) => ({ k, ...o });
  const SPEC = {
    day: [N1('rays', { at: [690, 115], c: '#FFD27A', n: 6, a: 0.22 }), N1('float', { m: 'drift', shape: 'dot', n: 34, c: '#F0B84A', s: [2, 5], blink: 1 }), N1('bird', { every: 26, c: '#7a5a3c', s: 5 })],
    night: [N1('stars', { n: 80, c: '#FFFFFF', shoot: 1, sc: '#FFF4C2' }), N1('cloud', { n: 3, c: '#6A5AA8', a: 0.1, y: [0.1, 0.45], s: [120, 200], v: [3, 6], flat: 0.5 }), N1('float', { m: 'drift', shape: 'dot', n: 10, c: '#F0C75E', s: [2, 4], blink: 1 })],
    dawn: [N1('cloud', { n: 5, c: '#FFFFFF', a: 0.4, y: [0.05, 0.5], s: [110, 190], v: [5, 11], flat: 0.5 }), N1('float', { m: 'rise', shape: 'balloon', n: 4, cs: ['#F28F7A', '#F6C65B', '#8AC6E8', '#C79BE0'], s: [18, 26], v: [7, 13] }), N1('bird', { every: 16, c: '#6a4a5a', s: 5 }), N1('float', { m: 'drift', shape: 'dot', n: 18, c: '#FFB98A', s: [2, 4], blink: 1 })],
    mint: [N1('leaf', { n: 12, cs: ['#7FA870', '#9CC08A', '#5E8C5A'], shape: 'leaf', s: [7, 12], sway: 28 }), N1('float', { m: 'drift', shape: 'butterfly', n: 5, cs: ['#F2A5C4', '#F7D26B', '#9CC7F0'], s: [8, 13], v: [24, 40] }), N1('float', { m: 'drift', shape: 'dot', n: 26, c: '#E8C94A', s: [2, 4], blink: 1 })],
    velvet: [N1('sweep', { every: 6, c: '#FFE391', a: 0.16 }), N1('float', { m: 'rise', shape: 'ember', n: 26, c: '#F0D27A', s: [2, 4], v: [8, 20] }), N1('sparkle', { n: 12, c: '#FFE391', area: [0.05, 0.95, 0.1, 0.9] })],
    autumn: [N1('rays', { at: [700, -20], c: '#FFC070', n: 6, a: 0.24, gate: 'dry' }), N1('leaf', { n: 30, cs: ['#B85C2B', '#D99132', '#8B3F2C', '#C9482B', '#E3A94A'], shape: 'mix', s: [8, 15], sway: 40 }), N1('rain', { n: 110, c: '#9aa8b4', cycle: 36, dim: 0.16 })],
    winter: [N1('snow', { n: 120, storm: 40 }), N1('smoke', { at: [570, 455], c: '#d5dfeb', a: 0.6 }), N1('glow', { pts: [{ at: [642, 584], r: 55, c: '#FFC85A', a: 0.7, pulse: 1.5 }] }), N1('sparkle', { n: 12, c: '#5E9AD0', area: [0, 1, 0.55, 1] })],
    treasure: [N1('waves', { y: 0.78, n: 3, c: '#4d7f7b', a: 0.2 }), N1('sparkle', { n: 10, c: '#D9A62E', area: [0, 1, 0.5, 0.95] }), N1('float', { m: 'drift', shape: 'dot', n: 18, c: '#C9A24F', s: [2, 4], blink: 1 }), N1('bird', { every: 20, c: '#5a4a3a', s: 6 })],
    aurora: [N1('stars', { n: 70, c: '#D5FFF0', shoot: 1, sc: '#B8FFE6' }), N1('aurora', { cs: ['#5EF0B4', '#B58CFF', '#4ac7ff'], a: 1 }), N1('float', { m: 'drift', shape: 'dot', n: 22, c: '#D5FFF0', s: [1.5, 3], blink: 1 })],
    galaxy: [N1('cloud', { n: 3, cs: ['#7A4FD8'], a: 0.22, y: [0.1, 0.7], s: [160, 260], v: [2, 4], add: 1, flat: 0.7 }), N1('stars', { n: 110, c: '#FFFFFF', shoot: 1, sc: '#C9A8FF', drift: 6, maxY: 1 }), N1('float', { m: 'drift', shape: 'dot', n: 14, c: '#A98CFF', s: [2, 5], blink: 1 })],
    gold: [N1('rays', { at: [500, 270], c: '#FFD96A', n: 9, a: 0.1, spin: 1 }), N1('sweep', { every: 5, c: '#FFE9A8', a: 0.18 }), N1('float', { m: 'rise', shape: 'ember', n: 30, c: '#F5D27A', s: [2, 4.5], v: [10, 26] }), N1('sparkle', { n: 14, c: '#FFF1C4', area: [0.05, 0.95, 0.1, 0.9] })],
    sakura: [N1('leaf', { n: 38, cs: ['#F4A9C4', '#F8C4D6', '#EE8FB0', '#FFFFFF'], shape: 'petal', s: [6, 11], sway: 46 }), N1('ripple', { c: '#FFFFFF', every: 1.6, area: [0.1, 0.9, 0.82, 0.96] }), N1('float', { m: 'drift', shape: 'dot', n: 16, c: '#FF8FB8', s: [2, 4], blink: 1 })],
    ocean: [N1('rays', { at: [750, -20], c: '#9BEFFF', n: 7, a: 0.14 }), N1('seaweed', { xs: [188, 250, 342, 438, 512, 640, 700, 790, 812], y: 584, h: [70, 135], cs: ['#2FB58A', '#46D6A0', '#1F8F78'], a: 0.85 }), N1('school', { n: 9, cs: ['#FFE066', '#FFD24A', '#FFF0A0'], band: [0.8, 0.86], v: 26, size: 0.7 }), N1('fish', { type: 'tang', mode: 'roam', band: [0.67, 0.76], v: 52, size: 1.15, x0: 0.15 }), N1('anemone', { at: [480, 580], cs: ['#FF6FB5', '#FF8FCB', '#E0489A'] }), N1('fish', { type: 'clown', mode: 'home', home: [480, 505], rx: 125, ry: 22, size: 0.95 }), N1('jelly', { xs: [255, 735], y: 300, size: 1 }), N1('waves', { y: 0.74, n: 3, c: '#67D9E8', a: 0.07 }), N1('float', { m: 'rise', shape: 'bubble', n: 24, c: '#BDEFFF', s: [2, 7], v: [18, 46] }), N1('float', { m: 'drift', shape: 'dot', n: 14, c: '#67D9E8', s: [3, 6], blink: 1 })],
    lavender: [N1('cloud', { n: 3, c: '#FFFFFF', a: 0.35, y: [0.6, 0.9], s: [140, 220], v: [2, 4], flat: 0.35 }), N1('float', { m: 'drift', shape: 'butterfly', n: 4, cs: ['#E8A6D0', '#B79AE8', '#FFE08A'], s: [8, 12], v: [24, 40] }), N1('leaf', { n: 9, cs: ['#B79AE8', '#D4B8F5'], shape: 'petal', s: [5, 8], sway: 30 }), N1('float', { m: 'drift', shape: 'dot', n: 22, c: '#B79AE8', s: [2, 4], blink: 1 })],
    sunset: [N1('glow', { pts: [{ at: [500, 270], r: 190, c: '#FFB074', a: 0.4, pulse: 0.8, flick: 0 }] }), N1('cloud', { n: 4, c: '#FFB48A', a: 0.35, y: [0.1, 0.45], s: [110, 190], v: [4, 8], flat: 0.4 }), N1('bird', { every: 12, c: '#2d183a', s: 5 }), N1('sparkle', { n: 14, c: '#FFD9A8', area: [0, 1, 0.82, 0.98] })],
    retro: [N1('grain', { c: '#3a2010' }), N1('glow', { pts: [{ fx: 0.2, fy: 0.2, r: 230, c: '#FFB35A', a: 0.14, pulse: 0.6, flick: 0 }] }), N1('float', { m: 'drift', shape: 'dot', n: 16, c: '#B98B62', s: [1.5, 3], v: [5, 12] }), N1('float', { m: 'rise', shape: 'heart', n: 5, c: '#C0504F', s: [6, 10], v: [10, 20], a: [0.3, 0.6] }), N1('vinyl', { at: [300, 515], r: 64 }), N1('float', { m: 'rise', shape: 'note', n: 6, at: [300, 470], c: '#9E3F3F', s: [5, 8], v: [18, 30] })],
    neon: [N1('rain', { n: 100, cs: ['#4CF4FF', '#FF4FD8'], dim: 0 }), N1('glow', { pts: [{ at: [540, 325], r: 90, c: '#4CF4FF', a: 0.5, pulse: 2 }, { at: [785, 375], r: 90, c: '#4CF4FF', a: 0.4, pulse: 1.3 }, { at: [95, 350], r: 80, c: '#4CF4FF', a: 0.4, pulse: 1.7 }, { at: [300, 405], r: 90, c: '#FF4FD8', a: 0.5, pulse: 2.3 }, { at: [690, 445], r: 80, c: '#FF4FD8', a: 0.45, pulse: 1.1 }, { at: [930, 480], r: 70, c: '#FF4FD8', a: 0.4, pulse: 1.9 }] }), N1('float', { m: 'rise', shape: 'heart', n: 7, c: '#FF4FD8', s: [6, 10], v: [14, 30], a: [0.4, 0.8] }), N1('float', { m: 'drift', shape: 'dot', n: 16, c: '#4CF4FF', s: [2, 4], blink: 1 })],
    clouds: [N1('rays', { at: [720, -40], c: '#FFE08A', n: 5, a: 0.3 }), N1('cloud', { n: 4, c: '#FFFFFF', a: 0.85, y: [0.08, 0.5], s: [90, 150], v: [6, 12], flat: 0.55 }), N1('cloud', { n: 3, c: '#FFFFFF', a: 0.55, y: [0.4, 0.85], s: [120, 200], v: [3, 6], flat: 0.45 }), N1('bird', { every: 14, c: '#4d6c80', s: 6 }), N1('float', { m: 'drift', shape: 'dot', n: 16, c: '#FFD36A', s: [2, 4], blink: 1 })],
    kazakh: [N1('stars', { n: 90, c: '#FFF8DF', shoot: 1, sc: '#F5D57A' }), N1('eagle', {}), N1('smoke', { at: [500, 382], c: '#cfd8e6', a: 0.4 }), N1('glow', { pts: [{ at: [500, 572], r: 70, c: '#FFB44D', a: 0.6 }, { at: [300, 582], r: 95, c: '#FF8A2A', a: 0.55 }] }), N1('float', { m: 'rise', shape: 'ember', n: 16, at: [300, 578], c: '#FFB44D', s: [2, 4], v: [24, 52] }), N1('float', { m: 'drift', shape: 'dot', n: 20, c: '#F5D57A', s: [2, 4], blink: 1, area: [0, 1, 0.6, 0.95] }), N1('ornament', { c: '#F5D57A', y: 14 })],
    arabian: [N1('stars', { n: 80, c: '#FFF6D8', shoot: 1, sc: '#F5C458' }), N1('carpet', {}), N1('float', { m: 'rise', shape: 'lantern', n: 7, s: [5, 8], v: [10, 20], a: [0.8, 1] }), N1('sparkle', { n: 16, c: '#F5C458', area: [0, 1, 0.05, 0.8] }), N1('ornament', { c: '#F5C458', y: 14 })],
  };

  let layers = [];
  const build = () => { layers = (SPEC[theme] || []).map((o) => L[o.k](o)); layers.forEach((l) => l.init && l.init()); };
  function resize() {
    const r = canvas.getBoundingClientRect();
    S.W = opts.width || r.width || window.innerWidth; S.H = opts.height || r.height || window.innerHeight;
    S.dpr = Math.min(opts.dpr || window.devicePixelRatio || 1, 2); S.q = S.W < 430 || (navigator.hardwareConcurrency || 8) <= 4 ? 0.7 : 1;
    canvas.width = S.W * S.dpr; canvas.height = S.H * S.dpr; ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); build();
  }
  function step(dt) { S.t += dt; S.wind = Math.sin(S.t * 0.23) * 0.6 + Math.sin(S.t * 0.07 + 1) * 0.4 + S.storm * 0.8; layers.forEach((l) => l.step && l.step(dt)); }
  function draw() { ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); ctx.clearRect(0, 0, S.W, S.H); layers.forEach((l) => { ctx.save(); ctx.globalAlpha = 1; l.draw && l.draw(); ctx.restore(); }); }
  resize();
  let raf = 0, last = 0, on = false;
  const frame = (ts) => { if (!on) return; const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts; step(dt); draw(); raf = requestAnimationFrame(frame); };
  const start = () => { if (on) return; on = true; last = performance.now(); raf = requestAnimationFrame(frame); };
  const vis = () => (document.hidden ? ((on = false), cancelAnimationFrame(raf)) : start());
  const rs = () => resize();
  if (!opts.manual) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { for (let i = 0; i < 100; i++) step(0.06); draw(); }
    else { start(); document.addEventListener('visibilitychange', vis); window.addEventListener('resize', rs); }
  }
  return { step, draw, resize, destroy() { on = false; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', vis); window.removeEventListener('resize', rs); } };
}

// Қосымша үшін: тақырыпты ауыстырғанда canvas-ты қайта пайдаланады
export function startAtmosphere(canvas, theme) {
  let cur = theme;
  let a = createAtmosphere(canvas, theme);
  return {
    setTheme(next) { if (next === cur) return; a.destroy(); cur = next; a = createAtmosphere(canvas, next); },
    destroy() { a.destroy(); },
  };
}
