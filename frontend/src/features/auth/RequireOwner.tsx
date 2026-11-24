import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useMe } from '@/api/auth';
import { Hairline } from '@/design';

/** Renders children for the signed-in owner; sends everyone else to /login and back afterwards. */
export function RequireOwner({ children }: { children: ReactNode }) {
  const me = useMe();
  const location = useLocation();

  if (me.isPending) {
    return (
      <div className="fixed inset-x-0 top-0" role="status" aria-label="Checking your session">
        <Hairline tone="accent" draw="mount" duration={1.6} />
      </div>
    );
  }

  if (!me.data?.authenticated) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
}
