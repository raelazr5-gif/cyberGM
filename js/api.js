/** HTTP client — uses relative URLs so it works on Replit and local dev */

export function getApiBase() {
  return '';
}

function apiUrl(path) {
  return path.startsWith('/') ? path : `/${path}`;
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
