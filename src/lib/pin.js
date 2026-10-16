// PIN hashing. This is a privacy screen, not encryption: the data itself is
// still plain localStorage. See docs/DECISIONS.md.

/** v3.0 hash (djb2). Kept only to verify PINs set before v3.1. */
export function legacyHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export function randomSalt() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256(salt:pin) as hex. Falls back to the legacy hash where SubtleCrypto
 *  is unavailable (plain-http LAN previews are not a "secure context"). */
export async function hashPin(pin, salt) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return { algo: 'djb2', hash: legacyHash(pin) };
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const buf = await subtle.digest('SHA-256', data);
  const hash = Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  return { algo: 'sha256', hash };
}

export async function verifyPin(pin, { pinHash, pinAlgo, pinSalt }) {
  if (!pinHash) return false;
  if (pinAlgo !== 'sha256') return legacyHash(pin) === pinHash;
  const { hash } = await hashPin(pin, pinSalt);
  return hash === pinHash;
}
