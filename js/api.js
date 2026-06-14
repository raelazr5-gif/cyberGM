/** HTTP client — server dev: http://localhost:5173 */

const DEFAULT_SERVER = 'http://localhost:5173';

export function getApiBase() {
  if (typeof window === 'undefined') return DEFAULT_SERVER;
  const { protocol, hostname, port } = window.location;
  if (protocol === 'file:') return DEFAULT_SERVER;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (port === '5173' || port === '') return '';
  }
  return DEFAULT_SERVER;
}

function apiUrl(path) {
  const base = getApiBase();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function checkServerHealth() {
  try {
    const res = await fetch(apiUrl('/api/health'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { online: false };
    const data = await res.json();
    return { online: Boolean(data.ok), data };
  } catch {
    return { online: false };
  }
}

export async function fetchPlayerFromServer(name) {
  try {
    const res = await fetch(apiUrl(`/api/player/${encodeURIComponent(name)}`), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = await res.json();
    return data.player ?? null;
  } catch {
    return null;
  }
}

export async function savePlayerToServer(player) {
  try {
    const res = await fetch(apiUrl(`/api/player/${encodeURIComponent(player.name)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(player),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchLeaderboardFromServer() {
  try {
    const res = await fetch(apiUrl('/api/leaderboard'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.leaderboard) ? data.leaderboard : null;
  } catch {
    return null;
  }
}
