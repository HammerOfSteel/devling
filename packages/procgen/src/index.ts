export const PACKAGE_NAME = "@devling/procgen";

/**
 * FNV-1a 32-bit string hash — the stable primitive used to fork named
 * sub-seeds from a root seed (todo.md §7.2.1) and to hash world state
 * for determinism checks (4.1.2).
 */
export function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
