/** Shared helpers — security, parsing, threat typing */

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeJsonParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Agent display name: letters, numbers, space, dot, hyphen; max 20 chars */
export function normalizeAgentName(raw) {
  const name = String(raw || '').trim().slice(0, 20);
  if (!name || !/^[\w\s.\-]+$/u.test(name)) return '';
  return name;
}

export function isValidAgentName(raw) {
  const name = normalizeAgentName(raw);
  if (!name) return false;
  if (name.length < 4) return false; // minimal 4 karakter
  if (/^\d+$/.test(name)) return false; // bukan hanya angka
  return true;
}

export function storageKeyForPlayer(name) {
  const safe = normalizeAgentName(name);
  return safe ? `cg_player_${safe}` : '';
}

export function mapThreatType(type) {
  const map = {
    phishing: 'phishing',
    social: 'social',
    web: 'web',
    malware: 'malware',
    scam: 'scam',
  };
  return map[type] || 'scam';
}

export function csvEscape(val) {
  const s = String(val ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Keyword-based AVA reply (hub + gameplay) */
export function pickAvaResponse(query, caseHints, responses) {
  const q = query.toLowerCase();
  if (q.includes('phishing') || q.includes('email')) {
    return responses.phishing[Math.floor(Math.random() * responses.phishing.length)];
  }
  if (q.includes('malware') || q.includes('virus') || q.includes('file')) {
    return responses.malware[Math.floor(Math.random() * responses.malware.length)];
  }
  if (q.includes('web') || q.includes('website') || q.includes('url')) {
    return responses.web[Math.floor(Math.random() * responses.web.length)];
  }
  if (q.includes('social') || q.includes('manipulasi')) {
    return responses.social[Math.floor(Math.random() * responses.social.length)];
  }
  if (q.includes('scam') || q.includes('investasi')) {
    return responses.scam[Math.floor(Math.random() * responses.scam.length)];
  }
  if (caseHints?.length) {
    return caseHints[Math.floor(Math.random() * caseHints.length)];
  }
  return responses.general[Math.floor(Math.random() * responses.general.length)];
}
