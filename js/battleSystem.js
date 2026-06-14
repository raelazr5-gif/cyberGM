import { movePosition, manhattan } from './movement.js';
import { startDuel } from './duelArena.js';
function posEqual(a, b) {
  return a?.x === b?.x && a?.y === b?.y;
}

function enemyMoveToward(state) {
  const source = state.enemyPos;
  const target = state.playerPos;
  const dx = Math.sign(target.x - source.x);
  const dy = Math.sign(target.y - source.y);
  const candidates = [
    { x: source.x + dx, y: source.y },
    { x: source.x, y: source.y + dy },
    { x: source.x + dx, y: source.y + dy },
  ];
  return candidates.find(pos =>
    pos.x >= 0 && pos.y >= 0 && pos.x < state.width && pos.y < state.height &&
    !state.obstacles.some(o => o.x === pos.x && o.y === pos.y) &&
    !posEqual(pos, state.playerPos)
  ) || source;
}

function performPlayerAttack(state, player) {
  const distance = manhattan(state.playerPos, state.enemyPos);
  if (distance > 1 && !posEqual(state.playerPos, state.enemyPos)) {
    return 'Musuh terlalu jauh untuk diserang.';
  }
  const baseDamage = 10 + Math.floor(Math.random() * 7);
  const critBonus = player.learnedSkills.includes('a1') ? 4 : 0;
  const sharpEye = state.sharpEyeActive ? 6 : 0;
  const isCrit = Math.random() < (player.learnedSkills.includes('a1') ? 0.25 : 0.08) || state.sharpEyeActive;
  state.sharpEyeActive = false;
  const defense = Math.max(0, state.enemyDefense + state.enemyDefenseDebuff - (state.scanned ? 2 : 0));
  const damage = Math.max(4, Math.round(baseDamage + critBonus + sharpEye) - defense);
  state.enemyHp = Math.max(0, state.enemyHp - damage);
  return `Serangan kamu mengena ${damage} HP${isCrit ? ' (CRIT!)' : ''}.`;
}

function enemyAttack(state, player) {
  let damage = Math.max(3, state.enemyAttack + Math.floor(Math.random() * 5) - (state.shieldActive ? 5 : 0));
  const damageText = state.shieldActive ? 'Damage dikurangi oleh Shield.' : '';
  state.shieldActive = false;
  if (state.counterActive) {
    const counterDamage = 10;
    state.enemyHp = Math.max(0, state.enemyHp - counterDamage);
    state.counterActive = false;
    return `Musuh menyerang dan menyebabkan ${damage} damage. Counter aktif! Musuh menerima ${counterDamage} damage.`;
  }
  player.hp = Math.max(0, player.hp - damage);
  return `Musuh menyerang dan menyebabkan ${damage} damage. ${damageText}`;
}

export function createBattleState(player) {
  const enemyLevel = Math.max(1, Math.min(5, Math.floor(player.level / 2) + 1));
  const enemyHp = 70 + (enemyLevel - 1) * 18;
  return {
    width: 7,
    height: 5,
    obstacles: [
      { x: 2, y: 1 },
      { x: 2, y: 3 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
    ],
    playerPos: { x: 0, y: 2 },
    enemyPos: { x: 6, y: 2 },
    enemyHp,
    enemyMaxHp: enemyHp,
    enemyAttack: 8 + enemyLevel * 4,
    enemyDefense: 2 + enemyLevel,
    enemyDefenseDebuff: 0,
    turn: 1,
    log: [`Duel dimulai! Musuh level ${enemyLevel} muncul di arena.`],
    usedSkills: [],
    shieldActive: false,
    counterActive: false,
    sharpEyeActive: false,
    extraActions: 0,
    scanned: false,
  };
}

export function getBattleSkills(player) {
  const skills = [
    { id: 'attack', name: 'Strike', desc: 'Serang musuh jika berdekatan.' },
    { id: 'shield', name: 'Shield Up', desc: 'Kurangi damage musuh berikutnya.' },
    { id: 'scan', name: 'Tactical Scan', desc: 'Ungkap kelemahan musuh.' },
  ];
  if (player.learnedSkills.includes('h1')) {
    skills.push({ id: 'speedHack', name: 'Speed Hack', desc: 'Dapatkan 1 gerakan ekstra.' });
  }
  if (player.learnedSkills.includes('h3')) {
    skills.push({ id: 'counter', name: 'Black Hat Counter', desc: 'Balas serangan musuh berikutnya.' });
  }
  if (player.learnedSkills.includes('d1')) {
    skills.push({ id: 'investigate', name: 'Investigate', desc: 'Pulihkan stamina dan lihat kelemahan.' });
  }
  if (player.learnedSkills.includes('d2')) {
    skills.push({ id: 'deepDive', name: 'Deep Dive', desc: 'Kurangi defense musuh.' });
  }
  if (player.learnedSkills.includes('a1')) {
    skills.push({ id: 'sharpEye', name: 'Sharp Eye', desc: 'Serangan berikutnya lebih kuat.' });
  }
  if (player.learnedSkills.includes('a3')) {
    skills.push({ id: 'expertAnalysis', name: 'Expert Analysis', desc: 'Pulihkan HP dan kurangi damage.' });
  }
  return skills;
}

export function applyBattleMove(state, direction, player) {
  const destination = movePosition(state.playerPos, direction, state);
  if (posEqual(destination, state.playerPos)) {
    return 'Gerakan kamu terhalang atau di luar arena.';
  }
  state.playerPos = destination;
  player.stamina = Math.max(0, player.stamina - 4);
  let text = `Kamu bergerak ${direction}.`;
  if (posEqual(state.playerPos, state.enemyPos)) {
    text += ' ' + performPlayerAttack(state, player);
    if (state.enemyHp <= 0) return text;
  }
  if (state.extraActions > 0) {
    state.extraActions--;
    text += ' Kamu masih punya gerakan ekstra.';
    return text;
  }
  text += ' ' + enemyAction(state, player);
  state.turn++;
  return text;
}

export function applyBattleSkill(state, skillId, player) {
  if (state.usedSkills.includes(skillId)) {
    return 'Skill ini sudah dipakai dalam duel ini.';
  }
  const skillCost = skillId === 'attack' ? 6 : 10;
  if (player.stamina < skillCost) {
    return 'Stamina tidak cukup untuk memakai skill ini.';
  }

  switch (skillId) {
    case 'attack': {
      player.stamina = Math.max(0, player.stamina - skillCost);
      state.usedSkills.push(skillId);
      const attackText = performPlayerAttack(state, player);
      return `${attackText} ${state.enemyHp <= 0 ? '' : enemyAction(state, player)}`.trim();
    }
    case 'shield':
      player.stamina = Math.max(0, player.stamina - skillCost);
      state.usedSkills.push(skillId);
      state.shieldActive = true;
      return `Shield Up aktif. Damage musuh berikutnya dikurangi.`;
    case 'scan':
      player.stamina = Math.max(0, player.stamina - skillCost);
      state.usedSkills.push(skillId);
      state.scanned = true;
      return `Tactical Scan selesai. Defense musuh berkurang sementara.`;
    case 'speedHack':
      if (!player.learnedSkills.includes('h1')) return 'Skill ini belum dipelajari.';
      player.stamina = Math.max(0, player.stamina - skillCost);
      state.usedSkills.push(skillId);
      state.extraActions += 1;
      return `Speed Hack aktif. Kamu memperoleh 1 gerakan ekstra.`;
    case 'counter':
      if (!player.learnedSkills.includes('h3')) return 'Skill ini belum dipelajari.';
      player.stamina = Math.max(0, player.stamina - skillCost);
      state.usedSkills.push(skillId);
      state.counterActive = true;
      return `Black Hat Counter aktif. Serangan musuh berikutnya akan dipantulkan.`;
    case 'investigate':
      if (!player.learnedSkills.includes('d1')) return 'Skill ini belum dipelajari.';
      player.stamina = Math.max(0, player.stamina - skillCost);
      state.usedSkills.push(skillId);
      player.stamina = Math.min(player.maxStamina, player.stamina + 18);
      return `Investigate berhasil. Stamina pulih +18.`;
    case 'deepDive':
      if (!player.learnedSkills.includes('d2')) return 'Skill ini belum dipelajari.';
      player.stamina = Math.max(0, player.stamina - skillCost);
      state.usedSkills.push(skillId);
      state.enemyDefenseDebuff = Math.min(state.enemyDefenseDebuff + 2, 4);
      return `Deep Dive berhasil. Defense musuh turun.`;
    case 'sharpEye':
      if (!player.learnedSkills.includes('a1')) return 'Skill ini belum dipelajari.';
      player.stamina = Math.max(0, player.stamina - skillCost);
      state.usedSkills.push(skillId);
      state.sharpEyeActive = true;
      return `Sharp Eye aktif. Serangan berikutnya menjadi lebih kuat.`;
    case 'expertAnalysis':
      if (!player.learnedSkills.includes('a3')) return 'Skill ini belum dipelajari.';
      player.stamina = Math.max(0, player.stamina - skillCost);
      state.usedSkills.push(skillId);
      player.hp = Math.min(player.maxHp, player.hp + 12);
      state.shieldActive = true;
      return `Expert Analysis berhasil. HP +12 dan damage dikurangi.`;
    default:
      return 'Skill tidak dikenal.';
  }
}

export function enemyAction(state, player) {
  if (state.enemyHp <= 0) return 'Musuh sudah hancur.';
  const distance = manhattan(state.playerPos, state.enemyPos);
  if (distance <= 1) {
    return enemyAttack(state, player);
  }
  const nextPos = enemyMoveToward(state);
  if (posEqual(nextPos, state.enemyPos)) {
    return 'Musuh mencoba mendekat, tapi tetap pada posisi.';
  }
  state.enemyPos = nextPos;
  return 'Musuh bergerak mendekat.';
}

/* ══════════════════════════════════════════════════════════════
   DUEL ARENA — Cybersecurity Quiz Battle System
   Integrated from duelArena.js
══════════════════════════════════════════════════════════════ */

/* ── Character SVG Assets ────────────────────────────────────── */
const CHAR_SVG = {
  detective: `<svg width="84" height="120" viewBox="0 0 14 20" xmlns="http://www.w3.org/2000/svg" class="char-svg player-idle" id="da-svg-player" style="image-rendering:pixelated"><rect x="3" y="0" width="8" height="2" fill="#1a1a2e"/><rect x="2" y="1" width="10" height="3" fill="#2a2a4e"/><rect x="3" y="1" width="8" height="3" fill="#1a1a3e"/><rect x="3" y="3" width="8" height="6" fill="#f5c5a0"/><rect x="4" y="5" width="2" height="2" fill="#1e90ff"/><rect x="8" y="5" width="2" height="2" fill="#1e90ff"/><rect x="5" y="5" width="1" height="1" fill="#003faa"/><rect x="9" y="5" width="1" height="1" fill="#003faa"/><rect x="2" y="9" width="10" height="1" fill="#f0f0f0"/><rect x="2" y="10" width="10" height="7" fill="#1a2a6e"/><rect x="3" y="10" width="8" height="7" fill="#1e3080"/><rect x="5" y="10" width="1" height="5" fill="#0a1040"/><rect x="8" y="10" width="1" height="5" fill="#0a1040"/><rect x="5" y="11" width="2" height="3" fill="#f0f0f0"/><rect x="5" y="12" width="2" height="1" fill="#1e90ff"/><rect x="0" y="12" width="4" height="3" fill="#2a2a4a"/><rect x="0" y="12" width="4" height="2" fill="#1e3080"/><rect x="1" y="13" width="2" height="1" fill="#00fff0"/><rect x="1" y="12" width="1" height="1" fill="#0088ff"/><rect x="3" y="17" width="3" height="3" fill="#0f1a4a"/><rect x="8" y="17" width="3" height="3" fill="#0f1a4a"/><rect x="3" y="19" width="3" height="1" fill="#3a2010"/><rect x="8" y="19" width="3" height="1" fill="#3a2010"/><rect x="11" y="10" width="2" height="3" fill="none" stroke="#00fff0" stroke-width="0.4" opacity="0.55"/><rect x="12" y="9" width="1" height="1" fill="#00fff0" opacity="0.3"/></svg>`,

  hacker: `<svg width="84" height="120" viewBox="0 0 14 20" xmlns="http://www.w3.org/2000/svg" class="char-svg enemy-idle" id="da-svg-enemy" style="image-rendering:pixelated"><rect x="1" y="3" width="12" height="14" fill="#1a0a0a"/><rect x="2" y="1" width="10" height="6" fill="#1a0a0a"/><rect x="3" y="0" width="8" height="4" fill="#220a0a"/><rect x="3" y="4" width="8" height="5" fill="#d0a080"/><rect x="3" y="4" width="8" height="3" fill="#1a0a0a" opacity="0.72"/><rect x="4" y="5" width="2" height="2" fill="#ff2020"/><rect x="8" y="5" width="2" height="2" fill="#ff2020"/><rect x="4" y="5" width="1" height="1" fill="#ff6060"/><rect x="8" y="5" width="1" height="1" fill="#ff6060"/><rect x="1" y="9" width="12" height="1" fill="#440010"/><rect x="1" y="13" width="12" height="1" fill="#440010"/><rect x="5" y="10" width="4" height="3" fill="#660020"/><rect x="6" y="10" width="2" height="1" fill="#ff2244" opacity="0.7"/><rect x="6" y="12" width="1" height="1" fill="#ff2244" opacity="0.5"/><rect x="7" y="12" width="1" height="1" fill="#ff2244" opacity="0.5"/><rect x="9" y="11" width="4" height="3" fill="#1a0010"/><rect x="9" y="11" width="4" height="2" fill="#220010"/><rect x="10" y="11" width="2" height="1" fill="#ff2244" opacity="0.6"/><rect x="3" y="17" width="3" height="3" fill="#0f0505"/><rect x="8" y="17" width="3" height="3" fill="#0f0505"/><rect x="3" y="19" width="3" height="1" fill="#440010"/><rect x="8" y="19" width="3" height="1" fill="#440010"/><rect x="0" y="10" width="2" height="5" fill="#330010"/><rect x="0" y="8" width="1" height="3" fill="#660020"/></svg>`
};

/* ── Question Bank: Cybersecurity Quiz ────────────────────────── */
const QUESTION_BANK = [
  {
    question: 'Alamat email apa yang PALING mencurigakan untuk phishing?',
    answers: ['support@paypa1.com', 'help@paypal.com', 'info@paypal-secure.com', 'noreply@paypal.com'],
    correct: 0,
    tag: 'PHISHING DETECTION',
    insight: 'Domain "paypa1" pakai angka "1" menggantikan huruf "l" — teknik typosquatting. Selalu periksa URL dengan teliti.'
  },
  {
    question: 'Organisasi legit TIDAK pernah meminta apa melalui telepon?',
    answers: ['Nama lengkap', 'Password/PIN', 'Konfirmasi identitas', 'Nomor rekening'],
    correct: 1,
    tag: 'SOCIAL ENGINEERING',
    insight: 'Ini vishing (voice phishing). Organisasi legit tidak pernah meminta password melalui telepon.'
  },
  {
    question: 'Berkas "dokumen.docx.exe" adalah contoh teknik apa?',
    answers: ['Compression', 'Double extension', 'Steganography', 'Encryption'],
    correct: 1,
    tag: 'MALWARE BASICS',
    insight: 'Double extension adalah teknik malware klasik. Windows menyembunyikan ekstensi terakhir secara default.'
  },
  {
    question: 'Apa yang TIDAK dijamin oleh sertifikat HTTPS?',
    answers: ['Koneksi terenkripsi', 'Website aman', 'Pemilik terverifikasi', 'Data tidak bisa dibaca di tengah'],
    correct: 1,
    tag: 'WEB SECURITY',
    insight: 'HTTPS hanya membuktikan koneksi terenkripsi. Phishing site pun bisa pakai HTTPS dengan sertifikat gratis.'
  },
  {
    question: 'Skema "investasi" yang menjanjikan return besar dari modal kecil adalah...',
    answers: ['Arbitrage', 'Advance fee fraud', 'Hedging', 'Diversifikasi'],
    correct: 1,
    tag: 'FRAUD DETECTION',
    insight: 'Advance fee fraud: korban diminta bayar "biaya" kecil untuk hadiah besar yang tidak pernah ada.'
  },
  {
    question: 'Password TERKUAT adalah...',
    answers: ['p@ssw0rd123', 'qB#9xKmL2@vW$nPqR', 'password2024', 'admin123456'],
    correct: 1,
    tag: 'PASSWORD SECURITY',
    insight: 'Password kuat: panjang (16+ karakter), kombinasi huruf besar/kecil, angka, simbol, dan tidak bermakna.'
  },
  {
    question: 'Untuk internet banking di WiFi publik, gunakan...',
    answers: ['HTTP saja', 'VPN', 'Tidak perlu ekstra', 'Proxy gratis'],
    correct: 1,
    tag: 'NETWORK SECURITY',
    insight: 'WiFi publik rentan man-in-the-middle attack. VPN mengenkripsi traffic sehingga data aman.'
  },
  {
    question: 'Prinsip "least privilege" dalam keamanan berarti...',
    answers: ['Hak akses minimal untuk semua', 'Akses hanya yang diperlukan untuk fungsi', 'VIP mendapat akses penuh', 'Tidak perlu pembatasan'],
    correct: 1,
    tag: 'ACCESS CONTROL',
    insight: 'Prinsip least privilege: hanya berikan izin yang benar-benar dibutuhkan aplikasi untuk berfungsi.'
  },
  {
    question: 'Ransomware adalah...',
    answers: ['Virus yang menghapus file', 'Malware yang mengenkripsi data dan minta tebusan', 'Worm yang menyebar sendiri', 'Spyware pengamat'],
    correct: 1,
    tag: 'MALWARE ADVANCED',
    insight: 'Ransomware mengenkripsi data korban dan meminta tebusan. Pencegahan: backup rutin + jangan buka lampiran mencurigakan.'
  },
  {
    question: 'Autentikasi 2FA (Two-Factor) adalah kombinasi apa?',
    answers: ['Username + password', 'Sesuatu yang kamu tahu + sesuatu yang kamu punya', 'Email + SMS saja', 'Password dobel'],
    correct: 1,
    tag: 'AUTHENTICATION',
    insight: '2FA menggabung pengetahuan (password) + kepemilikan (token/SMS/app). Jadi lebih aman dari 1FA.'
  }
];

/* ── Duel Arena State Management ──────────────────────────────── */
let _duelState = null;
let _duelQuestions = [];

function _freshDuelState() {
  const maxHp  = 100 + ((window.player?.level ?? 1) - 1) * 5;
  const maxSta = 80  + ((window.player?.level ?? 1) - 1) * 3;
  return {
    playerHp: maxHp,
    playerMaxHp: maxHp,
    playerSta: maxSta,
    playerMaxSta: maxSta,
    enemyHp: 100,
    enemyMaxHp: 100,
    turn: 1,
    round: 0,
    totalRounds: 5,
    answered: false,
    gameOver: false,
    correct: 0,
    wrong: 0,
    totalDamage: 0,
    scanActive: false,
    shieldActive: false,
    log: []
  };
}

function _pickDuelQuestions(n = 5) {
  const shuffled = [...QUESTION_BANK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/* ── Helper Functions ────────────────────────────────────────── */
function _$(id) { return document.getElementById(id); }

function _duelLog(msg, cls = '') {
  const log = _$('da-battle-log');
  if (!log) return;
  const el = document.createElement('div');
  el.className = 'battle-log-entry ' + cls;
  el.textContent = msg;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

function _duelEffect(text, color, xPct, yPx) {
  const layer = _$('da-effect-layer');
  if (!layer) return;
  const el = document.createElement('div');
  el.className = 'battle-effect-text';
  el.style.color  = color;
  el.style.left   = xPct;
  el.style.top    = yPx + 'px';
  el.textContent  = text;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function _duelAnimateAttack(side) {
  const svgId = side === 'player' ? 'da-svg-player' : 'da-svg-enemy';
  const hitId = side === 'player' ? 'da-enemy-portrait' : 'da-player-portrait';
  const svg   = _$(svgId);
  const hit   = _$(hitId);
  if (!svg || !hit) return;

  const idleCls   = side === 'player' ? 'player-idle'      : 'enemy-idle';
  const attackCls = side === 'player' ? 'player-attacking'  : 'enemy-attacking';

  svg.classList.remove(idleCls, attackCls);
  void svg.offsetWidth;
  svg.classList.add(attackCls);

  setTimeout(() => {
    hit.classList.add('is-hit');
    setTimeout(() => hit.classList.remove('is-hit'), 420);
  }, 560);
}

function _duelUpdateBars() {
  const s = _duelState;
  if (!s) return;

  const pHpPct = Math.max(0, s.playerHp / s.playerMaxHp * 100);
  const eHpPct = Math.max(0, s.enemyHp  / s.enemyMaxHp  * 100);
  const pStaPct = s.playerSta / s.playerMaxSta * 100;

  if (_$('da-player-hp-bar'))  _$('da-player-hp-bar').style.width  = pHpPct  + '%';
  if (_$('da-player-sta-bar')) _$('da-player-sta-bar').style.width = pStaPct + '%';
  if (_$('da-enemy-hp-bar'))   _$('da-enemy-hp-bar').style.width   = eHpPct  + '%';

  if (_$('da-player-hp-val'))  _$('da-player-hp-val').textContent  = Math.max(0, s.playerHp)  + '/' + s.playerMaxHp;
  if (_$('da-player-sta-val')) _$('da-player-sta-val').textContent = s.playerSta + '/' + s.playerMaxSta;
  if (_$('da-enemy-hp-val'))   _$('da-enemy-hp-val').textContent   = Math.max(0, s.enemyHp)   + '/' + s.enemyMaxHp;

  if (_$('da-turn-label'))  _$('da-turn-label').textContent  = 'TURN ' + s.turn;
  if (_$('da-round-label')) _$('da-round-label').textContent = 'ROUND ' + (s.round + 1) + ' / ' + s.totalRounds;

  const nameEl = _$('da-player-name');
  if (nameEl && window.player?.name) nameEl.textContent = window.player.name;
}

function _duelSetSkillsDisabled(disabled) {
  ['scan','firewall','trace','report'].forEach(sk => {
    const btn = _$('da-skill-' + sk);
    if (btn) btn.disabled = disabled;
  });
}

/* ── Core Duel Logic ─────────────────────────────────────────── */
function _duelLoadQuestion() {
  const s = _duelState;
  if (s.round >= _duelQuestions.length) { _duelEndGame(); return; }

  const q = _duelQuestions[s.round];
  s.answered    = false;
  s.scanActive  = false;
  s.shieldActive = false;

  _$('da-q-tag').textContent  = '// ' + q.tag;
  _$('da-q-text').textContent = q.question;

  const grid = _$('da-answer-grid');
  grid.innerHTML = '';

  const indices = [0,1,2,3].sort(() => Math.random() - 0.5);
  indices.forEach(i => {
    const btn = document.createElement('button');
    btn.className = 'battle-answer-btn';
    btn.textContent = q.answers[i];
    btn.onclick = () => _duelHandleAnswer(i, q, btn, grid);
    grid.appendChild(btn);
  });

  _duelSetSkillsDisabled(false);
  _duelUpdateBars();
}

function _duelHandleAnswer(idx, q, clickedBtn, grid) {
  const s = _duelState;
  if (s.answered || s.gameOver) return;
  s.answered = true;
  _duelSetSkillsDisabled(true);

  const allBtns = grid.querySelectorAll('.battle-answer-btn');
  allBtns.forEach(b => b.disabled = true);

  const isCorrect = idx === q.correct;

  if (isCorrect) {
    clickedBtn.classList.add('answer-correct');
    s.playerHp = Math.min(s.playerMaxHp, s.playerHp + 15);
    s.correct++;
    _duelLog('Jawaban BENAR! ' + q.insight, 'log-correct');
    _duelEffect('+15 HP', '#00ee88', '40%', 200);
  } else {
    clickedBtn.classList.add('answer-wrong');
    allBtns[q.correct].classList.add('answer-correct');
    const damage = 18;
    s.playerHp = Math.max(0, s.playerHp - damage);
    s.wrong++;
    s.totalDamage += damage;
    _duelLog('Jawaban SALAH! ' + q.insight, 'log-wrong');
    _duelEffect('-' + damage + ' HP', '#ff3355', '40%', 200);
  }

  const statusEl = _$('da-player-status');
  if (statusEl) statusEl.innerHTML = '';

  _duelUpdateBars();
  _duelCheckGameOver();

  if (!s.gameOver) {
    setTimeout(() => {
      s.round++;
      _duelLoadQuestion();
    }, 2000);
  }
}

function _duelCheckGameOver() {
  const s = _duelState;
  if (s.playerHp <= 0) {
    s.gameOver = true;
    _duelLog('KEKALAHAN! HP habis!', 'log-system');
    setTimeout(() => _duelShowResult(false), 600);
  } else if (s.enemyHp <= 0) {
    s.gameOver = true;
    _duelLog('KEMENANGAN!', 'log-system');
    setTimeout(() => _duelShowResult(true), 600);
  } else if (s.round >= _duelQuestions.length - 1 && s.answered) {
    s.gameOver = true;
    const playerWin = s.playerHp > s.enemyHp;
    _duelShowResult(playerWin);
  }
}

function _duelEndGame() {
  _duelShowResult(_duelState.playerHp > _duelState.enemyHp);
}

function _duelShowResult(win) {
  const s = _duelState;
  const screen = _$('da-result-screen');
  if (!screen) return;
  screen.classList.add('visible');

  const title = _$('da-result-title');
  const sub   = _$('da-result-sub');

  if (win) {
    title.textContent = 'KEMENANGAN!';
    title.className = 'battle-result-title win';
    sub.textContent = 'Detektif Siber Menang!';
  } else {
    title.textContent = 'KEKALAHAN!';
    title.className = 'battle-result-title lose';
    sub.textContent = 'Penipu Siber Menang!';
  }

  const xpGained = s.correct * 15 + (win ? 50 : 10);
  if (_$('da-res-correct')) _$('da-res-correct').textContent = s.correct;
  if (_$('da-res-wrong'))   _$('da-res-wrong').textContent   = s.wrong;
  if (_$('da-res-dmg'))     _$('da-res-dmg').textContent     = s.totalDamage;
  if (_$('da-res-xp'))      _$('da-res-xp').textContent      = xpGained;

  if (window.player) {
    window.player.exp += xpGained;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cyberGM_player', JSON.stringify(window.player));
    }
  }
}

/* ── Duel Skill Handler ──────────────────────────────────────── */
window.duelArenaSkill = function(skill) {
  const s = _duelState;
  if (!s || s.answered || s.gameOver) return;

  const costs = { scan: 15, firewall: 25, trace: 20, report: 30 };
  const cost  = costs[skill];

  if (s.playerSta < cost) {
    _duelLog('Stamina tidak cukup!', 'log-hint');
    return;
  }

  s.playerSta -= cost;
  _duelUpdateBars();

  switch (skill) {
    case 'scan':
      s.scanActive = true;
      _duelLog('SCAN: Deteksi kelemahan musuh! Defense musuh -2.', 'log-player');
      s.enemyHp = Math.max(0, s.enemyHp - 5);
      break;
    case 'firewall':
      s.shieldActive = true;
      _duelLog('FIREWALL: Pertahanan diaktifkan! Damage berkurang 40%.', 'log-player');
      break;
    case 'trace':
      _duelLog('TRACE: Musuh terlacak! +10 damage ke serangan berikutnya.', 'log-player');
      s.totalDamage += 10;
      break;
    case 'report':
      const healAmount = 20;
      s.playerHp = Math.min(s.playerMaxHp, s.playerHp + healAmount);
      _duelLog('REPORT: Analisis menyeluruh. HP +' + healAmount, 'log-player');
      break;
  }
};

/* ── Public API for Duel Arena ────────────────────────────────── */
export function initDuelArena() {
  _duelState = _freshDuelState();
  _duelQuestions = _pickDuelQuestions(5);
  
  const battleEl = _$('battle');
  if (!battleEl) return;
  
  battleEl.innerHTML = buildDuelArenaHTML();
  
  _duelLoadQuestion();
  _duelUpdateBars();
}

window.duelArenaRestart = function() {
  initDuelArena();
};

export function openBattleArena() {

    const battleScreen =
        document.getElementById('battle');

    const battleMap =
        document.getElementById('battle-map');

    if (!battleScreen || !battleMap) return;

    battleScreen.classList.add('duel-mode');

    battleMap.classList.add('duel-active');

    battleMap.innerHTML = '';

    startDuel({
        container: battleMap,
        playerName: window.G?.player?.name || 'Investigator',
        level: window.G?.player?.level || 1,
        onVictory() {

            if (window.G?.player) {
                window.G.player.exp += 150;
                window.G.player.credits += 300;
            }

            if (window.showNotification) {
                showNotification(
                    'success',
                    'MISSION SUCCESS',
                    '+150 EXP | +300 CREDIT'
                );
            }
        },
        onDefeat() {

            if (window.G?.player) {
                window.G.player.hp =
                    Math.max(
                        0,
                        window.G.player.hp - 15
                    );
            }

            if (window.showNotification) {
                showNotification(
                    'danger',
                    'SYSTEM BREACHED',
                    '-15 HP'
                );
            }
        }
    });
}

window.openBattleArena = openBattleArena;

export function closeBattleArena() {

    const battleScreen =
        document.getElementById('battle');

    const battleMap =
        document.getElementById('battle-map');

    battleScreen?.classList.remove(
        'duel-mode'
    );

    battleMap?.classList.remove(
        'duel-active'
    );

    if (battleMap) {
        battleMap.innerHTML = '';
    }
}
/* ── HTML Template Builder ────────────────────────────────────── */
export function buildDuelArenaHTML() {
  return `
<div class="arena-bg">
  <div class="arena-back-wall"></div>
  <div class="arena-banner blue"><div class="arena-banner-text">PROTECT<br>DETECT<br>RESPOND</div></div>
  <div class="arena-banner red"><div class="arena-banner-text">EXPLOIT<br>PHISH<br>DESTROY</div></div>
  <div class="arena-wall-panel center">
    <div class="arena-center-sign">
      <div class="sign-lock"></div>
      <div class="arena-sign-title">DUEL ARENA</div>
    </div>
  </div>
  <div class="arena-screen-panel blue-screen"><div class="arena-screen-text">DETECTIVE<br>SIBER</div></div>
  <div class="arena-screen-panel red-screen"><div class="arena-screen-text">PENIPU<br>SIBER</div></div>
  <div class="arena-floor"></div>
  <div class="arena-floor-circle"></div>
  <div class="arena-scanlines"></div>
</div>

<div class="battle-topbar">
  <button class="btn btn-sm" onclick="exitBattle()">← KEMBALI</button>
  <div class="battle-title">// DUEL ARENA</div>
  <div class="battle-turn" id="da-turn-label">TURN 1</div>
</div>

<div class="battle-area">
  <div class="battle-card" id="da-player-card">
    <div class="battle-portrait" id="da-player-portrait">${CHAR_SVG.detective}</div>
    <div class="battle-name" id="da-player-name">DETECTIVE</div>
    <div class="battle-bar-row">
      <div class="battle-bar-label">HP</div>
      <div class="battle-bar-track"><div class="battle-bar-fill bar-fill-hp" id="da-player-hp-bar" style="width:100%"></div></div>
      <div class="battle-bar-value" id="da-player-hp-val">100/100</div>
    </div>
    <div class="battle-bar-row">
      <div class="battle-bar-label">STA</div>
      <div class="battle-bar-track"><div class="battle-bar-fill bar-fill-sta" id="da-player-sta-bar" style="width:100%"></div></div>
      <div class="battle-bar-value" id="da-player-sta-val">80/80</div>
    </div>
    <div class="battle-status-row" id="da-player-status"></div>
  </div>

  <div class="battle-stage-panel">
    <div class="battle-vs-badge">VS</div>
    <div class="battle-round-label" id="da-round-label">ROUND 1 / 5</div>
    <div class="battle-question-box">
      <div class="battle-question-tag" id="da-q-tag">// QUESTION</div>
      <div class="battle-question-text" id="da-q-text">Pertanyaan akan muncul di sini...</div>
      <div class="battle-answer-grid" id="da-answer-grid"></div>
    </div>
    <div class="battle-effect-layer" id="da-effect-layer"></div>
  </div>

  <div class="battle-card battle-enemy-card" id="da-enemy-card">
    <div class="battle-portrait" id="da-enemy-portrait">${CHAR_SVG.hacker}</div>
    <div class="battle-name">HACKER</div>
    <div class="battle-bar-row">
      <div class="battle-bar-label">HP</div>
      <div class="battle-bar-track"><div class="battle-bar-fill bar-fill-enemy" id="da-enemy-hp-bar" style="width:100%"></div></div>
      <div class="battle-bar-value" id="da-enemy-hp-val">100/100</div>
    </div>
  </div>
</div>

<div class="battle-footer">
  <div class="battle-skills-panel">
    <div class="battle-panel-title">SKILLS</div>
    <div class="battle-skill-list">
      <button class="battle-skill-btn" id="da-skill-scan" onclick="duelArenaSkill('scan')">SCAN <span class="battle-skill-cost">-15</span></button>
      <button class="battle-skill-btn" id="da-skill-firewall" onclick="duelArenaSkill('firewall')">FIREWALL <span class="battle-skill-cost">-25</span></button>
      <button class="battle-skill-btn" id="da-skill-trace" onclick="duelArenaSkill('trace')">TRACE <span class="battle-skill-cost">-20</span></button>
      <button class="battle-skill-btn" id="da-skill-report" onclick="duelArenaSkill('report')">REPORT <span class="battle-skill-cost">-30</span></button>
    </div>
  </div>
  <div class="battle-log-panel" id="da-battle-log"></div>
</div>

<div class="battle-result-screen" id="da-result-screen">
  <div class="battle-result-title" id="da-result-title">VICTORY!</div>
  <div class="battle-result-sub" id="da-result-sub">Detektif Siber menang!</div>
  <div class="battle-result-stats">
    <div class="battle-rstat">
      <div class="battle-rstat-val" id="da-res-correct">5</div>
      <div class="battle-rstat-label">BENAR</div>
    </div>
    <div class="battle-rstat">
      <div class="battle-rstat-val" id="da-res-wrong">0</div>
      <div class="battle-rstat-label">SALAH</div>
    </div>
    <div class="battle-rstat">
      <div class="battle-rstat-val" id="da-res-dmg">18</div>
      <div class="battle-rstat-label">DAMAGE</div>
    </div>
    <div class="battle-rstat">
      <div class="battle-rstat-val" id="da-res-xp">100</div>
      <div class="battle-rstat-label">XP GAINED</div>
    </div>
  </div>
  <button class="battle-btn-restart" onclick="duelArenaRestart()">[ REMATCH ]</button>
  <button class="battle-btn-restart" style="border-color:var(--text2,#7090aa);color:var(--text2,#7090aa);margin-top:4px;" onclick="exitBattle()">[ EXIT ]</button>
</div>
`;
}
