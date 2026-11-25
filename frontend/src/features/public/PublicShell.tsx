import { Rss, Search } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { useIsOwner } from '@/api/auth';
import { usePreferences, useSiteSettings } from '@/api/settings';
import { Hairline, ThemeToggle, Wordmark } from '@/design';
import { usePalette } from '@/features/search/paletteStore';
import { cn } from '@/lib/cn';
import { useSmoothScroll } from '@/lib/hooks';

const NAV = [
  { to: '/writing', label: 'Writing' },
  { to: '/archive', label: 'Archive' },
  { to: '/about', label: 'About' },
] as const;

export function PublicNav({ className }: { className?: string }) {
  const isOwner = useIsOwner();
  const openPalette = usePalette((s) => s.open);
  return (
    <nav aria-label="Main" className={cn('flex items-center gap-6 sm:gap-8', className)}>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'group relative py-1 meta transition-colors duration-500 hover:text-ink',
              isActive && 'text-ink',
            )
          }
        >
          {({ isActive }) => (
            <>
              {item.label}
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-0 -bottom-px h-hair origin-left bg-accent transition-transform duration-700 ease-editorial',
                  isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                )}
              />
            </>
          )}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={openPalette}
        aria-label="Search (Ctrl K)"
        className="py-1 text-muted transition-colors hover:text-ink"
      >
        <Search aria-hidden className="size-3.5" strokeWidth={1.25} />
      </button>
      <Link
        to={isOwner ? '/desk' : '/login'}
        className="hidden py-1 meta transition-colors duration-500 hover:text-accent sm:inline"
      >
        {isOwner ? 'Desk' : 'Sign in'}
      </Link>
    </nav>
  );
}

/** Header and footer for the reading pages. Smooth scrolling follows the Preferences switch. */
export function PublicShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const prefs = usePreferences();
  useSmoothScroll(prefs.smoothScroll);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-md">
        <div
          className={cn(
            'mx-auto flex items-center justify-between gap-6 px-(--gutter) py-4',
            wide ? 'max-w-7xl' : 'max-w-6xl',
          )}
        >
          <Link to="/" aria-label="Home">
            <Wordmark size="sm" layout="inline" />
          </Link>
          <div className="flex items-center gap-6 sm:gap-8">
            <PublicNav />
            <ThemeToggle className="hidden md:inline-flex" />
          </div>
        </div>
        <Hairline />
      </header>
      <motion.main
        id="main"
        className="flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.main>
      <SiteFooter />
    </div>
  );
}

export function SiteFooter() {
  const settings = useSiteSettings();
  const prefs = usePreferences();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24">
      <Hairline draw="view" />
      <div className="mx-auto grid max-w-6xl gap-10 px-(--gutter) py-14 md:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-5">
          <Wordmark size="md" />
          <p className="max-w-[38ch] font-serif text-h4 font-[300] text-muted italic">
            {settings.tagline}
          </p>
        </div>
        <div className="flex flex-col gap-6 md:items-end">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} className="meta transition-colors hover:text-ink">
                {item.label}
              </Link>
            ))}
            {prefs.rssFeed && (
              <a
                href="/rss.xml"
                className="inline-flex items-center gap-1.5 meta transition-colors hover:text-accent"
              >
                <Rss aria-hidden className="size-3" strokeWidth={1.25} /> RSS
              </a>
            )}
          </div>
          {settings.social.length > 0 && (
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {settings.social.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="meta transition-colors hover:text-accent"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="num meta">
            © {year} {settings.displayName}
          </p>
        </div>
      </div>
    </footer>
  );
}
