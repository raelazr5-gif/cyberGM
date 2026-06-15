// js/worldMap.js — CyberGuard RPG World Map
// Classic top-down GBA/SNES style (Zelda Minish Cap / RPG Maker XP)
// 16×16 tiles · orthographic camera · drag-to-pan · click zones

/* ── Tile IDs ──────────────────────────────────────────────── */
const T = {
  GRASS:   0,
  GRASS_D: 1,   // dark grass variant
  TREE:    2,   // standard tree (canopy)
  TREE_D:  3,   // dense dark forest tree
  STONE:   4,   // stone road
  PLAZA:   5,   // stone plaza (village center)
  WALL:    6,   // building wall
  ROOF_R:  7,   // red roof
  ROOF_B:  8,   // blue-grey roof
  DOOR:    9,
  FENCE_H: 10,
  FENCE_V: 11,
  CROP:    12,
  FLOWER:  13,
  WATER:   14,
  SAND:    15,
  DARK:    16,  // darknet ground
  DARK_S:  17,  // dark stone
  PATH:    18,  // dirt path
};

/* ── Map dimensions ────────────────────────────────────────── */
const MW = 64;   // tiles wide
const MH = 52;   // tiles tall
const TS = 16;   // tile size in CSS px

/* ── Zone definitions (tile-coordinate centre + radius) ─────── */
const ZONES = [
  {
    id: 'phishing', label: '📧 PHISHING\nDISTRICT',
    diff: 'EASY', color: '#00d4bc',
    cx: 11, cy: 16, rw: 7, rh: 7,
  },
  {
    id: 'social', label: '🎭 SOCIAL ENG.\nHUB',
    diff: 'EASY', color: '#00d4bc',
    cx: 52, cy: 16, rw: 7, rh: 7,
  },
  {
    id: 'web', label: '🌐 WEB THREAT\nSECTOR',
    diff: 'MED', color: '#ffe566',
    cx: 53, cy: 33, rw: 6, rh: 6,
  },
  {
    id: 'malware', label: '🦠 MALWARE\nQUARANTINE',
    diff: 'MED', color: '#ffe566',
    cx: 11, cy: 38, rw: 7, rh: 6,
  },
  {
    id: 'scam', label: '💸 SCAM NET\nZONE',
    diff: 'HARD', color: '#ff5577',
    cx: 53, cy: 44, rw: 6, rh: 5,
  },
  {
    id: 'darknet', label: '🔒 DARKNET\nSECTOR',
    diff: 'LOCK', color: '#aa44ff',
    cx: 32, cy: 7, rw: 6, rh: 4,
    locked: true,
  },
];

/* ── Pure tile hash (deterministic, no state) ──────────────── */
// Returns a stable 0–1 value for tile (x, y, sample-index i)
function tileHash(x, y, i) {
  let h = (x * 374761393 + y * 668265263 + (i || 0) * 2246822519) >>> 0;
  h = ((h ^ (h >>> 15)) >>> 0);
  h = (Math.imul(h, 0x85ebca77)) >>> 0;
  h = ((h ^ (h >>> 13)) >>> 0);
  h = (Math.imul(h, 0xc2b2ae3d)) >>> 0;
  h = ((h ^ (h >>> 16)) >>> 0);
  return h / 4294967296;
}

/* ── Seeded RNG (Mulberry32) — used only for map generation ── */
function seededRng(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Map generation ─────────────────────────────────────────── */
function fillRect(map, x0, y0, w, h, tile) {
  for (let y = y0; y < Math.min(y0 + h, MH); y++)
    for (let x = x0; x < Math.min(x0 + w, MW); x++)
      if (x >= 0 && y >= 0) map[y][x] = tile;
}

function setTile(map, x, y, tile) {
  if (x >= 0 && y >= 0 && x < MW && y < MH) map[y][x] = tile;
}

function generateMap() {
  const rng  = seededRng(7331);
  const rng2 = seededRng(2109);

  // 1. Base: bright grass everywhere
  const map = Array.from({ length: MH }, () => Array(MW).fill(T.GRASS));

  // 2. Scatter dark grass for variation
  for (let y = 0; y < MH; y++)
    for (let x = 0; x < MW; x++)
      if (rng() < 0.20) map[y][x] = T.GRASS_D;

  // 3. Dense forest border (outer 3 tiles)
  fillRect(map, 0,    0,    MW,  3,  T.TREE_D);
  fillRect(map, 0,    MH-3, MW,  3,  T.TREE_D);
  fillRect(map, 0,    0,    3,   MH, T.TREE_D);
  fillRect(map, MW-3, 0,    3,   MH, T.TREE_D);

  // 4. Inner forest belt (thinner, standard trees)
  fillRect(map, 3, 3, MW-6, 2, T.TREE);
  fillRect(map, 3, MH-5, MW-6, 2, T.TREE);
  fillRect(map, 3, 3, 2, MH-6, T.TREE);
  fillRect(map, MW-5, 3, 2, MH-6, T.TREE);

  // 5. Forest separators between zones (tree columns/rows)
  //    Vertical dividers
  fillRect(map, 21, 5, 2, 18, T.TREE);
  fillRect(map, 41, 5, 2, 18, T.TREE);
  fillRect(map, 21, 28, 2, 20, T.TREE);
  fillRect(map, 41, 28, 2, 20, T.TREE);
  //    Horizontal dividers
  fillRect(map, 5, 22, 16, 2, T.TREE);
  fillRect(map, 43, 22, 14, 2, T.TREE);
  fillRect(map, 5, 30, 16, 2, T.TREE);
  fillRect(map, 43, 30, 14, 2, T.TREE);

  // 6. Main stone roads (cross pattern through centre)
  //    East-West road  y=25-26
  fillRect(map, 0, 25, MW, 2, T.STONE);
  //    North-South road  x=30-31
  fillRect(map, 30, 0, 2, MH, T.STONE);

  // 7. Zone connector paths (dirt/sand)
  //    Phishing connector  left side of EW road → phishing
  fillRect(map, 5, 24, 16, 1, T.PATH);
  fillRect(map, 5, 26, 16, 1, T.PATH);
  fillRect(map, 12, 22, 1, 4, T.PATH);
  //    Social connector  right side → social
  fillRect(map, 43, 24, 14, 1, T.PATH);
  fillRect(map, 43, 26, 14, 1, T.PATH);
  fillRect(map, 52, 22, 1, 4, T.PATH);
  //    Web connector  east
  fillRect(map, 43, 31, 14, 1, T.PATH);
  fillRect(map, 52, 31, 1, 5, T.PATH);
  //    Malware connector  south-west
  fillRect(map, 5, 32, 16, 1, T.PATH);
  fillRect(map, 12, 32, 1, 6, T.PATH);
  //    Scam connector  south-east
  fillRect(map, 43, 42, 14, 1, T.PATH);
  fillRect(map, 52, 38, 1, 5, T.PATH);
  //    Darknet connector  north
  fillRect(map, 30, 5, 2, 20, T.STONE);  // already covered by NS road extension

  // 8. Village plaza (centre of cross)
  fillRect(map, 26, 22, 8, 7, T.PLAZA);
  // Plaza edges / road merge
  fillRect(map, 26, 25, 8, 2, T.STONE);
  fillRect(map, 30, 22, 2, 7, T.STONE);

  // 9. Village houses (red roofs, stone base, door)
  //    House 1 NW of plaza
  placeHouse(map, 22, 22, T.ROOF_R);
  //    House 2 NE of plaza
  placeHouse(map, 36, 22, T.ROOF_B);
  //    House 3 SW of plaza
  placeHouse(map, 22, 29, T.ROOF_R);
  //    House 4 SE of plaza
  placeHouse(map, 36, 29, T.ROOF_R);
  //    House 5 N of plaza (inn / centre building)
  placeLargeBuilding(map, 27, 18, T.ROOF_B);

  // 10. Darknet sector (dark ground, locked fortress)
  fillRect(map, 26, 4, 10, 6, T.DARK);
  //     Dark stone walls of fortress
  fillRect(map, 26, 4, 10, 1, T.DARK_S);
  fillRect(map, 26, 9, 10, 1, T.DARK_S);
  fillRect(map, 26, 4, 1, 6, T.DARK_S);
  fillRect(map, 35, 4, 1, 6, T.DARK_S);
  //     Fortress interior dark
  fillRect(map, 27, 5, 8, 4, T.DARK);

  // 11. Phishing district (NW) — office building clusters
  fillRect(map, 5, 5, 16, 17, T.GRASS);
  placeHouse(map, 6, 6, T.ROOF_R);
  placeHouse(map, 12, 6, T.ROOF_B);
  placeHouse(map, 6, 12, T.ROOF_R);
  placeHouse(map, 13, 13, T.ROOF_R);
  placeLargeBuilding(map, 7, 17, T.ROOF_B);

  // 12. Social Engineering Hub (NE) — market stalls / buildings
  fillRect(map, 43, 5, 16, 17, T.GRASS);
  placeHouse(map, 44, 6, T.ROOF_R);
  placeHouse(map, 50, 6, T.ROOF_B);
  placeHouse(map, 44, 13, T.ROOF_B);
  placeHouse(map, 51, 13, T.ROOF_R);
  placeLargeBuilding(map, 46, 17, T.ROOF_R);

  // 13. Web Threat Sector (E) — server towers
  fillRect(map, 43, 28, 16, 14, T.GRASS);
  placeHouse(map, 45, 29, T.ROOF_B);
  placeHouse(map, 52, 29, T.ROOF_B);
  placeLargeBuilding(map, 47, 34, T.ROOF_B);

  // 14. Malware Quarantine (SW) — fenced quarantine area
  fillRect(map, 5, 28, 16, 16, T.GRASS_D);
  //     Quarantine fence perimeter
  fillRect(map, 5, 28, 16, 1, T.FENCE_H);
  fillRect(map, 5, 43, 16, 1, T.FENCE_H);
  fillRect(map, 5, 28, 1, 16, T.FENCE_V);
  fillRect(map, 20, 28, 1, 16, T.FENCE_V);
  //     Inside: dark buildings
  placeHouse(map, 7, 30, T.ROOF_B);
  placeHouse(map, 13, 30, T.ROOF_R);
  placeHouse(map, 7, 37, T.ROOF_B);
  placeHouse(map, 14, 37, T.ROOF_R);

  // 15. Scam Network Zone (SE) — flashy buildings
  fillRect(map, 43, 38, 16, 10, T.GRASS);
  placeHouse(map, 44, 39, T.ROOF_R);
  placeHouse(map, 51, 39, T.ROOF_R);
  placeLargeBuilding(map, 46, 43, T.ROOF_B);

  // 16. Farming area (between village and malware zone)
  fillRect(map, 23, 33, 6, 8, T.CROP);
  fillRect(map, 23, 33, 6, 1, T.FENCE_H);
  fillRect(map, 23, 40, 6, 1, T.FENCE_H);
  fillRect(map, 23, 33, 1, 8, T.FENCE_V);
  fillRect(map, 28, 33, 1, 8, T.FENCE_V);

  // 17. Water feature near village (small pond)
  fillRect(map, 33, 33, 5, 4, T.WATER);
  // Sandy shore around pond
  setTile(map, 32, 33, T.SAND);
  setTile(map, 32, 34, T.SAND);
  setTile(map, 32, 35, T.SAND);
  setTile(map, 32, 36, T.SAND);
  setTile(map, 33, 37, T.SAND);
  setTile(map, 34, 37, T.SAND);
  setTile(map, 35, 37, T.SAND);
  setTile(map, 36, 37, T.SAND);
  setTile(map, 38, 37, T.SAND);
  setTile(map, 38, 35, T.SAND);
  setTile(map, 38, 34, T.SAND);
  setTile(map, 38, 33, T.SAND);

  // 18. Flower decorations scattered on grass
  const flowerPts = [
    [8,20],[15,20],[19,20],[38,20],[45,20],[57,20],
    [8,30],[20,44],[50,44],[20,8],[57,8],[20,18],
    [25,33],[29,32],[40,32],[40,22],[33,22],
    [39,27],[24,27],
  ];
  flowerPts.forEach(([x,y]) => setTile(map, x, y, T.FLOWER));

  // 19. Extra tree clusters in grass areas for depth
  const treeClusters = [
    [8,9],[9,10],[15,8],[16,10],[18,9],
    [46,8],[47,9],[55,9],[56,8],[58,10],
    [8,31],[9,34],[10,43],[18,31],[19,36],
    [47,30],[48,32],[56,32],[57,30],[58,38],
    [33,10],[34,12],[35,11],[25,12],[26,14],
  ];
  treeClusters.forEach(([x, y]) => setTile(map, x, y, T.TREE));

  return map;
}

/* ── House placer helpers ───────────────────────────────────── */
// 4×3 tile house (wall base + roof + door)
function placeHouse(map, x, y, roofTile) {
  fillRect(map, x,   y,   4, 3, T.WALL);
  fillRect(map, x,   y,   4, 1, roofTile);
  setTile(map, x+1, y+2, T.DOOR);
}

// 6×4 large building
function placeLargeBuilding(map, x, y, roofTile) {
  fillRect(map, x,   y,   6, 4, T.WALL);
  fillRect(map, x,   y,   6, 1, roofTile);
  setTile(map, x+2, y+3, T.DOOR);
  setTile(map, x+3, y+3, T.DOOR);
}

/* ── Tile colour renderer ───────────────────────────────────── */
// tx, ty = tile map coordinates (for stable hash-based variation)
function drawTile(ctx, tile, px, py, ts, tx, ty) {
  const r  = tileHash(tx, ty, 0);
  const r2 = tileHash(tx, ty, 1);
  const r3 = tileHash(tx, ty, 2);
  switch (tile) {
    case T.GRASS: {
      ctx.fillStyle = r < 0.12 ? '#72c440' : r < 0.25 ? '#5aaa2e' : '#68b838';
      ctx.fillRect(px, py, ts, ts);
      if (r > 0.82) {
        ctx.fillStyle = '#7cd848';
        ctx.fillRect(px+3, py+2, 1, 4);
        ctx.fillRect(px+9, py+5, 1, 3);
      }
      break;
    }
    case T.GRASS_D: {
      ctx.fillStyle = r < 0.15 ? '#3e8822' : r < 0.3 ? '#4a9830' : '#4a9430';
      ctx.fillRect(px, py, ts, ts);
      break;
    }
    case T.TREE: {
      ctx.fillStyle = '#2a5a1a';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = r < 0.3 ? '#3a9030' : '#358830';
      ctx.fillRect(px+1, py+1, ts-2, ts-2);
      ctx.fillStyle = '#50b040';
      ctx.fillRect(px+2, py+2, ts-8, ts-8);
      ctx.fillStyle = '#2a6a20';
      ctx.fillRect(px+5, py+7, 3, 3);
      break;
    }
    case T.TREE_D: {
      ctx.fillStyle = '#0e2e0a';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#1a4a14';
      ctx.fillRect(px+1, py+1, ts-2, ts-2);
      ctx.fillStyle = '#245820';
      ctx.fillRect(px+2, py+2, ts-8, ts-7);
      ctx.fillStyle = '#0e2e0a';
      ctx.fillRect(px+5, py+6, 3, 4);
      break;
    }
    case T.STONE: {
      ctx.fillStyle = r < 0.3 ? '#726858' : '#7a7060';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#5e5448';
      ctx.fillRect(px,   py,   ts, 1);
      ctx.fillRect(px,   py,   1,  ts);
      ctx.fillRect(px+8, py+4, 1,  ts-4);
      ctx.fillRect(px,   py+8, 8,  1);
      ctx.fillStyle = '#908070';
      ctx.fillRect(px+1, py+1, 7, 7);
      ctx.fillRect(px+9, py+5, ts-10, ts-6);
      break;
    }
    case T.PLAZA: {
      ctx.fillStyle = '#a09070';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#8a7858';
      ctx.fillRect(px,   py,   ts, 1);
      ctx.fillRect(px,   py,   1,  ts);
      ctx.fillRect(px+8, py,   1,  ts);
      ctx.fillRect(px,   py+8, ts, 1);
      ctx.fillStyle = '#b4a882';
      ctx.fillRect(px+1, py+1, 7, 7);
      ctx.fillRect(px+9, py+9, 6, 6);
      break;
    }
    case T.WALL: {
      ctx.fillStyle = '#d4b87a';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#b89858';
      ctx.fillRect(px,   py+5,  ts, 1);
      ctx.fillRect(px,   py+10, ts, 1);
      ctx.fillRect(px+8, py,    1,  5);
      ctx.fillRect(px+4, py+6,  1,  5);
      ctx.fillRect(px+8, py+11, 1,  ts-11);
      ctx.fillStyle = '#88ccff';
      ctx.fillRect(px+10, py+2, 4, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px+10, py+2, 2, 1);
      break;
    }
    case T.ROOF_R: {
      ctx.fillStyle = '#c83030';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#a02020';
      for (let row = 0; row < 4; row++) ctx.fillRect(px, py + row*4, ts, 1);
      ctx.fillStyle = '#e04848';
      ctx.fillRect(px+1, py+1, ts-4, 2);
      break;
    }
    case T.ROOF_B: {
      ctx.fillStyle = '#5878a8';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#405888';
      for (let row = 0; row < 4; row++) ctx.fillRect(px, py + row*4, ts, 1);
      ctx.fillStyle = '#6890c0';
      ctx.fillRect(px+1, py+1, ts-4, 2);
      break;
    }
    case T.DOOR: {
      ctx.fillStyle = '#d4b87a';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#6a3a1a';
      ctx.fillRect(px+3, py+2, 10, ts-2);
      ctx.fillStyle = '#8a5030';
      ctx.fillRect(px+4, py+3, 8, ts-4);
      ctx.fillStyle = '#d4a040';
      ctx.fillRect(px+11, py+8, 2, 2);
      break;
    }
    case T.FENCE_H: {
      ctx.fillStyle = '#68b838';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#7a5828';
      ctx.fillRect(px, py+6, ts, 2);
      ctx.fillRect(px+3, py+4, 2, 6);
      ctx.fillRect(px+11, py+4, 2, 6);
      ctx.fillStyle = '#9a7040';
      ctx.fillRect(px, py+6, ts, 1);
      break;
    }
    case T.FENCE_V: {
      ctx.fillStyle = '#68b838';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#7a5828';
      ctx.fillRect(px+7, py, 2, ts);
      ctx.fillRect(px+5, py+3, 6, 2);
      ctx.fillRect(px+5, py+11, 6, 2);
      ctx.fillStyle = '#9a7040';
      ctx.fillRect(px+7, py, 1, ts);
      break;
    }
    case T.CROP: {
      ctx.fillStyle = '#4a9430';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#90d038';
      ctx.fillRect(px+1, py+1, 2, ts-2);
      ctx.fillRect(px+6, py+2, 2, ts-3);
      ctx.fillRect(px+11, py+1, 2, ts-2);
      ctx.fillStyle = '#aae850';
      ctx.fillRect(px+1, py+1, 1, 3);
      ctx.fillRect(px+6, py+3, 1, 3);
      ctx.fillRect(px+11, py+2, 1, 3);
      break;
    }
    case T.FLOWER: {
      ctx.fillStyle = r < 0.4 ? '#68b838' : '#5aaa2e';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#40801a';
      ctx.fillRect(px+4, py+7, 1, 5);
      ctx.fillRect(px+10, py+8, 1, 4);
      const fc = r2 < 0.33 ? '#f8d820' : r2 < 0.66 ? '#f83060' : '#e880f0';
      ctx.fillStyle = fc;
      ctx.fillRect(px+2, py+4, 5, 3);
      ctx.fillStyle = '#fff8e0';
      ctx.fillRect(px+4, py+5, 1, 1);
      ctx.fillStyle = '#e0a820';
      ctx.fillRect(px+8, py+5, 4, 3);
      ctx.fillStyle = '#fff8e0';
      ctx.fillRect(px+10, py+6, 1, 1);
      break;
    }
    case T.WATER: {
      // Base drawn by caller's water animation pass
      ctx.fillStyle = '#2468c8';
      ctx.fillRect(px, py, ts, ts);
      break;
    }
    case T.SAND: {
      ctx.fillStyle = r < 0.2 ? '#c8a860' : r < 0.45 ? '#d4b870' : '#ccb068';
      ctx.fillRect(px, py, ts, ts);
      if (r2 > 0.7) {
        ctx.fillStyle = '#b89048';
        ctx.fillRect(px+2, py+5, 2, 1);
        ctx.fillRect(px+10, py+9, 3, 1);
      }
      break;
    }
    case T.PATH: {
      ctx.fillStyle = '#b49858';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#9a7c40';
      ctx.fillRect(px, py,   ts, 1);
      ctx.fillRect(px, py+1, 1,  ts-1);
      if (r2 > 0.6) {
        ctx.fillStyle = '#c8ac6a';
        ctx.fillRect(px+3,  py+3, 2, 2);
        ctx.fillRect(px+10, py+9, 2, 2);
      }
      break;
    }
    case T.DARK: {
      ctx.fillStyle = r < 0.2 ? '#14102a' : '#1a1430';
      ctx.fillRect(px, py, ts, ts);
      if (r2 > 0.85) {
        ctx.fillStyle = '#6030a8';
        const sx = (r3 * 14) | 0;
        const sy = (tileHash(tx, ty, 3) * 14) | 0;
        ctx.fillRect(px + sx, py + sy, 1, 1);
      }
      break;
    }
    case T.DARK_S: {
      ctx.fillStyle = '#2a2040';
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = '#3a2e58';
      ctx.fillRect(px+1, py+1, ts-2, ts-2);
      ctx.fillStyle = '#1a1430';
      ctx.fillRect(px, py, ts, 1);
      ctx.fillRect(px, py, 1, ts);
      break;
    }
    default: {
      ctx.fillStyle = '#68b838';
      ctx.fillRect(px, py, ts, ts);
    }
  }
}

/* ── Zone overlay renderer ──────────────────────────────────── */
function drawZoneOverlay(ctx, zone, screenX, screenY, tsScaled, time) {
  const cx = screenX + zone.cx * tsScaled;
  const cy = screenY + zone.cy * tsScaled;

  // Pulsing border
  const pulse = 0.55 + 0.45 * Math.sin(time / 600 + zone.cx);
  const glow  = ctx.createRadialGradient(cx, cy, 0, cx, cy, zone.rw * tsScaled);
  const col   = zone.locked ? '#aa44ff' : zone.color;
  glow.addColorStop(0,   col + '14');
  glow.addColorStop(0.7, col + '08');
  glow.addColorStop(1,   'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(
    cx - zone.rw * tsScaled,
    cy - zone.rh * tsScaled,
    zone.rw * 2 * tsScaled,
    zone.rh * 2 * tsScaled
  );

  // Floating label background
  const lblY = cy - zone.rh * tsScaled - 12;
  const lines = zone.label.split('\n');
  const fontSize = Math.max(9, Math.min(13, tsScaled * 0.85));

  ctx.font = `bold ${fontSize}px "Orbitron", monospace`;
  const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
  const lblH = lines.length * (fontSize + 3) + 8;

  ctx.fillStyle = 'rgba(2,5,14,0.82)';
  ctx.fillRect(cx - maxW/2 - 8, lblY - lblH + 4, maxW + 16, lblH);

  // Border line
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.2 * pulse;
  ctx.strokeRect(cx - maxW/2 - 8, lblY - lblH + 4, maxW + 16, lblH);

  // Label text
  ctx.fillStyle = zone.locked ? '#cc88ff' : col;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  lines.forEach((line, i) => {
    ctx.fillText(line, cx, lblY - (lines.length - 1 - i) * (fontSize + 3));
  });

  // Difficulty badge
  const diffColor = zone.locked ? '#aa44ff' : (zone.diff === 'HARD' ? '#ff5577' : zone.diff === 'MED' ? '#ffe566' : '#00d4bc');
  ctx.font = `${Math.max(7, fontSize - 2)}px "Share Tech Mono", monospace`;
  ctx.fillStyle = diffColor;
  ctx.fillText(`[${zone.diff}]`, cx, lblY);
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

    // Camera position in tile coordinates (top-left of viewport)
    this.camX = 16;
    this.camY = 10;
    this.targetCamX = 16;
    this.targetCamY = 10;

    // Drag state
    this.drag       = false;
    this.dragX      = 0;
    this.dragY      = 0;
    this.camDragX   = 0;
    this.camDragY   = 0;
  }

  init() {
    // Generate map
    this.map = generateMap();

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'display:block;width:100%;height:100%;cursor:grab;touch-action:none;';
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    // Centre camera on village (around tile 30,26)
    this.camX = 30 - 10;
    this.camY = 26 - 7;
    this.targetCamX = this.camX;
    this.targetCamY = this.camY;

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
    this.cssW = w;
    this.cssH = h;
  }

  _tick() {
    this.raf = requestAnimationFrame(() => this._tick());
    this.time++;

    // Smooth camera lerp
    const spd = 0.12;
    this.camX += (this.targetCamX - this.camX) * spd;
    this.camY += (this.targetCamY - this.camY) * spd;

    this._render();
  }

  _render() {
    const ctx   = this.ctx;
    const w     = this.cssW  || 480;
    const h     = this.cssH  || 320;
    const ts    = TS;

    // Tiles visible
    const tilesX = Math.ceil(w / ts) + 2;
    const tilesY = Math.ceil(h / ts) + 2;

    // Pixel offset for sub-tile camera smoothing
    const offX = -(this.camX * ts) % ts;
    const offY = -(this.camY * ts) % ts;
    const startTX = Math.floor(this.camX);
    const startTY = Math.floor(this.camY);

    ctx.imageSmoothingEnabled = false;

    // Draw tiles
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const mx = startTX + tx;
        const my = startTY + ty;
        const tile = (mx >= 0 && mx < MW && my >= 0 && my < MH)
          ? this.map[my][mx]
          : T.TREE_D;
        const px = tx * ts + offX;
        const py = ty * ts + offY;
        drawTile(ctx, tile, px, py, ts, mx, my);
      }
    }

    // Water shimmer animation pass (re-draw water tiles with animated shimmer)
    const waterPhase = (Math.sin(this.time / 45) + 1) / 2;
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const mx = startTX + tx;
        const my = startTY + ty;
        if (mx < 0 || my < 0 || mx >= MW || my >= MH) continue;
        if (this.map[my][mx] !== T.WATER) continue;
        const px = tx * ts + offX;
        const py = ty * ts + offY;
        ctx.fillStyle = '#2468c8';
        ctx.fillRect(px, py, ts, ts);
        ctx.fillStyle = `rgba(56,136,232,${0.6 + 0.4 * waterPhase})`;
        const sx = (waterPhase * 6) | 0;
        ctx.fillRect(px + sx,        py + 4,  6, 2);
        ctx.fillRect(px + (ts-sx-4), py + 10, 4, 2);
        ctx.fillStyle = 'rgba(96,170,255,0.7)';
        ctx.fillRect(px + sx + 1,    py + 4,  2, 1);
      }
    }

    // Draw zone overlays (glow + labels)
    const screenOX = -this.camX * ts;
    const screenOY = -this.camY * ts;
    ZONES.forEach(zone => {
      const szx = screenOX + zone.cx * ts - zone.rw * ts;
      const szy = screenOY + zone.cy * ts - zone.rh * ts;
      const szw = zone.rw * 2 * ts;
      const szh = zone.rh * 2 * ts;
      // Only draw if visible
      if (szx + szw < 0 || szx > w || szy + szh < 0 || szy > h) return;
      drawZoneOverlay(ctx, zone, screenOX, screenOY, ts, this.time);
    });

    // Vignette
    const vg = ctx.createRadialGradient(w/2, h/2, h*0.25, w/2, h/2, h*0.75);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  _clampCamera() {
    const visX = (this.cssW  || 480) / TS;
    const visY = (this.cssH || 320) / TS;
    this.targetCamX = Math.max(0, Math.min(MW - visX, this.targetCamX));
    this.targetCamY = Math.max(0, Math.min(MH - visY, this.targetCamY));
  }

  _bindEvents() {
    const c = this.canvas;

    // Mouse drag
    c.addEventListener('mousedown', e => {
      this.drag   = true;
      this.dragX  = e.clientX;
      this.dragY  = e.clientY;
      this.camDragX = this.camX;
      this.camDragY = this.camY;
      c.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', e => {
      if (!this.drag) return;
      const dx = (e.clientX - this.dragX) / TS;
      const dy = (e.clientY - this.dragY) / TS;
      this.targetCamX = this.camDragX - dx;
      this.targetCamY = this.camDragY - dy;
      this._clampCamera();
    });
    window.addEventListener('mouseup', e => {
      if (!this.drag) return;
      const didDrag = Math.abs(e.clientX - this.dragX) > 5 || Math.abs(e.clientY - this.dragY) > 5;
      this.drag = false;
      c.style.cursor = 'grab';
      if (!didDrag) this._handleClick(e.clientX, e.clientY);
    });

    // Touch drag
    c.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      this.drag   = true;
      this.dragX  = t.clientX;
      this.dragY  = t.clientY;
      this.camDragX = this.camX;
      this.camDragY = this.camY;
    }, { passive: false });
    c.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!this.drag) return;
      const t = e.touches[0];
      const dx = (t.clientX - this.dragX) / TS;
      const dy = (t.clientY - this.dragY) / TS;
      this.targetCamX = this.camDragX - dx;
      this.targetCamY = this.camDragY - dy;
      this._clampCamera();
    }, { passive: false });
    c.addEventListener('touchend', e => {
      const t = e.changedTouches[0];
      const didDrag = Math.abs(t.clientX - this.dragX) > 10 || Math.abs(t.clientY - this.dragY) > 10;
      this.drag = false;
      if (!didDrag) this._handleClick(t.clientX, t.clientY);
    });
  }

  _handleClick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const cx   = clientX - rect.left;
    const cy   = clientY - rect.top;

    // Convert screen coords → tile coords
    const tx = cx / TS + this.camX;
    const ty = cy / TS + this.camY;

    // Check zone hit
    for (const zone of ZONES) {
      if (
        Math.abs(tx - zone.cx) <= zone.rw &&
        Math.abs(ty - zone.cy) <= zone.rh
      ) {
        this.onZoneClick(zone.id, zone.locked);
        return;
      }
    }
  }

  panToZone(zoneId) {
    const zone = ZONES.find(z => z.id === zoneId);
    if (!zone) return;
    const visX = (this.cssW || 480) / TS;
    const visY = (this.cssH || 320) / TS;
    this.targetCamX = zone.cx - visX / 2;
    this.targetCamY = zone.cy - visY / 2;
    this._clampCamera();
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._resize);
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
  if (_instance) {
    _instance.destroy();
    _instance = null;
  }
}

export function panWorldMapToZone(zoneId) {
  _instance?.panToZone(zoneId);
}

window.panWorldMapToZone = panWorldMapToZone;
