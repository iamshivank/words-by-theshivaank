import { Menu, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useLogout } from '@/api/auth';
import { useDueDecisions } from '@/api/desk';
import { EASE, Hairline, ThemeToggle, Wordmark } from '@/design';
import { RequireOwner } from '@/features/auth/RequireOwner';
import { usePalette } from '@/features/search/paletteStore';
import { cn } from '@/lib/cn';

const SECTIONS = [
  {
    label: 'Write',
    items: [
      { to: '/desk', label: 'Today', end: true },
      { to: '/desk/journal', label: 'Journal' },
      { to: '/desk/essays', label: 'Essays' },
      { to: '/desk/notes', label: 'Notes' },
    ],
  },
  {
    label: 'Reflect',
    items: [
      { to: '/desk/decisions', label: 'Decisions' },
      { to: '/desk/review', label: 'Reviews' },
      { to: '/desk/goals', label: 'Goals' },
      { to: '/desk/quotes', label: 'Quotes & prompts' },
    ],
  },
  {
    label: 'Manage',
    items: [{ to: '/desk/admin', label: 'Admin panel' }],
  },
] as const;

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const due = useDueDecisions();
  const dueCount = due.data?.length ?? 0;
  return (
    <nav aria-label="Desk" className="flex flex-col gap-8">
      {SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="meta opacity-70">{section.label}</p>
          <ul className="mt-3 flex flex-col">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={'end' in item ? item.end : false}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center justify-between py-1.5 pl-4 text-ui transition-colors duration-500',
                      isActive ? 'text-ink' : 'text-muted hover:text-ink',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden
                        className={cn(
                          'absolute top-1/2 left-0 h-hair w-2 origin-left -translate-y-1/2 bg-accent transition-transform duration-700 ease-editorial',
                          isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50',
                        )}
                      />
                      {item.label}
                      {item.to === '/desk/decisions' && dueCount > 0 && (
                        <span
                          className="num text-[0.6875rem] text-accent"
                          aria-label={`${dueCount} due for review`}
                        >
                          {dueCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function RailFooter() {
  const logout = useLogout();
  const navigate = useNavigate();
  const openPalette = usePalette((s) => s.open);
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={openPalette}
        className="flex items-center justify-between text-ui text-muted transition-colors hover:text-ink"
      >
        <span className="inline-flex items-center gap-2">
          <Search aria-hidden className="size-3.5" strokeWidth={1.25} /> Search
        </span>
        <kbd className="num text-[0.6875rem]">Ctrl K</kbd>
      </button>
      <ThemeToggle />
      <div className="flex items-center justify-between">
        <Link to="/" className="meta transition-colors hover:text-ink">
          View site
        </Link>
        <button
          type="button"
          className="meta transition-colors hover:text-accent"
          onClick={() => {
            logout.mutate(undefined, {
              onSuccess: () => {
                void navigate('/', { replace: true });
              },
            });
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

/** The Desk: a quiet left rail on wide screens, a sheet menu on phones. Owner only. */
export function DeskLayout() {
  const [open, setOpen] = useState(false);

  return (
    <RequireOwner>
      <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
        <aside className="sticky top-0 hidden h-dvh flex-col justify-between border-r-hair border-hairline px-6 py-8 lg:flex">
          <div className="flex flex-col gap-12">
            <Link to="/desk" aria-label="Desk home">
              <Wordmark size="sm" />
            </Link>
            <Nav />
          </div>
          <RailFooter />
        </aside>

        <header className="sticky top-0 z-40 flex items-center justify-between bg-bg/85 px-(--gutter) py-4 backdrop-blur-md lg:hidden">
          <Link to="/desk" aria-label="Desk home">
            <Wordmark size="sm" layout="inline" />
          </Link>
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => {
              setOpen(true);
            }}
            className="p-1 text-ink"
          >
            <Menu aria-hidden className="size-5" strokeWidth={1.25} />
          </button>
        </header>
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-50 flex flex-col justify-between bg-bg px-(--gutter) py-6 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              role="dialog"
              aria-modal="true"
              aria-label="Desk menu"
            >
              <div className="flex flex-col gap-10">
                <div className="flex items-center justify-between">
                  <Wordmark size="sm" layout="inline" />
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => {
                      setOpen(false);
                    }}
                    className="p-1"
                  >
                    <X aria-hidden className="size-5" strokeWidth={1.25} />
                  </button>
                </div>
                <Hairline draw="mount" />
                <Nav
                  onNavigate={() => {
                    setOpen(false);
                  }}
                />
              </div>
              <RailFooter />
            </motion.div>
          )}
        </AnimatePresence>

        <main id="main" className="min-w-0 px-(--gutter) py-10 lg:px-14 lg:py-14">
          <Outlet />
        </main>
      </div>
    </RequireOwner>
  );
}

/** Page heading used by every Desk screen. */
export function DeskHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <motion.header
      className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      <div>
        <p className="meta">{eyebrow}</p>
        <h1 className="mt-4 text-h1">{title}</h1>
        <Hairline tone="accent" draw="mount" delay={0.3} className="mt-6 w-12" />
      </div>
      {children && <div className="flex flex-wrap items-center gap-4">{children}</div>}
    </motion.header>
  );
}
