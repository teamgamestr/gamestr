import { nip19 } from 'nostr-tools';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useAuthor } from '@/hooks/useAuthor';
import { ZapButton } from '@/components/ZapButton';
import { NoteContent } from '@/components/NoteContent';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { genUserName } from '@/lib/genUserName';
import { formatDistanceToNow } from 'date-fns';
import type { Event } from 'nostr-tools';
import NotFound from './NotFound';
import { playerPath } from '@/lib/nostrLinks';
import { PlayerProfile } from './PlayerProfile';

type NProfilePointer = { pubkey: string };
type NEventPointer = { id: string };
type NAddrPointer = { kind: number; pubkey: string; identifier: string };

function AddressableEventView({ kind, pubkey, identifier }: { kind: number; pubkey: string; identifier: string }) {
  const { nostr } = useNostr();

  // Fetch the addressable event
  const { data: event, isLoading } = useQuery({
    queryKey: ['naddr', kind, pubkey, identifier],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [{ kinds: [kind], authors: [pubkey], '#d': [identifier] }],
        { signal }
      );
      return events[0];
    },
  });

  const author = useAuthor(event?.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(event?.pubkey || '');

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-10 w-32 mb-6" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">Event not found</p>
            <Button asChild>
              <Link to="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Extract title from tags if available
  const title = event.tags.find(([name]) => name === 'title')?.[1];
  const summary = event.tags.find(([name]) => name === 'summary')?.[1];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        {/* Event Card */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Title */}
              {title && (
                <h1 className="text-3xl font-bold">{title}</h1>
              )}

              {/* Summary */}
              {summary && (
                <p className="text-lg text-muted-foreground">{summary}</p>
              )}

              {/* Author Info */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Link 
                  to={playerPath(event.pubkey)}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={metadata?.picture} alt={displayName} />
                    <AvatarFallback>
                      {displayName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(event.created_at * 1000, { addSuffix: true })}
                    </p>
                  </div>
                </Link>

                {/* Zap Button */}
                {author.data?.event && (
                  <div className="cursor-pointer">
                    <ZapButton 
                      target={event as unknown as Event}
                      showCount={true}
                      className="h-10 px-4 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Event Content */}
              <div className="prose prose-sm dark:prose-invert max-w-none pt-4">
                <NoteContent event={event} className="text-base" />
              </div>

              {/* Event Metadata */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Badge variant="outline">Kind {event.kind}</Badge>
                <Badge variant="outline">
                  {identifier}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  {event.id.substring(0, 8)}...
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EventView({ eventId }: { eventId: string }) {
  const { nostr } = useNostr();

  // Fetch the event
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [{ ids: [eventId] }],
        { signal }
      );
      return events[0];
    },
  });

  const author = useAuthor(event?.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(event?.pubkey || '');

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-10 w-32 mb-6" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-4">Event not found</p>
            <Button asChild>
              <Link to="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        {/* Event Card */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Author Info */}
              <div className="flex items-center justify-between">
                <Link 
                  to={playerPath(event.pubkey)}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={metadata?.picture} alt={displayName} />
                    <AvatarFallback>
                      {displayName[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{displayName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(event.created_at * 1000, { addSuffix: true })}
                    </p>
                  </div>
                </Link>

                {/* Zap Button */}
                {author.data?.event && (
                  <div className="cursor-pointer">
                    <ZapButton 
                      target={event as unknown as Event}
                      showCount={true}
                      className="h-10 px-4 text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Event Content */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <NoteContent event={event} className="text-base" />
              </div>

              {/* Event Metadata */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Badge variant="outline">Kind {event.kind}</Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  {event.id.substring(0, 8)}...
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function NIP19Page() {
  const { slug: identifier } = useParams<{ slug: string }>();

  if (!identifier) {
    return <NotFound />;
  }

  // Validate that the identifier looks like a NIP-19 identifier before attempting to decode.
  // NIP-19 bech32 is case-insensitive, so accept the all-uppercase form too; nip19.decode
  // normalises the case itself.
  const validPrefixes = ['npub1', 'nprofile1', 'note1', 'nevent1', 'naddr1'];
  const lowerIdentifier = identifier.toLowerCase();
  const hasValidPrefix = validPrefixes.some(prefix => lowerIdentifier.startsWith(prefix));
  
  if (!hasValidPrefix) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch (error) {
    console.error('Failed to decode NIP-19 identifier:', error);
    return <NotFound />;
  }

  const { type, data } = decoded;

  switch (type) {
    case 'npub':
      // The player view carries scores and notes; the old ProfileView showed a
      // card and notes only, so an npub link was a lesser page than a /player/
      // one. Both forms now render the same component.
      return <PlayerProfile pubkey={data as string} />;

    case 'nprofile':
      return <PlayerProfile pubkey={(data as NProfilePointer).pubkey} />;

    case 'note':
      return <EventView eventId={data as string} />;

    case 'nevent':
      return <EventView eventId={(data as NEventPointer).id} />;

    case 'naddr': {
      const addrData = data as NAddrPointer;
      return <AddressableEventView 
        kind={addrData.kind} 
        pubkey={addrData.pubkey} 
        identifier={addrData.identifier} 
      />;
    }

    default:
      return <NotFound />;
  }
} 
