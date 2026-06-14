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
  { q: 'Apakah URL berikut phishing?\nwww.paypaI-security.com', ok: true },
  { q: 'Situs resmi selalu meminta PIN lewat email.', ok: false },
  { q: 'HTTPS menjamin keamanan penuh dari phishing.', ok: false },
  { q: 'Link dengan domain typo kemungkinan typosquatting.', ok: true },
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
  state = { battle: battleState, player, time: 0, intro: true, introTime: 0, shake: 0, effects: [], chars: {}, particles: [] };
  const container = document.getElementById('battle-map');
  if (!container) return;
  createCanvas(container);
  // mark UI
  container.classList.add('duel-active');
  const root = document.getElementById('battle');
  if (root) root.classList.add('duel-mode');
  // mark UI
  container.classList.add('duel-active');
  // start intro sequence
  state.intro = true;
  state.introTime = 0;
  // preload assets (best-effort)
  Promise.all([
    loadImage(ASSET_PATHS.playerIdle),
    loadImage(ASSET_PATHS.playerAttack),
    loadImage(ASSET_PATHS.hackerIdle),
    loadImage(ASSET_PATHS.hackerDefeat),
  ])
    .then(([pIdle, pAtk, hIdle, hDef]) => {
      // create character animations from individual frames
      state.chars.player = createCharFromFrames('player', { idle: pIdle, attack: pAtk });
      state.chars.enemy = createCharFromFrames('enemy', { idle: hIdle, defeat: hDef });
      // set initial anim
      playAnim(state.chars.player, 'idle', true);
      playAnim(state.chars.enemy, 'idle', true);
      rafId = requestAnimationFrame(loop);
    });
}

function createCharFromFrames(kind, frameMap) {
  // frameMap: { idle: img, attack: img, hit: img, victory: img, defeat: img }
  const animMap = {};
  Object.entries(frameMap).forEach(([name, img]) => {
    if (img) {
      animMap[name] = { frames: [img], idx: 0, speed: 100 };
    }
  });
  // add fallback empty anims
  const allAnims = ['idle','attack','hit','victory','defeat'];
  allAnims.forEach(name => {
    if (!animMap[name]) animMap[name] = { frames: [], idx: 0, speed: 100 };
  });
  return { animMap, xOff:0, yOff:0, anim: 'idle', frame:0, ft:0 };
}

function createPlaceholderChar(kind) {
  return { img: null, animMap: { idle:{frames:1}, attack:{frames:1}, hit:{frames:1}, victory:{frames:1}, defeat:{frames:1} }, anim:'idle', frame:0, ft:0, xOff:0, yOff:0 };
}

function playAnim(char, name, loop=false) {
  if (!char) return;
  char.anim = name;
  char.frame = 0;
  char.ft = loop ? 0 : 0;
  char.loop = !!loop;
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
    if (s.introTime > 2000) s.intro = false;
  }
  // update effects
  s.effects = s.effects.filter(e => {
    e.t -= 16;
    return e.t > 0;
  });
  // update particles
  s.particles = s.particles || [];
  s.particles = s.particles.filter(p => (p.life -= 16) > 0).map(p => { p.x += p.vx; p.y += p.vy; return p; });
  // update character animations
  ['player','enemy'].forEach(k=>{
    const c = s.chars && s.chars[k];
    if (!c) return;
    const anim = c.animMap && c.animMap[c.anim];
    if (anim && anim.frames && anim.frames.length>0) {
      c.ft = (c.ft || 0) + 16;
      const speed = anim.speed || 120;
      if (c.ft >= speed) {
        c.ft = 0;
        c.frame++;
        if (c.frame >= anim.frames) {
          if (c.loop) c.frame = 0; else c.frame = anim.frames-1;
        }
      }
    }
  });
  if (s.shake > 0) s.shake = Math.max(0, s.shake - 0.5);
}

function render(s) {
  const w = canvas.width = canvas.clientWidth * devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * devicePixelRatio;
  ctx.clearRect(0,0,w,h);
  ctx.save();
  // background
  if (s.bg) {
    // draw full background scaled
    ctx.drawImage(s.bg, 0, 0, w, h);
  } else {
    ctx.fillStyle = '#041018';
    ctx.fillRect(0,0,w,h);
  }

  // glitch / scanlines during intro
  if (s.intro) {
    const alpha = Math.sin(s.introTime/80)*0.2 + 0.3;
    ctx.fillStyle = `rgba(0,255,240,${alpha})`;
    ctx.fillRect(0,0,w,h);
    // title
    ctx.fillStyle = '#00fff0';
    ctx.font = `${48*devicePixelRatio}px Share Tech Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('CYBER DUEL START', w/2, h*0.25);
  }

  // positions
  const pad = 80*devicePixelRatio;
  const leftX = pad;
  const rightX = w - pad;
  const midY = h/2;

  // draw player (left)
  drawCharacterSprite(s.chars.player, leftX, midY, true, s);
  drawCharacterSprite(s.chars.enemy, rightX, midY, false, s);

  // HP bars
  drawHpBars(s);

  // effects: damage numbers
  s.effects.forEach(e => {
    ctx.fillStyle = e.color || '#ffdd88';
    ctx.font = `${20*devicePixelRatio}px Share Tech Mono`;
    ctx.fillText(e.text, (e.x||w/2), (e.y||h/2) - e.t/4);
  });
  // particles
  s.particles.forEach(p => {
    ctx.fillStyle = p.color || '#00fff0';
    ctx.fillRect(p.x, p.y, p.s, p.s);
  });

  ctx.restore();
}

function drawCharacter(avatar, x, y, isPlayer) {
  ctx.save();
  ctx.translate(x, y);
  // simple pixel-style rounded box + avatar char
  ctx.fillStyle = 'rgba(0,255,240,0.06)';
  ctx.fillRect(-80*devicePixelRatio, -90*devicePixelRatio, 160*devicePixelRatio, 180*devicePixelRatio);
  ctx.strokeStyle = 'rgba(0,255,240,0.3)';
  ctx.lineWidth = 2*devicePixelRatio;
  ctx.strokeRect(-80*devicePixelRatio, -90*devicePixelRatio, 160*devicePixelRatio, 180*devicePixelRatio);
  ctx.fillStyle = '#00fff0';
  ctx.font = `${64*devicePixelRatio}px Share Tech Mono`;
  ctx.textAlign = 'center';
  ctx.fillText(avatar, 0, 24*devicePixelRatio);
  ctx.restore();
}

function drawEnemy(avatar, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,51,102,0.06)';
  ctx.fillRect(-80*devicePixelRatio, -90*devicePixelRatio, 160*devicePixelRatio, 180*devicePixelRatio);
  ctx.strokeStyle = 'rgba(255,51,102,0.3)';
  ctx.lineWidth = 2*devicePixelRatio;
  ctx.strokeRect(-80*devicePixelRatio, -90*devicePixelRatio, 160*devicePixelRatio, 180*devicePixelRatio);
  ctx.fillStyle = '#ff6b9f';
  ctx.font = `${64*devicePixelRatio}px Share Tech Mono`;
  ctx.textAlign = 'center';
  ctx.fillText(avatar, 0, 24*devicePixelRatio);
  ctx.restore();
}

function drawCharacterSprite(char, x, y, isPlayer, s) {
  ctx.save();
  ctx.translate(x, y);
  if (char && char.animMap) {
    const anim = char.animMap[char.anim];
    if (anim && anim.frames && anim.frames[char.frame]) {
      const img = anim.frames[char.frame];
      const scale = Math.min(2.0, (canvas.width/1200));
      const w = img.width * scale;
      const h = img.height * scale;
      const dx = -w/2;
      const dy = -h/2;
      ctx.drawImage(img, dx, dy, w, h);
    }
  } else {
    // fallback to emoji box
    drawCharacter(isPlayer? (s.player.avatar||'🕵️') : '🤖', 0, 0, isPlayer);
  }
  ctx.restore();
}

function drawHpBars(s) {
  const w = canvas.width;
  const h = canvas.height;
  const barW = Math.min(420*devicePixelRatio, w*0.35);
  // player
  const p = s.player;
  const playerHpPct = Math.max(0, p.hp / p.maxHp);
  ctx.fillStyle = '#08323a';
  ctx.fillRect(40*devicePixelRatio, 40*devicePixelRatio, barW, 18*devicePixelRatio);
  ctx.fillStyle = '#ff3366';
  ctx.fillRect(40*devicePixelRatio, 40*devicePixelRatio, barW * playerHpPct, 18*devicePixelRatio);
  ctx.fillStyle = '#b8d4e8';
  ctx.font = `${12*devicePixelRatio}px Share Tech Mono`;
  ctx.fillText(`PLAYER HP ${p.hp}/${p.maxHp}`, 48*devicePixelRatio, 54*devicePixelRatio);

  // enemy
  const enemy = s.battle;
  const enemyHpPct = Math.max(0, enemy.enemyHp / enemy.enemyMaxHp);
  const ex = w - barW - 40*devicePixelRatio;
  ctx.fillStyle = '#2a0b10';
  ctx.fillRect(ex, 40*devicePixelRatio, barW, 18*devicePixelRatio);
  ctx.fillStyle = '#ff4a7f';
  ctx.fillRect(ex, 40*devicePixelRatio, barW * enemyHpPct, 18*devicePixelRatio);
  ctx.fillStyle = '#b8d4e8';
  ctx.fillText(`HACKER HP ${enemy.enemyHp}/${enemy.enemyMaxHp}`, ex+6*devicePixelRatio, 54*devicePixelRatio);
}

// Skill flow: before performing skill, show question modal
function performDuelSkill(skillId) {
  if (!state) return;
  const q = QUESTIONS[Math.floor(Math.random()*QUESTIONS.length)];
  // windup animation
  const playerChar = state.chars.player;
  const enemyChar = state.chars.enemy;
  playAnim(playerChar, 'attack', false);
  // after windup, show question modal
  setTimeout(()=>{
    showQuestionModal(q.q, (ans)=>{
      const correct = (ans === 'yes') === q.ok;
      if (correct) {
        // play hit animation
        playAnim(enemyChar, 'hit', false);
        const dmgMap = { 'attack': 28, 'shield':0, 'scan':0, 'deepDive':14 };
        const dmg = dmgMap[skillId] || 20;
        state.battle.enemyHp = Math.max(0, state.battle.enemyHp - dmg);
        state.effects.push({ text: `-${dmg}`, x: canvas.width*0.78, y: canvas.height*0.45, t: 1400, color:'#ffdd88' });
        // particles
        spawnParticles(canvas.width*0.75, canvas.height*0.45, '#ffcc66');
        if (window.appendBattleLog) window.appendBattleLog(`Skill ${skillId} berhasil! Mengena ${dmg} HP.`);
      } else {
        // counter
        playAnim(playerChar, 'hit', false);
        const cDmg = 14;
        state.player.hp = Math.max(0, state.player.hp - cDmg);
        state.effects.push({ text: `-${cDmg}`, x: canvas.width*0.22, y: canvas.height*0.45, t: 1400, color:'#ff8888' });
        spawnParticles(canvas.width*0.22, canvas.height*0.45, '#ff6677');
        if (window.appendBattleLog) window.appendBattleLog(`Jawaban salah. Musuh melakukan counter dan menyebabkan ${cDmg} HP.`);
      }
      // reset to idle after short delay
      setTimeout(()=>{ playAnim(playerChar,'idle',true); playAnim(enemyChar,'idle',true); }, 600);
      if (window.renderBattleUI) window.renderBattleUI();
      checkDuelEnd();
    });
  }, 450);
}

function spawnParticles(x,y,color){
  state.particles = state.particles || [];
  for(let i=0;i<8;i++){
    state.particles.push({ x:x + (Math.random()-0.5)*40, y:y + (Math.random()-0.5)*40, vx:(Math.random()-0.5)*4, vy:(Math.random()-0.5)*-2, s:4+Math.random()*6, life:300 + Math.random()*400, color });
  }
}

function checkDuelEnd() {
  if (!state) return;
  if (state.battle.enemyHp <= 0) {
    if (window.appendBattleLog) window.appendBattleLog('HACKER DETECTED — SYSTEM SECURED');
    // disintegration effect
    state.effects.push({ text: 'HACKER DETECTED', x: canvas.width*0.5, y: canvas.height*0.5, t:2000, color:'#00fff0' });
    setTimeout(()=>{ if (window.exitBattle) window.exitBattle(); stopDuel(); }, 1200);
  } else if (state.player.hp <= 0) {
    if (window.appendBattleLog) window.appendBattleLog('SYSTEM BREACHED');
    state.effects.push({ text: 'SYSTEM BREACHED', x: canvas.width*0.5, y: canvas.height*0.5, t:2000, color:'#ff3366' });
    setTimeout(()=>{ if (window.exitBattle) window.exitBattle(); stopDuel(); }, 1200);
  }
}

function showQuestionModal(question, cb) {
  // simple confirm-style modal using prompt/confirm fallback
  const modalId = 'duel-question-modal';
  let modal = document.getElementById(modalId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.style.position = 'fixed';
    modal.style.left = '50%';
    modal.style.top = '20%';
    modal.style.transform = 'translateX(-50%)';
    modal.style.background = 'rgba(2,14,25,0.98)';
    modal.style.border = '1px solid rgba(0,255,240,0.12)';
    modal.style.padding = '18px';
    modal.style.zIndex = 3000;
    modal.style.color = '#b8d4e8';
    modal.style.minWidth = '320px';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div style="font-family:Share Tech Mono,monospace;margin-bottom:12px;white-space:pre-wrap;">${question}</div>\n    <div style="display:flex;gap:10px;justify-content:flex-end;">\n      <button class="btn btn-sm" id="duel-q-yes">YA</button>\n      <button class="btn btn-sm" id="duel-q-no">TIDAK</button>\n    </div>`;
  document.getElementById('duel-q-yes').onclick = () => { modal.remove(); cb('yes'); };
  document.getElementById('duel-q-no').onclick = () => { modal.remove(); cb('no'); };
}

// expose
window.startDuel = startDuel;
window.stopDuel = stopDuel;
window.performDuelSkill = performDuelSkill;

export { startDuel, stopDuel, performDuelSkill };
