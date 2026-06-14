import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');

function readPlayers() {
  try {
    if (!fs.existsSync(PLAYERS_FILE)) return {};
    return JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writePlayers(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PLAYERS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, body) {
  cors(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : null);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

export function cyberguardApiPlugin() {
  return {
    name: 'cyberguard-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0];

        if (!url.startsWith('/api')) {
          next();
          return;
        }

        if (req.method === 'OPTIONS') {
          cors(res);
          res.statusCode = 204;
          res.end();
          return;
        }

        if (url === '/api/health') {
          sendJson(res, 200, {
            ok: true,
            service: 'cyberguard',
            time: new Date().toISOString(),
          });
          return;
        }

        if (url === '/api/leaderboard' && req.method === 'GET') {
          const players = readPlayers();
          const leaderboard = Object.values(players)
            .map((p) => ({
              name: p.name,
              avatar: p.avatar || '🕵️',
              level: p.level || 1,
              score: (p.researchData?.totalCorrect ?? 0) * 50 + (p.level ?? 1) * 30,
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 50);
          sendJson(res, 200, { leaderboard });
          return;
        }

        const playerMatch = url.match(/^\/api\/player\/([^/]+)$/);
        if (playerMatch) {
          const key = decodeURIComponent(playerMatch[1]);
          const players = readPlayers();

          if (req.method === 'GET') {
            const player = players[key];
            if (!player) sendJson(res, 404, { error: 'Player not found' });
            else sendJson(res, 200, { player });
            return;
          }

          if (req.method === 'PUT' || req.method === 'POST') {
            try {
              const parsed = await readBody(req);
              if (!parsed || typeof parsed.name !== 'string') {
                sendJson(res, 400, { error: 'Invalid player data' });
                return;
              }
              players[parsed.name] = parsed;
              writePlayers(players);
              sendJson(res, 200, { ok: true, player: parsed });
            } catch {
              sendJson(res, 400, { error: 'Invalid JSON' });
            }
            return;
          }
        }

        sendJson(res, 404, { error: 'Not found' });
      });
    },
  };
}
