// Use window.appendBattleLog at runtime to avoid circular imports

// Duel Arena module - side-view canvas duel with QA-gated skills
let canvas, ctx, rafId;
let state = null;
const ASSET_PATHS = {
  playerIdle: '/assets/duel/player_idle.png',
  playerAttack: '/assets/duel/player_attack.png',
  hackerIdle: '/assets/duel/hacker_idle.png',
  hackerDefeat: '/assets/duel/hacker_defeat.png',
};
const QUESTIONS = [
  {
    q: `📧 MISI: Email Mencurigakan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Kamu menerima email dari "Tim Keamanan BRI":

"Akun Anda TERANCAM! Klik link berikut
SEGERA untuk verifikasi keamanan akun:
→ http://bri-secure-login.xyz/verify"

Email terlihat resmi lengkap dengan logo bank.

❓ Apakah ini serangan phishing?`,
    ok: true,
    insight: 'Link domain tidak resmi (.xyz) adalah tanda phishing!'
  },
  {
    q: `🛒 MISI: Toko Online Palsu
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Temanmu mengirim link belanja murah:
→ www.tokopidia.com/promo-99persen

URL terlihat mirip toko terkenal, tapi ada
yang aneh pada ejaannya.

❓ Apakah aman untuk login dan berbelanja?`,
    ok: false,
    insight: '"tokopidia" bukan "tokopedia" — ini typosquatting!'
  },
  {
    q: `🔒 MISI: Ikon Gembok HTTPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Kamu mengunjungi situs perbankan. Browser
menampilkan gembok hijau dan "https://"
di address bar.

Temanmu bilang: "Kalau ada HTTPS berarti
situs itu 100% aman dari phishing!"

❓ Apakah pernyataan temanmu BENAR?`,
    ok: false,
    insight: 'HTTPS hanya enkripsi data, bukan jaminan situs tidak phishing!'
  },
  {
    q: `💬 MISI: Pesan WhatsApp Hadiah
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Kamu mendapat pesan WA dari nomor asing:

"SELAMAT! Anda terpilih memenangkan hadiah
Rp 50.000.000! Kirimkan foto KTP + nomor
rekening ke admin kami untuk pencairan."

❓ Apakah pesan ini berbahaya (social engineering)?`,
    ok: true,
    insight: 'Meminta KTP & rekening lewat WA adalah penipuan social engineering!'
  },
  {
    q: `🖥️ MISI: Pop-up Virus Alert
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Saat browsing, tiba-tiba muncul pop-up besar:

"⚠️ VIRUS TERDETEKSI! Perangkat Anda
dalam bahaya! Hubungi support kami di
0800-FAKE-HELP SEKARANG!"

❓ Apakah kamu harus menghubungi nomor itu?`,
    ok: false,
    insight: 'Pop-up palsu seperti ini disebut scareware — jangan percaya!'
  },
  {
    q: `📱 MISI: Update Aplikasi Palsu
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Kamu menerima SMS: "Aplikasi m-banking Anda
perlu diupdate. Download versi terbaru di:
→ bit.ly/banking-update-apk"

Link mengarah ke file .apk dari luar Play Store.

❓ Apakah mengunduh APK ini berbahaya?`,
    ok: true,
    insight: 'APK dari luar Play Store bisa mengandung malware/spyware!'
  },
  {
    q: `🔑 MISI: Permintaan Password
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Seseorang mengaku sebagai IT support kantor
menghubungi kamu via email:

"Kami perlu password akun kerja Anda untuk
melakukan maintenance sistem. Tolong balas
email ini dengan password Anda."

❓ Apakah kamu harus memberikan password?`,
    ok: false,
    insight: 'IT asli TIDAK PERNAH meminta password lewat email!'
  },
  {
    q: `🌐 MISI: WiFi Gratis Bandara
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Di bandara ada dua jaringan WiFi:
→ "Airport_Free_WiFi" (terbuka, kuat)
→ "AirportWifi_Official" (butuh login)

Temanmu langsung konek ke yang pertama
dan mulai internet banking.

❓ Apakah tindakan temanmu aman?`,
    ok: false,
    insight: 'WiFi publik tanpa password rentan terhadap serangan Man-in-the-Middle!'
  },
];

// ── 2D Pixel art sprite data ──────────────────────────────────
const PIX_SIZE = 10; // base block size in CSS px (scaled by devicePixelRatio)

// Detective: headset + glasses + holding laptop
const DETECTIVE_GRID = [
  [0,0,1,1,1,1,1,1,0,0],  // headset band top
  [0,1,1,0,0,0,0,1,1,0],  // headset arch sides
  [1,1,2,2,2,2,2,2,1,1],  // head + ear pads
  [1,1,2,3,3,3,3,2,1,1],  // face + glasses top frame
  [0,0,2,3,2,2,3,2,0,0],  // face + glasses lenses
  [0,0,2,3,3,3,3,2,0,0],  // face + glasses bottom frame
  [0,0,2,2,2,2,2,2,0,0],  // lower face / chin
  [0,4,4,4,4,4,4,4,4,0],  // shoulders / collar
  [4,4,7,7,7,7,7,7,4,4],  // body + laptop top
  [4,4,7,8,8,8,8,7,4,4],  // laptop screen (cyan glow)
  [4,4,7,8,8,8,8,7,4,4],  // laptop screen
  [4,4,7,7,7,7,7,7,4,4],  // laptop bottom / keyboard
  [0,4,4,0,0,0,0,4,4,0],  // waist / belt
  [0,0,6,6,0,0,6,6,0,0],  // legs
  [0,0,6,6,0,0,6,6,0,0],  // legs lower
  [0,0,6,6,0,0,6,6,0,0],  // boots
];
const DETECTIVE_PALETTE = {
  1: '#2a2a4a',  // headset (dark purple-gray)
  2: '#f8c88a',  // skin
  3: '#1a3a66',  // glasses frame (dark blue)
  4: '#0d5c9e',  // coat (blue)
  5: '#00fff0',  // cyan accent (unused)
  6: '#1a3066',  // dark pants
  7: '#0a3a5a',  // laptop body (dark teal)
  8: '#00ccff',  // laptop screen (bright cyan)
};

// ── Enemy sprite: Round 1 — Phishing Hacker ──────────────────
const HACKER_GRID = [
  [0,1,1,1,1,1,1,0],  // hood peak
  [1,1,1,1,1,1,1,1],  // hood top
  [1,1,2,2,2,2,1,1],  // face
  [1,2,3,2,2,3,2,1],  // glowing red eyes
  [1,1,2,2,2,2,1,1],  // lower face
  [0,1,1,2,2,1,1,0],  // chin
  [0,4,4,4,4,4,4,0],  // collar
  [4,4,4,5,5,4,4,4],  // coat + green stripes
  [4,4,5,4,4,5,4,4],  // code pattern
  [4,4,4,4,4,4,4,4],  // lower coat
  [0,4,4,4,4,4,4,0],  // waist
  [0,4,6,0,0,6,4,0],  // legs
  [0,0,6,0,0,6,0,0],  // lower legs
  [0,0,6,6,6,6,0,0],  // boots
];
const HACKER_PALETTE = {
  1: '#1a083a',  // dark hood
  2: '#7a6555',  // skin
  3: '#ff1133',  // red glowing eyes
  4: '#2a0a18',  // dark coat
  5: '#22aa44',  // green code stripes
  6: '#180a10',  // dark boots
};

// ── Enemy sprite: Round 2 — Malware Bot ──────────────────────
const MALWARE_BOT_GRID = [
  [0,0,1,1,1,1,0,0],  // head top
  [0,1,1,1,1,1,1,0],  // head
  [1,2,3,2,2,3,2,1],  // visor eyes (green)
  [1,1,4,4,4,4,1,1],  // head body / jaw
  [0,1,1,1,1,1,1,0],  // neck
  [1,1,4,4,4,4,1,1],  // shoulder pads
  [4,4,4,4,4,4,4,4],  // torso
  [4,5,4,3,3,4,5,4],  // torso with lights
  [4,4,4,4,4,4,4,4],  // lower torso
  [0,4,4,4,4,4,4,0],  // waist
  [0,4,6,6,6,6,4,0],  // legs
  [0,4,6,0,0,6,4,0],  // knee joints
  [0,0,6,0,0,6,0,0],  // lower legs
  [0,0,7,7,7,7,0,0],  // feet
];
const MALWARE_BOT_PALETTE = {
  1: '#1a2a3a',  // metal head dark
  2: '#2a4a2a',  // dark visor
  3: '#22ff44',  // green screen eyes
  4: '#223344',  // metal body
  5: '#ff6600',  // warning lights
  6: '#1a2a3a',  // leg metal
  7: '#0a1a2a',  // feet
};

// ── Enemy sprite: Round 3 — Ransomware King ──────────────────
const RANSOMWARE_GRID = [
  [0,0,1,1,1,1,0,0,0,0],  // crown base
  [0,1,2,1,1,2,1,2,1,0],  // crown spikes
  [1,1,1,1,1,1,1,1,1,1],  // crown band
  [1,1,3,3,3,3,3,3,1,1],  // face top (pale)
  [1,3,4,3,3,4,3,3,3,1],  // eye sockets (red glow)
  [1,3,3,3,3,3,3,3,3,1],  // face mid
  [1,3,5,5,5,5,5,5,3,1],  // mouth/teeth
  [0,1,1,1,1,1,1,1,1,0],  // neck
  [1,6,6,6,6,6,6,6,6,1],  // cloak shoulders
  [6,6,7,6,6,6,7,6,6,6],  // cloak upper with clasp
  [6,6,6,6,6,6,6,6,6,6],  // cloak body
  [6,6,8,6,6,6,8,6,6,6],  // cloak lower with trim
  [0,6,6,6,6,6,6,6,6,0],  // waist
  [0,6,9,6,0,0,6,9,6,0],  // legs
  [0,0,9,9,0,0,9,9,0,0],  // lower legs
  [0,0,9,9,9,9,9,9,0,0],  // heavy boots
];
const RANSOMWARE_PALETTE = {
  1: '#cc9900',  // gold crown
  2: '#ffee00',  // crown gem
  3: '#c0a888',  // pale skin
  4: '#ff0022',  // red eye glow
  5: '#eeeeee',  // teeth
  6: '#1a0a2a',  // dark cloak
  7: '#cc2244',  // cloak clasp red
  8: '#440022',  // cloak trim
  9: '#0a0a1a',  // dark boots
};

const ENEMY_TYPES = [
  { grid: HACKER_GRID,      palette: HACKER_PALETTE,      name: 'PHISHING HACKER', baseHp: 80  },
  { grid: MALWARE_BOT_GRID, palette: MALWARE_BOT_PALETTE, name: 'MALWARE BOT',     baseHp: 104 },
  { grid: RANSOMWARE_GRID,  palette: RANSOMWARE_PALETTE,  name: 'RANSOMWARE KING', baseHp: 136 },
];

function createCanvas(container) {
  canvas = document.createElement('canvas');
  canvas.width = Math.max(600, container.clientWidth);
  canvas.height = Math.max(360, container.clientHeight);
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.innerHTML = '';
  container.appendChild(canvas);
  ctx = canvas.getContext('2d');
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function startDuel(battleState, player) {
  if (!battleState || !player) return;
  player.hp = player.maxHp || 100;
  const et = ENEMY_TYPES[0];
  battleState.enemyHp    = et.baseHp;
  battleState.enemyMaxHp = et.baseHp;
  state = {
    battle: battleState, player,
    time: 0, intro: true, introTime: 0, shake: 0,
    effects: [], particles: [],
    round: 1, maxRounds: 3,
    roundClearing: false,
    gameOver: false, gameResult: null,
    enemyType: 0,
    heldKeys: { left: false, right: false, up: false },
    chars: {
      player: makeChar(0.22),
      enemy:  makeChar(0.78),
    },
  };
  const container = document.getElementById('battle-map');
  if (!container) return;
  createCanvas(container);
  container.classList.add('duel-active');
  const root = document.getElementById('battle');
  if (root) root.classList.add('duel-mode');
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

function makeChar(xFrac) {
  return {
    anim: 'idle', hitFlash: 0, attackLean: 0,
    xPos: null,    // initialized on first update (CSS px)
    xFrac: xFrac || 0.22,
    yPos: 0,       // 0 = on ground; negative = in air (CSS px)
    vx: 0, vy: 0,
    onGround: true,
    facing: 'right',
  };
}

function playAnim(char, name) {
  if (!char) return;
  char.anim = name;
  if (name === 'attack') char.attackLean = 1;
  if (name === 'hit')    char.hitFlash = 8;
}

function stopDuel() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  state = null;
  const container = document.getElementById('battle-map');
  if (container) {
    container.innerHTML = '';
    container.classList.remove('duel-active');
    const root = document.getElementById('battle');
    if (root) root.classList.remove('duel-mode');
  }
}

function loop(ts) {
  if (!state) return;
  state.time = (state.time || 0) + 16;
  update(state);
  render(state);
  rafId = requestAnimationFrame(loop);
}

function update(s) {
  if (s.intro) {
    s.introTime += 16;
    if (s.introTime > 1500) s.intro = false;
  }
  if (s.roundClearing) {
    s.roundClearTime = (s.roundClearTime || 0) + 16;
    if (s.roundClearTime > 1800) { s.roundClearing = false; s.roundClearTime = 0; }
  }
  s.effects  = s.effects.filter(e => { e.t -= 16; return e.t > 0; });
  s.particles = (s.particles || []).filter(p => (p.life -= 16) > 0).map(p => { p.x += p.vx; p.y += p.vy; return p; });
  ['player', 'enemy'].forEach(k => {
    const c = s.chars && s.chars[k];
    if (!c) return;
    if (c.hitFlash > 0)   c.hitFlash   = Math.max(0, c.hitFlash   - 1);
    if (c.attackLean > 0) c.attackLean = Math.max(0, c.attackLean - 0.08);
  });
  if (s.shake > 0) s.shake = Math.max(0, s.shake - 0.5);

  // ── Player physics (smooth keyboard movement) ─────────────────
  if (!s.gameOver && canvas) {
    const pc   = s.chars.player;
    const cssW = canvas.clientWidth || 600;
    const keys = s.heldKeys || {};
    const SPD  = 5;   // max speed CSS px/frame

    // Init position
    if (pc.xPos == null) pc.xPos = cssW * pc.xFrac;

    // Horizontal acceleration / friction
    if (keys.left)       pc.vx = Math.max(-SPD, (pc.vx || 0) - 1.4);
    else if (keys.right) pc.vx = Math.min(SPD,  (pc.vx || 0) + 1.4);
    else                 pc.vx = (pc.vx || 0) * 0.76;

    // Jump — consume the flag so one press = one jump
    if (keys.up && pc.onGround) {
      pc.vy       = -13;
      pc.onGround = false;
      keys.up     = false;   // require re-press
    }

    // Apply positions
    const minX = 30;
    const maxX = cssW - 30;
    pc.xPos = Math.max(minX, Math.min(maxX, pc.xPos + (pc.vx || 0)));

    // Vertical physics
    pc.yPos = (pc.yPos || 0) + (pc.vy || 0);
    pc.vy   = (pc.vy   || 0) + 0.55;   // gravity
    if ((pc.yPos || 0) >= 0) {
      pc.yPos = 0; pc.vy = 0; pc.onGround = true;
    }

    // Facing direction (flip sprite when moving left)
    if ((pc.vx || 0) >  0.4) pc.facing = 'right';
    if ((pc.vx || 0) < -0.4) pc.facing = 'left';

    // Animation state
    if (!pc.onGround)              pc.anim = 'jump';
    else if (Math.abs(pc.vx||0) > 0.5) pc.anim = 'run';
    else                           pc.anim = 'idle';
  }
}

function render(s) {
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.clearRect(0, 0, w, h);
  ctx.save();

  // ── Background — Cyber Forest ────────────────────────────────
  drawCyberForest(w, h, s.time);

  // ── Characters ────────────────────────────────────────────────
  const floorY = h * 0.72;
  const dp     = devicePixelRatio;
  const bob    = Math.sin(s.time / 280) * 3 * dp;

  const pc = s.chars.player;
  const ec = s.chars.enemy;

  // Player: physics-based x, yPos lifts off floor on jump
  const playerX  = pc && pc.xPos != null
    ? pc.xPos * dp
    : (canvas.clientWidth || 600) * 0.22 * dp;
  const playerY  = floorY + (pc ? (pc.yPos || 0) * dp : 0) + bob;

  // Enemy: stays at 78% of width, idle bob
  const enemyX   = (canvas.clientWidth || 600) * 0.78 * dp
                 - (ec ? (ec.attackLean || 0) * 30 * dp : 0);
  const enemyY   = floorY + bob;

  const et = ENEMY_TYPES[s.enemyType || 0];

  // Flip player sprite when facing left
  const playerFacesRight = !pc || pc.facing !== 'left';
  drawPixelCharacter(playerX, playerY, DETECTIVE_GRID, DETECTIVE_PALETTE, pc, playerFacesRight, s.time);
  drawPixelCharacter(enemyX,  enemyY,  et.grid,        et.palette,        ec, false,            s.time);

  // ── Intro flash (after characters so they show through) ──────
  if (s.intro) {
    const progress = s.introTime / 1500;
    const alpha = (1 - progress) * (Math.sin(s.introTime / 70) * 0.12 + 0.18);
    ctx.fillStyle = `rgba(0,255,240,${alpha})`;
    ctx.fillRect(0, 0, w, h);
    const textAlpha = Math.max(0, 1 - progress * 1.6);
    ctx.fillStyle = `rgba(0,255,240,${textAlpha})`;
    ctx.font = `bold ${44 * devicePixelRatio}px Orbitron, Share Tech Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00fff0';
    ctx.shadowBlur = 28 * devicePixelRatio;
    ctx.fillText('CYBER DUEL START', w / 2, h * 0.22);
    ctx.shadowBlur = 0;
  }

  // ── HP bars ───────────────────────────────────────────────────
  drawHpBars(s);

  // ── Damage / effect floaters ─────────────────────────────────
  s.effects.forEach(e => {
    ctx.fillStyle = e.color || '#ffdd88';
    ctx.font = `bold ${22 * devicePixelRatio}px Orbitron, Share Tech Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.shadowColor = e.color || '#ffdd88';
    ctx.shadowBlur = 12 * devicePixelRatio;
    ctx.fillText(e.text, e.x || w / 2, (e.y || h / 2) - e.t / 4);
    ctx.shadowBlur = 0;
  });

  // ── Particles ────────────────────────────────────────────────
  s.particles.forEach(p => {
    ctx.fillStyle = p.color || '#00fff0';
    ctx.fillRect(p.x, p.y, p.s, p.s);
  });

  // ── Victory / Defeat overlay ──────────────────────────────────
  if (s.gameOver) {
    const dp = devicePixelRatio;
    const isWin = s.gameResult === 'win';
    const col   = isWin ? '#00fff0' : '#ff3366';
    const bg    = isWin ? 'rgba(0,255,240,0.12)' : 'rgba(255,51,102,0.14)';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    // pulsing outer rect
    const pulse2 = Math.abs(Math.sin(s.time / 200));
    ctx.strokeStyle = col;
    ctx.lineWidth = 3 * dp * pulse2;
    ctx.strokeRect(12*dp, 12*dp, w - 24*dp, h - 24*dp);
    // big label
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 30 * dp;
    ctx.font = `bold ${64 * dp}px Orbitron, Share Tech Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(isWin ? 'VICTORY!' : 'DEFEAT', w / 2, h * 0.42);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `${18 * dp}px Share Tech Mono, monospace`;
    ctx.fillText(isWin ? 'Sistem aman — Hacker berhasil dilumpuhkan!' : 'Sistem dibobol — Pelajari lagi keamanan siber!', w / 2, h * 0.56);
  }

  // ── Round clear banner ────────────────────────────────────────
  if (s.roundClearing) {
    const dp = devicePixelRatio;
    const t2 = Math.max(0, s.roundClearTime || 0);
    const alpha2 = Math.min(1, t2 / 200) * Math.max(0, 1 - (t2 - 800) / 400);
    ctx.fillStyle = `rgba(0,255,240,${alpha2 * 0.15})`;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = `rgba(0,255,240,${alpha2})`;
    ctx.shadowColor = '#00fff0';
    ctx.shadowBlur = 24 * dp;
    ctx.font = `bold ${48 * dp}px Orbitron, Share Tech Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`ROUND ${s.round - 1} CLEAR!`, w / 2, h * 0.35);
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(255,255,255,${alpha2 * 0.7})`;
    ctx.font = `${20 * dp}px Share Tech Mono, monospace`;
    ctx.fillText(`ROUND ${s.round} — Lanjutkan pertarungan!`, w / 2, h * 0.48);
  }

  ctx.restore();
}

/**
 * Draw a 2D pixel-art character.
 * cx, cy = bottom-center of the sprite (feet position).
 * grid    = 2D array of palette indices (0 = transparent).
 * palette = { index: '#rrggbb' }
 * char    = { hitFlash, attackLean, xOff, yOff }
 * isPlayer = true for player (faces right), false for enemy (flipped).
 * time    = global time for glow pulse.
 */
function drawPixelCharacter(cx, cy, grid, palette, char, isPlayer, time) {
  const dp  = devicePixelRatio;
  const ps  = PIX_SIZE * dp;               // pixel block size in canvas units
  const cols = grid[0].length;
  const rows = grid.length;
  const totalW = cols * ps;
  const totalH = rows * ps;
  const startX = cx - totalW / 2;
  const startY = cy - totalH;

  const hitFlash   = char ? char.hitFlash   : 0;
  const isPlayer_  = isPlayer;
  const glowColor  = isPlayer_ ? '#00fff0' : '#ff2244';
  const shadowColor_ = isPlayer_ ? 'rgba(0,255,240,' : 'rgba(255,34,68,';

  ctx.save();

  // Rectangular glow behind character (no circles)
  const pulse = 0.08 + Math.sin(time / 400) * 0.04;
  ctx.fillStyle = shadowColor_ + pulse + ')';
  ctx.fillRect(cx - totalW * 0.7, cy - totalH * 1.05, totalW * 1.4, totalH * 1.1);

  // Flip enemy to face left
  if (!isPlayer_) {
    ctx.save();
    ctx.translate(cx * 2, 0);
    ctx.scale(-1, 1);
  }

  // Draw pixel blocks
  grid.forEach((row, ry) => {
    row.forEach((cell, rx) => {
      if (!cell || !palette[cell]) return;
      let color = palette[cell];
      if (hitFlash > 0 && hitFlash % 2 === 0) color = '#ffffff';
      ctx.fillStyle = color;
      // 1-px gap between blocks for crisp pixel look
      ctx.fillRect(
        startX + rx * ps,
        startY + ry * ps,
        ps - 1,
        ps - 1
      );
    });
  });

  if (!isPlayer_) ctx.restore();

  // Outline glow when attacking
  if (char && char.attackLean > 0.2) {
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2 * dp * char.attackLean;
    ctx.globalAlpha = char.attackLean;
    ctx.strokeRect(startX - 2*dp, startY - 2*dp, totalW + 4*dp, totalH + 4*dp);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawHpBars(s) {
  const w  = canvas.width;
  const dp = devicePixelRatio;
  const barW = Math.min(380 * dp, w * 0.32);
  const barH = 14 * dp;
  const barY = 52 * dp;
  const labelY = barY - 6 * dp;

  ctx.textAlign = 'left';
  ctx.font = `${11*dp}px Share Tech Mono, monospace`;

  // ── Player bar (left) ─────────────────────────────────────────
  const p = s.player;
  const pPct = Math.max(0, Math.min(1, p.hp / (p.maxHp || 100)));
  const px = 36 * dp;
  // label
  ctx.fillStyle = '#00fff0';
  ctx.fillText('CYBER DETECTIVE', px, labelY);
  ctx.fillStyle = 'rgba(180,220,230,0.5)';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.max(0, Math.round(p.hp))} / ${p.maxHp || 100} HP`, px + barW, labelY);
  ctx.textAlign = 'left';
  // track
  ctx.fillStyle = '#0a2030';
  ctx.fillRect(px, barY, barW, barH);
  // fill — green when high, yellow mid, red low
  const pColor = pPct > 0.5 ? '#00ee88' : pPct > 0.25 ? '#ffcc22' : '#ff3355';
  ctx.fillStyle = pColor;
  ctx.fillRect(px, barY, barW * pPct, barH);
  // border
  ctx.strokeStyle = 'rgba(0,255,240,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px, barY, barW, barH);

  // ── Round label (center) ──────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `bold ${13*dp}px Orbitron, Share Tech Mono, monospace`;
  ctx.fillText(`ROUND  ${s.round || 1} / ${s.maxRounds || 3}`, w / 2, labelY);

  // ── Enemy bar (right) ─────────────────────────────────────────
  const enemy = s.battle;
  const ePct  = Math.max(0, Math.min(1, enemy.enemyHp / (enemy.enemyMaxHp || 80)));
  const ex    = w - barW - 36 * dp;
  ctx.textAlign = 'right';
  ctx.font = `${11*dp}px Share Tech Mono, monospace`;
  ctx.fillStyle = '#ff4488';
  ctx.fillText('HACKER', ex + barW, labelY);
  ctx.fillStyle = 'rgba(180,220,230,0.5)';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.max(0, Math.round(enemy.enemyHp))} / ${enemy.enemyMaxHp || 80} HP`, ex, labelY);
  // track
  ctx.fillStyle = '#2a0a14';
  ctx.fillRect(ex, barY, barW, barH);
  // fill
  ctx.fillStyle = '#ff2255';
  ctx.fillRect(ex, barY, barW * ePct, barH);
  ctx.strokeStyle = 'rgba(255,34,68,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ex, barY, barW, barH);

  ctx.textAlign = 'left';
}

// Move player (impulse-based, for on-screen button taps)
function duelMove(direction) {
  if (!state || !state.chars.player) return;
  const pc = state.chars.player;
  pc.vx = direction === 'right' ? 5 : -5;
  if (direction === 'up' && pc.onGround) { pc.vy = -13; pc.onGround = false; }
}

// Keyboard held-key tracker — called from main.js keydown/keyup
function handleDuelKey(key, isDown) {
  if (!state) return;
  const hk = state.heldKeys;
  if (!hk) return;
  if (key === 'ArrowLeft'  || key === 'a' || key === 'A') hk.left  = isDown;
  if (key === 'ArrowRight' || key === 'd' || key === 'D') hk.right = isDown;
  if (key === 'ArrowUp'    || key === 'w' || key === 'W' || key === ' ') {
    if (isDown) hk.up = true;    // set on press; physics consumes it
    else        hk.up = false;
  }
}

// Skill definitions
const SKILL_DATA = {
  scan:     { label: 'Scan Email',    dmg: 18, heal: 0,  cDmg: 12, color: '#00d8ff' },
  analyze:  { label: 'Analyze',       dmg: 26, heal: 0,  cDmg: 16, color: '#6699ff' },
  sandbox:  { label: 'Sandbox',       dmg: 38, heal: 0,  cDmg: 20, color: '#ffaa44' },
  firewall: { label: 'Firewall',      dmg: 10, heal: 0,  cDmg: 6,  color: '#cc88ff' },
  incident: { label: 'Incident Resp', dmg: 0,  heal: 20, cDmg: 10, color: '#00ee88' },
  isolate:  { label: 'Isolate',       dmg: 50, heal: 0,  cDmg: 24, color: '#ffdd22' },
};

function performDuelSkill(skillId) {
  if (!state || state.gameOver || state.roundClearing) return;
  const sk = SKILL_DATA[skillId] || SKILL_DATA.scan;
  const q  = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  const playerChar = state.chars.player;
  const enemyChar  = state.chars.enemy;
  playAnim(playerChar, 'attack');
  setTimeout(() => {
    showQuestionModal(q, (ans) => {
      const correct = (ans === 'yes') === q.ok;
      if (q.insight) showInsightToast(q.insight, correct);

      if (correct) {
        playAnim(enemyChar, 'hit');
        if (sk.heal > 0) {
          // Healing skill
          const healed = Math.min(sk.heal, (state.player.maxHp || 100) - state.player.hp);
          state.player.hp = Math.min(state.player.maxHp || 100, state.player.hp + sk.heal);
          state.effects.push({ text: `+${healed} HP`, x: canvas.width * 0.22, y: canvas.height * 0.42, t: 1400, color: '#00ee88' });
          spawnParticles(canvas.width * 0.22, canvas.height * 0.45, '#00ee88');
          if (window.appendBattleLog) window.appendBattleLog(`✓ Benar! ${sk.label} pulihkan +${healed} HP.`);
        } else {
          const isCrit = skillId === 'isolate';
          const dmgText = isCrit ? `CRITICAL −${sk.dmg}` : `−${sk.dmg} HP`;
          state.battle.enemyHp = Math.max(0, state.battle.enemyHp - sk.dmg);
          state.effects.push({ text: dmgText, x: canvas.width * 0.75, y: canvas.height * 0.40, t: 1600, color: sk.color });
          spawnParticles(canvas.width * 0.75, canvas.height * 0.45, sk.color);
          if (window.appendBattleLog) window.appendBattleLog(`✓ Benar! ${sk.label}${isCrit ? ' — CRITICAL HIT' : ''} mengena ${sk.dmg} HP.`);
        }
      } else {
        playAnim(playerChar, 'hit');
        state.player.hp = Math.max(0, state.player.hp - sk.cDmg);
        state.effects.push({ text: `−${sk.cDmg} HP`, x: canvas.width * 0.22, y: canvas.height * 0.42, t: 1400, color: '#ff8888' });
        spawnParticles(canvas.width * 0.22, canvas.height * 0.45, '#ff6677');
        if (window.appendBattleLog) window.appendBattleLog(`✗ Salah! Musuh counter −${sk.cDmg} HP.`);
      }
      setTimeout(() => { playAnim(playerChar, 'idle'); playAnim(enemyChar, 'idle'); }, 600);
      if (window.renderBattleUI) window.renderBattleUI();
      checkDuelEnd();
    });
  }, 380);
}

function spawnParticles(x,y,color){
  state.particles = state.particles || [];
  for(let i=0;i<8;i++){
    state.particles.push({ x:x + (Math.random()-0.5)*40, y:y + (Math.random()-0.5)*40, vx:(Math.random()-0.5)*4, vy:(Math.random()-0.5)*-2, s:4+Math.random()*6, life:300 + Math.random()*400, color });
  }
}

function checkDuelEnd() {
  if (!state) return;

  // Player HP zero → defeat
  if (state.player.hp <= 0) {
    state.player.hp = 0;
    if (window.appendBattleLog) window.appendBattleLog('SYSTEM BREACHED — Hacker menang!');
    spawnParticles(canvas.width * 0.5, canvas.height * 0.5, '#ff3366');
    spawnParticles(canvas.width * 0.3, canvas.height * 0.4, '#ff2244');
    spawnParticles(canvas.width * 0.7, canvas.height * 0.4, '#ff2244');
    state.gameOver = true;
    state.gameResult = 'lose';
    if (window.renderBattleUI) window.renderBattleUI();
    setTimeout(() => { if (window.exitBattle) window.exitBattle(); stopDuel(); }, 3000);
    return;
  }

  // Enemy HP zero → round clear or final victory
  if (state.battle.enemyHp <= 0) {
    if (state.round < state.maxRounds) {
      // Advance to next round
      state.round++;
      state.enemyType = Math.min(state.round - 1, ENEMY_TYPES.length - 1);
      const nextEt = ENEMY_TYPES[state.enemyType];
      state.battle.enemyHp    = nextEt.baseHp;
      state.battle.enemyMaxHp = nextEt.baseHp;
      // Update enemy name display
      const enameEl = document.getElementById('battle-enemy-name');
      if (enameEl) enameEl.textContent = nextEt.name;
      // Show round-clear banner
      state.roundClearing = true;
      state.roundClearTime = 0;
      // Spawn victory particles
      spawnParticles(canvas.width * 0.75, canvas.height * 0.45, '#00fff0');
      spawnParticles(canvas.width * 0.5,  canvas.height * 0.3,  '#ffcc44');
      if (window.appendBattleLog) window.appendBattleLog(`ROUND ${state.round - 1} CLEAR! Maju ke Round ${state.round}!`);
      if (window.renderBattleUI) window.renderBattleUI();
    } else {
      // Final victory
      spawnParticles(canvas.width * 0.5, canvas.height * 0.4, '#00fff0');
      spawnParticles(canvas.width * 0.3, canvas.height * 0.3, '#ffcc44');
      spawnParticles(canvas.width * 0.7, canvas.height * 0.3, '#00fff0');
      spawnParticles(canvas.width * 0.5, canvas.height * 0.6, '#ffcc44');
      if (window.appendBattleLog) window.appendBattleLog('HACKER DILUMPUHKAN — SISTEM AMAN!');
      state.gameOver = true;
      state.gameResult = 'win';
      if (window.renderBattleUI) window.renderBattleUI();
      setTimeout(() => { if (window.exitBattle) window.exitBattle(); stopDuel(); }, 3500);
    }
  }
}

function showQuestionModal(q, cb) {
  document.getElementById('duel-question-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'duel-question-modal';
  Object.assign(modal.style, {
    position: 'fixed', inset: '0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 3000,
    background: 'rgba(0,0,0,0.72)',
  });
  modal.innerHTML = `
    <div style="
      background: linear-gradient(160deg,#050f1e,#0a1830);
      border: 1px solid rgba(0,255,240,0.3);
      border-radius: 14px;
      padding: 28px 32px;
      max-width: 480px;
      width: 92%;
      box-shadow: 0 0 40px rgba(0,255,240,0.15);
    ">
      <div style="font-family:'Share Tech Mono',monospace;font-size:13px;line-height:1.7;
                  color:#c8e0f0;white-space:pre-wrap;margin-bottom:20px;">${q.q || q}</div>
      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button id="duel-q-yes" style="
          padding:10px 26px;border-radius:8px;border:2px solid #00fff0;
          background:rgba(0,255,240,0.1);color:#00fff0;
          font-family:'Share Tech Mono',monospace;font-size:14px;font-weight:700;
          cursor:pointer;transition:background 0.15s;letter-spacing:1px;">YA ✓</button>
        <button id="duel-q-no" style="
          padding:10px 26px;border-radius:8px;border:2px solid rgba(255,80,100,0.6);
          background:rgba(255,80,100,0.08);color:#ff8090;
          font-family:'Share Tech Mono',monospace;font-size:14px;font-weight:700;
          cursor:pointer;transition:background 0.15s;letter-spacing:1px;">TIDAK ✗</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const cleanup = (ans) => {
    modal.remove();
    cb(ans);
  };
  document.getElementById('duel-q-yes').onclick = () => cleanup('yes');
  document.getElementById('duel-q-no').onclick  = () => cleanup('no');
}

function showInsightToast(text, correct) {
  const toast = document.createElement('div');
  const col = correct ? '#00fff0' : '#ff5566';
  Object.assign(toast.style, {
    position: 'fixed', bottom: '90px', left: '50%',
    transform: 'translateX(-50%)',
    background: correct ? 'rgba(0,30,40,0.95)' : 'rgba(30,0,10,0.95)',
    border: `1px solid ${col}`,
    borderRadius: '10px', padding: '12px 22px',
    color: col, fontFamily: "'Share Tech Mono',monospace",
    fontSize: '13px', zIndex: 4000, maxWidth: '420px',
    textAlign: 'center', lineHeight: '1.5',
    boxShadow: `0 0 20px ${col}44`,
    transition: 'opacity 0.4s',
  });
  toast.innerHTML = `${correct ? '✅' : '❌'} <strong>${correct ? 'BENAR!' : 'SALAH!'}</strong><br><span style="opacity:0.85;">${text}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; }, 2200);
  setTimeout(() => toast.remove(), 2700);
}

// ── Cyber Forest background ───────────────────────────────────
function drawCyberForest(w, h, time) {
  const dp = devicePixelRatio;

  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.68);
  skyGrad.addColorStop(0,   '#010608');
  skyGrad.addColorStop(0.5, '#030d14');
  skyGrad.addColorStop(1,   '#041218');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h * 0.68);

  // Floating network nodes + connection lines
  const nodePos = [0.08, 0.18, 0.30, 0.50, 0.62, 0.75, 0.88, 0.95];
  const nodeY   = [0.06, 0.12, 0.08, 0.14, 0.09, 0.13, 0.07, 0.11];
  ctx.lineWidth = 1;
  for (let i = 0; i < nodePos.length; i++) {
    const nx = nodePos[i] * w;
    const ny = nodeY[i] * h;
    const glow = 0.25 + 0.18 * Math.sin(time / 900 + i * 1.3);
    // line to next node
    if (i < nodePos.length - 1) {
      ctx.strokeStyle = `rgba(0,200,255,${glow * 0.35})`;
      ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nodePos[i+1]*w, nodeY[i+1]*h); ctx.stroke();
    }
    // node square
    ctx.fillStyle = `rgba(0,220,255,${glow})`;
    ctx.fillRect(nx - 3*dp, ny - 3*dp, 6*dp, 6*dp);
    // small cross
    ctx.fillRect(nx - 6*dp, ny - dp, 12*dp, 2*dp);
    ctx.fillRect(nx - dp, ny - 6*dp, 2*dp, 12*dp);
  }

  // Server towers — far background silhouettes
  const towers = [
    { rx: 0.04,  rw: 0.040, rh: 0.28 },
    { rx: 0.10,  rw: 0.025, rh: 0.20 },
    { rx: 0.76,  rw: 0.042, rh: 0.30 },
    { rx: 0.84,  rw: 0.030, rh: 0.22 },
    { rx: 0.91,  rw: 0.035, rh: 0.18 },
    { rx: 0.96,  rw: 0.022, rh: 0.14 },
  ];
  const baseY = h * 0.66;
  towers.forEach((t, ti) => {
    const tx = t.rx * w, tw = t.rw * w, th = t.rh * h;
    const top = baseY - th;
    // tower body
    ctx.fillStyle = '#050e1a';
    ctx.fillRect(tx, top, tw, th);
    // window lights (static, seeded by ti)
    for (let wy = 8*dp; wy < th - 4*dp; wy += 10*dp) {
      for (let wx = 3*dp; wx < tw - 3*dp; wx += 7*dp) {
        const lit = ((ti * 7 + Math.floor(wy) + Math.floor(wx)) % 5) < 3;
        ctx.fillStyle = lit ? 'rgba(0,160,255,0.18)' : 'rgba(0,0,0,0.2)';
        ctx.fillRect(tx + wx, top + wy, 4*dp, 6*dp);
      }
    }
    // blink antenna
    const blink = 0.3 + 0.5 * Math.abs(Math.sin(time / 700 + ti));
    ctx.fillStyle = `rgba(255,60,60,${blink})`;
    ctx.fillRect(tx + tw/2 - 2*dp, top - 5*dp, 4*dp, 4*dp);
  });

  // Binary trees — left and right of arena
  const trees = [
    { x: 0.01, h: 0.36, c: '#0a2a16' },
    { x: 0.19, h: 0.26, c: '#0a2a16' },
    { x: 0.73, h: 0.28, c: '#0a2a16' },
    { x: 0.90, h: 0.34, c: '#0a2a16' },
  ];
  trees.forEach(t => drawBinaryTree(t.x * w, baseY, t.h * h, dp, time, t.c));

  // Ground
  const floorGrad = ctx.createLinearGradient(0, baseY, 0, h);
  floorGrad.addColorStop(0, '#051015');
  floorGrad.addColorStop(1, '#030a10');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, baseY, w, h - baseY);

  // Circuit traces on ground
  ctx.strokeStyle = 'rgba(0,200,180,0.06)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < w; gx += 28*dp) {
    ctx.beginPath(); ctx.moveTo(gx, baseY); ctx.lineTo(gx, h); ctx.stroke();
  }
  for (let gy = baseY; gy < h; gy += 18*dp) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }

  // Horizon glow line
  ctx.strokeStyle = 'rgba(0,180,100,0.18)';
  ctx.lineWidth = 2 * dp;
  ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(w, baseY); ctx.stroke();

  // Floating data packets (animated left→right)
  for (let i = 0; i < 6; i++) {
    const progress = ((time / 5000 + i / 6) % 1);
    const px = progress * w;
    const py = h * 0.10 + Math.sin(time / 1000 + i * 2.1) * h * 0.06;
    const a  = 0.12 + 0.08 * Math.sin(time / 500 + i);
    ctx.fillStyle = `rgba(0,255,200,${a})`;
    ctx.fillRect(px - 4*dp, py - 2*dp, 8*dp, 4*dp);
    // trailing dim block
    ctx.fillStyle = `rgba(0,255,200,${a * 0.4})`;
    ctx.fillRect(px - 10*dp, py - dp, 4*dp, 2*dp);
  }
}

function drawBinaryTree(cx, baseY, treeH, dp, time, trunkColor) {
  const trunkW = 5 * dp;
  // trunk
  ctx.fillStyle = trunkColor;
  ctx.fillRect(cx - trunkW/2, baseY - treeH, trunkW, treeH);

  // branches + leaf blocks per level
  const levels = 4;
  for (let lv = 0; lv < levels; lv++) {
    const lvY     = baseY - treeH * (0.28 + lv * 0.17);
    const spread  = (10 + lv * 9) * dp;
    const brH     = Math.max(2*dp, (4 - lv) * dp);

    ctx.fillStyle = trunkColor;
    // left branch
    ctx.fillRect(cx - spread, lvY, spread, brH);
    // right branch
    ctx.fillRect(cx, lvY, spread, brH);

    // leaf pixel blocks (simulate binary "canopy")
    for (let li = -(lv + 1); li <= (lv + 1); li++) {
      const leafX = cx + li * 8*dp - 3*dp;
      const leafY = lvY - 7*dp;
      const a = 0.12 + 0.06 * Math.sin(time / 700 + lv * 1.5 + li);
      ctx.fillStyle = `rgba(0,210,120,${a})`;
      ctx.fillRect(leafX, leafY, 6*dp, 6*dp);
    }
  }
}

// expose
window.startDuel = startDuel;
window.stopDuel = stopDuel;
window.performDuelSkill = performDuelSkill;
window.duelMove      = duelMove;
window.handleDuelKey = handleDuelKey;

export { startDuel, stopDuel, performDuelSkill, duelMove, handleDuelKey };
