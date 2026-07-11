import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNIP05Names } from '@/hooks/useNIP05';
import { useAuthor } from '@/hooks/useAuthor';
import { buildNIP05Identifier } from '@/lib/nip05';
import { genUserName } from '@/lib/genUserName';
import { Skeleton } from '@/components/ui/skeleton';

function DirectoryItem({ name, pubkey }: { name: string; pubkey: string }) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);

  return (
    <Link
      to={`/player/${pubkey}`}
      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={metadata?.picture} alt={displayName} />
          <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="absolute -top-1 -right-1 bg-yellow-500 text-yellow-950 rounded-full p-0.5">
          <Crown className="h-3 w-3" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{buildNIP05Identifier(name)}</div>
        <div className="text-sm text-muted-foreground truncate">{displayName}</div>
      </div>
    </Link>
  );
}

export function NIP05Directory() {
  const { data, isLoading } = useNIP05Names();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          gamestr.me holders
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : data?.names.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.names.map((entry) => (
              <DirectoryItem key={entry.name} name={entry.name} pubkey={entry.pubkey} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No gamestr.me names claimed yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
