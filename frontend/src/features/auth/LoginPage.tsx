import { motion } from 'motion/react';
import { useState, type SubmitEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { useLogin, useMe } from '@/api/auth';
import { ApiError } from '@/api/client';
import { Button, EASE, Hairline, Input, ThemeToggle, Wordmark } from '@/design';
import { safeNext } from '@/lib/safeNext';

function describeError(error: unknown): string {
  if (error instanceof ApiError && error.fromApi) {
    if (error.status === 429) {
      const minutes = Math.ceil((error.problem.retryAfterSeconds ?? 60) / 60);
      return `Too many attempts. Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`;
    }
    if (error.status === 400) return 'Enter a valid email and your password.';
    if (error.status >= 500) return 'The server stumbled. Try again in a moment.';
    return error.message;
  }
  return 'The server is not answering. Is the backend running?';
}

export function LoginPage() {
  const me = useMe();
  const login = useLogin();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (me.data?.authenticated) return <Navigate to={next} replace />;

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          void navigate(next, { replace: true });
        },
      },
    );
  };

  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] px-(--frame) py-(--frame)">
      <header className="flex items-center justify-between">
        <Link to="/" aria-label="Home">
          <Wordmark size="sm" layout="inline" />
        </Link>
        <ThemeToggle />
      </header>

      <section className="flex items-center justify-center py-16">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <p className="meta">Private</p>
          <h1 className="mt-4 text-h1">The Desk</h1>
          <Hairline tone="accent" draw="mount" delay={0.3} className="mt-6 w-12" />

          <form className="mt-12 flex flex-col gap-10" onSubmit={onSubmit} noValidate>
            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
            />
            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              error={login.isError ? describeError(login.error) : null}
            />
            <div className="flex items-center justify-between">
              <Link to="/" className="meta transition-colors duration-500 hover:text-ink">
                Back to Words
              </Link>
              <Button type="submit" busy={login.isPending} busyLabel="Opening">
                Enter
              </Button>
            </div>
          </form>
        </motion.div>
      </section>
    </main>
  );
}
