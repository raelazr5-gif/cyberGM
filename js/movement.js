export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function movePosition(pos, direction, map) {
  const delta = DIRECTIONS[direction];
  if (!delta || !pos || !map) return pos;
  const next = { x: pos.x + delta.x, y: pos.y + delta.y };
  if (next.x < 0 || next.y < 0 || next.x >= map.width || next.y >= map.height) return pos;
  if ((map.obstacles || []).some(o => o.x === next.x && o.y === next.y)) return pos;
  return next;
}

export function manhattan(a, b) {
  return Math.abs((a?.x || 0) - (b?.x || 0)) + Math.abs((a?.y || 0) - (b?.y || 0));
}
