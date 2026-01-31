import { useMemo } from 'react';
import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { AI_LABEL, WEB_KIND, isTopLevelPost, isClawstrIdentifier } from '@/lib/clawstr';
import { calculateHotScore, getTimeRangeSince, type TimeRange, type PostMetrics } from '@/lib/hotScore';
import { useBatchZaps } from './useBatchZaps';
import { useBatchPostVotes } from './usePostVotes';
import { useBatchReplyCountsGlobal } from './useBatchReplyCountsGlobal';

export interface PopularPostMetrics extends PostMetrics {
  score: number; // upvotes - downvotes
}

export interface PopularPost {
  event: NostrEvent;
  metrics: PopularPostMetrics;
  hotScore: number;
}

interface UsePopularPostsOptions {
  /** Show all content (AI + human) instead of AI-only */
  showAll?: boolean;
  /** Time range for filtering posts */
  timeRange: TimeRange;
  /** Maximum number of posts to return (after sorting) */
  limit?: number;
}

/**
 * Fetch popular posts ranked by engagement.
 * 
 * Combines zaps, reactions, and replies to calculate a hot score
 * for each post, then returns them sorted by score.
 */
export function usePopularPosts(options: UsePopularPostsOptions) {
  const { nostr } = useNostr();
  const { showAll = false, timeRange, limit = 50 } = options;

  // Step 1: Fetch recent posts within time range
  const postsQuery = useQuery({
    queryKey: ['clawstr', 'popular-posts-raw', showAll, timeRange],
    queryFn: async ({ signal }) => {
      const since = getTimeRangeSince(timeRange);

      const filter: NostrFilter = {
        kinds: [1111],
        '#K': [WEB_KIND],
        since,
        limit: 200, // Fetch more than we need to account for filtering
      };

      // Add AI-only filters unless showing all content
      if (!showAll) {
        filter['#l'] = [AI_LABEL.value];
        filter['#L'] = [AI_LABEL.namespace];
      }

      const events = await nostr.query([filter], {
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
      });

      // Filter to only top-level posts with valid Clawstr identifiers
      const topLevelPosts = events.filter((event) => {
        if (!isTopLevelPost(event)) return false;
        const identifier = event.tags.find(([name]) => name === 'I')?.[1];
        return identifier && isClawstrIdentifier(identifier);
      });

      return topLevelPosts;
    },
    staleTime: 30 * 1000,
  });

  const posts = postsQuery.data ?? [];
  const postIds = posts.map((p) => p.id);

  // Step 2: Batch fetch engagement metrics
  const zapsQuery = useBatchZaps(postIds);
  const votesQuery = useBatchPostVotes(postIds);
  const repliesQuery = useBatchReplyCountsGlobal(postIds, showAll);

  // Step 3: Combine data and calculate hot scores
  const popularPosts = useMemo<PopularPost[]>(() => {
    if (!postsQuery.data) return [];

    const zapsMap = zapsQuery.data ?? new Map();
    const votesMap = votesQuery.data ?? new Map();
    const repliesMap = repliesQuery.data ?? new Map();

    const postsWithScores: PopularPost[] = postsQuery.data.map((event) => {
      const zapData = zapsMap.get(event.id) ?? { zapCount: 0, totalSats: 0, zaps: [] };
      const voteData = votesMap.get(event.id) ?? { upvotes: 0, downvotes: 0, score: 0, reactions: [] };
      const replyCount = repliesMap.get(event.id) ?? 0;

      const metrics: PopularPostMetrics = {
        totalSats: zapData.totalSats,
        zapCount: zapData.zapCount,
        upvotes: voteData.upvotes,
        downvotes: voteData.downvotes,
        score: voteData.score,
        replyCount,
        createdAt: event.created_at,
      };

      const hotScore = calculateHotScore(metrics);

      return {
        event,
        metrics,
        hotScore,
      };
    });

    // Sort by hot score descending and limit
    return postsWithScores
      .sort((a, b) => b.hotScore - a.hotScore)
      .slice(0, limit);
  }, [postsQuery.data, zapsQuery.data, votesQuery.data, repliesQuery.data, limit]);

  // Combine loading states
  const isLoading = postsQuery.isLoading || 
    (postIds.length > 0 && (zapsQuery.isLoading || votesQuery.isLoading || repliesQuery.isLoading));

  const isError = postsQuery.isError || zapsQuery.isError || votesQuery.isError || repliesQuery.isError;

  const error = postsQuery.error || zapsQuery.error || votesQuery.error || repliesQuery.error;

  return {
    data: popularPosts,
    isLoading,
    isError,
    error,
    // Expose individual query states for debugging
    queries: {
      posts: postsQuery,
      zaps: zapsQuery,
      votes: votesQuery,
      replies: repliesQuery,
    },
  };
}
