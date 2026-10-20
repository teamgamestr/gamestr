import { useState, useEffect } from 'react';
import { Lock, Plus, Settings, Wifi, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAppContext } from '@/hooks/useAppContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import {
  GAMESTR_RELAY,
  GAMESTR_RELAY_URL,
  normalizeRelayUrl,
  relayListTags,
  type RelayEntry,
} from '@/lib/relays';

/**
 * Editor for the visitor's NIP-65 relay list.
 *
 * The Gamestr relay is pinned: it is always read from and published to, so it
 * has no read/write toggles and cannot be removed. Everything else is the
 * visitor's own list, stored locally and published as a kind 10002 event when
 * they are logged in.
 */
export function RelayListManager() {
  const { config, updateConfig } = useAppContext();
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  const { toast } = useToast();

  // The pinned Gamestr entry is not part of the editable list.
  const [relays, setRelays] = useState<RelayEntry[]>(
    config.relayMetadata.relays.filter((relay) => relay.url !== GAMESTR_RELAY_URL),
  );
  const [newRelayUrl, setNewRelayUrl] = useState('');

  // Sync local state with config when it changes (e.g. after NIP-65 sync).
  useEffect(() => {
    setRelays(config.relayMetadata.relays.filter((relay) => relay.url !== GAMESTR_RELAY_URL));
  }, [config.relayMetadata.relays]);

  const handleAddRelay = () => {
    const normalized = normalizeRelayUrl(newRelayUrl);

    if (!normalized) {
      toast({
        title: 'Invalid relay URL',
        description: 'Please enter a valid relay URL (e.g. wss://relay.example.com)',
        variant: 'destructive',
      });
      return;
    }

    if (normalized === GAMESTR_RELAY_URL) {
      toast({
        title: 'Gamestr is always connected',
        description: 'The Gamestr relay is part of every connection and needs no entry.',
      });
      return;
    }

    if (relays.some((relay) => relay.url === normalized)) {
      toast({
        title: 'Relay already exists',
        description: 'This relay is already in your list.',
        variant: 'destructive',
      });
      return;
    }

    setNewRelayUrl('');
    saveRelays([...relays, { url: normalized, read: true, write: true }]);
  };

  const handleRemoveRelay = (url: string) => {
    saveRelays(relays.filter((relay) => relay.url !== url));
  };

  const handleToggleRead = (url: string) => {
    saveRelays(relays.map((relay) => (relay.url === url ? { ...relay, read: !relay.read } : relay)));
  };

  const handleToggleWrite = (url: string) => {
    saveRelays(relays.map((relay) => (relay.url === url ? { ...relay, write: !relay.write } : relay)));
  };

  const saveRelays = (editable: RelayEntry[]) => {
    // Relays switched off in both directions stay in the list (so they can be
    // switched back on) but are dropped from the published NIP-65 event.
    const nextRelays = [GAMESTR_RELAY, ...editable];
    const now = Math.floor(Date.now() / 1000);

    setRelays(editable);

    updateConfig((current) => ({
      ...current,
      relayMetadata: {
        relays: nextRelays,
        updatedAt: now,
        pubkey: user?.pubkey,
      },
    }));

    if (user) {
      publishRelayList(nextRelays);
    }
  };

  const publishRelayList = (list: RelayEntry[]) => {
    publishEvent(
      {
        kind: 10002,
        content: '',
        tags: relayListTags(list),
      },
      {
        onSuccess: () => {
          toast({
            title: 'Relay list published',
            description: 'Your relay list has been published to Nostr.',
          });
        },
        onError: (error) => {
          console.error('Failed to publish relay list:', error);
          toast({
            title: 'Failed to publish relay list',
            description: 'There was an error publishing your relay list to Nostr.',
            variant: 'destructive',
          });
        },
      },
    );
  };

  const renderRelayUrl = (url: string): string => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'wss:') {
        return parsed.pathname === '/' ? parsed.host : parsed.host + parsed.pathname;
      }
      return parsed.href;
    } catch {
      return url;
    }
  };

  return (
    <div className="space-y-4">
      {/* Relay list */}
      <div className="space-y-2">
        {/* Pinned Gamestr relay */}
        <div className="flex items-center gap-3 rounded-md border border-dashed bg-muted/10 p-3">
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate font-mono text-sm" title={GAMESTR_RELAY_URL}>
            {renderRelayUrl(GAMESTR_RELAY_URL)}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">Always connected</span>
        </div>

        {relays.map((relay) => (
          <div
            key={relay.url}
            className="flex items-center gap-3 rounded-md border bg-muted/20 p-3"
          >
            <Wifi className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate font-mono text-sm" title={relay.url}>
              {renderRelayUrl(relay.url)}
            </span>

            {/* Read/write settings */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5 shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label={`Settings for ${renderRelayUrl(relay.url)}`}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`read-${relay.url}`} className="cursor-pointer text-sm">
                      Read
                    </Label>
                    <Switch
                      id={`read-${relay.url}`}
                      checked={relay.read}
                      onCheckedChange={() => handleToggleRead(relay.url)}
                      className="scale-75 data-[state=checked]:bg-green-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`write-${relay.url}`} className="cursor-pointer text-sm">
                      Write
                    </Label>
                    <Switch
                      id={`write-${relay.url}`}
                      checked={relay.write}
                      onCheckedChange={() => handleToggleWrite(relay.url)}
                      className="scale-75 data-[state=checked]:bg-blue-500"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveRelay(relay.url)}
              className="size-5 shrink-0 text-muted-foreground hover:bg-transparent hover:text-destructive"
              aria-label={`Remove ${renderRelayUrl(relay.url)}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {relays.length === 0 && (
          <p className="px-1 text-sm text-muted-foreground">
            No relays of your own yet. Gamestr is still connected.
          </p>
        )}
      </div>

      {/* Add relay */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="new-relay-url" className="sr-only">
            Relay URL
          </Label>
          <Input
            id="new-relay-url"
            placeholder="Enter relay URL (e.g. wss://relay.example.com)"
            value={newRelayUrl}
            onChange={(e) => setNewRelayUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddRelay();
              }
            }}
          />
        </div>
        <Button
          onClick={handleAddRelay}
          disabled={!newRelayUrl.trim()}
          variant="outline"
          size="sm"
          className="h-10 shrink-0"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Relay
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {user
          ? 'Saved to Nostr as your NIP-65 relay list.'
          : 'Log in to publish this list to Nostr.'}
      </p>
    </div>
  );
}
