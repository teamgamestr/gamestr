import { useCallback } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { createNIP98AuthHeader } from '@/lib/nip98';

export function useNIP98Auth() {
  const { user } = useCurrentUser();

  const authHeader = useCallback(
    async (url: string, method: string, payload?: string | object) => {
      if (!user?.signer) {
        throw new Error('You must be logged in to perform this action');
      }
      return createNIP98AuthHeader(user.signer, url, method, payload);
    },
    [user?.signer],
  );

  return { authHeader, isReady: !!user?.signer };
}
