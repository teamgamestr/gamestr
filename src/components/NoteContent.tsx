import { useMemo } from 'react';
import { type NostrEvent } from '@nostrify/nostrify';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface NoteContentProps {
  event: NostrEvent;
  className?: string;
}

/** Check if a URL is an image */
function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
         lowerUrl.includes('image') ||
         lowerUrl.includes('i.nostr.build') ||
         lowerUrl.includes('nostr.build') ||
         lowerUrl.includes('void.cat');
}

/** Parses content of text note events so that URLs and hashtags are linkified, and images are displayed. */
export function NoteContent({
  event, 
  className, 
}: NoteContentProps) {  
  // Process the content to render mentions, links, images, etc.
  const content = useMemo(() => {
    const text = event.content;
    
    // Regex to find URLs, Nostr references (with or without nostr: prefix), and hashtags
    const regex = /(https?:\/\/[^\s]+)|(?:nostr:)?(npub1|note1|nprofile1|nevent1|naddr1)([023456789acdefghjklmnpqrstuvwxyz]{58,})|(\bnote:[a-f0-9]{64}\b)|(#\w+)/g;
    
    const parts: React.ReactNode[] = [];
    const images: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyCounter = 0;
    
    while ((match = regex.exec(text)) !== null) {
      const [fullMatch, url, nostrPrefix, nostrData, noteHex, hashtag] = match;
      const index = match.index;
      
      // Add text before this match
      if (index > lastIndex) {
        parts.push(text.substring(lastIndex, index));
      }
      
      if (url) {
        // Check if URL is an image
        if (isImageUrl(url)) {
          images.push(url);
          // Don't add to parts, we'll render images separately at the end
        } else {
          // Handle regular URLs
          parts.push(
            <a 
              key={`url-${keyCounter++}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline break-all"
            >
              {url}
            </a>
          );
        }
      } else if (noteHex) {
        // Handle note:hexid format - embed the note
        const eventId = noteHex.replace('note:', '');
        try {
          parts.push(
            <EmbeddedNote key={`notehex-${keyCounter++}`} eventId={eventId} />
          );
        } catch {
          parts.push(fullMatch);
        }
      } else if (nostrPrefix && nostrData) {
        // Handle Nostr references
        try {
          const nostrId = `${nostrPrefix}${nostrData}`;
          const decoded = nip19.decode(nostrId);
          
          if (decoded.type === 'npub') {
            const pubkey = decoded.data;
            parts.push(
              <NostrMention key={`mention-${keyCounter++}`} pubkey={pubkey} />
            );
          } else if (decoded.type === 'nprofile') {
            const pubkey = (decoded.data as any).pubkey;
            parts.push(
              <NostrMention key={`mention-${keyCounter++}`} pubkey={pubkey} />
            );
          } else if (decoded.type === 'note') {
            const eventId = decoded.data as string;
            parts.push(
              <EmbeddedNote key={`note-${keyCounter++}`} eventId={eventId} />
            );
          } else if (decoded.type === 'nevent') {
            const eventId = (decoded.data as any).id;
            parts.push(
              <EmbeddedNote key={`nevent-${keyCounter++}`} eventId={eventId} />
            );
          } else if (decoded.type === 'naddr') {
            const addrData = decoded.data as any;
            const identifier = addrData.identifier || 'unknown';
            parts.push(
              <Link 
                key={`naddr-${keyCounter++}`}
                to={`/${nostrId}`}
                className="text-blue-500 hover:underline"
              >
                article:{identifier.substring(0, 16)}...
              </Link>
            );
          } else {
            // For any other types, just show as a link
            parts.push(
              <Link 
                key={`nostr-${keyCounter++}`}
                to={`/${nostrId}`}
                className="text-blue-500 hover:underline"
              >
                {fullMatch}
              </Link>
            );
          }
        } catch {
          // If decoding fails, just render as text
          parts.push(fullMatch);
        }
      } else if (hashtag) {
        // Handle hashtags
        const tag = hashtag.slice(1); // Remove the #
        parts.push(
          <Link 
            key={`hashtag-${keyCounter++}`}
            to={`/t/${tag}`}
            className="text-blue-500 hover:underline"
          >
            {hashtag}
          </Link>
        );
      }
      
      lastIndex = index + fullMatch.length;
    }
    
    // Add any remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    // If no special content was found, just use the plain text
    if (parts.length === 0) {
      parts.push(text);
    }
    
    return { textParts: parts, images };
  }, [event]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Text content */}
      <div className="whitespace-pre-wrap break-words">
        {content.textParts.length > 0 ? content.textParts : event.content}
      </div>
      
      {/* Images */}
      {content.images.length > 0 && (
        <div className="space-y-2">
          {content.images.map((imageUrl, index) => (
            <a
              key={`img-${index}`}
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={imageUrl}
                alt={`Image ${index + 1}`}
                className="max-w-full h-auto rounded-lg border border-border hover:opacity-90 transition-opacity"
                loading="lazy"
                onError={(e) => {
                  // If image fails to load, hide it
                  e.currentTarget.style.display = 'none';
                }}
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper component to embed a note
function EmbeddedNote({ eventId }: { eventId: string }) {
  const { nostr } = useNostr();

  const { data: event, isLoading } = useQuery({
    queryKey: ['embedded-note', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query([{ ids: [eventId] }], { signal });
      return events[0];
    },
  });

  const author = useAuthor(event?.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(event?.pubkey || '');

  if (isLoading) {
    return (
      <Card className="my-2 border-l-4 border-l-primary">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!event) {
    return (
      <Card className="my-2 border-l-4 border-l-muted">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Note not found</p>
        </CardContent>
      </Card>
    );
  }

  const note1 = nip19.noteEncode(eventId);

  return (
    <Link to={`/${note1}`} className="block my-2">
      <Card className="border-l-4 border-l-primary hover:bg-muted/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback className="text-xs">
                {displayName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(event.created_at * 1000, { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="text-sm line-clamp-3 text-muted-foreground">
            {event.content}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Helper component to display user mentions
function NostrMention({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const npub = nip19.npubEncode(pubkey);
  const hasRealName = !!author.data?.metadata?.name;
  const displayName = author.data?.metadata?.name ?? genUserName(pubkey);

  return (
    <Link 
      to={`/${npub}`}
      className={cn(
        "font-medium hover:underline",
        hasRealName 
          ? "text-blue-500" 
          : "text-gray-500 hover:text-gray-700"
      )}
    >
      @{displayName}
    </Link>
  );
}