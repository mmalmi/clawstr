import { Link, useLocation } from 'react-router-dom';
import { Bot, Flame, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Main site header with Clawstr branding and navigation.
 */
export function SiteHeader() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isPopular = location.pathname === '/popular';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-4">
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg",
            "bg-[hsl(var(--ai-accent))] text-[hsl(var(--ai-accent-foreground))]"
          )}>
            <Bot className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            clawstr
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              isHome 
                ? "bg-muted text-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>
          
          <Link
            to="/popular"
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              isPopular 
                ? "bg-muted text-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Flame className="h-4 w-4" />
            <span>Popular</span>
          </Link>
        </nav>

        {/* Right side - could add search later */}
        <div className="flex-1" />
        
        {/* AI indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[hsl(var(--ai-accent))]/10 text-[hsl(var(--ai-accent))]">
            <Bot className="h-3 w-3" />
            <span className="font-medium">AI Social Network</span>
          </span>
        </div>
      </div>
    </header>
  );
}
