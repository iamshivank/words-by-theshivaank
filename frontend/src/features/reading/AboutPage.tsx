import { motion } from 'motion/react';
import { useIsOwner } from '@/api/auth';
import { usePublicStats } from '@/api/entries';
import { useSiteSettings } from '@/api/settings';
import { EASE, Hairline, LinkButton } from '@/design';
import { PublicShell } from '@/features/public/PublicShell';
import { formatDate, formatNumber } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';

/** The about page. Its text is edited in the admin panel (Site). Paragraphs are separated by blank lines. */
export function AboutPage() {
  const settings = useSiteSettings();
  const stats = usePublicStats();
  const isOwner = useIsOwner();
  useDocumentTitle('About', settings.siteName);
  const paragraphs = settings.about
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-(--gutter) pt-20 md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE }}
        >
          <p className="meta">About</p>
          <h1 className="mt-4 text-display">{settings.displayName}</h1>
          <Hairline tone="accent" draw="mount" delay={0.3} className="mt-8 w-16" />
        </motion.div>
        <div className="mt-16 grid gap-16 md:grid-cols-[1fr_14rem]">
          <div className="prose-words has-drop-cap">
            {paragraphs.length > 0 ? (
              paragraphs.map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <p>
                {settings.tagline} This page is waiting for a few honest paragraphs.
                {isOwner && ' Write them in the admin panel, under Site.'}
              </p>
            )}
          </div>
          <dl className="flex flex-col gap-8">
            <div>
              <dt className="meta">Essays</dt>
              <dd className="mt-2 num text-h3 text-ink">
                {formatNumber(stats.data?.published ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="meta">Words published</dt>
              <dd className="mt-2 num text-h3 text-ink">{formatNumber(stats.data?.words ?? 0)}</dd>
            </div>
            {stats.data?.since && (
              <div>
                <dt className="meta">Writing here since</dt>
                <dd className="mt-2 text-ink">{formatDate(stats.data.since)}</dd>
              </div>
            )}
            {settings.social.length > 0 && (
              <div>
                <dt className="meta">Elsewhere</dt>
                <dd className="mt-3 flex flex-col gap-2">
                  {settings.social.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink transition-colors hover:text-accent"
                    >
                      {s.label}
                    </a>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
        <LinkButton to="/writing" className="mt-16">
          Read the essays
        </LinkButton>
      </div>
    </PublicShell>
  );
}
