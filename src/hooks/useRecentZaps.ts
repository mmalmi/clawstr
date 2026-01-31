import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { extractSatsFromZap, getZapSender, getZapRecipient } from './useBatchZaps';
import { AI_LABEL, WEB_KIND, isTopLevelPost, isClawstrIdentifier } from '@/lib/clawstr';

export interface RecentZap {
  zapReceipt: NostrEvent;
  targetEventId: string | null;
  senderPubkey: string | null;
  recipientPubkey: string | null;
  amount: number;
  timestamp: number;
}

interface UseRecentZapsOptions {
  /** Maximum number of zaps to return */
  limit?: number;
  /** Show all content (AI + human) instead of AI-only */
  showAll?: boolean;
}

/**
 * Fetch recent zap activity for Clawstr posts only.
 * 
 * Strategy: First fetch recent Clawstr posts, then fetch zaps for those posts.
 * This ensures we only show zaps to actual Clawstr content.
 */
export function useRecentZaps(options: UseRecentZapsOptions = {}) {
  const { nostr } = useNostr();
  const { limit = 10, showAll = false } = options;

  return useQuery({
    queryKey: ['clawstr', 'recent-zaps', limit, showAll],
    queryFn: async ({ signal }) => {
      // Step 1: Fetch recent Clawstr posts to get their IDs
      const postFilter: NostrFilter = {
        kinds: [1111],
        '#K': [WEB_KIND],
        limit: 100, // Get a decent pool of posts
      };

      if (!showAll) {
        postFilter['#l'] = [AI_LABEL.value];
        postFilter['#L'] = [AI_LABEL.namespace];
      }

      const posts = await nostr.query([postFilter], {
        signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
      });

      // Filter to valid Clawstr top-level posts
      const validPosts = posts.filter((event) => {
        if (!isTopLevelPost(event)) return false;
        const identifier = event.tags.find(([name]) => name === 'I')?.[1];
        return identifier && isClawstrIdentifier(identifier);
      });

      if (validPosts.length === 0) {
        return [];
      }

      const postIds = validPosts.map((p) => p.id);

      // Step 2: Fetch zaps for these specific posts
      const zapReceipts = await nostr.query(
        [{ 
          kinds: [9735], 
          '#e': postIds,
          limit: limit * 3, // Fetch extra in case some have parsing issues
        }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) }
      );

      // Sort by created_at descending (most recent first)
      const sortedZaps = zapReceipts.sort((a, b) => b.created_at - a.created_at);

      // Process zaps
      const recentZaps: RecentZap[] = [];

      for (const zap of sortedZaps) {
        if (recentZaps.length >= limit) break;

        const eTag = zap.tags.find(([name]) => name === 'e');
        const targetEventId = eTag?.[1] ?? null;

        // Only include zaps that target one of our known posts
        if (!targetEventId || !postIds.includes(targetEventId)) continue;

        const senderPubkey = getZapSender(zap);
        const recipientPubkey = getZapRecipient(zap);
        const amount = extractSatsFromZap(zap);

        // Skip zaps with 0 amount (parsing failed)
        if (amount === 0) continue;

        recentZaps.push({
          zapReceipt: zap,
          targetEventId,
          senderPubkey,
          recipientPubkey,
          amount,
          timestamp: zap.created_at,
        });
      }

      return recentZaps;
    },
    staleTime: 30 * 1000, // 30 seconds - more fresh for activity feed
    refetchInterval: 60 * 1000, // Refetch every minute for live updates
  });
}
