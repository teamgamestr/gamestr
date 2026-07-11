import { getToken } from 'nostr-tools/nip98';
import type { NostrEvent } from '@nostrify/nostrify';

export interface NostrSignerLike {
  signEvent: (event: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>) => Promise<NostrEvent>;
}

export async function createNIP98AuthHeader(
  signer: NostrSignerLike,
  url: string,
  method: string,
  payload?: string | object,
): Promise<string> {
  const payloadObj = typeof payload === 'string' ? JSON.parse(payload) : payload;

  return getToken(
    url,
    method.toUpperCase(),
    async (event) => signer.signEvent(event as Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>),
    true,
    payloadObj as Record<string, unknown> | undefined,
  );
}
