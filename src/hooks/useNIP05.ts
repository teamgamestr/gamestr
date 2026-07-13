import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNIP98Auth } from '@/hooks/useNIP98Auth';
import { isValidNIP05LocalPart } from '@/lib/nip05';

export interface NIP05Config {
  servicePubkey: string;
  domain: string;
  priceSats: number;
  termMonths: number;
  orderTimeoutMs: number;
}

export interface NIP05Availability {
  name: string;
  valid: boolean;
  available: boolean;
  renewable: boolean;
  priceSats: number;
  termMonths: number;
}

export interface NIP05Order {
  id: string;
  name: string;
  action: 'new' | 'renew';
  status: 'pending' | 'paid' | 'expired';
  expiresAt: number;
  createdAt: number;
}

export interface NIP05OrderPayment {
  amountSats: number;
  amountMillisats: number;
  pubkey: string;
  lud16: string;
  lud06: string | null;
  commentPrefix: string;
}

export interface NIP05OrderResponse {
  order: NIP05Order;
  payment: NIP05OrderPayment;
}

export interface NIP05NameEntry {
  name: string;
  pubkey: string;
  expiresAt: number;
}

export function useNIP05Config() {
  return useQuery<NIP05Config>({
    queryKey: ['nip05', 'config'],
    queryFn: async ({ signal }) => {
      const res = await fetch('/api/nip05/config', { signal });
      if (!res.ok) throw new Error('Failed to fetch NIP-05 config');
      return res.json();
    },
    staleTime: Infinity,
  });
}

export function useNIP05Availability(name: string, pubkey?: string) {
  const normalized = name.trim().toLowerCase();
  return useQuery<NIP05Availability>({
    queryKey: ['nip05', 'availability', normalized, pubkey],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ name: normalized });
      if (pubkey) params.set('pubkey', pubkey);
      const res = await fetch(`/api/nip05/availability?${params.toString()}`, { signal });
      if (!res.ok) throw new Error('Failed to check availability');
      return res.json();
    },
    enabled: isValidNIP05LocalPart(normalized),
    staleTime: 10_000,
  });
}

export function useCreateNIP05Order() {
  const { authHeader } = useNIP98Auth();
  const queryClient = useQueryClient();

  return useMutation<NIP05OrderResponse, Error, { name: string; action: 'new' | 'renew' }>({
    mutationFn: async ({ name, action }) => {
      const url = `${window.location.origin}/api/nip05/order`;
      const payload = { name: name.trim().toLowerCase(), action };
      const authorization = await authHeader(url, 'POST', payload);

      const res = await fetch('/api/nip05/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorization,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to create order (${res.status})`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nip05'] });
    },
  });
}

export function useNIP05Order(orderId: string | null) {
  return useQuery<{ order: NIP05Order }>({
    queryKey: ['nip05', 'order', orderId],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/nip05/order/${orderId}`, { signal });
      if (!res.ok) throw new Error('Failed to fetch order');
      return res.json();
    },
    enabled: !!orderId,
    refetchInterval: (query) => {
      const status = query.state.data?.order.status;
      return status === 'pending' ? 3000 : false;
    },
  });
}

export function useNIP05Names() {
  return useQuery<{ names: NIP05NameEntry[] }>({
    queryKey: ['nip05', 'names'],
    queryFn: async ({ signal }) => {
      const res = await fetch('/api/nip05/names', { signal });
      if (!res.ok) throw new Error('Failed to fetch names');
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useNIP05NamesByPubkey(pubkey: string | undefined) {
  return useQuery<{ names: NIP05NameEntry[] }>({
    queryKey: ['nip05', 'names', pubkey],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/nip05/names?pubkey=${pubkey}`, { signal });
      if (!res.ok) throw new Error('Failed to fetch names');
      return res.json();
    },
    enabled: !!pubkey,
    staleTime: 60_000,
  });
}
