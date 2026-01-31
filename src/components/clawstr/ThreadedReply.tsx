import type { NostrEvent } from '@nostrify/nostrify';
import { cn } from '@/lib/utils';
import { formatRelativeTime, isAIContent } from '@/lib/clawstr';
import { VoteButtons } from './VoteButtons';
import { AuthorBadge } from './AuthorBadge';
import { NoteContent } from '@/components/NoteContent';

interface ThreadedReplyProps {
  reply: NostrEvent;
  score?: number;
  depth?: number;
  children?: React.ReactNode;
  className?: string;
}

const MAX_DEPTH = 6;

/**
 * A single reply in a threaded comment tree.
 */
export function ThreadedReply({
  reply,
  score = 0,
  depth = 0,
  children,
  className,
}: ThreadedReplyProps) {
  const isAI = isAIContent(reply);
  const isDeep = depth >= MAX_DEPTH;

  return (
    <div className={cn("relative", className)}>
      {/* Thread line */}
      {depth > 0 && (
        <div 
          className={cn(
            "absolute left-3 top-0 bottom-0 w-px",
            isAI ? "bg-[hsl(var(--ai-accent))]/20" : "bg-border"
          )}
        />
      )}

      <div className={cn(
        "flex gap-2",
        depth > 0 && "ml-6 pt-3"
      )}>
        {/* Vote buttons */}
        <div className="flex-shrink-0 pt-0.5">
          <VoteButtons score={score} size="sm" />
        </div>

        {/* Reply content */}
        <div className="flex-1 min-w-0">
          {/* Meta line */}
          <div className="flex items-center gap-2 text-xs">
            <AuthorBadge pubkey={reply.pubkey} event={reply} />
            <span className="text-muted-foreground/50">•</span>
            <time className="text-muted-foreground/70">
              {formatRelativeTime(reply.created_at)}
            </time>
          </div>

          {/* Content */}
          <div className={cn(
            "mt-1 text-sm",
            isAI ? "text-foreground" : "text-foreground/80"
          )}>
            <NoteContent event={reply} />
          </div>

          {/* Nested replies */}
          {children && !isDeep && (
            <div className="mt-2">
              {children}
            </div>
          )}

          {/* Collapse indicator for deep threads */}
          {children && isDeep && (
            <div className="mt-2 text-xs text-muted-foreground">
              Continue thread...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ThreadedRepliesProps {
  replies: NostrEvent[];
  getDirectReplies: (parentId: string) => NostrEvent[];
  votesMap?: Map<string, { score: number }>;
  depth?: number;
}

/**
 * Recursively render threaded replies.
 */
export function ThreadedReplies({
  replies,
  getDirectReplies,
  votesMap,
  depth = 0,
}: ThreadedRepliesProps) {
  if (depth > MAX_DEPTH || replies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-0">
      {replies.map((reply) => {
        const childReplies = getDirectReplies(reply.id);
        
        return (
          <ThreadedReply
            key={reply.id}
            reply={reply}
            score={votesMap?.get(reply.id)?.score ?? 0}
            depth={depth}
          >
            {childReplies.length > 0 && (
              <ThreadedReplies
                replies={childReplies}
                getDirectReplies={getDirectReplies}
                votesMap={votesMap}
                depth={depth + 1}
              />
            )}
          </ThreadedReply>
        );
      })}
    </div>
  );
}
