/* City Bloxxx - browser remake of the Nokia-era tower stacking classic.
   Pure canvas, no dependencies. Internal resolution 176x208 (Series 40 style). */
'use strict';
(() => {
  // ------------------------------------------------------------------ constants
  const W = 176, H = 208;
  const GROUND_Y = 188;      // screen y of ground surface when camera is at 0
  const BW = 40, BH = 22;    // block size
  const PIVOT_Y = 17;        // crane trolley pivot (screen y)
  const ROPE = 34;           // rope length
  const TOP_TARGET = 126;    // screen y where the tower top settles
  const GRAV = 540;
  const RELEASE = 0.5;       // fraction of swing momentum kept on release
  const LOT_W = 56;
  const SAVE_KEY = 'citybloxxx.v1';

  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;

  // ------------------------------------------------------------------ utils
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const easeOut = (t) => 1 - (1 - t) * (1 - t);
  const R = (col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(x | 0, y | 0, w, h); };

  function pixLine(x0, y0, x1, y1, col) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    ctx.fillStyle = col;
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, guard = 0;
    for (;;) {
      ctx.fillRect(x0, y0, 1, 1);
      if ((x0 === x1 && y0 === y1) || ++guard > 600) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // ------------------------------------------------------------------ 5x7 bitmap font
  const FONT_SRC = {
    'A': '.###.|#...#|#...#|#####|#...#|#...#|#...#',
    'B': '####.|#...#|#...#|####.|#...#|#...#|####.',
    'C': '.###.|#...#|#....|#....|#....|#...#|.###.',
    'D': '####.|#...#|#...#|#...#|#...#|#...#|####.',
    'E': '#####|#....|#....|####.|#....|#....|#####',
    'F': '#####|#....|#....|####.|#....|#....|#....',
    'G': '.###.|#...#|#....|#.###|#...#|#...#|.####',
    'H': '#...#|#...#|#...#|#####|#...#|#...#|#...#',
    'I': '.###.|..#..|..#..|..#..|..#..|..#..|.###.',
    'J': '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
    'K': '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
    'L': '#....|#....|#....|#....|#....|#....|#####',
    'M': '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
    'N': '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#',
    'O': '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
    'P': '####.|#...#|#...#|####.|#....|#....|#....',
    'Q': '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
    'R': '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
    'S': '.####|#....|#....|.###.|....#|....#|####.',
    'T': '#####|..#..|..#..|..#..|..#..|..#..|..#..',
    'U': '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
    'V': '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
    'W': '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.',
    'X': '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
    'Y': '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
    'Z': '#####|....#|...#.|..#..|.#...|#....|#####',
    '0': '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
    '1': '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
    '2': '.###.|#...#|....#|...#.|..#..|.#...|#####',
    '3': '####.|....#|....#|.###.|....#|....#|####.',
    '4': '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
    '5': '#####|#....|####.|....#|....#|#...#|.###.',
    '6': '..##.|.#...|#....|####.|#...#|#...#|.###.',
    '7': '#####|....#|...#.|..#..|.#...|.#...|.#...',
    '8': '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
    '9': '.###.|#...#|#...#|.####|....#|...#.|.##..',
    ' ': '.....|.....|.....|.....|.....|.....|.....',
    '.': '.....|.....|.....|.....|.....|.##..|.##..',
    ',': '.....|.....|.....|.....|.##..|..#..|.#...',
    '!': '..#..|..#..|..#..|..#..|..#..|.....|..#..',
    '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
    ':': '.....|.##..|.##..|.....|.##..|.##..|.....',
    '-': '.....|.....|.....|.###.|.....|.....|.....',
    '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
    '/': '....#|....#|...#.|..#..|.#...|#....|#....',
    "'": '..#..|..#..|.#...|.....|.....|.....|.....',
    '(': '...#.|..#..|.#...|.#...|.#...|..#..|...#.',
    ')': '.#...|..#..|...#.|...#.|...#.|..#..|.#...',
    '<': '...#.|..#..|.#...|#....|.#...|..#..|...#.',
    '>': '.#...|..#..|...#.|....#|...#.|..#..|.#...',
    '=': '.....|.....|#####|.....|#####|.....|.....',
    '*': '.....|#.#.#|.###.|#####|.###.|#.#.#|.....',
    '#': '.#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.',
    // icons
    '@': '.....|.#.#.|#####|#####|.###.|..#..|.....', // heart
    '$': '.###.|.###.|..#..|#####|..#..|.#.#.|#...#', // person
    '&': '#####|#.#.#|#####|#.#.#|#####|#.#.#|#####', // building
    '~': '...##|...#.|...#.|...#.|.##..|###..|.#...', // note
  };
  const FONT = {};
  for (const k in FONT_SRC) {
    const px = [];
    FONT_SRC[k].split('|').forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '#') px.push(x, y);
    });
    FONT[k] = px;
  }
  const textW = (s, sc = 1) => (s.length ? (s.length * 6 - 1) * sc : 0);
  function rawText(s, x, y, col, sc) {
    ctx.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]] || FONT['?'];
      const ox = x + i * 6 * sc;
      for (let j = 0; j < g.length; j += 2) ctx.fillRect(ox + g[j] * sc, y + g[j + 1] * sc, sc, sc);
    }
  }
  function text(s, x, y, col, opt) {
    const o = opt || {};
    const sc = o.sc || 1;
    s = String(s).toUpperCase();
    const w = textW(s, sc);
    if (o.align === 'center') x = Math.round(x - w / 2);
    else if (o.align === 'right') x = Math.round(x - w);
    if (o.outline) {
      for (const [ax, ay] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) {
        rawText(s, x + ax * sc, y + ay * sc, o.outline, sc);
      }
    }
    if (o.shadow) rawText(s, x + sc, y + sc, o.shadow, sc);
    rawText(s, x, y, col, sc);
  }

  // ------------------------------------------------------------------ audio
  const Snd = {
    ac: null, master: null, on: true,
    init() {
      if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume().catch(() => {}); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ac = new AC();
        this.master = this.ac.createGain();
        this.master.gain.value = 0.12;
        this.master.connect(this.ac.destination);
      } catch (e) { this.ac = null; }
    },
    tone(freq, dur, o) {
      if (!this.on || !this.ac) return;
      o = o || {};
      try {
        const c = this.ac, t0 = c.currentTime + (o.delay || 0) + 0.005;
        const osc = c.createOscillator(), g = c.createGain();
        osc.type = o.type || 'square';
        osc.frequency.setValueAtTime(freq, t0);
        if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
        const v = o.vol == null ? 0.6 : o.vol;
        g.gain.setValueAtTime(v, t0);
        g.gain.setValueAtTime(v, t0 + dur * 0.75);
        g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g); g.connect(this.master);
        osc.start(t0); osc.stop(t0 + dur + 0.03);
      } catch (e) { /* audio is optional */ }
    },
    seq(notes, step, o) {
      notes.forEach((n, i) => { if (n) this.tone(n, step * 0.92, Object.assign({}, o, { delay: i * step })); });
    },
    // Gran Vals (F. Tarrega, 1902) - the ringtone everyone remembers
    tune() {
      const e = 0.13, q = e * 2;
      const notes = [[659, e], [587, e], [370, q], [415, q], [554, e], [494, e], [294, q], [330, q], [494, e], [440, e], [277, q], [330, q], [440, q * 2]];
      let t = 0;
      for (const [f, d] of notes) { this.tone(f, d * 0.9, { delay: t, vol: 0.5 }); t += d; }
    },
    move() { this.tone(1250, 0.025, { vol: 0.25 }); },
    select() { this.tone(880, 0.05, { vol: 0.4 }); this.tone(1320, 0.07, { delay: 0.05, vol: 0.4 }); },
    drop() { this.tone(560, 0.07, { to: 240, vol: 0.35 }); },
    land() { this.tone(150, 0.08, { to: 60, vol: 0.8 }); this.tone(95, 0.07, { delay: 0.02, type: 'triangle', vol: 0.8 }); },
    perfect(combo) {
      const b = 523 * Math.pow(2, Math.min(combo, 12) / 12);
      this.land();
      this.seq([b, b * 1.26, b * 1.5, b * 2], 0.055, { vol: 0.4, delay: 0.04 });
    },
    life() { this.seq([523, 659, 784, 1047, 1319], 0.07, { vol: 0.4 }); },
    tip() { this.tone(300, 0.12, { to: 120, vol: 0.5 }); },
    miss() { this.tone(440, 0.5, { to: 55, type: 'sawtooth', vol: 0.35 }); },
    crash() { this.tone(110, 0.2, { to: 40, type: 'sawtooth', vol: 0.6 }); },
    over() { this.seq([523, 392, 330, 262, 196], 0.17, { vol: 0.45 }); },
  };

  // ------------------------------------------------------------------ persistence
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && typeof s === 'object') {
        return { best: +s.best || 0, floors: +s.floors || 0, games: +s.games || 0, sound: s.sound !== false };
      }
    } catch (e) { /* storage blocked */ }
    return { best: 0, floors: 0, games: 0, sound: true };
  }
  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ }
  }
  const save = loadSave();
  Snd.on = save.sound;

  // ------------------------------------------------------------------ block sprites
  const PALETTES = [
    { body: '#d89c5c', light: '#f4c88e', dark: '#9c6434', trim: '#5c3618' }, // sand
    { body: '#c9493f', light: '#ee8676', dark: '#8c2a24', trim: '#4e1210' }, // brick
    { body: '#4f86d0', light: '#92bdf2', dark: '#2d5594', trim: '#162e58' }, // blue
    { body: '#5fb04e', light: '#a2de88', dark: '#357a2a', trim: '#1a4414' }, // green
    { body: '#e3bd3a', light: '#fbe58e', dark: '#a07c14', trim: '#5a4408' }, // yellow
    { body: '#9c6cc8', light: '#cfa6f0', dark: '#64408e', trim: '#341c54' }, // purple
    { body: '#cfd4da', light: '#f4f6f8', dark: '#8c949e', trim: '#40464e' }, // concrete
  ];
  const palFor = (n) => Math.floor(n / 10) % PALETTES.length;
  const spriteCache = new Map();

  function getSprite(pi, ground, night, seed) {
    const mask = night ? Math.floor(seed * 8) : 0;
    const key = pi + '|' + (ground ? 1 : 0) + '|' + (night ? 1 : 0) + '|' + mask;
    let c = spriteCache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = BW; c.height = BH;
    const x = c.getContext('2d');
    const p = PALETTES[pi];
    const F = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    F(p.body, 0, 0, BW, BH);
    F(p.trim, 0, 0, BW, 1);
    F(p.light, 1, 1, BW - 2, 1);
    F(p.dark, 0, BH - 3, BW, 2);
    F(p.trim, 0, BH - 1, BW, 1);
    F(p.light, 1, 2, 1, BH - 5);
    F(p.dark, BW - 2, 2, 1, BH - 5);
    F(p.trim, 0, 0, 1, BH);
    F(p.trim, BW - 1, 0, 1, BH);
    const WX = [5, 16, 27];
    for (let k = 0; k < 3; k++) {
      const wx = WX[k];
      if (ground && k === 1) {
        // door + awning
        F('#d8343a', 15, 3, 10, 3);
        F('#ffffff', 17, 3, 2, 3);
        F('#ffffff', 21, 3, 2, 3);
        F(p.trim, 16, 7, 8, BH - 10);
        F(night ? '#c08a3a' : '#6b4220', 17, 8, 6, BH - 11);
        F(night ? '#ffe9a0' : '#9fd8ff', 18, 9, 4, 3);
        F('#ffd84a', 19, 14, 1, 1);
        F('#ffd84a', 20, 14, 1, 1);
        continue;
      }
      const lit = night && ((mask >> k) & 1);
      const glass = night ? (lit ? '#ffd24a' : '#1a2440') : '#9fd8ff';
      const hl = night ? (lit ? '#fff2b0' : '#2c3a60') : '#e6f7ff';
      F(p.trim, wx, 4, 8, 11);
      F(glass, wx + 1, 5, 6, 9);
      F(hl, wx + 1, 5, 2, 1);
      F(hl, wx + 1, 6, 1, 1);
      F(p.trim, wx + 1, 9, 6, 1);
      F(p.light, wx - 1, 15, 10, 1);
    }
    spriteCache.set(key, c);
    return c;
  }

  function drawBlock(pi, ground, night, seed, sx, sy, rot) {
    const spr = getSprite(pi, ground, night, seed);
    if (!rot || Math.abs(rot) < 0.02) {
      ctx.drawImage(spr, Math.round(sx - BW / 2), Math.round(sy - BH / 2));
      return;
    }
    ctx.save();
    ctx.translate(Math.round(sx), Math.round(sy));
    ctx.rotate(rot);
    ctx.drawImage(spr, -BW / 2, -BH / 2);
    ctx.restore();
  }

  // ------------------------------------------------------------------ backdrop
  const SKY = [
    [0, [92, 172, 252], [200, 236, 255]],
    [18, [72, 132, 236], [255, 206, 150]],
    [32, [52, 52, 130], [236, 120, 96]],
    [48, [14, 16, 52], [52, 48, 110]],
    [70, [2, 2, 12], [14, 14, 44]],
  ];
  function skyAt(f) {
    if (f <= SKY[0][0]) return [SKY[0][1], SKY[0][2]];
    for (let i = 0; i < SKY.length - 1; i++) {
      const a = SKY[i], b = SKY[i + 1];
      if (f < b[0]) {
        const t = (f - a[0]) / (b[0] - a[0]);
        return [a[1].map((v, k) => lerp(v, b[1][k], t)), a[2].map((v, k) => lerp(v, b[2][k], t))];
      }
    }
    const l = SKY[SKY.length - 1];
    return [l[1], l[2]];
  }
  const rgb = (c) => 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
  const nightOf = (camY) => clamp((camY / BH - 28) / 20, 0, 1);

  const STARS = Array.from({ length: 60 }, (_, i) => ({ x: hash(i + 1) * W, y: hash(i + 101) * H, p: hash(i + 201) * 6 }));
  const SKYLINE = [];
  {
    let x = 0, i = 0;
    while (x < 240) {
      const w = 12 + Math.floor(hash(i + 50) * 16);
      SKYLINE.push({ x, w, h: 18 + Math.floor(hash(i + 80) * 44), s: hash(i + 9) });
      x += w + 1 + Math.floor(hash(i + 33) * 4);
      i++;
    }
  }
  const SKYLINE_W = 240;

  function drawSky(g, t) {
    const f = g.camY / BH;
    const [top, bot] = skyAt(f);
    for (let y = 0; y < H; y += 8) {
      const k = y / H;
      R(rgb([lerp(top[0], bot[0], k), lerp(top[1], bot[1], k), lerp(top[2], bot[2], k)]), 0, y, W, 8);
    }
    const nf = nightOf(g.camY);
    if (nf > 0) {
      for (const s of STARS) {
        const sy = (s.y + g.camY * 0.06) % H;
        const tw = 0.55 + 0.45 * Math.sin(t * 2 + s.p);
        ctx.globalAlpha = nf * tw;
        R('#ffffff', s.x, sy, 1, 1);
      }
      ctx.globalAlpha = 1;
    }
    // sun / moon
    if (f < 40) {
      const sy = 40 + g.camY * 0.08;
      if (sy < H + 10) { R('#fff6c0', 136, sy, 10, 10); R('#fff6c0', 134, sy + 2, 14, 6); R('#ffffff', 138, sy + 2, 4, 3); }
    }
    if (nf > 0.3) {
      ctx.globalAlpha = Math.min(1, (nf - 0.3) * 2);
      R('#f2f2e0', 30, 34, 10, 10); R('#f2f2e0', 28, 36, 14, 6);
      R(rgb(top), 34, 33, 9, 9);
      ctx.globalAlpha = 1;
    }
  }

  function drawCloud(x, y, big, col, shade) {
    x = Math.round(x); y = Math.round(y);
    if (big) {
      R(col, x + 8, y, 16, 4); R(col, x + 3, y + 3, 28, 5); R(col, x, y + 7, 38, 5);
      R(shade, x + 1, y + 11, 36, 1);
    } else {
      R(col, x + 5, y, 10, 3); R(col, x + 1, y + 3, 20, 4); R(shade, x + 2, y + 6, 18, 1);
    }
  }
  function drawClouds(g) {
    const nf = nightOf(g.camY);
    const col = rgb([lerp(255, 70, nf), lerp(255, 74, nf), lerp(255, 110, nf)]);
    const shade = rgb([lerp(200, 50, nf), lerp(220, 52, nf), lerp(240, 84, nf)]);
    const py = g.camY * 0.6;
    const k0 = Math.floor((py - 60) / 70);
    for (let k = k0; k < k0 + 5; k++) {
      if (k < 1) continue;
      const cy = k * 70 + 60;
      const sy = GROUND_Y - (cy - py);
      if (sy < -20 || sy > H) continue;
      const span = W + 80;
      let x = (hash(k) * span + g.t * (3 + hash(k + 7) * 5) - g.camX * 0.25) % span;
      if (x < 0) x += span;
      drawCloud(x - 40, sy, hash(k + 3) > 0.5, col, shade);
    }
  }

  function drawSkyline(g) {
    const base = GROUND_Y + g.camY * 0.55;
    if (base - 70 > H) return;
    const nf = nightOf(g.camY);
    const body = '#7f9fc4', win = '#b6d0ea';
    let ox = (-g.camX * 0.3) % SKYLINE_W;
    if (ox > 0) ox -= SKYLINE_W;
    for (let rep = 0; rep < 2; rep++) {
      for (const b of SKYLINE) {
        const x = Math.round(ox + rep * SKYLINE_W + b.x);
        if (x > W || x + b.w < 0) continue;
        const y = Math.round(base - b.h);
        R(body, x, y, b.w, b.h);
        R('#6c8bb0', x + b.w - 2, y, 2, b.h);
        for (let wy = y + 3; wy < base - 3; wy += 5) {
          for (let wx = x + 2; wx < x + b.w - 3; wx += 4) {
            if (hash(wx * 3 + wy) > 0.35) R(nf > 0.5 && hash(wx + wy * 7) > 0.5 ? '#ffd24a' : win, wx, wy, 2, 2);
          }
        }
      }
    }
  }

  function drawTree(x, gy) {
    R('#6b4220', x - 1, gy - 7, 3, 7);
    R('#2f8a2a', x - 6, gy - 16, 13, 8); R('#2f8a2a', x - 4, gy - 19, 9, 3);
    R('#4cb83e', x - 4, gy - 16, 5, 3); R('#226a1e', x - 6, gy - 9, 13, 1);
  }
  function drawGround(g) {
    const gy = Math.round(GROUND_Y + g.camY);
    if (gy > H + 2) return;
    R('#4caf3c', 0, gy, W, 4);
    R('#2f7a28', 0, gy + 4, W, 1);
    R('#9a9aa2', 0, gy + 5, W, 3);
    R('#3b3d46', 0, gy + 8, W, H);
    const off = ((-g.camX) % 16 + 16) % 16;
    for (let x = off - 16; x < W; x += 16) R('#e8d84a', x, gy + 14, 8, 1);
    const lx = Math.round(-g.camX - LOT_W / 2);
    // trees & lamps around the lot
    drawTree(lx - 22, gy); drawTree(lx + LOT_W + 22, gy); drawTree(lx - 60, gy); drawTree(lx + LOT_W + 62, gy);
    R('#555a64', lx - 40, gy - 22, 1, 22); R('#ffe27a', lx - 42, gy - 23, 4, 2);
    // foundation slab
    R('#8d9097', lx, gy, LOT_W, 4);
    R('#c4c7cc', lx, gy, LOT_W, 1);
    for (let i = 0; i < 4; i++) {
      R(i % 2 ? '#222' : '#ffcc22', lx + i * 2, gy + 1, 2, 3);
      R(i % 2 ? '#ffcc22' : '#222', lx + LOT_W - 8 + i * 2, gy + 1, 2, 3);
    }
  }

  // ------------------------------------------------------------------ game model
  function newGame(demo) {
    return {
      demo: !!demo,
      blocks: [], n: 0,
      camY: 0, camX: -W / 2,
      hs: 8 * BH,
      swayAmp: 0, swayPhase: 0,
      phase: Math.random() * Math.PI * 2,
      t: 0,
      hang: false, spawnT: 1, cur: null,
      falling: null,
      particles: [], floats: [],
      lives: 3, pop: 0, combo: 0, bestCombo: 0, perfects: 0,
      shake: 0, nextT: 0, overT: 0, record: false,
    };
  }

  function swing(g) {
    return {
      amp: 0.6,
      w: 2.3 + Math.min(1.7, g.n * 0.045),
      drift: Math.min(20, g.n * 0.7),
    };
  }
  const pivotScreenX = (g, sp) => W / 2 + sp.drift * Math.sin(g.t * 0.7);
  const swayS = (g) => g.swayAmp * Math.sin(g.swayPhase);
  const deflAt = (g, h) => { const k = h / g.hs; return swayS(g) * k * k; };
  const blockX = (g, i) => g.blocks[i].cx + deflAt(g, (i + 0.5) * BH);
  const ropeLen = (g) => lerp(-BH - 14, ROPE, easeOut(g.spawnT));

  function hangPose(g) {
    const sp = swing(g);
    const th = sp.amp * Math.sin(g.phase);
    const thd = sp.amp * sp.w * Math.cos(g.phase);
    const L = ropeLen(g);
    const Rr = L + BH / 2;
    const psx = pivotScreenX(g, sp);
    const px = g.camX + psx;
    const py = g.camY + GROUND_Y - PIVOT_Y;
    const trolleyV = sp.drift * 0.7 * Math.cos(g.t * 0.7);
    return {
      th, thd, L, Rr, psx, px, py,
      cx: px + Rr * Math.sin(th),
      cy: py - Rr * Math.cos(th),
      vx: (Rr * thd * Math.cos(th) + trolleyV) * RELEASE,
      vy: Rr * thd * Math.sin(th) * RELEASE,
    };
  }

  function spawnBlock(g) {
    g.hang = true;
    g.spawnT = 0;
    g.cur = { pal: palFor(g.n), seed: Math.random() };
    g.phase = Math.random() * Math.PI * 2;
  }

  function sfx(g, name, arg) { if (!g.demo) Snd[name](arg); }
  function addFloat(g, txt, x, y, col, big) {
    g.floats.push({ txt, x, y, col, t: 0, big: !!big });
  }
  function dust(g, x, y, n, col) {
    for (let i = 0; i < n; i++) {
      g.particles.push({ x: x + rnd(-BW / 2, BW / 2), y: y + rnd(0, 3), vx: rnd(-40, 40), vy: rnd(10, 60), life: rnd(0.3, 0.7), col: col || '#e8e2d0', s: Math.random() < 0.3 ? 2 : 1 });
    }
  }
  function debris(g, x, y, pal) {
    const p = PALETTES[pal];
    for (let i = 0; i < 26; i++) {
      g.particles.push({ x: x + rnd(-BW / 2, BW / 2), y: y + rnd(0, BH), vx: rnd(-90, 90), vy: rnd(40, 160), life: rnd(0.5, 1.1), col: [p.body, p.dark, p.trim, '#9fd8ff'][i % 4], s: Math.random() < 0.5 ? 2 : 3, grav: true });
    }
  }

  function drop(g) {
    if (!g.hang || g.spawnT < 1 || g.falling) return false;
    const p = hangPose(g);
    g.falling = { x: p.cx, y: p.cy, vx: p.vx, vy: p.vy, rot: -p.th, vr: 0, pal: g.cur.pal, seed: g.cur.seed, mode: 'drop' };
    g.hang = false;
    sfx(g, 'drop');
    return true;
  }

  function land(g, f, dx) {
    const n = g.n;
    const h = (n + 0.5) * BH;
    const cx = f.x - deflAt(g, h);
    g.blocks.push({ cx, pal: f.pal, seed: f.seed });
    g.n++;
    const adx = Math.abs(dx);
    const perfect = adx <= 3;
    const base = 10 + Math.floor(g.n / 5) * 2;
    const sx = f.x - g.camX, sy = GROUND_Y - (h - g.camY);
    let gain;
    if (perfect) {
      g.combo++;
      g.perfects++;
      g.bestCombo = Math.max(g.bestCombo, g.combo);
      gain = base * 2 + (g.combo - 1) * 10;
      g.swayAmp *= 0.6;
      addFloat(g, g.combo > 1 ? 'PERFECT X' + g.combo : 'PERFECT!', W / 2, 46, '#ffd84a', false);
      sfx(g, 'perfect', g.combo);
      if (g.combo % 5 === 0 && g.lives < 3) {
        g.lives++;
        addFloat(g, '+1 @', W / 2, 58, '#ff6a7a');
        sfx(g, 'life');
      }
      dust(g, f.x, n * BH, 10, '#fff6c0');
    } else {
      g.combo = 0;
      gain = Math.max(4, Math.round(base * (1 - adx / BW)));
      g.swayAmp += adx * 0.35;
      if (adx <= 8) addFloat(g, 'GOOD', W / 2, 46, '#a8f0ff');
      sfx(g, 'land');
      dust(g, f.x, n * BH, 8);
    }
    g.swayAmp = Math.min(g.swayAmp, 40);
    g.pop += gain;
    addFloat(g, '+' + gain, clamp(sx, 20, W - 20), sy - 6, '#ffffff');
    g.shake = perfect ? 1.5 : 2.5;
    g.falling = null;
    g.nextT = 0.35;
  }

  function loseLife(g) {
    g.lives--;
    g.combo = 0;
    g.shake = 4;
    sfx(g, 'miss');
    if (!g.demo) {
      addFloat(g, 'MISS!', W / 2, 52, '#ff5a5a', true);
      try { if (navigator.vibrate) navigator.vibrate(90); } catch (e) { /* ignore */ }
    }
    if (g.lives <= 0) {
      if (g.demo) { g.reset = true; return; }
      gameOver(g);
    } else {
      g.nextT = 0.6;
    }
  }

  function gameOver(g) {
    state = 'over';
    g.overT = 0;
    save.games++;
    g.record = g.pop > save.best;
    if (g.record) save.best = g.pop;
    if (g.n > save.floors) save.floors = g.n;
    writeSave();
    Snd.over();
  }

  function updateFalling(g, dt) {
    const f = g.falling;
    f.vy -= GRAV * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if (f.mode === 'drop') {
      f.rot *= Math.exp(-6 * dt);
      const topH = g.n * BH;
      if (f.y - BH / 2 <= topH) {
        const tx = g.n === 0 ? 0 : blockX(g, g.n - 1);
        const dx = f.x - tx;
        const adx = Math.abs(dx);
        if (g.n === 0 ? adx <= LOT_W / 2 - 6 : adx <= BW * 0.6) {
          f.y = topH + BH / 2;
          land(g, f, dx);
          return;
        }
        if (g.n > 0 && adx < BW) {
          f.mode = 'tip';
          f.y = topH + BH / 2;
          f.vy = 30;
          f.vx = Math.sign(dx) * 55;
          f.vr = Math.sign(dx) * 6;
          sfx(g, 'tip');
        } else {
          f.mode = 'miss';
          f.vr = (Math.random() - 0.5) * 3;
        }
      }
      return;
    }
    f.rot += f.vr * dt;
    const sy = GROUND_Y - (f.y - g.camY);
    if (f.y - BH / 2 <= 0) {
      debris(g, f.x, 0, f.pal);
      sfx(g, 'crash');
      g.falling = null;
      loseLife(g);
    } else if (sy > H + 40) {
      g.falling = null;
      loseLife(g);
    }
  }

  function updateGame(g, dt) {
    g.t += dt;
    const sp = swing(g);
    g.phase += sp.w * dt;
    g.swayPhase += dt * Math.PI * 2 * (0.34 - Math.min(0.12, g.n * 0.003));
    const lean = g.n ? Math.abs(g.blocks[g.n - 1].cx - g.blocks[0].cx) : 0;
    const target = clamp((g.n - 3) * 1.1, 0, 24) + Math.min(10, lean * 0.12);
    g.swayAmp += (target - g.swayAmp) * Math.min(1, dt * 0.35);
    g.hs += (Math.max(g.n * BH, 8 * BH) - g.hs) * Math.min(1, dt * 2);

    // camera
    const topH = g.n * BH;
    if (state === 'over' && !g.demo) {
      const sp2 = Math.max(110, topH / 3);
      g.camY = Math.max(0, g.camY - sp2 * dt * (g.overT > 0.8 ? 1 : 0));
    } else {
      const ty = Math.max(0, topH - (GROUND_Y - TOP_TARGET));
      g.camY += (ty - g.camY) * Math.min(1, dt * 4);
    }
    const tx = (g.n ? g.blocks[g.n - 1].cx : 0) - W / 2;
    g.camX += (tx - g.camX) * Math.min(1, dt * 2.5);

    if (g.spawnT < 1) g.spawnT = Math.min(1, g.spawnT + dt / 0.4);
    if (g.falling) updateFalling(g, dt);
    if (!g.hang && !g.falling && g.nextT > 0 && g.lives > 0) {
      g.nextT -= dt;
      if (g.nextT <= 0) spawnBlock(g);
    }

    for (let i = g.particles.length - 1; i >= 0; i--) {
      const p = g.particles[i];
      p.life -= dt;
      if (p.life <= 0) { g.particles.splice(i, 1); continue; }
      if (p.grav) p.vy -= GRAV * 0.6 * dt; else p.vy *= Math.exp(-3 * dt);
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.grav && p.y < 0) { p.y = 0; p.vy *= -0.3; p.vx *= 0.6; }
    }
    for (let i = g.floats.length - 1; i >= 0; i--) {
      const fl = g.floats[i];
      fl.t += dt;
      if (fl.t > 1.1) g.floats.splice(i, 1);
    }
    g.shake = Math.max(0, g.shake - dt * 12);
  }

  // demo autopilot for the title screens
  function demoBrain(g) {
    if (g.reset || g.n >= 9) { Object.assign(g, newGame(true)); spawnBlock(g); return; }
    if (!g.hang || g.spawnT < 1) return;
    const p = hangPose(g);
    const topH = g.n * BH;
    const d = p.cy - topH - BH / 2;
    const tf = (p.vy + Math.sqrt(Math.max(0, p.vy * p.vy + 2 * GRAV * d))) / GRAV;
    const px = p.cx + p.vx * tf;
    const tx = g.n === 0 ? 0 : blockX(g, g.n - 1);
    if (Math.abs(px - tx) < (g.aim || 2)) { drop(g); g.aim = Math.random() < 0.25 ? 14 : 2; }
  }

  // ------------------------------------------------------------------ rendering
  function renderWorld(g, showCrane) {
    const shx = g.shake ? Math.round((Math.random() * 2 - 1) * g.shake) : 0;
    const shy = g.shake ? Math.round((Math.random() * 2 - 1) * g.shake) : 0;
    drawSky(g, g.t);
    drawClouds(g);
    ctx.save();
    ctx.translate(shx, shy);
    drawSkyline(g);
    drawGround(g);
    const night = nightOf(g.camY) > 0.5;
    const toSx = (wx) => wx - g.camX;
    const toSy = (wy) => GROUND_Y - (wy - g.camY);
    const first = Math.max(0, Math.floor((g.camY - (H - GROUND_Y)) / BH) - 1);
    const last = Math.min(g.n - 1, Math.floor((g.camY + GROUND_Y) / BH) + 1);
    for (let i = first; i <= last; i++) {
      const b = g.blocks[i];
      drawBlock(b.pal, i === 0, night, b.seed, toSx(blockX(g, i)), toSy((i + 0.5) * BH), 0);
    }
    // roof on finished tower
    if (state === 'over' && !g.demo && g.n > 0) {
      const tx = toSx(blockX(g, g.n - 1)), ty = toSy(g.n * BH);
      R('#4a4f5a', tx - BW / 2 + 2, ty - 4, BW - 4, 4);
      R('#6a707c', tx - BW / 2 + 2, ty - 4, BW - 4, 1);
      R('#4a4f5a', tx - 1, ty - 14, 2, 10);
      if (Math.floor(g.t * 3) % 2) R('#ff3a3a', tx - 1, ty - 16, 2, 2);
    }
    if (g.falling) {
      const f = g.falling;
      drawBlock(f.pal, g.n === 0 && f.mode === 'drop', night, f.seed, toSx(f.x), toSy(f.y), f.rot);
    }
    for (const p of g.particles) {
      ctx.globalAlpha = clamp(p.life * 2, 0, 1);
      R(p.col, toSx(p.x), toSy(p.y), p.s, p.s);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (showCrane) drawCrane(g, night);
  }

  function drawCrane(g, night) {
    const sp = swing(g);
    const psx = pivotScreenX(g, sp);
    // girder
    R('#7a5a00', 0, 11, W, 1);
    R('#e8b81c', 0, 12, W, 4);
    R('#7a5a00', 0, 16, W, 1);
    for (let x = 0; x < W; x += 6) { R('#a67c08', x, 13, 1, 1); R('#a67c08', x + 1, 14, 1, 1); R('#a67c08', x + 2, 15, 1, 1); }
    // trolley
    R('#2b2e35', psx - 7, 10, 14, 7);
    R('#5b616c', psx - 6, 11, 12, 2);
    R('#111', psx - 6, 17, 3, 2); R('#111', psx + 3, 17, 3, 2);
    if (!g.hang) return;
    const th = sp.amp * Math.sin(g.phase);
    const L = ropeLen(g);
    const sn = Math.sin(th), cs = Math.cos(th);
    if (L > 0) pixLine(psx, PIVOT_Y + 1, psx + L * sn, PIVOT_Y + L * cs, '#202228');
    const Rr = L + BH / 2;
    const cx = psx + Rr * sn, cy = PIVOT_Y + Rr * cs;
    drawBlock(g.cur.pal, g.n === 0, night, g.cur.seed, cx, cy, -th);
    if (L > -2) R('#8a8f99', psx + L * sn - 1, PIVOT_Y + L * cs - 1, 3, 3);
  }

  function drawFloats(g) {
    for (const fl of g.floats) {
      const k = fl.t / 1.1;
      if (k > 0.75 && Math.floor(fl.t * 20) % 2) continue;
      text(fl.txt, fl.x, Math.round(fl.y - k * 16), fl.col, { align: 'center', sc: fl.big ? 2 : 1, outline: '#101418' });
    }
  }

  function drawHud(g) {
    R('rgba(8,14,24,0.82)', 0, 0, W, 10);
    text('$' + g.pop, 2, 2, '#ffffff');
    for (let i = 0; i < 3; i++) text('@', W / 2 - 9 + i * 7, 2, i < g.lives ? '#ff4a5a' : '#3c414c');
    text(g.n + '&', W - 2, 2, '#ffd84a', { align: 'right' });
    if (g.combo >= 2 && Math.floor(g.t * 4) % 4) text('COMBO X' + g.combo, W - 3, 21, '#ffd84a', { align: 'right', outline: '#101418' });
  }

  function softkeys(l, r) {
    R('rgba(0,0,0,0.72)', 0, H - 11, W, 11);
    if (l) text(l, 3, H - 9, '#ffffff');
    if (r) text(r, W - 3, H - 9, '#ffffff', { align: 'right' });
  }

  function panel(x, y, w, h) {
    R('#0e1622', x, y, w, h);
    R('#ffd84a', x, y, w, 1); R('#ffd84a', x, y + h - 1, w, 1);
    R('#ffd84a', x, y, 1, h); R('#ffd84a', x + w - 1, y, 1, h);
    R('#2a3a52', x + 2, y + 2, w - 4, 1);
  }

  let listRects = [];
  function drawList(items, idx, y0, step) {
    listRects = [];
    items.forEach((it, i) => {
      const y = y0 + i * step;
      const label = it.label();
      if (i === idx) {
        R('#ffd84a', 22, y - 3, W - 44, 13);
        R('#b8901a', 22, y + 9, W - 44, 1);
        text(label, W / 2, y, '#14161c', { align: 'center' });
      } else {
        text(label, W / 2, y, '#ffffff', { align: 'center', shadow: '#000000' });
      }
      listRects.push({ y0: y - 4, y1: y - 4 + step, i });
    });
  }

  function drawLogo(y) {
    text('CITY', W / 2, y, '#ffffff', { sc: 2, align: 'center', outline: '#14161c' });
    text('BLOXXX', W / 2 + 1, y + 17, '#b8460e', { sc: 3, align: 'center' });
    text('BLOXXX', W / 2, y + 16, '#ffd84a', { sc: 3, align: 'center', outline: '#14161c' });
  }

  // ------------------------------------------------------------------ app state
  let state = 'boot';
  let menuIdx = 0, pauseIdx = 0;
  let game = null;
  const demo = newGame(true);
  spawnBlock(demo);
  let clock = 0;

  const MAIN_MENU = [
    { label: () => 'NEW GAME', fn: startGame },
    { label: () => 'HOW TO PLAY', fn: () => go('help') },
    { label: () => 'HIGH SCORE', fn: () => go('scores') },
    { label: () => 'SOUND: ' + (Snd.on ? 'ON' : 'OFF'), fn: toggleSound },
  ];
  const PAUSE_MENU = [
    { label: () => 'CONTINUE', fn: () => { state = 'play'; } },
    { label: () => 'RESTART', fn: startGame },
    { label: () => 'SOUND: ' + (Snd.on ? 'ON' : 'OFF'), fn: toggleSound },
    { label: () => 'MAIN MENU', fn: () => go('menu') },
  ];

  function go(s) { state = s; }
  function startGame() {
    game = newGame(false);
    spawnBlock(game);
    state = 'play';
  }
  function toggleSound() {
    Snd.on = !Snd.on;
    save.sound = Snd.on;
    writeSave();
    if (Snd.on) Snd.select();
  }

  function listInput(items, idx, a) {
    if (a === 'up' || a === 'left') { Snd.move(); return (idx + items.length - 1) % items.length; }
    if (a === 'down' || a === 'right') { Snd.move(); return (idx + 1) % items.length; }
    if (a === 'ok') { Snd.select(); items[idx].fn(); }
    return idx;
  }

  function handle(a) {
    Snd.init();
    if (a === 'mute') { toggleSound(); return; }
    if (a === 'none') return;
    switch (state) {
      case 'boot':
        Snd.tune();
        state = 'menu';
        break;
      case 'menu':
        menuIdx = listInput(MAIN_MENU, menuIdx, a);
        break;
      case 'help':
      case 'scores':
        if (a === 'ok' || a === 'back') { Snd.move(); state = 'menu'; }
        break;
      case 'play':
        if (a === 'back') { state = 'pause'; pauseIdx = 0; Snd.move(); }
        else if (a === 'ok' || a === 'down') drop(game);
        break;
      case 'pause':
        if (a === 'back') { state = 'play'; Snd.move(); }
        else pauseIdx = listInput(PAUSE_MENU, pauseIdx, a);
        break;
      case 'over':
        if (game.overT < 0.9) return;
        if (a === 'ok') { Snd.select(); startGame(); }
        else if (a === 'back') { Snd.move(); state = 'menu'; }
        break;
    }
  }

  function tapScreen(x, y) {
    if ((state === 'menu' || state === 'pause') && y < H - 12) {
      const items = state === 'menu' ? MAIN_MENU : PAUSE_MENU;
      const hit = listRects.find((r) => y >= r.y0 && y < r.y1);
      if (!hit) return;
      Snd.init();
      if (state === 'menu') menuIdx = hit.i; else pauseIdx = hit.i;
      Snd.select();
      items[hit.i].fn();
      return;
    }
    if (y >= H - 14) {
      // soft key zones (in play only the small PAUSE label pauses)
      if (state === 'play') handle(x > W - 36 ? 'back' : 'ok');
      else handle(x < W / 2 ? 'ok' : 'back');
      return;
    }
    handle('ok');
  }

  // ------------------------------------------------------------------ frame
  function update(dt) {
    clock += dt;
    switch (state) {
      case 'boot': case 'menu': case 'help': case 'scores':
        updateGame(demo, dt);
        demoBrain(demo);
        break;
      case 'play':
        updateGame(game, dt);
        break;
      case 'over':
        game.overT += dt;
        updateGame(game, dt);
        break;
      default:
        break;
    }
  }

  function render() {
    ctx.imageSmoothingEnabled = false;
    switch (state) {
      case 'boot': renderBoot(); break;
      case 'menu': renderMenu(); break;
      case 'help': renderHelp(); break;
      case 'scores': renderScores(); break;
      case 'play': renderPlay(); break;
      case 'pause': renderPause(); break;
      case 'over': renderOver(); break;
    }
  }

  function renderBoot() {
    R('#0a0f0b', 0, 0, W, H);
    for (let y = 0; y < H; y += 2) R('rgba(80,255,120,0.025)', 0, y, W, 1);
    drawLogo(56);
    // tiny tower icon
    const c = PALETTES;
    for (let i = 0; i < 3; i++) R(c[i].body, W / 2 - 8, 132 - i * 7, 16, 6);
    R('#ffd84a', W / 2 - 1, 104, 2, 7);
    if (Math.floor(clock * 2) % 2 === 0) text('PRESS 5 OR TAP', W / 2, 150, '#c8ffd0', { align: 'center' });
    text('NOKIA-ERA REMAKE', W / 2, 186, '#4d6b55', { align: 'center' });
  }

  function renderMenu() {
    renderWorld(demo, true);
    R('rgba(8,14,24,0.35)', 0, 0, W, H);
    drawLogo(26);
    R('rgba(8,14,24,0.78)', 16, 88, W - 32, 62);
    drawList(MAIN_MENU, menuIdx, 93, 14);
    if (save.best > 0) text('BEST $' + save.best, W / 2, 160, '#ffd84a', { align: 'center', outline: '#101418' });
    softkeys('SELECT', '');
  }

  function renderHelp() {
    renderWorld(demo, true);
    R('rgba(8,14,24,0.86)', 0, 0, W, H);
    text('HOW TO PLAY', W / 2, 8, '#ffd84a', { align: 'center' });
    R('#ffd84a', 20, 17, W - 40, 1);
    const lines = [
      'TAP THE SCREEN OR', 'PRESS 5 TO DROP THE', 'SWINGING BLOCK.', '',
      'STACK FLOORS AS HIGH', 'AS YOU CAN. THE TOWER', 'SWAYS MORE AS IT GROWS.', '',
      'PERFECT DROPS GIVE', 'BONUS RESIDENTS AND', 'CALM THE TOWER DOWN.', '',
      '5 PERFECTS IN A ROW', '= EXTRA LIFE.', '3 MISSES = GAME OVER.',
    ];
    lines.forEach((l, i) => text(l, 8, 24 + i * 10, l.startsWith('=') || l.startsWith('3') ? '#ff8a96' : '#ffffff'));
    softkeys('', 'BACK');
  }

  function renderScores() {
    renderWorld(demo, true);
    R('rgba(8,14,24,0.86)', 0, 0, W, H);
    text('HIGH SCORE', W / 2, 8, '#ffd84a', { align: 'center' });
    R('#ffd84a', 20, 17, W - 40, 1);
    text('POPULATION', W / 2, 34, '#a8f0ff', { align: 'center' });
    text(String(save.best), W / 2, 46, '#ffffff', { align: 'center', sc: 2 });
    text('HIGHEST TOWER', W / 2, 78, '#a8f0ff', { align: 'center' });
    text(save.floors + ' FLOORS', W / 2, 90, '#ffffff', { align: 'center', sc: 2 });
    text('GAMES PLAYED', W / 2, 122, '#a8f0ff', { align: 'center' });
    text(String(save.games), W / 2, 134, '#ffffff', { align: 'center', sc: 2 });
    softkeys('', 'BACK');
  }

  function renderPlay() {
    renderWorld(game, true);
    drawFloats(game);
    drawHud(game);
    if (game.n === 0 && game.hang && game.spawnT >= 1 && Math.floor(clock * 2) % 2) {
      text('TAP TO DROP', W / 2, 96, '#ffffff', { align: 'center', outline: '#101418' });
    }
    R('rgba(0,0,0,0.45)', W - 34, H - 11, 34, 11);
    text('PAUSE', W - 3, H - 9, '#ffffff', { align: 'right' });
  }

  function renderPause() {
    renderWorld(game, true);
    drawHud(game);
    R('rgba(8,14,24,0.55)', 0, 10, W, H);
    panel(16, 52, W - 32, 92);
    text('PAUSED', W / 2, 60, '#ffd84a', { align: 'center', sc: 2 });
    drawList(PAUSE_MENU, pauseIdx, 84, 14);
    softkeys('SELECT', 'RESUME');
  }

  function renderOver() {
    const g = game;
    renderWorld(g, true);
    drawFloats(g);
    drawHud(g);
    if (g.overT < 0.5) return;
    panel(14, 26, W - 28, 104);
    text('GAME OVER', W / 2, 33, '#ff5a5a', { align: 'center', sc: 2, shadow: '#3a0a0a' });
    const row = (l, v, y, col) => { text(l, 24, y, '#a8f0ff'); text(v, W - 24, y, col || '#ffffff', { align: 'right' }); };
    row('FLOORS', String(g.n), 56);
    row('POPULATION', String(g.pop), 68, '#ffd84a');
    row('PERFECTS', String(g.perfects), 80);
    row('BEST COMBO', 'X' + g.bestCombo, 92);
    row('RECORD', String(save.best), 104);
    if (g.record && Math.floor(clock * 3) % 2) text('NEW RECORD!', W / 2, 116, '#ffd84a', { align: 'center' });
    if (g.overT > 0.9) softkeys('AGAIN', 'MENU');
  }

  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) dt = 0;
    if (dt > 0.05) dt = 0.05;
    try {
      update(dt);
      render();
    } catch (err) {
      // keep the loop alive and surface the problem instead of freezing silently
      console.error(err);
      R('#300', 0, H / 2 - 10, W, 20);
      text('ERROR - SEE CONSOLE', W / 2, H / 2 - 3, '#fff', { align: 'center' });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ------------------------------------------------------------------ input
  const KEYMAP = {
    ' ': 'ok', 'Enter': 'ok', '5': 'ok', 'NumpadEnter': 'ok',
    'ArrowUp': 'up', '2': 'up', 'w': 'up', 'W': 'up',
    'ArrowDown': 'down', '8': 'down', 's': 'down', 'S': 'down',
    'ArrowLeft': 'left', '4': 'left', 'a': 'left', 'A': 'left',
    'ArrowRight': 'right', '6': 'right', 'd': 'right', 'D': 'right',
    'Escape': 'back', 'Backspace': 'back', 'p': 'back', 'P': 'back',
    'm': 'mute', 'M': 'mute', '#': 'mute',
  };
  const KEY_TO_BUTTON = {
    ' ': 'ok', 'Enter': 'ok', 'NumpadEnter': 'ok',
    'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
    'Escape': 'rsk', 'Backspace': 'rsk', 'p': 'rsk', 'P': 'rsk',
    'm': '#', 'M': '#',
  };
  function flashButton(key) {
    const sel = '[data-key="' + (key === '#' ? '\\#' : key === '*' ? '\\*' : key) + '"]';
    let el = null;
    try { el = document.querySelector(sel); } catch (e) { el = null; }
    if (!el) return;
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 110);
  }

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const a = KEYMAP[e.key];
    if (!a) return;
    e.preventDefault();
    if (e.repeat && a === 'ok') return;
    flashButton(KEY_TO_BUTTON[e.key] || e.key);
    handle(a);
  });

  document.querySelectorAll('button[data-action]').forEach((btn) => {
    const release = () => btn.classList.remove('pressed');
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.add('pressed');
      handle(btn.dataset.action);
    });
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointerleave', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const r = canvas.getBoundingClientRect();
    tapScreen(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H);
  });

  // tapping anywhere outside the phone also drops while playing (big thumbs welcome)
  document.getElementById('stage').addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || e.target === canvas) return;
    if (state === 'play' || state === 'over') handle('ok');
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'play') { state = 'pause'; pauseIdx = 0; }
  });

  // ------------------------------------------------------------------ fit phone to viewport
  const phone = document.getElementById('phone');
  const hint = document.querySelector('.hint');
  function fit() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const hintH = hint && getComputedStyle(hint).display !== 'none' ? 30 : 0;
    const s = Math.min((vw - 12) / 328, (vh - 12 - hintH) / 798);
    phone.style.setProperty('--s', Math.max(0.3, s).toFixed(4));
    phone.style.top = hintH ? 'calc(50% - ' + hintH / 2 + 'px)' : '50%';
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  fit();

  // exposed for automated smoke tests
  window.__bloxxx = { get state() { return state; }, get game() { return game; }, handle, drop: () => game && drop(game) };
})();
