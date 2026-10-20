import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';
import { useStagedRelayQuery } from '@/hooks/useStagedRelayQuery';
import { getAllKind5555Tags } from '@/lib/gameConfig';
import {
  buildGamesWithScores,
  buildLatestScores,
  buildTrendingGames,
  validateScoreEvent,
  type GameWithScores,
  type ParsedScore,
  type TrendingGame,
} from '@/hooks/useScores';

export interface HomeScoreFeed {
  /** One row per game, aggregated from the same events as the other views. */
  games: GameWithScores[];
  /** Every game's scores, newest first. Callers slice to what they show. */
  latest: ParsedScore[];
  /** Games ranked by the last seven days of activity. */
  trending: TrendingGame[];
}

const HOME_FEED_KEY = ['home-score-feed'] as const;
const TRENDING_WINDOW_SECS = 7 * 86400;
/** Cap on the live tail so a long-lived tab cannot grow it without bound. */
const LIVE_TAIL_LIMIT = 50;

function buildFeed(events: NostrEvent[], now = Math.floor(Date.now() / 1000)): HomeScoreFeed {
  const trendingSince = now - TRENDING_WINDOW_SECS;

  return {
    games: buildGamesWithScores(events),
    latest: buildLatestScores(events),
    trending: buildTrendingGames(events.filter((event) => event.created_at >= trendingSince)),
  };
}

/**
 * One score query for the whole home page.
 *
 * The home page used to ask for the game list, the latest scores and the
 * trending list as three separate subscriptions. The Gamestr relay serves a
 * connection's subscriptions one after another, so the third of them was still
 * queueing when the 3s timeout fired and the Latest Scores strip rendered
 * empty. All three views come from the same score events, so this asks once and
 * streams the answer into the cache every 50 events: the strip fills while the
 * rest of the page is still arriving.
 */
export function useHomeScoreFeed() {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();
  const stagedQuery = useStagedRelayQuery();

  const query = useQuery({
    queryKey: HOME_FEED_KEY,
    queryFn: async (c) => {
      const filters: NostrFilter[] = [{ kinds: [30762], limit: 1000 }];

      const kind5555Tags = getAllKind5555Tags();
      if (kind5555Tags.length > 0) {
        filters.push({ kinds: [5555], '#t': kind5555Tags, limit: 1000 });
      }

      const events = await stagedQuery(filters, {
        signal: c.signal,
        timeoutMs: 8000,
        onProgress: (partial) => {
          queryClient.setQueryData<HomeScoreFeed>(HOME_FEED_KEY, (prev) => {
            // Build the game grids once, from the first partial answer. After
            // that only the strip keeps growing: rebuilding the grid on every
            // tick slows message consumption enough to throttle the relay.
            if (!prev || prev.games.length === 0) {
              return buildFeed(partial);
            }

            return { ...prev, latest: buildLatestScores(partial) };
          });
        },
      });

      return buildFeed(events);
    },
  });

  // Live tail: new scores appear at the top without refetching the feed.
  useEffect(() => {
    const controller = new AbortController();
    const since = Math.floor(Date.now() / 1000) - 60;

    const filters: NostrFilter[] = [{ kinds: [30762], since }];
    const kind5555Tags = getAllKind5555Tags();
    if (kind5555Tags.length > 0) {
      filters.push({ kinds: [5555], '#t': kind5555Tags, since });
    }

    (async () => {
      try {
        for await (const msg of nostr.req(filters, { signal: controller.signal })) {
          if (msg[0] !== 'EVENT') continue;

          const score = validateScoreEvent(msg[2]);
          if (!score) continue;
          if (score.state === 'invalidated' || score.state === 'retired') continue;

          queryClient.setQueryData<HomeScoreFeed>(HOME_FEED_KEY, (prev) => {
            if (!prev) return prev;
            if (prev.latest.some((existing) => existing.event.id === score.event.id)) return prev;

            return {
              ...prev,
              latest: [score, ...prev.latest]
                .sort((a, b) => b.event.created_at - a.event.created_at)
                .slice(0, LIVE_TAIL_LIMIT),
            };
          });
        }
      } catch {
        // Subscription aborted or relay error: the query data remains.
      }
    })();

    return () => controller.abort();
  }, [nostr, queryClient]);

  return query;
}
