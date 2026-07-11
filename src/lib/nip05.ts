export function buildNIP05Identifier(name: string, domain: string): string {
  return `${name}@${domain}`;
}

export function isValidNIP05LocalPart(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const normalized = name.trim().toLowerCase();
  if (!/^[a-z0-9-_.]{2,32}$/.test(normalized)) return false;
  if (normalized.startsWith('-') || normalized.endsWith('-')) return false;
  if (normalized.startsWith('.') || normalized.endsWith('.')) return false;
  return true;
}
