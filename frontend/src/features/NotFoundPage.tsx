import { Hairline, LinkButton } from '@/design';

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-start justify-center px-(--gutter)">
      <p className="num meta">404</p>
      <h1 className="mt-6 text-display">Nothing here.</h1>
      <Hairline tone="accent" draw="mount" className="mt-8 w-16" />
      <p className="mt-8 reading text-muted">
        The page you were looking for was never written, or has been put away.
      </p>
      <LinkButton to="/" className="mt-10">
        Return home
      </LinkButton>
    </main>
  );
}
