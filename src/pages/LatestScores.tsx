import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { MessageCircle, Heart, Gamepad2, SmilePlus } from 'lucide-react';
import { NKinds, type NostrEvent } from '@nostrify/nostrify';

import { useLatestScores, type ParsedScore } from '@/hooks/useScores';
import { useGameConfig } from '@/hooks/useGameConfig';
import { useAuthor } from '@/hooks/useAuthor';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { FALLBACK_GAME_METADATA, formatScoreValue, getScoreDisplayPrefs, resolveGameByIdentifier, type GameConfigMap, type GameMetadata } from '@/lib/gameConfig';
import { genUserName } from '@/lib/genUserName';

const LATEST_SCORES_PAGE_LIMIT = 500;
const SCORES_PER_PAGE = 25;
const SCORE_REACTION_EMOJIS = ['❤️', '🔥', '🎉', '💪', '👑', '⚡', '💩', '🎮'];
const COUNT_QUERY_CHUNK_SIZE = 25;

export function LatestScores() {
  const { config } = useGameConfig();
  const { data: scores, isLoading } = useLatestScores({ limit: LATEST_SCORES_PAGE_LIMIT });
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const gameFilters = useMemo(() => {
    const games = new Map<string, { name: string; count: number }>();

    for (const score of scores ?? []) {
      const metadata = resolveGameByIdentifier(score.gameIdentifier, config)?.metadata || FALLBACK_GAME_METADATA;
      const existing = games.get(score.gameIdentifier);
      games.set(score.gameIdentifier, {
        name: metadata.name,
        count: (existing?.count ?? 0) + 1,
      });
    }

    return Array.from(games.entries())
      .map(([gameIdentifier, data]) => ({ gameIdentifier, ...data }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [config, scores]);

  const filteredScores = useMemo(() => {
    if (!selectedGame) return scores ?? [];
    return (scores ?? []).filter(score => score.gameIdentifier === selectedGame);
  }, [scores, selectedGame]);
  const totalPages = Math.max(1, Math.ceil(filteredScores.length / SCORES_PER_PAGE));
  const paginatedScores = useMemo(() => {
    const start = (page - 1) * SCORES_PER_PAGE;
    return filteredScores.slice(start, start + SCORES_PER_PAGE);
  }, [filteredScores, page]);
  const { data: commentCounts } = useScoreCommentCounts(paginatedScores);
  const { data: reactionCounts } = useScoreReactionCounts(paginatedScores);

  useEffect(() => {
    setPage(1);
  }, [selectedGame]);

  useEffect(() => {
    setPage(current => Math.min(current, totalPages));
  }, [totalPages]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Latest Scores</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Every recent run ordered newest first, with quick Nostr reactions and comments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedGame === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedGame(null)}
            className="shrink-0 gap-2 rounded-full"
          >
            <Gamepad2 className="h-4 w-4" />
            All games
          </Button>
          {gameFilters.map(game => (
            <Button
              key={game.gameIdentifier}
              variant={selectedGame === game.gameIdentifier ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedGame(game.gameIdentifier)}
              className="shrink-0 rounded-full"
            >
              {game.name}
              <span className="ml-1 text-xs opacity-70">{game.count}</span>
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-72 max-w-full" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredScores.length > 0 ? (
          <div className="space-y-3">
            {paginatedScores.map(score => (
              <LatestScoreRow
                key={score.event.id}
                score={score}
                gameConfig={config}
                commentCount={commentCounts?.get(score.event.id) ?? 0}
                reactionCount={reactionCounts?.get(score.event.id) ?? 0}
              />
            ))}
            <ScoresPagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              No scores found for this game yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

interface ScoresPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function ScoresPagination({ page, totalPages, onPageChange }: ScoresPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-3 pt-4 sm:flex-row">
      <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

interface LatestScoreRowProps {
  score: ParsedScore;
  gameConfig: GameConfigMap;
  commentCount: number;
  reactionCount: number;
}

function LatestScoreRow({ score, gameConfig, commentCount, reactionCount }: LatestScoreRowProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const queryClient = useQueryClient();
  const author = useAuthor(score.playerPubkey);
  const metadata = author.data?.metadata;
  const playerName = metadata?.name || metadata?.display_name || genUserName(score.playerPubkey);
  const resolvedGame = resolveGameByIdentifier(score.gameIdentifier, gameConfig);
  const gameMetadata: GameMetadata = resolvedGame?.metadata || FALLBACK_GAME_METADATA;
  const scorePrefs = getScoreDisplayPrefs(gameMetadata);

  return (
    <Card className="overflow-hidden bg-card/80 transition-colors hover:border-primary/40">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link to={`/${score.gameIdentifier}/score/${score.event.id}`} className="group flex min-w-0 items-center gap-4">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
              <AvatarImage src={metadata?.picture} alt={playerName} />
              <AvatarFallback>{playerName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="line-clamp-1 text-lg group-hover:text-primary">{playerName}</CardTitle>
              <p className="line-clamp-1 text-sm text-muted-foreground">
                {gameMetadata.name} · {formatDistanceToNow(score.event.created_at * 1000, { addSuffix: true })}
              </p>
            </div>
          </Link>
          <div className="flex items-center justify-between gap-3 md:justify-end">
            <div className="text-left md:text-right">
              <p className="text-3xl font-black text-primary">{formatScoreValue(score.score, scorePrefs)}</p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Score</p>
            </div>
            <QuickScoreActions
              scoreEvent={score.event}
              commentCount={commentCount}
              reactionCount={reactionCount}
              onComment={() => setCommentsOpen(open => !open)}
            />
          </div>
        </div>
      </CardHeader>
      {commentsOpen && (
        <CardContent className="border-t bg-muted/20 pt-4">
          <ScoreReactionsStrip scoreEvent={score.event} />
          <CommentsSection
            root={score.event}
            title="Discussion"
            className="border-0 bg-transparent shadow-none"
            onCommentSuccess={() => queryClient.invalidateQueries({ queryKey: ['latest-score-comment-counts'] })}
          />
        </CardContent>
      )}
    </Card>
  );
}

function ScoreReactionsStrip({ scoreEvent }: { scoreEvent: NostrEvent }) {
  const { data: reactions, isLoading } = useScoreReactions(scoreEvent);

  if (isLoading) {
    return (
      <div className="mb-4 rounded-2xl border bg-background/70 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    );
  }

  if (!reactions || reactions.length === 0) {
    return (
      <div className="mb-4 rounded-2xl border border-dashed bg-background/70 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <SmilePlus className="h-4 w-4" />
          No reactions yet.
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border bg-background/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SmilePlus className="h-4 w-4 text-primary" />
          Reactions
        </div>
        <Badge variant="secondary">{reactions.length}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {reactions.map(reaction => (
          <ReactionPill key={reaction.id} reaction={reaction} />
        ))}
      </div>
    </div>
  );
}

function ReactionPill({ reaction }: { reaction: NostrEvent }) {
  const author = useAuthor(reaction.pubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || metadata?.display_name || genUserName(reaction.pubkey);
  const emoji = reaction.content || '❤️';

  return (
    <div className="flex items-center gap-2 rounded-full border bg-card px-2 py-1 text-sm shadow-sm">
      <span className="text-base" aria-hidden="true">{emoji}</span>
      <Avatar className="h-6 w-6">
        <AvatarImage src={metadata?.picture} alt={displayName} />
        <AvatarFallback className="text-[10px]">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="max-w-28 truncate text-muted-foreground">{displayName}</span>
    </div>
  );
}

interface QuickScoreActionsProps {
  scoreEvent: NostrEvent;
  commentCount: number;
  reactionCount: number;
  onComment: () => void;
}

function QuickScoreActions({ scoreEvent, commentCount, reactionCount, onComment }: QuickScoreActionsProps) {
  const [emojiDialogOpen, setEmojiDialogOpen] = useState(false);
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const publishReaction = async (content: string) => {
    if (!user) {
      toast({ title: 'Log in first', description: 'You need to be logged in to react.', variant: 'destructive' });
      return;
    }

    try {
      await publishEvent({
        kind: 7,
        content,
        tags: [
          ['e', scoreEvent.id],
          ['p', scoreEvent.pubkey],
          ['k', scoreEvent.kind.toString()],
        ],
      });

      setEmojiDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['latest-score-reaction-counts'] });
      toast({ title: 'Reaction posted' });
    } catch {
      toast({ title: 'Reaction failed', description: 'Could not publish your reaction.', variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="flex shrink-0 items-center gap-1 rounded-full border bg-background/80 p-1">
        <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-full px-2" disabled={isPending} onClick={() => setEmojiDialogOpen(true)}>
          <Heart className="h-4 w-4" />
          <span className="min-w-4 text-xs tabular-nums">{reactionCount}</span>
        </Button>
        <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-full px-2" onClick={onComment}>
          <MessageCircle className="h-4 w-4" />
          <span className="min-w-4 text-xs tabular-nums">{commentCount}</span>
        </Button>
      </div>
      <Dialog open={emojiDialogOpen} onOpenChange={setEmojiDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Choose a reaction</DialogTitle>
            <DialogDescription>Publish a Nostr reaction to this score.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            {SCORE_REACTION_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => publishReaction(emoji)}
                className="h-14 text-2xl"
              >
                {emoji}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function useScoreCommentCounts(scores: ParsedScore[]) {
  const { nostr } = useNostr();
  const scoreIds = useMemo(() => scores.map(score => score.event.id), [scores]);
  const scoreReferences = useMemo(() => buildScoreCommentReferences(scores), [scores]);

  return useQuery({
    queryKey: ['latest-score-comment-counts', scoreIds, Array.from(scoreReferences.referenceToScoreId.keys())],
    queryFn: async (c) => {
      if (scoreIds.length === 0) return new Map<string, number>();

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(8000)]);
      const referenceSet = new Set(scoreReferences.referenceToScoreId.keys());
      const chunks = chunkValues(Array.from(referenceSet), COUNT_QUERY_CHUNK_SIZE);
      const commentGroups = await Promise.all(chunks.map(references => nostr.query([
          {
            kinds: [1111],
            '#E': references,
            limit: Math.min(Math.max(references.length * 20, 100), 1000),
          },
          {
            kinds: [1111],
            '#e': references,
            limit: Math.min(Math.max(references.length * 20, 100), 1000),
          },
          {
            kinds: [1111],
            '#A': references,
            limit: Math.min(Math.max(references.length * 20, 100), 1000),
          },
          {
            kinds: [1111],
            '#a': references,
            limit: Math.min(Math.max(references.length * 20, 100), 1000),
          },
        ], { signal })
      ));
      const comments = commentGroups.flat();

      const counts = new Map(scoreIds.map(id => [id, 0]));
      const countedCommentIds = new Set<string>();
      for (const comment of comments) {
        if (countedCommentIds.has(comment.id)) continue;

        const reference = comment.tags.find(([name, value]) => ['E', 'e', 'A', 'a'].includes(name) && referenceSet.has(value))?.[1];
        const rootId = reference ? scoreReferences.referenceToScoreId.get(reference) : undefined;

        if (rootId) {
          counts.set(rootId, (counts.get(rootId) ?? 0) + 1);
          countedCommentIds.add(comment.id);
        }
      }

      return counts;
    },
    enabled: scoreIds.length > 0,
    staleTime: 30_000,
  });
}

function buildScoreCommentReferences(scores: ParsedScore[]) {
  const referenceToScoreId = new Map<string, string>();

  for (const score of scores) {
    referenceToScoreId.set(score.event.id, score.event.id);

    if (NKinds.addressable(score.event.kind)) {
      const d = score.event.tags.find(([name]) => name === 'd')?.[1] ?? '';
      referenceToScoreId.set(`${score.event.kind}:${score.event.pubkey}:${d}`, score.event.id);
    } else if (NKinds.replaceable(score.event.kind)) {
      referenceToScoreId.set(`${score.event.kind}:${score.event.pubkey}:`, score.event.id);
    }
  }

  return { referenceToScoreId };
}

function useScoreReactionCounts(scores: ParsedScore[]) {
  const { nostr } = useNostr();
  const scoreIds = useMemo(() => scores.map(score => score.event.id), [scores]);

  return useQuery({
    queryKey: ['latest-score-reaction-counts', scoreIds],
    queryFn: async (c) => {
      if (scoreIds.length === 0) return new Map<string, number>();

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const idSet = new Set(scoreIds);
      const chunks = chunkValues(scoreIds, COUNT_QUERY_CHUNK_SIZE);
      const reactions = await nostr.query(chunks.map(ids => ({
        kinds: [7],
        '#e': ids,
        limit: Math.min(Math.max(ids.length * 20, 100), 1000),
      })), { signal });

      const counts = new Map(scoreIds.map(id => [id, 0]));
      const countedReactionIds = new Set<string>();
      for (const reaction of reactions) {
        if (countedReactionIds.has(reaction.id)) continue;

        const scoreId = reaction.tags.find(([name, value]) => name === 'e' && idSet.has(value))?.[1];
        if (scoreId) {
          counts.set(scoreId, (counts.get(scoreId) ?? 0) + 1);
          countedReactionIds.add(reaction.id);
        }
      }

      return counts;
    },
    enabled: scoreIds.length > 0,
    staleTime: 30_000,
  });
}

function useScoreReactions(scoreEvent: NostrEvent) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['score-reactions', scoreEvent.id],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      const reactions = await nostr.query([
        {
          kinds: [7],
          '#e': [scoreEvent.id],
          limit: 100,
        },
      ], { signal });

      const seen = new Set<string>();
      return reactions
        .filter(reaction => reaction.tags.some(([name, value]) => name === 'e' && value === scoreEvent.id))
        .filter(reaction => {
          if (seen.has(reaction.id)) return false;
          seen.add(reaction.id);
          return true;
        })
        .sort((a, b) => b.created_at - a.created_at);
    },
    staleTime: 30_000,
  });
}

function chunkValues<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export default LatestScores;
