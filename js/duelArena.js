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

// ── Enemy sprite: Round 1 — Trojan Virus ──────────────────────
const HACKER_GRID = [
  [0,1,0,1,1,0,1,0],  // glitch top spikes
  [1,1,1,1,1,1,1,1],  // corrupted head
  [1,2,3,2,2,3,2,1],  // red virus eyes
  [1,2,2,2,2,2,2,1],  // face (corrupted)
  [0,1,4,4,4,4,1,0],  // neck glitch
  [4,1,4,5,5,4,1,4],  // body with corruption artifacts
  [4,4,5,4,4,5,4,4],  // body glitch bands
  [1,4,4,4,4,4,4,1],  // lower body
  [0,4,4,4,4,4,4,0],  // waist
  [0,1,4,6,6,4,1,0],  // legs (data tentacles)
  [0,0,6,1,1,6,0,0],  // lower legs
  [0,0,1,6,6,1,0,0],  // corrupted boots
];
const HACKER_PALETTE = {
  1: '#ff1133',  // red corruption glitch
  2: '#1a0505',  // dark corrupted form
  3: '#ff0000',  // bright red virus eyes
  4: '#200810',  // dark body
  5: '#aa0022',  // deep red artifact
  6: '#0e0006',  // dark tendrils
};

// ── Enemy sprite: Round 2 — Worm Malware ─────────────────────
const MALWARE_BOT_GRID = [
  [0,0,0,1,1,0,0,0],  // head segment
  [0,0,1,2,2,1,0,0],  // head body
  [0,1,2,3,3,2,1,0],  // glowing green eyes
  [1,1,2,2,2,2,1,1],  // body segment 1
  [1,4,4,4,4,4,4,1],  // body segment 2 (wider)
  [0,1,5,4,4,5,1,0],  // segment connector glow
  [0,4,4,4,4,4,4,0],  // body segment 3
  [0,1,5,4,4,5,1,0],  // segment connector
  [0,4,4,4,4,4,4,0],  // body segment 4
  [0,0,1,5,5,1,0,0],  // tail narrowing
  [0,0,0,6,6,0,0,0],  // tail tip
  [0,0,0,0,6,0,0,0],  // tail end
];
const MALWARE_BOT_PALETTE = {
  1: '#0a2a0a',  // dark green segment outline
  2: '#1a3a10',  // head skin (dark green)
  3: '#22ff44',  // bright green eyes
  4: '#102010',  // body segments
  5: '#22aa33',  // segment connectors (bright green)
  6: '#061506',  // tail tip
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
  { grid: HACKER_GRID,      palette: HACKER_PALETTE,      name: 'TROJAN VIRUS',    baseHp: 80  },
  { grid: MALWARE_BOT_GRID, palette: MALWARE_BOT_PALETTE, name: 'WORM MALWARE',    baseHp: 104 },
  { grid: RANSOMWARE_GRID,  palette: RANSOMWARE_PALETTE,  name: 'RANSOMWARE KING', baseHp: 136 },
];

// ── NPC Quest Giver — Mentor pixel sprite ─────────────────────
const MENTOR_GRID = [
  [0,0,1,1,1,1,0,0],  // hair (gray-silver)
  [0,1,2,2,2,2,1,0],  // head
  [0,1,2,3,3,2,1,0],  // face with glasses top
  [0,0,2,3,2,3,2,0],  // glasses lenses
  [0,0,2,2,2,2,0,0],  // lower face
  [0,4,4,4,4,4,4,0],  // labcoat shoulders
  [4,4,5,5,5,5,4,4],  // labcoat body (light)
  [4,4,5,6,6,5,4,4],  // clipboard/tablet
  [4,4,5,6,7,5,4,4],  // tablet screen glow
  [0,4,4,4,4,4,4,0],  // waist
  [0,0,8,8,0,8,8,0],  // legs
  [0,0,8,8,0,8,8,0],  // lower legs
  [0,0,9,9,0,9,9,0],  // shoes
];
const MENTOR_PALETTE = {
  1: '#8888aa',  // silver-gray hair
  2: '#f0c898',  // skin tone
  3: '#22266a',  // glasses frames (dark blue)
  4: '#d8e4f8',  // labcoat white
  5: '#eef4ff',  // labcoat inner
  6: '#1a1a2e',  // tablet/clipboard body
  7: '#00ccff',  // tablet screen glow
  8: '#2a3a8a',  // dark trousers
  9: '#181828',  // dark shoes
};

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

  // NPC Mentor: stands in far-left corner watching the battle
  const mentorX = Math.max(18 * dp, (canvas.clientWidth || 600) * 0.05 * dp);
  const mentorY = floorY + 2 * dp;
  drawPixelCharacter(mentorX, mentorY, MENTOR_GRID, MENTOR_PALETTE, null, true, s.time);

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

// ── Computer Room Background ──────────────────────────────────
function drawCyberForest(w, h, time) {
  drawComputerRoom(w, h, time);
}

function drawComputerRoom(w, h, time) {
  const dp   = devicePixelRatio;
  const floorY = h * 0.72;

  // ── Ceiling ──────────────────────────────────────────────────
  ctx.fillStyle = '#020409';
  ctx.fillRect(0, 0, w, h * 0.12);

  // Ceiling light strips (rectangular LED panels — no circles)
  const lightX = [0.15, 0.35, 0.55, 0.75];
  lightX.forEach((lp, li) => {
    const lx = lp * w;
    const lw = 0.12 * w;
    const flicker = 0.88 + 0.12 * Math.abs(Math.sin(time / 3400 + li * 2.2));
    ctx.fillStyle = `rgba(160,210,255,${0.18 * flicker})`;
    ctx.fillRect(lx, 2*dp, lw, 5*dp);
    const beamG = ctx.createLinearGradient(0, 0, 0, floorY * 0.5);
    beamG.addColorStop(0, `rgba(130,190,255,${0.07 * flicker})`);
    beamG.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = beamG;
    ctx.fillRect(lx, 0, lw, floorY * 0.5);
  });

  // ── Back Wall ─────────────────────────────────────────────────
  const wallG = ctx.createLinearGradient(0, h * 0.10, 0, floorY);
  wallG.addColorStop(0, '#030810');
  wallG.addColorStop(1, '#060f1c');
  ctx.fillStyle = wallG;
  ctx.fillRect(0, h * 0.10, w, floorY - h * 0.10);

  // Wall horizontal panel seams
  ctx.lineWidth = 1;
  for (let py = h * 0.13; py < floorY; py += 30 * dp) {
    ctx.strokeStyle = 'rgba(0,80,160,0.07)';
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
  }
  // Wall vertical panel seams
  for (let px = w * 0.15; px < w * 0.86; px += 70 * dp) {
    ctx.strokeStyle = 'rgba(0,80,160,0.05)';
    ctx.beginPath(); ctx.moveTo(px, h * 0.10); ctx.lineTo(px, floorY); ctx.stroke();
  }

  // ── Server Racks (left & right walls) ─────────────────────────
  drawServerRack(0, h * 0.10, w * 0.14, floorY - h * 0.10, dp, time, 0);
  drawServerRack(w * 0.86, h * 0.10, w * 0.14, floorY - h * 0.10, dp, time, 1);

  // ── Wall-mounted Monitors (center back wall) ──────────────────
  drawWallMonitor(w * 0.22, h * 0.14, w * 0.17, h * 0.26, dp, time, 'code');
  drawWallMonitor(w * 0.41, h * 0.11, w * 0.18, h * 0.30, dp, time, 'alert');
  drawWallMonitor(w * 0.61, h * 0.14, w * 0.17, h * 0.26, dp, time, 'network');

  // ── Overhead Cable Conduit ────────────────────────────────────
  ctx.fillStyle = 'rgba(0,40,90,0.6)';
  ctx.fillRect(0, h * 0.10 - 8*dp, w, 8*dp);
  const cableColors = [
    'rgba(0,200,255,0.22)', 'rgba(255,140,0,0.16)',
    'rgba(0,255,100,0.14)', 'rgba(200,100,255,0.14)',
  ];
  cableColors.forEach((cc, ci) => {
    ctx.strokeStyle = cc;
    ctx.lineWidth = 2 * dp;
    ctx.beginPath();
    ctx.moveTo(0,   h * 0.10 - (ci + 1) * 2 * dp);
    ctx.lineTo(w,   h * 0.10 - (ci + 1) * 2 * dp);
    ctx.stroke();
  });

  // ── Floor ─────────────────────────────────────────────────────
  const floorG = ctx.createLinearGradient(0, floorY, 0, h);
  floorG.addColorStop(0, '#040c18');
  floorG.addColorStop(1, '#02060e');
  ctx.fillStyle = floorG;
  ctx.fillRect(0, floorY, w, h - floorY);

  // Floor tiles (grid)
  const tileW = 40 * dp, tileH = 20 * dp;
  ctx.lineWidth = 1;
  for (let fx = 0; fx < w; fx += tileW) {
    ctx.strokeStyle = 'rgba(0,140,220,0.09)';
    ctx.beginPath(); ctx.moveTo(fx, floorY); ctx.lineTo(fx, h); ctx.stroke();
  }
  for (let fy = floorY; fy < h; fy += tileH) {
    ctx.strokeStyle = 'rgba(0,140,220,0.07)';
    ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(w, fy); ctx.stroke();
  }

  // Floor edge glow strip
  ctx.strokeStyle = 'rgba(0,190,255,0.22)';
  ctx.lineWidth = 2 * dp;
  ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(w, floorY); ctx.stroke();

  // Floor tile reflection patch (subtle)
  const reflG = ctx.createLinearGradient(0, floorY, 0, floorY + 28*dp);
  reflG.addColorStop(0, 'rgba(0,180,255,0.07)');
  reflG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = reflG;
  ctx.fillRect(0, floorY, w, 28*dp);

  // ── Floating Binary / Hex Data Fragments ─────────────────────
  for (let i = 0; i < 7; i++) {
    const prog = ((time / 9000 + i / 7) % 1);
    const px   = w * 0.15 + prog * w * 0.70;
    const py   = floorY * (0.28 + 0.10 * Math.sin(time / 800 + i * 1.9));
    const a    = 0.06 + 0.04 * Math.sin(time / 450 + i);
    ctx.fillStyle = `rgba(0,255,180,${a})`;
    ctx.fillRect(px,          py,          14*dp, 3*dp);
    ctx.fillRect(px + 17*dp,  py,           8*dp, 3*dp);
    ctx.fillRect(px + 28*dp,  py,          10*dp, 3*dp);
  }

  // ── CRT Scanlines overlay ─────────────────────────────────────
  for (let sl = 0; sl < h; sl += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, sl, w, 2);
  }
}

function drawServerRack(rx, ry, rw, rh, dp, time, idx) {
  // Rack chassis
  ctx.fillStyle = '#030810';
  ctx.fillRect(rx, ry, rw, rh);
  ctx.strokeStyle = 'rgba(0,80,160,0.45)';
  ctx.lineWidth = 2 * dp;
  ctx.strokeRect(rx, ry, rw, rh);

  // Rack frame rails
  ctx.fillStyle = 'rgba(0,60,120,0.4)';
  ctx.fillRect(rx, ry, 4*dp, rh);
  ctx.fillRect(rx + rw - 4*dp, ry, 4*dp, rh);

  const unitH = 11 * dp;
  const pad   = 5 * dp;
  let ui = 0;
  for (let uy = ry + pad; uy < ry + rh - unitH; uy += unitH + 2*dp) {
    // 1U server tray
    ctx.fillStyle = '#070e1e';
    ctx.fillRect(rx + pad, uy, rw - 2*pad, unitH);
    ctx.strokeStyle = 'rgba(0,100,200,0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(rx + pad, uy, rw - 2*pad, unitH);

    // Power/status LED — rectangular, no circles
    const seed   = idx * 31 + ui * 7;
    const active = (seed % 4) !== 1;
    const ledA   = active
      ? 0.6 + 0.35 * Math.abs(Math.sin(time / 500 + seed * 0.9))
      : 0.3;
    ctx.fillStyle = active
      ? `rgba(0,255,100,${ledA})`
      : `rgba(255,60,0,${ledA})`;
    ctx.fillRect(rx + pad + 3*dp, uy + unitH/2 - dp, 4*dp, 2*dp);

    // HDD activity blink — rectangular
    const diskOn = ((time + seed * 173) % 700) < 150;
    ctx.fillStyle = `rgba(255,200,0,${diskOn ? 0.9 : 0.08})`;
    ctx.fillRect(rx + pad + 9*dp, uy + unitH/2 - dp, 3*dp, 2*dp);

    // Vent slots (right side)
    ctx.fillStyle = 'rgba(0,40,90,0.5)';
    for (let vi = 0; vi < 3; vi++) {
      ctx.fillRect(
        rx + rw - pad - (vi + 1) * 7*dp,
        uy + 2*dp,
        5*dp,
        unitH - 4*dp
      );
    }
    ui++;
  }

  // Cable bundle at bottom of rack
  const cbColors = [
    'rgba(0,200,255,0.5)', 'rgba(255,120,0,0.4)',
    'rgba(0,255,100,0.35)', 'rgba(200,80,255,0.3)',
  ];
  cbColors.forEach((cc, ci) => {
    ctx.strokeStyle = cc;
    ctx.lineWidth   = 2 * dp;
    ctx.beginPath();
    ctx.moveTo(rx + pad + ci * 6*dp, ry + rh - 18*dp);
    ctx.lineTo(rx + pad + ci * 6*dp, ry + rh);
    ctx.stroke();
  });
}

function drawWallMonitor(mx, my, mw, mh, dp, time, type) {
  // Bezel
  ctx.fillStyle = '#06080f';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = 'rgba(0,140,240,0.38)';
  ctx.lineWidth   = 2 * dp;
  ctx.strokeRect(mx, my, mw, mh);

  const p  = 4 * dp;
  const sx = mx + p, sy = my + p;
  const sw = mw - 2*p, sh = mh - 2*p;

  if (type === 'alert') {
    // Red alert screen — threat detected
    ctx.fillStyle = 'rgba(30,0,8,0.95)';
    ctx.fillRect(sx, sy, sw, sh);
    const bl = 0.5 + 0.5 * Math.abs(Math.sin(time / 460));
    ctx.fillStyle = `rgba(255,20,50,${bl * 0.18})`;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255,50,70,${bl})`;
    ctx.font = `bold ${7*dp}px monospace`;
    ctx.fillText('! THREAT DETECTED', sx + sw/2, sy + sh*0.28);
    ctx.font = `${5*dp}px monospace`;
    ctx.fillStyle = `rgba(255,130,100,${bl * 0.75})`;
    ctx.fillText('MALWARE ACTIVE', sx + sw/2, sy + sh*0.48);
    ctx.fillText('DEFENSE BREACH', sx + sw/2, sy + sh*0.63);
    ctx.fillText('ISOLATE THREAT', sx + sw/2, sy + sh*0.78);
    // Alert bar (top)
    ctx.fillStyle = `rgba(255,30,50,${bl * 0.4})`;
    ctx.fillRect(sx, sy, sw, 4*dp);

  } else if (type === 'code') {
    // Green terminal / code screen
    ctx.fillStyle = 'rgba(0,10,3,0.97)';
    ctx.fillRect(sx, sy, sw, sh);
    const codeLines = [
      '> SCAN --deep --all',
      '01101000 01100001',
      '> FIREWALL: ACTIVE',
      '11001010 00110011',
      '> TRACING ORIGIN...',
      '10101010 11110000',
      '> ANALYZING PAYLOAD',
    ];
    ctx.textAlign = 'left';
    ctx.font = `${5*dp}px monospace`;
    codeLines.forEach((line, li) => {
      const la = 0.5 + 0.3 * Math.sin(time / 700 + li * 0.8);
      ctx.fillStyle = `rgba(0,220,80,${la})`;
      ctx.fillText(line, sx + 3*dp, sy + 7*dp + li * 7*dp);
    });
    // Cursor blink
    if (Math.floor(time / 500) % 2 === 0) {
      ctx.fillStyle = 'rgba(0,255,100,0.9)';
      ctx.fillRect(sx + 3*dp, sy + sh - 8*dp, 5*dp, 5*dp);
    }

  } else {
    // Network graph / data monitor
    ctx.fillStyle = 'rgba(0,4,14,0.97)';
    ctx.fillRect(sx, sy, sw, sh);
    // Graph line (network traffic)
    const pts = [0, 0.5, 0.1, 0.4, 0.3, 0.7, 0.45, 0.2, 0.6, 0.65, 0.75, 0.35, 0.9, 0.55, 1.0, 0.4];
    ctx.strokeStyle = 'rgba(0,160,255,0.55)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    for (let pi = 0; pi < pts.length; pi += 2) {
      const px = sx + pts[pi] * sw;
      const py = sy + pts[pi+1] * sh;
      if (pi === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // Data point markers (squares)
    for (let pi = 0; pi < pts.length; pi += 2) {
      ctx.fillStyle = 'rgba(0,200,255,0.7)';
      ctx.fillRect(sx + pts[pi]*sw - 2*dp, sy + pts[pi+1]*sh - 2*dp, 4*dp, 4*dp);
    }
    // Label
    ctx.textAlign = 'left';
    ctx.font      = `${5*dp}px monospace`;
    ctx.fillStyle = 'rgba(0,180,255,0.4)';
    ctx.fillText('NET TRAFFIC', sx + 2*dp, sy + sh - 4*dp);
  }

  // Monitor stand (rectangular base)
  ctx.fillStyle = '#05080f';
  ctx.fillRect(mx + mw*0.38, my + mh,   mw*0.24, 5*dp);
  ctx.fillRect(mx + mw*0.28, my + mh + 5*dp, mw*0.44, 3*dp);
}

// ── NPC Quest Intro Overlay ───────────────────────────────────
function showNpcQuestIntro(onAccept) {
  document.getElementById('npc-quest-intro')?.remove();

  const ENEMY_NAMES = ['Trojan Virus', 'Worm Malware', 'Ransomware King'];
  const overlay = document.createElement('div');
  overlay.id = 'npc-quest-intro';
  overlay.innerHTML = `
    <div class="nqi-room">
      <div class="nqi-content">

        <div class="nqi-left">
          <div class="nqi-npc-frame">
            <svg class="nqi-npc-svg" width="90" height="130" viewBox="0 0 14 20"
                xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
              <rect x="3" y="0" width="8" height="2" fill="#8888aa"/>
              <rect x="3" y="2" width="8" height="5" fill="#f0c898"/>
              <rect x="3" y="3" width="3" height="2" fill="none" stroke="#22266a" stroke-width="0.6"/>
              <rect x="8" y="3" width="3" height="2" fill="none" stroke="#22266a" stroke-width="0.6"/>
              <rect x="6" y="4" width="2" height="0.6" fill="#22266a"/>
              <rect x="2" y="7" width="10" height="8" fill="#d8e4f8"/>
              <rect x="5" y="7" width="4" height="3" fill="#3a5a9a"/>
              <rect x="8" y="10" width="3" height="4" fill="#1a1a2e"/>
              <rect x="8.5" y="10.5" width="2" height="3" fill="#00d4ff" opacity="0.4"/>
              <rect x="4" y="15" width="3" height="4" fill="#2a3a8a"/>
              <rect x="7" y="15" width="3" height="4" fill="#2a3a8a"/>
              <rect x="4" y="18" width="3" height="2" fill="#181828"/>
              <rect x="7" y="18" width="3" height="2" fill="#181828"/>
            </svg>
            <div class="nqi-npc-name">AGENT_7</div>
            <div class="nqi-npc-rank">Senior Cyber Analyst</div>
          </div>
        </div>

        <div class="nqi-right">
          <div class="nqi-tag">// MISSION BRIEFING — DUEL ARENA</div>
          <div class="nqi-dialog">
            <p>Siap, Agent? Server kita sedang diinvasi oleh <em>malware dan virus</em> berbahaya yang mencoba membobol sistem pertahanan.</p>
            <p>Gunakan pengetahuan keamanan sibermu. Setiap jawaban benar menghajar musuh — setiap kesalahan balik menyerangmu!</p>
          </div>
          <div class="nqi-mission-board">
            <div class="nqi-mb-title">// TARGET THREATS</div>
            <div class="nqi-mb-row"><span class="nqi-mb-icon">🔴</span><span>Round 1 — <b>Trojan Virus</b> (80 HP)</span></div>
            <div class="nqi-mb-row"><span class="nqi-mb-icon">🟢</span><span>Round 2 — <b>Worm Malware</b> (104 HP)</span></div>
            <div class="nqi-mb-row"><span class="nqi-mb-icon">👑</span><span>Round 3 — <b>Ransomware King</b> (136 HP)</span></div>
          </div>
          <div class="nqi-tips">
            <span>💡 Jawab BENAR → musuh damage</span>
            <span>⚠️ Jawab SALAH → kamu kena counter</span>
            <span>🎮 WASD / Arrow Keys = gerak karakter</span>
          </div>
          <button class="nqi-accept-btn" id="nqi-accept">[ TERIMA MISI — MULAI DUEL ]</button>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('nqi-visible'));

  document.getElementById('nqi-accept').onclick = () => {
    overlay.classList.remove('nqi-visible');
    overlay.classList.add('nqi-hide');
    setTimeout(() => { overlay.remove(); onAccept(); }, 420);
  };
}

// expose
window.startDuel = startDuel;
window.stopDuel = stopDuel;
window.performDuelSkill = performDuelSkill;
window.duelMove         = duelMove;
window.handleDuelKey    = handleDuelKey;
window.showNpcQuestIntro = showNpcQuestIntro;

export { startDuel, stopDuel, performDuelSkill, duelMove, handleDuelKey, showNpcQuestIntro };
