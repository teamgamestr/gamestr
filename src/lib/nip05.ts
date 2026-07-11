export const NIP05_SERVICE_PUBKEY =
  '5748fbe6ec0443e1f85b66351fe9cc2717014cf938acc968e7b20c9099802453';

export const NIP05_DOMAIN = 'gamestr.me';

export const NIP05_PRICE_SATS = 10_000;

export function buildNIP05Identifier(name: string): string {
  return `${name}@${NIP05_DOMAIN}`;
}

export function isValidNIP05LocalPart(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const normalized = name.trim().toLowerCase();
  if (!/^[a-z0-9-_.]{2,32}$/.test(normalized)) return false;
  if (normalized.startsWith('-') || normalized.endsWith('-')) return false;
  if (normalized.startsWith('.') || normalized.endsWith('.')) return false;
  return true;
}
