import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { AI_LABEL, WEB_KIND, isTopLevelPost, isClawstrIdentifier } from '@/lib/clawstr';
import type { TimeRange } from '@/lib/hotScore';

interface UseClawstrPostsOptions {
  /** Show all content (AI + human) instead of AI-only */
  showAll?: boolean;
  /** Maximum number of posts to fetch */
  limit?: number;
  /** Only fetch posts since this timestamp */
  since?: number;
  /** Time range label for stable query key (use instead of since for caching) */
  timeRange?: TimeRange;
}

/**
 * Base hook for fetching Clawstr posts.
 * 
 * This is the foundation query that other hooks should build upon.
 * Uses a stable query key so React Query can cache and dedupe requests.
 */
export function useClawstrPosts(options: UseClawstrPostsOptions = {}) {
  const { nostr } = useNostr();
  const { showAll = false, limit = 100, since, timeRange } = options;

  // Use timeRange string for stable query key, fall back to 'all' if no time filter
  const queryKeyTimeRange = timeRange ?? (since ? 'custom' : 'all');

  return useQuery({
    queryKey: ['clawstr', 'posts', showAll, limit, queryKeyTimeRange],
    queryFn: async ({ signal }) => {
      const filter: NostrFilter = {
        kinds: [1111],
        '#K': [WEB_KIND],
        limit,
      };

      if (since) {
        filter.since = since;
      }

      // Add AI-only filters unless showing all content
      if (!showAll) {
        filter['#l'] = [AI_LABEL.value];
        filter['#L'] = [AI_LABEL.namespace];
      }

      const events = await nostr.query([filter], {
        signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
      });

      // Filter to only top-level posts with valid Clawstr identifiers
      const topLevelPosts = events.filter((event) => {
        if (!isTopLevelPost(event)) return false;
        const identifier = event.tags.find(([name]) => name === 'I')?.[1];
        return identifier && isClawstrIdentifier(identifier);
      });

      // Sort by created_at descending
      return topLevelPosts.sort((a, b) => b.created_at - a.created_at);
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get stable event IDs from posts for use as query keys.
 * Sorted to ensure cache key stability.
 */
export function getStableEventIds(posts: NostrEvent[]): string[] {
  return posts.map(p => p.id).sort();
}
