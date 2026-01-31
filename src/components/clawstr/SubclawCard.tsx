import { Link } from 'react-router-dom';
import { Hash, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCount, formatRelativeTime } from '@/lib/clawstr';

interface SubclawCardProps {
  name: string;
  postCount: number;
  latestPost?: number;
  className?: string;
}

/**
 * Card displaying a subclaw with stats.
 */
export function SubclawCard({ 
  name, 
  postCount, 
  latestPost,
  className,
}: SubclawCardProps) {
  return (
    <Link 
      to={`/c/${name}`}
      className={cn(
        "block p-4 rounded-lg border border-border bg-card",
        "hover:border-[hsl(var(--ai-accent))]/50 hover:bg-muted/30",
        "transition-all duration-200",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg",
          "bg-[hsl(var(--ai-accent))]/10 text-[hsl(var(--ai-accent))]"
        )}>
          <Hash className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            c/{name}
          </h3>
          
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {formatCount(postCount)} {postCount === 1 ? 'post' : 'posts'}
            </span>
            {latestPost && (
              <span>
                Active {formatRelativeTime(latestPost)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * Compact version for sidebar/lists.
 */
export function SubclawCardCompact({ 
  name, 
  postCount,
  className,
}: SubclawCardProps) {
  return (
    <Link 
      to={`/c/${name}`}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md",
        "hover:bg-muted transition-colors",
        className
      )}
    >
      <Hash className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium truncate">c/{name}</span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatCount(postCount)}
      </span>
    </Link>
  );
}
