import { motion } from 'motion/react';
import { Link } from 'react-router';
import { useArchive } from '@/api/entries';
import { useSiteSettings } from '@/api/settings';
import { EASE, Hairline, LoadingLine } from '@/design';
import { PublicShell } from '@/features/public/PublicShell';
import { formatDayMonth } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';

/** Everything, grouped by year along a thin vertical timeline. */
export function ArchivePage() {
  const settings = useSiteSettings();
  useDocumentTitle('Archive', settings.siteName);
  const { data, isPending } = useArchive();

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl px-(--gutter) pt-20 md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE }}
        >
          <p className="meta">Everything, in order</p>
          <h1 className="mt-4 text-display">Archive</h1>
          <Hairline tone="accent" draw="mount" delay={0.3} className="mt-8 w-16" />
        </motion.div>

        {isPending && <LoadingLine className="mt-16" />}
        <div className="relative mt-20">
          <Hairline
            orientation="vertical"
            draw="view"
            duration={1.8}
            className="absolute top-0 bottom-0 left-[4.5rem] hidden sm:block"
          />
          {data?.map((group) => (
            <section
              key={group.year}
              className="relative grid gap-6 pb-16 sm:grid-cols-[4.5rem_1fr] sm:gap-0"
            >
              <h2 className="num text-h3 font-[300] text-ink sm:sticky sm:top-28 sm:self-start">
                {group.year}
              </h2>
              <ol className="sm:pl-10">
                {group.entries.map((e, i) => (
                  <motion.li
                    key={e.slug}
                    className="relative"
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: Math.min(i, 8) * 0.05, ease: EASE }}
                  >
                    <span
                      aria-hidden
                      className="absolute top-[1.15rem] -left-10 hidden h-hair w-5 bg-accent sm:block"
                    />
                    <Link
                      to={`/writing/${e.slug}`}
                      className="group flex flex-wrap items-baseline gap-x-6 gap-y-1 py-3"
                    >
                      <time dateTime={e.publishedAt} className="w-16 num meta">
                        {formatDayMonth(e.publishedAt)}
                      </time>
                      <span className="font-serif text-h4 font-[330] text-ink transition-colors duration-500 group-hover:text-accent">
                        {e.title}
                      </span>
                      <span className="meta">{e.readingTimeMinutes} min</span>
                    </Link>
                  </motion.li>
                ))}
              </ol>
            </section>
          ))}
          {data?.length === 0 && (
            <p className="font-serif text-h4 text-muted italic">The archive is still empty.</p>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
