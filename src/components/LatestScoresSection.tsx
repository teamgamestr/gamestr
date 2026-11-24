import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Activity, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

import { useAuthor } from '@/hooks/useAuthor';
import { type ParsedScore } from '@/hooks/useScores';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FALLBACK_GAME_METADATA, formatScoreValue, getScoreDisplayPrefs, resolveGameByIdentifier, type GameConfigMap, type GameMetadata } from '@/lib/gameConfig';
import { genUserName } from '@/lib/genUserName';
import { encodeNevent } from '@/lib/nostrLinks';
import { planScoreStripMotion, type StripCardPosition } from '@/lib/scoreStripMotion';

/** How long the older cards take to glide to their new slot. */
const PUSH_DURATION_MS = 420;
/** How long a brand new card takes to slide in from the left. */
const ENTER_DURATION_MS = 320;
const PUSH_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface LatestScoresSectionProps {
  scores: ParsedScore[];
  gameConfig: GameConfigMap;
  hasMoreScores: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

export function LatestScoresSection({ scores, gameConfig, hasMoreScores, isLoading, onLoadMore }: LatestScoresSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollOffsetRef = useRef(0);
  const cardOffsetsRef = useRef<Map<string, number>>(new Map());
  const animationsRef = useRef<Map<HTMLElement, Animation>>(new Map());
  const snapTimerRef = useRef<number>();
  const snapStateRef = useRef<{ paused: boolean; previous: string }>({ paused: false, previous: '' });

  useEffect(() => {
    const row = scrollRef.current;
    if (!row) return;

    const updateScrollState = () => {
      scrollOffsetRef.current = row.scrollLeft;
      setCanScrollLeft(row.scrollLeft > 0);
      setCanScrollRight(hasMoreScores || row.scrollLeft + row.clientWidth < row.scrollWidth - 1);
    };

    updateScrollState();
    row.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      row.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [hasMoreScores, isLoading, scores.length]);

  useEffect(() => {
    const animations = animationsRef.current;

    return () => {
      window.clearTimeout(snapTimerRef.current);
      for (const animation of animations.values()) animation.cancel();
      animations.clear();
    };
  }, []);

  // New scores are prepended to a row with snap points, and the browser moves
  // the scroll offset along with them: without this the older cards look
  // pinned in place while the new card is silently slotted in off-screen.
  // Hold the offset where it was so the new card lands at the left edge and
  // pushes the older ones to the right, then animate that push.
  useLayoutEffect(() => {
    const row = scrollRef.current;
    if (!row || isLoading) return;

    const cards = Array.from(row.querySelectorAll<HTMLElement>('[data-score-id]'));
    if (cards.length === 0) {
      cardOffsetsRef.current = new Map();
      return;
    }

    const current: StripCardPosition[] = cards.map((card) => ({
      id: card.dataset.scoreId ?? '',
      offset: card.offsetLeft,
    }));
    const { moved, entering } = planScoreStripMotion(cardOffsetsRef.current, current);
    const hadCards = cardOffsetsRef.current.size > 0;

    if (entering.length > 0) {
      // `instant` overrides the row's scroll-smooth, and writing the offset
      // even when it looks unchanged is what stops the snap engine from
      // advancing it behind our back.
      if (typeof row.scrollTo === 'function') {
        row.scrollTo({ left: scrollOffsetRef.current, behavior: 'instant' });
      } else {
        row.scrollLeft = scrollOffsetRef.current;
      }
      scrollOffsetRef.current = row.scrollLeft;
    }

    if (hadCards && !prefersReducedMotion()) {
      const byId = new Map(cards.map((card) => [card.dataset.scoreId ?? '', card]));
      const gap = cards.length > 1
        ? Math.max(0, cards[1].offsetLeft - cards[0].offsetLeft - cards[0].offsetWidth)
        : 0;
      const enterFrom = -(cards[0].offsetWidth + gap);

      // Snap areas follow a transformed card, so a running push would make
      // the browser re-snap and cancel the movement. Hold snapping off until
      // the cards have finished gliding into their layout slots.
      if (entering.length > 0) {
        if (!snapStateRef.current.paused) {
          snapStateRef.current = { paused: true, previous: row.style.scrollSnapType };
        }

        row.style.scrollSnapType = 'none';
        window.clearTimeout(snapTimerRef.current);
        snapTimerRef.current = window.setTimeout(() => {
          row.style.scrollSnapType = snapStateRef.current.previous;
          snapStateRef.current = { paused: false, previous: '' };
        }, PUSH_DURATION_MS + 60);
      }

      const run = (card: HTMLElement, keyframes: Keyframe[], duration: number) => {
        if (typeof card.animate !== 'function') return;

        animationsRef.current.get(card)?.cancel();
        const animation = card.animate(keyframes, { duration, easing: PUSH_EASING });
        animationsRef.current.set(card, animation);
        animation.finished.catch(() => undefined).then(() => {
          if (animationsRef.current.get(card) === animation) animationsRef.current.delete(card);
        });
      };

      for (const { id, dx } of moved) {
        const card = byId.get(id);
        if (card) run(card, [{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0px)' }], PUSH_DURATION_MS);
      }

      for (const id of entering) {
        const card = byId.get(id);
        if (!card) continue;

        run(card, [
          { transform: `translateX(${enterFrom}px)`, opacity: 0 },
          { transform: 'translateX(0px)', opacity: 1 },
        ], ENTER_DURATION_MS);
      }
    }

    cardOffsetsRef.current = new Map(current.map((card) => [card.id, card.offset]));
  }, [scores, isLoading]);

  const scrollScores = (direction: 'left' | 'right') => {
    const row = scrollRef.current;
    if (!row) return;

    const isAtEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 1;
    if (direction === 'right' && isAtEnd && hasMoreScores) {
      onLoadMore();
      window.requestAnimationFrame(() => {
        row.scrollBy({ left: row.clientWidth * 0.85, behavior: 'smooth' });
      });
      return;
    }

    row.scrollBy({
      left: direction === 'left' ? -row.clientWidth * 0.85 : row.clientWidth * 0.85,
      behavior: 'smooth',
    });
  };

  return (
    <section className="relative overflow-visible rounded-3xl border bg-card/80 p-5 shadow-lg shadow-primary/5 sm:p-6">
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_30%)]" />
      </div>
      <div className="relative space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="outline" className="mb-2 gap-1 border-primary/30 bg-primary/10 text-primary">
              <Activity className="h-3 w-3" />
              Live feed
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Latest Scores</h2>
            <p className="text-sm text-muted-foreground">Fresh runs arriving from Nostr leaderboards.</p>
          </div>
          <Button variant="outline" size="sm" asChild className="w-fit gap-2 rounded-full bg-background/70">
            <Link to="/scores">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading || scores.length > 0 ? (
          <div className="relative py-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Scroll latest scores left"
              disabled={!canScrollLeft}
              onClick={() => scrollScores('left')}
              className="absolute left-0 top-1/2 z-10 h-10 w-10 -translate-x-3 -translate-y-1/2 rounded-full border bg-background/90 shadow-lg backdrop-blur transition-opacity disabled:opacity-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div
              ref={scrollRef}
              className="-my-4 flex gap-3 overflow-x-auto py-4 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {isLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <Card key={index} className="min-w-[240px] flex-1 snap-start bg-background/70 md:min-w-[280px]">
                      <CardHeader className="space-y-3 pb-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-5 w-3/4" />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-4 w-full" />
                      </CardContent>
                    </Card>
                  ))
                : scores.map((score) => (
                    <LatestScoreCard key={score.event.id} score={score} gameConfig={gameConfig} />
                  ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Scroll latest scores right"
              disabled={!canScrollRight}
              onClick={() => scrollScores('right')}
              className="absolute right-0 top-1/2 z-10 h-10 w-10 translate-x-3 -translate-y-1/2 rounded-full border bg-background/90 shadow-lg backdrop-blur transition-opacity disabled:opacity-0"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Card className="border-dashed bg-background/70">
            <CardContent className="py-8 text-center text-muted-foreground">
              No recent scores found. Try another relay or check back soon.
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}

interface LatestScoreCardProps {
  score: ParsedScore;
  gameConfig: GameConfigMap;
}

function LatestScoreCard({ score, gameConfig }: LatestScoreCardProps) {
  const author = useAuthor(score.playerPubkey);
  const metadata = author.data?.metadata;
  const playerName = metadata?.name || metadata?.display_name || genUserName(score.playerPubkey);
  const resolvedGame = resolveGameByIdentifier(score.gameIdentifier, gameConfig);
  const gameMetadata: GameMetadata = resolvedGame?.metadata || FALLBACK_GAME_METADATA;
  const scorePrefs = getScoreDisplayPrefs(gameMetadata);

  return (
    <Link data-score-id={score.event.id} to={`/${score.gameIdentifier}/score/${encodeNevent(score.event.id)}`} className="group block min-w-[240px] flex-1 snap-start rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:min-w-[280px]">
      <Card className="h-full overflow-hidden bg-background/75 transition-all group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-xl group-hover:shadow-primary/10">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src={metadata?.picture} alt={playerName} />
              <AvatarFallback>{playerName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <Badge variant="secondary" className="max-w-36 rounded-full px-3 py-1 text-xs font-semibold">
              <span className="truncate">{gameMetadata.name}</span>
            </Badge>
          </div>
          <CardTitle className="line-clamp-1 text-base">{playerName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-3xl font-black tracking-tight text-primary">{formatScoreValue(score.score, scorePrefs)}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(score.event.created_at * 1000, { addSuffix: true })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
