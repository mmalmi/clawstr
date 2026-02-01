import { useMemo } from 'react';
import type { NostrEvent } from '@nostrify/nostrify';
import { useBatchZaps } from './useBatchZaps';
import { useBatchPostVotes } from './usePostVotes';
import { useBatchReplyCountsGlobal } from './useBatchReplyCountsGlobal';
import { useClawstrPostsInfinite } from './useClawstrPostsInfinite';

export interface RecentPostMetrics {
  totalSats: number;
  zapCount: number;
  upvotes: number;
  downvotes: number;
  score: number;
  replyCount: number;
  createdAt: number;
}

export interface RecentPost {
  event: NostrEvent;
  metrics: RecentPostMetrics;
}

interface UseRecentPostsInfiniteOptions {
  /** Show all content (AI + human) instead of AI-only */
  showAll?: boolean;
  /** Number of posts per page */
  limit?: number;
}

/**
 * Infinite scroll version of useRecentPosts with engagement metrics.
 * 
 * Returns flattened, deduplicated posts from all pages with metrics.
 */
export function useRecentPostsInfinite(options: UseRecentPostsInfiniteOptions = {}) {
  const { showAll = false, limit = 20 } = options;

  // Step 1: Use the infinite posts query
  const postsQuery = useClawstrPostsInfinite({ showAll, limit });

  // Step 2: Flatten and deduplicate posts from all pages
  const posts = useMemo(() => {
    if (!postsQuery.data?.pages) return [];
    
    const seen = new Set<string>();
    return postsQuery.data.pages.flat().filter(event => {
      if (!event.id || seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
  }, [postsQuery.data?.pages]);

  const postIds = posts.map((p) => p.id);

  // Step 3: Batch fetch engagement metrics
  const zapsQuery = useBatchZaps(postIds);
  const votesQuery = useBatchPostVotes(postIds);
  const repliesQuery = useBatchReplyCountsGlobal(postIds, showAll);

  // Step 4: Combine data
  const recentPosts = useMemo<RecentPost[]>(() => {
    if (posts.length === 0) return [];

    const zapsMap = zapsQuery.data ?? new Map();
    const votesMap = votesQuery.data ?? new Map();
    const repliesMap = repliesQuery.data ?? new Map();

    return posts.map((event) => {
      const zapData = zapsMap.get(event.id) ?? { zapCount: 0, totalSats: 0, zaps: [] };
      const voteData = votesMap.get(event.id) ?? { upvotes: 0, downvotes: 0, score: 0, reactions: [] };
      const replyCount = repliesMap.get(event.id) ?? 0;

      const metrics: RecentPostMetrics = {
        totalSats: zapData.totalSats,
        zapCount: zapData.zapCount,
        upvotes: voteData.upvotes,
        downvotes: voteData.downvotes,
        score: voteData.score,
        replyCount,
        createdAt: event.created_at,
      };

      return { event, metrics };
    });
  }, [posts, zapsQuery.data, votesQuery.data, repliesQuery.data]);

  // Check if metrics are still loading
  const metricsLoading = postIds.length > 0 && 
    (zapsQuery.isLoading || votesQuery.isLoading || repliesQuery.isLoading);

  return {
    data: recentPosts,
    isLoading: postsQuery.isLoading,
    isMetricsLoading: metricsLoading,
    isError: postsQuery.isError,
    error: postsQuery.error,
    fetchNextPage: postsQuery.fetchNextPage,
    hasNextPage: postsQuery.hasNextPage,
    isFetchingNextPage: postsQuery.isFetchingNextPage,
  };
}
