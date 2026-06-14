/** Standalone pages/ use index.html for the full game */
export function showLegacyNotice(elementId, section) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = `${section} tersedia di index.html (CyberGuard RPG utama).`;
}
