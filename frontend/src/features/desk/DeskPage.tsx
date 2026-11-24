import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router';
import { useLogout } from '@/api/auth';
import { useSiteSettings } from '@/api/settings';
import { Button, EASE, Hairline, ThemeToggle, Wordmark } from '@/design';
import { RequireOwner } from '@/features/auth/RequireOwner';
import { formatLongDate, greetingFor, useNow } from '@/lib/time';

/** Foundation Desk: proves the private side works. Phase 3 fills it in. */
export function DeskPage() {
  return (
    <RequireOwner>
      <Desk />
    </RequireOwner>
  );
}

function Desk() {
  const { displayName } = useSiteSettings();
  const logout = useLogout();
  const navigate = useNavigate();
  const now = useNow();

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-(--gutter) py-(--frame)">
      <header className="flex items-center justify-between">
        <Link to="/" aria-label="Home">
          <Wordmark size="sm" layout="inline" />
        </Link>
        <div className="flex items-center gap-8">
          <ThemeToggle />
          <Button
            variant="text"
            size="sm"
            busy={logout.isPending}
            onClick={() => {
              logout.mutate(undefined, {
                onSuccess: () => {
                  void navigate('/', { replace: true });
                },
              });
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      <motion.section
        className="flex flex-1 flex-col justify-center py-24"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <time dateTime={now.toISOString()} className="meta">
          {formatLongDate(now)}
        </time>
        <h1 className="mt-6 text-h1">
          {greetingFor(now)}, <em className="font-[300]">{displayName}</em>.
        </h1>
        <Hairline tone="accent" draw="mount" delay={0.4} className="mt-8 w-16" />
        <p className="mt-8 reading text-muted">
          Your desk is being set up: the journal, the editor, streaks and the decision log arrive
          next.
        </p>
      </motion.section>
    </main>
  );
}
