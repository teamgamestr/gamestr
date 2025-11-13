import { nip19 } from 'nostr-tools';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useAuthor } from '@/hooks/useAuthor';
import { ZapButton } from '@/components/ZapButton';
import { NoteContent } from '@/components/NoteContent';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Calendar, MessageSquare } from 'lucide-react';
import { genUserName } from '@/lib/genUserName';
import { formatDistanceToNow } from 'date-fns';
import type { NostrEvent } from '@nostrify/nostrify';
import type { Event } from 'nostr-tools';
import NotFound from './NotFound';

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
                  to={`/${nip19.npubEncode(event.pubkey)}`}
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
                  to={`/${nip19.npubEncode(event.pubkey)}`}
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

function ProfileView({ pubkey }: { pubkey: string }) {
  const { nostr } = useNostr();
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);

  // Fetch recent kind 1 notes
  const { data: notes, isLoading: notesLoading } = useQuery({
    queryKey: ['notes', pubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [{ kinds: [1], authors: [pubkey], limit: 20 }],
        { signal }
      );
      return events.sort((a, b) => b.created_at - a.created_at);
    },
  });

  if (author.isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-10 w-32 mb-6" />
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardHeader>
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
            Back to Games
          </Link>
        </Button>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              {/* Avatar */}
              <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                <AvatarImage src={metadata?.picture} alt={displayName} />
                <AvatarFallback className="text-3xl">
                  {displayName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Profile Info */}
              <div className="flex-1 space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold">{displayName}</h1>
                {metadata?.about && (
                  <p className="text-muted-foreground">{metadata.about}</p>
                )}
                <div className="flex flex-wrap gap-3 items-center text-sm text-muted-foreground">
                  {metadata?.nip05 && (
                    <div className="flex items-center gap-1">
                      <ExternalLink className="h-4 w-4" />
                      {metadata.nip05}
                    </div>
                  )}
                  {metadata?.website && (
                    <a 
                      href={metadata.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Website
                    </a>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {author.data?.event && (
                  <div className="cursor-pointer">
                    <ZapButton 
                      target={author.data.event as unknown as Event}
                      showCount={true}
                      className="h-10 px-4 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Recent Notes Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Recent Notes
          </h2>

          {notesLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : notes && notes.length > 0 ? (
            <div className="space-y-4">
              {notes.map((note) => (
                <Card key={note.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDistanceToNow(note.created_at * 1000, { addSuffix: true })}
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <NoteContent event={note} className="text-sm" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No notes found</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();

  if (!identifier) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  const { type, data } = decoded;

  switch (type) {
    case 'npub':
      return <ProfileView pubkey={data as string} />;

    case 'nprofile':
      return <ProfileView pubkey={(data as any).pubkey} />;

    case 'note':
      return <EventView eventId={data as string} />;

    case 'nevent':
      return <EventView eventId={(data as any).id} />;

    case 'naddr':
      const addrData = data as any;
      return <AddressableEventView 
        kind={addrData.kind} 
        pubkey={addrData.pubkey} 
        identifier={addrData.identifier} 
      />;

    default:
      return <NotFound />;
  }
} 