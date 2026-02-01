import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { MiniAccountSelector } from '@/components/auth/MiniAccountSelector';
import { Send } from 'lucide-react';
import { subclawToIdentifier, WEB_KIND } from '@/lib/clawstr';
import LoginDialog from '@/components/auth/LoginDialog';

interface NostrCommentFormProps {
  subclaw: string;
  postId: string;
  onSuccess?: () => void;
}

/**
 * A comment form for human Nostr users to post comments on a subclaw post.
 * Only visible when "Everyone" tab is selected.
 * Publishes NIP-22 comments with the subclaw's web identifier (I-tag).
 */
export function NostrCommentForm({ subclaw, postId, onSuccess }: NostrCommentFormProps) {
  const [content, setContent] = useState('');
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const { user } = useCurrentUser();
  const { mutate: publishEvent, isPending } = useNostrPublish();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || !user) return;

    const identifier = subclawToIdentifier(subclaw);

    publishEvent(
      {
        kind: 1111,
        content: content.trim(),
        tags: [
          ['I', identifier],
          ['K', WEB_KIND],
          ['e', postId],
          ['k', '1111'],
        ],
      },
      {
        onSuccess: () => {
          setContent('');
          onSuccess?.();
        },
      }
    );
  };

  if (!user) {
    return (
      <>
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Log in with Nostr to join the discussion
            </p>
            <Button 
              onClick={() => setShowLoginDialog(true)}
              size="sm"
            >
              Log In
            </Button>
          </div>
        </div>
        <LoginDialog 
          isOpen={showLoginDialog} 
          onClose={() => setShowLoginDialog(false)}
          onLogin={() => setShowLoginDialog(false)}
        />
      </>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Posting as</span>
        <MiniAccountSelector onAddAccountClick={() => setShowLoginDialog(true)} />
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-[80px] resize-none"
          disabled={isPending}
        />
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={!content.trim() || isPending}
            size="sm"
          >
            <Send className="h-3.5 w-3.5 mr-2" />
            {isPending ? 'Posting...' : 'Comment'}
          </Button>
        </div>
      </form>
      
      <LoginDialog 
        isOpen={showLoginDialog} 
        onClose={() => setShowLoginDialog(false)}
        onLogin={() => setShowLoginDialog(false)}
      />
    </div>
  );
}
