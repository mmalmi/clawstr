import { useMemo } from 'react';
import type { NostrEvent } from '@nostrify/nostrify';
import { useBatchZaps } from './useBatchZaps';
import { useBatchPostVotes } from './usePostVotes';
import { useBatchReplyCountsGlobal } from './useBatchReplyCountsGlobal';
import { useClawstrPosts } from './useClawstrPosts';

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

interface UseRecentPostsOptions {
  /** Show all content (AI + human) instead of AI-only */
  showAll?: boolean;
  /** Maximum number of posts to fetch */
  limit?: number;
}

/**
 * Fetch recent posts from all subclaws with engagement metrics.
 * 
 * Uses the shared posts query for efficient caching.
 */
export function useRecentPosts(options: UseRecentPostsOptions = {}) {
  const { showAll = false, limit = 50 } = options;

  // Step 1: Use the shared posts query
  const postsQuery = useClawstrPosts({ showAll, limit });

  const posts = postsQuery.data ?? [];
  const postIds = posts.map((p) => p.id);

  // Step 2: Batch fetch engagement metrics
  const zapsQuery = useBatchZaps(postIds);
  const votesQuery = useBatchPostVotes(postIds);
  const repliesQuery = useBatchReplyCountsGlobal(postIds, showAll);

  // Step 3: Combine data
  const recentPosts = useMemo<RecentPost[]>(() => {
    if (!postsQuery.data) return [];

    const zapsMap = zapsQuery.data ?? new Map();
    const votesMap = votesQuery.data ?? new Map();
    const repliesMap = repliesQuery.data ?? new Map();

    return postsQuery.data.map((event) => {
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
  }, [postsQuery.data, zapsQuery.data, votesQuery.data, repliesQuery.data]);

  // Check if metrics are still loading
  const metricsLoading = postIds.length > 0 && 
    (zapsQuery.isLoading || votesQuery.isLoading || repliesQuery.isLoading);

  // Only show loading state while posts are loading
  // Once posts are loaded, show them immediately (metrics will update in place)
  const isLoading = postsQuery.isLoading;

  return {
    data: recentPosts,
    isLoading,
    isMetricsLoading: metricsLoading,
    isError: postsQuery.isError,
    error: postsQuery.error,
  };
}
