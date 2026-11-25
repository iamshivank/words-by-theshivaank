import { useState, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router';
import { useLogout } from '@/api/auth';
import { useAccount, useChangeEmail, useChangePassword, useSignOutEverywhere } from '@/api/admin';
import { errorMessage } from '@/api/client';
import { Button, Input, LoadingLine, Notice, SectionLabel, toast } from '@/design';
import { formatAgo, formatDate } from '@/lib/format';

function PasswordForm() {
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const mismatch = again.length > 0 && next !== again;
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (next !== again) return;
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          toast('Password changed. Other devices are signed out.');
          setCurrent('');
          setNext('');
          setAgain('');
        },
      },
    );
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-8" noValidate>
      <SectionLabel index="02">Password</SectionLabel>
      <Input
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={current}
        onChange={(e) => {
          setCurrent(e.target.value);
        }}
        required
      />
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        value={next}
        onChange={(e) => {
          setNext(e.target.value);
        }}
        hint="At least 12 characters. A short sentence works well."
        required
        minLength={12}
      />
      <Input
        label="New password, again"
        type="password"
        autoComplete="new-password"
        value={again}
        onChange={(e) => {
          setAgain(e.target.value);
        }}
        error={mismatch ? 'These do not match.' : null}
        required
      />
      {change.isError && <Notice tone="error">{errorMessage(change.error)}</Notice>}
      <div>
        <Button
          type="submit"
          busy={change.isPending}
          disabled={!current || next.length < 12 || next !== again}
        >
          Change password
        </Button>
      </div>
    </form>
  );
}

function EmailForm({ email }: { email: string }) {
  const change = useChangeEmail();
  const [next, setNext] = useState(email);
  const [password, setPassword] = useState('');
  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        change.mutate(
          { email: next, currentPassword: password },
          {
            onSuccess: () => {
              toast('Sign-in email changed');
              setPassword('');
            },
          },
        );
      }}
    >
      <SectionLabel index="03">Sign-in email</SectionLabel>
      <Input
        label="Email"
        type="email"
        autoComplete="username"
        value={next}
        onChange={(e) => {
          setNext(e.target.value);
        }}
        required
      />
      <Input
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
        }}
        required
      />
      {change.isError && <Notice tone="error">{errorMessage(change.error)}</Notice>}
      <div>
        <Button type="submit" busy={change.isPending} disabled={!password || next === email}>
          Change email
        </Button>
      </div>
    </form>
  );
}

export function AccountTab() {
  const account = useAccount();
  const everywhere = useSignOutEverywhere();
  const logout = useLogout();
  const navigate = useNavigate();
  if (account.isPending) return <LoadingLine />;
  if (!account.data) return <Notice tone="error">{errorMessage(account.error)}</Notice>;
  const a = account.data;

  return (
    <div className="grid gap-16 lg:grid-cols-2">
      <div className="flex flex-col gap-14">
        <section className="flex flex-col gap-6">
          <SectionLabel index="01">You</SectionLabel>
          <dl className="grid grid-cols-[10rem_1fr] gap-y-3 text-ui">
            <dt className="meta">Email</dt>
            <dd className="text-ink">{a.email}</dd>
            <dt className="meta">Last sign in</dt>
            <dd className="text-ink">{formatAgo(a.lastLoginAt)}</dd>
            <dt className="meta">Password changed</dt>
            <dd className="text-ink">
              {a.passwordChangedAt ? formatDate(a.passwordChangedAt) : 'Still the one from .env'}
            </dd>
            <dt className="meta">Account since</dt>
            <dd className="text-ink">{formatDate(a.createdAt)}</dd>
            <dt className="meta">Sessions last</dt>
            <dd className="text-ink">{a.sessionDays} days</dd>
          </dl>
        </section>
        <PasswordForm />
      </div>
      <div className="flex flex-col gap-14">
        <EmailForm email={a.email} />
        <section className="flex flex-col gap-6">
          <SectionLabel index="04">Sessions</SectionLabel>
          <p className="text-ui text-muted">
            Lost a phone, or signed in on a borrowed laptop? Sign out everywhere else. This device
            stays signed in.
          </p>
          <div className="flex flex-wrap gap-6">
            <Button
              busy={everywhere.isPending}
              onClick={() => {
                everywhere.mutate(undefined, {
                  onSuccess: () => {
                    toast('Every other device is signed out.');
                  },
                });
              }}
            >
              Sign out other devices
            </Button>
            <Button
              variant="text"
              onClick={() => {
                logout.mutate(undefined, {
                  onSuccess: () => {
                    void navigate('/', { replace: true });
                  },
                });
              }}
            >
              Sign out here
            </Button>
          </div>
          <p className="text-ui text-muted">
            Forgot the password? Set <code className="num">OWNER_RESET_FROM_ENV=true</code> for one
            restart to go back to the email and password hash in <code className="num">.env</code>.
          </p>
        </section>
      </div>
    </div>
  );
}
