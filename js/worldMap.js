// js/worldMap.js — CyberGuard RPG · CYBER WORLD MAP
// Top-down GBA/SNES style · dark cyber theme · 16×16 tiles
// Placed in Duel Arena panel as zone-selection map

/* ── Tile IDs ──────────────────────────────────────────────── */
const T = {
  FLOOR:    0,   // dark grid base floor
  FLOOR_D:  1,   // darker floor variant
  ENERGY_H: 2,   // horizontal neon energy road
  ENERGY_V: 3,   // vertical neon energy road
  ENERGY_X: 4,   // energy intersection
  CIRCUIT_H:5,   // secondary horizontal circuit trace
  CIRCUIT_V:6,   // secondary vertical circuit trace
  CIRCUIT_X:7,   // circuit node
  SERVER:   8,   // server rack building
  FIREWALL_H:9,  // horizontal firewall barrier
  FIREWALL_V:10, // vertical firewall barrier
  DATA_TOWER:11, // data tower block
  TERMINAL: 12,  // terminal screen tile
  VOID:     13,  // pure void (outer border)
  NODE:     14,  // relay node (small bright)
  NEXUS:    15,  // central nexus hub tile
  DARK:     16,  // darknet dark tile
  DARK_WALL:17,  // darknet fortress wall
  GLITCH:   18,  // glitch/corrupted tile
  ANTENNA:  19,  // broadcast antenna
};

/* ── Map dimensions ────────────────────────────────────────── */
const MW = 64;
const MH = 52;
const TS = 16;

/* ── Zone definitions ───────────────────────────────────────── */
const ZONES = [
  {
    id: 'phishing',  label: '📧 PHISHING\nDISTRICT',
    diff: 'EASY', color: '#00d4ff',
    cx: 11, cy: 15, rw: 7, rh: 6,
  },
  {
    id: 'social',    label: '🎭 SOCIAL ENG.\nHUB',
    diff: 'EASY', color: '#00ff88',
    cx: 52, cy: 15, rw: 7, rh: 6,
  },
  {
    id: 'web',       label: '🌐 WEB THREAT\nSECTOR',
    diff: 'MED',  color: '#ffe566',
    cx: 53, cy: 32, rw: 6, rh: 6,
  },
  {
    id: 'malware',   label: '🦠 MALWARE\nQUARANTINE',
    diff: 'MED',  color: '#ff9933',
    cx: 11, cy: 37, rw: 7, rh: 6,
  },
  {
    id: 'scam',      label: '💸 SCAM NET\nZONE',
    diff: 'HARD', color: '#ff3366',
    cx: 53, cy: 43, rw: 6, rh: 5,
  },
  {
    id: 'darknet',   label: '🔒 DARKNET\nSECTOR',
    diff: 'LOCK', color: '#aa44ff',
    cx: 32, cy: 7,  rw: 6, rh: 4,
    locked: true,
  },
];

/* ── Pure tile hash (deterministic, no state) ──────────────── */
function tileHash(x, y, i) {
  let h = (x * 374761393 + y * 668265263 + (i || 0) * 2246822519) >>> 0;
  h = ((h ^ (h >>> 15)) >>> 0);
  h = (Math.imul(h, 0x85ebca77)) >>> 0;
  h = ((h ^ (h >>> 13)) >>> 0);
  h = (Math.imul(h, 0xc2b2ae3d)) >>> 0;
  h = ((h ^ (h >>> 16)) >>> 0);
  return h / 4294967296;
}

/* ── Seeded RNG — map generation only ──────────────────────── */
function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Map generation ─────────────────────────────────────────── */
function fillBlock(map, x0, y0, w, h, tile) {
  for (let y = y0; y < Math.min(y0 + h, MH); y++)
    for (let x = x0; x < Math.min(x0 + w, MW); x++)
      if (x >= 0 && y >= 0) map[y][x] = tile;
}
function setTile(map, x, y, tile) {
  if (x >= 0 && y >= 0 && x < MW && y < MH) map[y][x] = tile;
}

function generateMap() {
  const rng = seededRng(0xCB3E7 ^ 0x1337);

  // 1. Base: dark floor everywhere
  const map = Array.from({ length: MH }, () => Array(MW).fill(T.FLOOR));

  // 2. Scatter darker floor variants
  for (let y = 0; y < MH; y++)
    for (let x = 0; x < MW; x++)
      if (rng() < 0.22) map[y][x] = T.FLOOR_D;

  // 3. Void border (outer 3 tiles)
  fillBlock(map, 0,    0,    MW,  3,  T.VOID);
  fillBlock(map, 0,    MH-3, MW,  3,  T.VOID);
  fillBlock(map, 0,    0,    3,   MH, T.VOID);
  fillBlock(map, MW-3, 0,    3,   MH, T.VOID);

  // 4. Firewall separators between zones
  fillBlock(map, 21, 3, 1, 20, T.FIREWALL_V);
  fillBlock(map, 42, 3, 1, 20, T.FIREWALL_V);
  fillBlock(map, 21, 26, 1, 20, T.FIREWALL_V);
  fillBlock(map, 42, 26, 1, 20, T.FIREWALL_V);
  fillBlock(map, 3, 22, 19, 1, T.FIREWALL_H);
  fillBlock(map, 43, 22, 18, 1, T.FIREWALL_H);
  fillBlock(map, 3, 28, 19, 1, T.FIREWALL_H);
  fillBlock(map, 43, 28, 18, 1, T.FIREWALL_H);

  // 5. Main energy roads (bright neon — the cross through centre)
  //    E-W road  y=25-26
  fillBlock(map, 0, 25, MW, 2, T.ENERGY_H);
  //    N-S road  x=30-31
  fillBlock(map, 30, 0, 2, MH, T.ENERGY_V);
  // Intersections where they cross the firewalls
  setTile(map, 30, 22, T.ENERGY_V);
  setTile(map, 31, 22, T.ENERGY_V);
  setTile(map, 30, 28, T.ENERGY_V);
  setTile(map, 31, 28, T.ENERGY_V);
  setTile(map, 21, 25, T.ENERGY_H);
  setTile(map, 21, 26, T.ENERGY_H);
  setTile(map, 42, 25, T.ENERGY_H);
  setTile(map, 42, 26, T.ENERGY_H);
  // Big intersection at center
  fillBlock(map, 28, 23, 6, 6, T.NEXUS);
  fillBlock(map, 30, 25, 2, 2, T.ENERGY_X);

  // 6. Secondary circuit paths (zone connectors — dimmer traces)
  //    Phishing connector
  fillBlock(map, 5, 24, 16, 1, T.CIRCUIT_H);
  fillBlock(map, 5, 27, 16, 1, T.CIRCUIT_H);
  fillBlock(map, 11, 21, 1, 4, T.CIRCUIT_V);
  //    Social connector
  fillBlock(map, 43, 24, 14, 1, T.CIRCUIT_H);
  fillBlock(map, 43, 27, 14, 1, T.CIRCUIT_H);
  fillBlock(map, 52, 21, 1, 4, T.CIRCUIT_V);
  //    Web connector
  fillBlock(map, 43, 30, 14, 1, T.CIRCUIT_H);
  fillBlock(map, 52, 29, 1, 4, T.CIRCUIT_V);
  //    Malware connector
  fillBlock(map, 5, 31, 16, 1, T.CIRCUIT_H);
  fillBlock(map, 11, 31, 1, 6, T.CIRCUIT_V);
  //    Scam connector
  fillBlock(map, 43, 41, 14, 1, T.CIRCUIT_H);
  fillBlock(map, 52, 37, 1, 5, T.CIRCUIT_V);
  //    Darknet connector (N from centre nexus)
  fillBlock(map, 30, 3, 2, 22, T.ENERGY_V);

  // 7. Relay nodes along paths
  const nodePts = [
    [11,24],[11,27],[52,24],[52,27],[52,30],[11,32],[52,38],[52,42],
    [30,12],[30,17],[30,3],
  ];
  nodePts.forEach(([x,y]) => setTile(map, x, y, T.NODE));

  // 8. Darknet sector (N centre)
  fillBlock(map, 26, 3, 10, 7, T.DARK);
  fillBlock(map, 26, 3, 10, 1, T.DARK_WALL);
  fillBlock(map, 26, 9, 10, 1, T.DARK_WALL);
  fillBlock(map, 26, 3, 1, 7, T.DARK_WALL);
  fillBlock(map, 35, 3, 1, 7, T.DARK_WALL);
  fillBlock(map, 27, 4, 8, 5, T.DARK);
  // Re-open NS road through darknet
  setTile(map, 30, 3, T.ENERGY_V); setTile(map, 31, 3, T.ENERGY_V);
  setTile(map, 30, 4, T.ENERGY_V); setTile(map, 31, 4, T.ENERGY_V);
  setTile(map, 30, 5, T.ENERGY_V); setTile(map, 31, 5, T.ENERGY_V);
  setTile(map, 30, 6, T.ENERGY_V); setTile(map, 31, 6, T.ENERGY_V);
  setTile(map, 30, 7, T.ENERGY_V); setTile(map, 31, 7, T.ENERGY_V);
  setTile(map, 30, 8, T.ENERGY_V); setTile(map, 31, 8, T.ENERGY_V);
  setTile(map, 30, 9, T.ENERGY_V); setTile(map, 31, 9, T.ENERGY_V);

  // 9. Phishing District (NW) — email server buildings
  fillBlock(map, 4, 3, 17, 19, T.FLOOR);
  placeServer(map, 5, 4, false);
  placeServer(map, 10, 4, true);
  placeServer(map, 15, 4, false);
  placeServer(map, 5, 11, true);
  placeServer(map, 12, 12, false);
  placeAntenna(map, 8, 9);
  placeAntenna(map, 17, 8);

  // 10. Social Engineering Hub (NE) — broadcast towers
  fillBlock(map, 43, 3, 17, 19, T.FLOOR);
  placeServer(map, 44, 4, true);
  placeServer(map, 50, 4, false);
  placeServer(map, 56, 4, true);
  placeServer(map, 44, 11, false);
  placeServer(map, 52, 12, true);
  placeAntenna(map, 48, 9);
  placeAntenna(map, 55, 7);

  // 11. Web Threat Sector (E)
  fillBlock(map, 43, 23, 17, 15, T.FLOOR);
  placeServer(map, 45, 24, true);
  placeServer(map, 52, 24, false);
  placeServer(map, 57, 29, true);
  placeAntenna(map, 49, 30);
  placeAntenna(map, 55, 24);

  // 12. Malware Quarantine (SW) — red containment zone
  fillBlock(map, 4, 23, 17, 16, T.FLOOR_D);
  // Containment fences with red tint (using FIREWALL tiles as containment)
  fillBlock(map, 4, 23, 17, 1, T.FIREWALL_H);
  fillBlock(map, 4, 38, 17, 1, T.FIREWALL_H);
  fillBlock(map, 4, 23, 1, 16, T.FIREWALL_V);
  fillBlock(map, 20, 23, 1, 16, T.FIREWALL_V);
  placeServer(map, 6, 25, false);
  placeServer(map, 13, 25, true);
  placeServer(map, 6, 32, true);
  placeServer(map, 14, 33, false);
  placeAntenna(map, 10, 30);
  placeAntenna(map, 18, 27);

  // 13. Scam Network Zone (SE) — neon flashy
  fillBlock(map, 43, 33, 17, 15, T.FLOOR);
  placeServer(map, 44, 34, true);
  placeServer(map, 51, 34, false);
  placeServer(map, 56, 39, true);
  placeAntenna(map, 48, 40);
  placeAntenna(map, 55, 35);

  // 14. Central Nexus decoration — data towers around hub
  const towerPts = [
    [25,23],[38,23],[25,28],[38,28],
    [25,25],[38,25],[28,22],[35,22],
    [28,29],[35,29],
  ];
  towerPts.forEach(([x,y]) => setTile(map, x, y, T.DATA_TOWER));

  // 15. Glitch tiles scattered in zone interiors
  const glitchPts = [
    [8,16],[15,16],[16,9],[7,9],
    [47,16],[54,16],[47,8],[55,8],
    [47,28],[54,28],[48,38],[55,38],
    [8,28],[16,28],[9,36],[18,36],
    [47,42],[55,42],
  ];
  glitchPts.forEach(([x,y]) => setTile(map, x, y, T.GLITCH));

  // 16. Terminal screens on some server tiles
  const termPts = [
    [5,6],[10,6],[15,6],[44,6],[50,6],[56,6],
    [45,26],[52,26],[6,27],[13,27],[44,36],[51,36],
  ];
  termPts.forEach(([x,y]) => setTile(map, x, y, T.TERMINAL));

  return map;
}

/* ── Building helpers ───────────────────────────────────────── */
// 4×3 server rack cluster
function placeServer(map, x, y, alt) {
  const top = alt ? T.TERMINAL : T.SERVER;
  fillBlock(map, x, y,   4, 1, top);
  fillBlock(map, x, y+1, 4, 1, T.SERVER);
  fillBlock(map, x, y+2, 4, 1, T.SERVER);
}
// 1×2 antenna tower
function placeAntenna(map, x, y) {
  setTile(map, x, y,   T.ANTENNA);
  setTile(map, x, y+1, T.DATA_TOWER);
}

/* ── Tile renderer (cyber theme) ────────────────────────────── */
function drawTile(ctx, tile, px, py, ts, tx, ty) {
  const r  = tileHash(tx, ty, 0);
  const r2 = tileHash(tx, ty, 1);
  const r3 = tileHash(tx, ty, 2);

  switch (tile) {

    case T.FLOOR: {
      ctx.fillStyle = r < 0.18 ? '#0c1020' : r < 0.35 ? '#0a0e1c' : '#0b1018';
      ctx.fillRect(px, py, ts, ts);
      // grid lines
      ctx.fillStyle = '#162040';
      ctx.fillRect(px,      py,      ts, 1);
      ctx.fillRect(px,      py,      1,  ts);
      // faint circuit dot
      if (r2 > 0.88) {
        ctx.fillStyle = '#1a3060';
        ctx.fillRect(px + (r3*14|0), py + (tileHash(tx,ty,3)*14|0), 1, 1);
      }
      break;
    }

    case T.FLOOR_D: {
      ctx.fillStyle = r < 0.2 ? '#060810' : '#07090e';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#0e1830';
      ctx.fillRect(px, py, ts, 1);
      ctx.fillRect(px, py, 1, ts);
      break;
    }

    case T.ENERGY_H: {
      // Dark base + bright horizontal neon stripe
      ctx.fillStyle = '#050c18';
      ctx.fillRect(px, py, ts, ts);
      // outer glow bands
      ctx.fillStyle = 'rgba(0,180,255,0.15)';
      ctx.fillRect(px, py,   ts, 3);
      ctx.fillRect(px, py+ts-3, ts, 3);
      // core bright line
      ctx.fillStyle = '#00c8ff';
      ctx.fillRect(px, py+5, ts, 2);
      ctx.fillRect(px, py+ts-7, ts, 2);
      // center brightest
      ctx.fillStyle = '#80eeff';
      ctx.fillRect(px, py+6, ts, 1);
      ctx.fillRect(px, py+ts-6, ts, 1);
      break;
    }

    case T.ENERGY_V: {
      ctx.fillStyle = '#050c18';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = 'rgba(0,180,255,0.15)';
      ctx.fillRect(px,      py, 3,  ts);
      ctx.fillRect(px+ts-3, py, 3,  ts);
      ctx.fillStyle = '#00c8ff';
      ctx.fillRect(px+5, py, 2, ts);
      ctx.fillRect(px+ts-7, py, 2, ts);
      ctx.fillStyle = '#80eeff';
      ctx.fillRect(px+6, py, 1, ts);
      ctx.fillRect(px+ts-6, py, 1, ts);
      break;
    }

    case T.ENERGY_X: {
      ctx.fillStyle = '#0a1828';
      ctx.fillRect(px, py, ts, ts);
      // H + V intersection glow
      ctx.fillStyle = 'rgba(0,200,255,0.25)';
      ctx.fillRect(px, py+4, ts, ts-8);
      ctx.fillRect(px+4, py, ts-8, ts);
      ctx.fillStyle = '#00d4ff';
      ctx.fillRect(px, py+6, ts, 2);
      ctx.fillRect(px+6, py, 2, ts);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px+6, py+6, 2, 2);
      break;
    }

    case T.CIRCUIT_H: {
      ctx.fillStyle = '#080c18';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = 'rgba(0,100,200,0.3)';
      ctx.fillRect(px, py+6, ts, 4);
      ctx.fillStyle = '#2860c0';
      ctx.fillRect(px, py+7, ts, 2);
      ctx.fillStyle = '#4080e0';
      ctx.fillRect(px, py+8, ts, 1);
      // dots at intervals
      if (r > 0.5) {
        ctx.fillStyle = '#60a0ff';
        ctx.fillRect(px+4, py+7, 2, 2);
      }
      break;
    }

    case T.CIRCUIT_V: {
      ctx.fillStyle = '#080c18';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = 'rgba(0,100,200,0.3)';
      ctx.fillRect(px+6, py, 4, ts);
      ctx.fillStyle = '#2860c0';
      ctx.fillRect(px+7, py, 2, ts);
      ctx.fillStyle = '#4080e0';
      ctx.fillRect(px+8, py, 1, ts);
      if (r > 0.5) {
        ctx.fillStyle = '#60a0ff';
        ctx.fillRect(px+7, py+4, 2, 2);
      }
      break;
    }

    case T.CIRCUIT_X: {
      ctx.fillStyle = '#080c18';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#2860c0';
      ctx.fillRect(px, py+7, ts, 2);
      ctx.fillRect(px+7, py, 2, ts);
      ctx.fillStyle = '#60a0ff';
      ctx.fillRect(px+7, py+7, 2, 2);
      break;
    }

    case T.SERVER: {
      // Server rack face (top-down view shows the front panel)
      ctx.fillStyle = '#141a28';
      ctx.fillRect(px, py, ts, ts);
      // rack slots
      ctx.fillStyle = '#1e2840';
      ctx.fillRect(px+1, py+1, ts-2, 3);
      ctx.fillRect(px+1, py+6, ts-2, 3);
      ctx.fillRect(px+1, py+11, ts-2, 3);
      // LED indicators on each slot
      const ledCol = r < 0.2 ? '#ff3030' : r < 0.5 ? '#00ff88' : '#00d4ff';
      ctx.fillStyle = ledCol;
      ctx.fillRect(px+ts-4, py+2, 2, 1);
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(px+ts-4, py+7, 2, 1);
      ctx.fillStyle = ledCol;
      ctx.fillRect(px+ts-4, py+12, 2, 1);
      // vent lines
      ctx.fillStyle = '#0e1428';
      for (let i = 2; i < ts-2; i += 2) ctx.fillRect(px+i, py+4, 1, 1);
      break;
    }

    case T.FIREWALL_H: {
      ctx.fillStyle = '#180810';
      ctx.fillRect(px, py, ts, ts);
      // energy barrier top-down — red/orange
      ctx.fillStyle = 'rgba(255,40,20,0.2)';
      ctx.fillRect(px, py+3, ts, ts-6);
      ctx.fillStyle = '#cc2010';
      ctx.fillRect(px, py+6, ts, 1);
      ctx.fillRect(px, py+9, ts, 1);
      ctx.fillStyle = '#ff4030';
      ctx.fillRect(px, py+7, ts, 2);
      // flicker dots
      if (r2 > 0.7) {
        ctx.fillStyle = '#ff8060';
        ctx.fillRect(px + (r3*12|0), py+7, 2, 1);
      }
      break;
    }

    case T.FIREWALL_V: {
      ctx.fillStyle = '#180810';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = 'rgba(255,40,20,0.2)';
      ctx.fillRect(px+3, py, ts-6, ts);
      ctx.fillStyle = '#cc2010';
      ctx.fillRect(px+6, py, 1, ts);
      ctx.fillRect(px+9, py, 1, ts);
      ctx.fillStyle = '#ff4030';
      ctx.fillRect(px+7, py, 2, ts);
      if (r2 > 0.7) {
        ctx.fillStyle = '#ff8060';
        ctx.fillRect(px+7, py + (r3*12|0), 1, 2);
      }
      break;
    }

    case T.DATA_TOWER: {
      ctx.fillStyle = '#0a1428';
      ctx.fillRect(px, py, ts, ts);
      // tower body (top-down sees roof/top)
      ctx.fillStyle = '#1a2a50';
      ctx.fillRect(px+2, py+2, ts-4, ts-4);
      ctx.fillStyle = '#2a3a70';
      ctx.fillRect(px+3, py+3, ts-6, ts-6);
      // glowing top
      ctx.fillStyle = '#4060c0';
      ctx.fillRect(px+5, py+5, ts-10, ts-10);
      ctx.fillStyle = '#6080ff';
      ctx.fillRect(px+6, py+6, ts-12, ts-12);
      break;
    }

    case T.TERMINAL: {
      ctx.fillStyle = '#050e08';
      ctx.fillRect(px, py, ts, ts);
      // terminal screen face
      ctx.fillStyle = '#0a1e10';
      ctx.fillRect(px+1, py+1, ts-2, ts-2);
      // text lines (green)
      ctx.fillStyle = '#00cc44';
      ctx.fillRect(px+2, py+3, ts-6, 1);
      ctx.fillRect(px+2, py+6, ts-8, 1);
      ctx.fillRect(px+2, py+9, ts-5, 1);
      ctx.fillRect(px+2, py+12, ts-9, 1);
      // cursor blink (static here)
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(px+2, py+12, 2, 2);
      break;
    }

    case T.VOID: {
      ctx.fillStyle = '#000000';
      ctx.fillRect(px, py, ts, ts);
      // occasional faint star
      if (r > 0.93) {
        ctx.fillStyle = '#202040';
        ctx.fillRect(px + (r2*14|0), py + (r3*14|0), 1, 1);
      }
      break;
    }

    case T.NODE: {
      ctx.fillStyle = r < 0.3 ? '#080e1c' : '#0a1020';
      ctx.fillRect(px, py, ts, ts);
      // relay node — glowing square
      ctx.fillStyle = 'rgba(0,200,255,0.15)';
      ctx.fillRect(px+2, py+2, ts-4, ts-4);
      ctx.fillStyle = '#0088cc';
      ctx.fillRect(px+4, py+4, ts-8, ts-8);
      ctx.fillStyle = '#00ccff';
      ctx.fillRect(px+5, py+5, ts-10, ts-10);
      ctx.fillStyle = '#80eeff';
      ctx.fillRect(px+6, py+6, ts-12, ts-12);
      break;
    }

    case T.NEXUS: {
      ctx.fillStyle = '#0c1830';
      ctx.fillRect(px, py, ts, ts);
      // nexus hub tile — bright grid + glow
      ctx.fillStyle = '#1a3060';
      ctx.fillRect(px,   py,   ts, 1);
      ctx.fillRect(px,   py,   1,  ts);
      ctx.fillRect(px+8, py,   1,  ts);
      ctx.fillRect(px,   py+8, ts, 1);
      ctx.fillStyle = '#2040a0';
      ctx.fillRect(px+1, py+1, 7, 7);
      ctx.fillRect(px+9, py+9, 6, 6);
      // neon accent
      ctx.fillStyle = 'rgba(0,180,255,0.2)';
      ctx.fillRect(px+1, py+1, ts-2, ts-2);
      break;
    }

    case T.DARK: {
      ctx.fillStyle = r < 0.2 ? '#0c0818' : '#100c20';
      ctx.fillRect(px, py, ts, ts);
      // purple particle
      if (r2 > 0.82) {
        ctx.fillStyle = '#6030a8';
        ctx.fillRect(px + (r3*14|0), py + (tileHash(tx,ty,3)*14|0), 1, 1);
      }
      break;
    }

    case T.DARK_WALL: {
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#2a1848';
      ctx.fillRect(px+1, py+1, ts-2, ts-2);
      ctx.fillStyle = '#0c0818';
      ctx.fillRect(px, py, ts, 1);
      ctx.fillRect(px, py, 1, ts);
      // purple edge glow
      ctx.fillStyle = 'rgba(120,40,200,0.4)';
      ctx.fillRect(px, py, ts, 1);
      ctx.fillRect(px, py, 1, ts);
      break;
    }

    case T.GLITCH: {
      // corrupted/glitch tile
      const gc = r < 0.33 ? '#ff003c' : r < 0.66 ? '#00ff88' : '#ff80ff';
      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = gc;
      const gw = (r2 * 10 + 2) | 0;
      const gh = (r3 * 3 + 1) | 0;
      const gx = (tileHash(tx, ty, 3) * (ts - gw)) | 0;
      const gy = (tileHash(tx, ty, 4) * (ts - gh)) | 0;
      ctx.fillRect(px + gx, py + gy, gw, gh);
      // second stripe
      ctx.fillStyle = r2 > 0.5 ? '#ffffff' : gc;
      ctx.fillRect(px + 1, py + (tileHash(tx,ty,5)*14|0), ts - 2, 1);
      break;
    }

    case T.ANTENNA: {
      ctx.fillStyle = '#0a1020';
      ctx.fillRect(px, py, ts, ts);
      // antenna mast
      ctx.fillStyle = '#3a5080';
      ctx.fillRect(px+7, py+1, 2, ts-1);
      // cross-bars
      ctx.fillStyle = '#4060a0';
      ctx.fillRect(px+3, py+3, ts-6, 2);
      ctx.fillRect(px+4, py+7, ts-8, 1);
      // top beacon
      ctx.fillStyle = r2 > 0.5 ? '#ff4040' : '#ff8080';
      ctx.fillRect(px+7, py+1, 2, 2);
      break;
    }

    default: {
      ctx.fillStyle = '#080c18';
      ctx.fillRect(px, py, ts, ts);
    }
  }
}

/* ── Zone overlay renderer ──────────────────────────────────── */
function drawZoneOverlay(ctx, zone, screenOX, screenOY, ts, time) {
  const cx = screenOX + zone.cx * ts;
  const cy = screenOY + zone.cy * ts;

  const pulse = 0.55 + 0.45 * Math.sin(time / 500 + zone.cx * 0.7);
  const col   = zone.color;

  // Zone glow rectangle
  const zx = cx - zone.rw * ts;
  const zy = cy - zone.rh * ts;
  const zw = zone.rw * 2 * ts;
  const zh = zone.rh * 2 * ts;

  const glow = ctx.createLinearGradient(zx, zy, zx+zw, zy+zh);
  glow.addColorStop(0, col + '10');
  glow.addColorStop(0.5, col + '1a');
  glow.addColorStop(1, col + '08');
  ctx.fillStyle = glow;
  ctx.fillRect(zx, zy, zw, zh);

  // Animated corner brackets
  const br = 8 * pulse;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // TL
  ctx.moveTo(zx, zy + br); ctx.lineTo(zx, zy); ctx.lineTo(zx + br, zy);
  // TR
  ctx.moveTo(zx+zw-br, zy); ctx.lineTo(zx+zw, zy); ctx.lineTo(zx+zw, zy+br);
  // BL
  ctx.moveTo(zx, zy+zh-br); ctx.lineTo(zx, zy+zh); ctx.lineTo(zx+br, zy+zh);
  // BR
  ctx.moveTo(zx+zw-br, zy+zh); ctx.lineTo(zx+zw, zy+zh); ctx.lineTo(zx+zw, zy+zh-br);
  ctx.stroke();

  // Floating label
  const lines    = zone.label.split('\n');
  const fontSize = Math.max(9, Math.min(12, ts * 0.78));
  ctx.font = `bold ${fontSize}px "Orbitron", monospace`;
  const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
  const lineH = fontSize + 3;
  const lblH  = lines.length * lineH + 8;
  const lblY  = zy - 4;

  ctx.fillStyle = 'rgba(4,8,20,0.88)';
  ctx.fillRect(cx - maxW/2 - 8, lblY - lblH, maxW + 16, lblH);

  // label border
  ctx.strokeStyle = zone.locked ? '#7733cc' : col;
  ctx.lineWidth = 1 * pulse;
  ctx.strokeRect(cx - maxW/2 - 8, lblY - lblH, maxW + 16, lblH);

  ctx.fillStyle = zone.locked ? '#cc88ff' : col;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  lines.forEach((line, i) => {
    ctx.fillText(line, cx, lblY - (lines.length - 1 - i) * lineH);
  });

  const diffCol = zone.locked ? '#aa44ff' :
    zone.diff === 'HARD' ? '#ff3366' : zone.diff === 'MED' ? '#ffe566' : '#00d4ff';
  ctx.font = `${Math.max(7, fontSize - 2)}px "Share Tech Mono", monospace`;
  ctx.fillStyle = diffCol;
  ctx.fillText(`[${zone.diff}]`, cx, lblY - lines.length * lineH - 2);
}

/* ── WorldMap class ─────────────────────────────────────────── */
class WorldMap {
  constructor(container, onZoneClick) {
    this.container   = container;
    this.onZoneClick = onZoneClick;
    this.map         = null;
    this.canvas      = null;
    this.ctx         = null;
    this.raf         = null;
    this.time        = 0;
    this.camX = 16; this.camY = 10;
    this.targetCamX = 16; this.targetCamY = 10;
    this.drag = false;
    this.dragX = 0; this.dragY = 0;
    this.camDragX = 0; this.camDragY = 0;
    this.cssW = 480; this.cssH = 320;
  }

  init() {
    this.map = generateMap();
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;cursor:crosshair;touch-action:none;';
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    this.camX = 30 - 10; this.camY = 26 - 7;
    this.targetCamX = this.camX; this.targetCamY = this.camY;

    this._bindEvents();
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._tick();
  }

  _resize() {
    const dpr = devicePixelRatio || 1;
    const w   = this.container.clientWidth  || 480;
    const h   = this.container.clientHeight || 320;
    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cssW = w; this.cssH = h;
  }

  _tick() {
    this.raf = requestAnimationFrame(() => this._tick());
    this.time++;
    const spd = 0.10;
    this.camX += (this.targetCamX - this.camX) * spd;
    this.camY += (this.targetCamY - this.camY) * spd;
    this._render();
  }

  _render() {
    const ctx = this.ctx;
    const w   = this.cssW || 480;
    const h   = this.cssH || 320;
    const ts  = TS;

    const tilesX   = Math.ceil(w / ts) + 2;
    const tilesY   = Math.ceil(h / ts) + 2;
    const offX     = -(this.camX * ts) % ts;
    const offY     = -(this.camY * ts) % ts;
    const startTX  = Math.floor(this.camX);
    const startTY  = Math.floor(this.camY);

    ctx.imageSmoothingEnabled = false;

    // Draw tiles
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const mx   = startTX + tx;
        const my   = startTY + ty;
        const tile = (mx >= 0 && mx < MW && my >= 0 && my < MH)
          ? this.map[my][mx] : T.VOID;
        drawTile(ctx, tile, tx*ts + offX, ty*ts + offY, ts, mx, my);
      }
    }

    // Animated energy road pulse
    const pulse = (Math.sin(this.time / 30) + 1) / 2;
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const mx = startTX + tx;
        const my = startTY + ty;
        if (mx < 0 || my < 0 || mx >= MW || my >= MH) continue;
        const tile = this.map[my][mx];
        if (tile !== T.ENERGY_H && tile !== T.ENERGY_V && tile !== T.ENERGY_X) continue;
        const px = tx*ts + offX;
        const py = ty*ts + offY;
        ctx.fillStyle = `rgba(0,${180+60*pulse|0},255,${0.12 + 0.10*pulse})`;
        ctx.fillRect(px, py, ts, ts);
      }
    }

    // Animated NODE pulse
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const mx = startTX + tx;
        const my = startTY + ty;
        if (mx < 0 || my < 0 || mx >= MW || my >= MH) continue;
        if (this.map[my][mx] !== T.NODE) continue;
        const px = tx*ts + offX;
        const py = ty*ts + offY;
        const np = (Math.sin(this.time / 20 + mx * 0.8) + 1) / 2;
        ctx.fillStyle = `rgba(0,220,255,${0.15 + 0.25*np})`;
        ctx.fillRect(px+3, py+3, ts-6, ts-6);
      }
    }

    // Zone overlays
    const screenOX = -this.camX * ts;
    const screenOY = -this.camY * ts;
    ZONES.forEach(zone => {
      const zx = screenOX + (zone.cx - zone.rw) * ts;
      const zy = screenOY + (zone.cy - zone.rh) * ts;
      if (zx + zone.rw*2*ts < 0 || zx > w || zy + zone.rh*2*ts < 0 || zy > h) return;
      drawZoneOverlay(ctx, zone, screenOX, screenOY, ts, this.time);
    });

    // CRT scanline overlay
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let sy = 0; sy < h; sy += 3) ctx.fillRect(0, sy, w, 1);

    // Vignette
    const vg = ctx.createRadialGradient(w/2, h/2, h*0.2, w/2, h/2, h*0.72);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  _clampCamera() {
    const visX = this.cssW / TS;
    const visY = this.cssH / TS;
    this.targetCamX = Math.max(0, Math.min(MW - visX, this.targetCamX));
    this.targetCamY = Math.max(0, Math.min(MH - visY, this.targetCamY));
  }

  _bindEvents() {
    const c = this.canvas;
    c.addEventListener('mousedown', e => {
      this.drag = true;
      this.dragX = e.clientX; this.dragY = e.clientY;
      this.camDragX = this.camX; this.camDragY = this.camY;
      c.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', e => {
      if (!this.drag) return;
      this.targetCamX = this.camDragX - (e.clientX - this.dragX) / TS;
      this.targetCamY = this.camDragY - (e.clientY - this.dragY) / TS;
      this._clampCamera();
    });
    window.addEventListener('mouseup', e => {
      if (!this.drag) return;
      const moved = Math.abs(e.clientX - this.dragX) > 5 || Math.abs(e.clientY - this.dragY) > 5;
      this.drag = false;
      c.style.cursor = 'crosshair';
      if (!moved) this._handleClick(e.clientX, e.clientY);
    });
    c.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      this.drag = true;
      this.dragX = t.clientX; this.dragY = t.clientY;
      this.camDragX = this.camX; this.camDragY = this.camY;
    }, { passive: false });
    c.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!this.drag) return;
      const t = e.touches[0];
      this.targetCamX = this.camDragX - (t.clientX - this.dragX) / TS;
      this.targetCamY = this.camDragY - (t.clientY - this.dragY) / TS;
      this._clampCamera();
    }, { passive: false });
    c.addEventListener('touchend', e => {
      const t = e.changedTouches[0];
      const moved = Math.abs(t.clientX - this.dragX) > 10 || Math.abs(t.clientY - this.dragY) > 10;
      this.drag = false;
      if (!moved) this._handleClick(t.clientX, t.clientY);
    });
  }

  _handleClick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const tx = (clientX - rect.left) / TS + this.camX;
    const ty = (clientY - rect.top)  / TS + this.camY;
    for (const zone of ZONES) {
      if (Math.abs(tx - zone.cx) <= zone.rw && Math.abs(ty - zone.cy) <= zone.rh) {
        this.onZoneClick(zone.id, zone.locked);
        return;
      }
    }
  }

  panToZone(zoneId) {
    const zone = ZONES.find(z => z.id === zoneId);
    if (!zone) return;
    this.targetCamX = zone.cx - this.cssW / TS / 2;
    this.targetCamY = zone.cy - this.cssH / TS / 2;
    this._clampCamera();
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.canvas?.remove();
    this.canvas = null;
  }
}

/* ── Public API ─────────────────────────────────────────────── */
let _instance = null;

export function initWorldMap(container, onZoneClick) {
  destroyWorldMap();
  _instance = new WorldMap(container, onZoneClick || (() => {}));
  _instance.init();
  return _instance;
}

export function destroyWorldMap() {
  if (_instance) { _instance.destroy(); _instance = null; }
}

export function panWorldMapToZone(zoneId) {
  _instance?.panToZone(zoneId);
}

window.panWorldMapToZone = panWorldMapToZone;
