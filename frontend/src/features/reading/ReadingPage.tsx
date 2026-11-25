import { ArrowLeft, ArrowRight, Link2 } from 'lucide-react';
import { motion, useScroll, useSpring } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import { recordView, usePublicEntry } from '@/api/entries';
import { usePreferences, useSiteSettings } from '@/api/settings';
import { EASE, Hairline, LinkButton, LoadingLine, toast } from '@/design';
import { PublicShell } from '@/features/public/PublicShell';
import { cn } from '@/lib/cn';
import { formatDate, formatNumber } from '@/lib/format';
import { useDocumentTitle, useMeta } from '@/lib/hooks';

type Heading = { id: string; text: string; level: 2 | 3 };

function slugify(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
  return slug || 'section';
}

/**
 * Finds the headings for the table of contents. The server gives headings ids when it saves an entry;
 * content that never went through the editor (seeded or old rows) gets them here, the same way.
 */
function withHeadings(html: string): { html: string; headings: Heading[] } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const used = new Set<string>();
  const headings = [...doc.querySelectorAll('h2, h3')].map((h) => {
    if (!h.id) {
      const base = slugify(h.textContent);
      let id = base;
      for (let n = 2; used.has(id); n++) id = `${base}-${String(n)}`;
      h.id = id;
    }
    used.add(h.id);
    return {
      id: h.id,
      text: h.textContent.trim(),
      level: h.tagName === 'H2' ? (2 as const) : (3 as const),
    };
  });
  return { html: doc.body.innerHTML, headings };
}

/** Table of contents in the margin, with the section you are reading marked by an orange tick. */
function Contents({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    els.forEach((el) => {
      io.observe(el);
    });
    return () => {
      io.disconnect();
    };
  }, [headings]);

  return (
    <nav aria-label="Contents" className="sticky top-28">
      <p className="meta">Contents</p>
      <ol className="mt-5 flex flex-col gap-3 border-l-hair border-hairline">
        {headings.map((h) => (
          <li key={h.id} className={cn('relative', h.level === 3 && 'pl-3')}>
            <span
              aria-hidden
              className={cn(
                'absolute top-0 -left-px h-full w-hair origin-top bg-accent transition-transform duration-700 ease-editorial',
                active === h.id ? 'scale-y-100' : 'scale-y-0',
              )}
            />
            <a
              href={`#${h.id}`}
              className={cn(
                'block pl-4 text-ui leading-snug transition-colors duration-500',
                active === h.id ? 'text-ink' : 'text-muted hover:text-ink',
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ReadingPage() {
  const { slug } = useParams();
  const { data: entry, isPending, error } = usePublicEntry(slug);
  const prefs = usePreferences();
  const settings = useSiteSettings();
  const articleRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: articleRef, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const { html, headings } = useMemo(
    () => (entry ? withHeadings(entry.contentHtml) : { html: '', headings: [] }),
    [entry],
  );

  useDocumentTitle(entry?.title, settings.siteName);
  useMeta({ description: entry?.excerpt, image: entry?.coverImageUrl, type: 'article' });
  useEffect(() => {
    if (entry) recordView(entry.slug);
  }, [entry]);

  if (isPending) {
    return (
      <PublicShell>
        <LoadingLine className="mx-auto mt-40 max-w-xs" />
      </PublicShell>
    );
  }
  if (error) {
    const missing = error instanceof ApiError && error.status === 404;
    return (
      <PublicShell>
        <div className="mx-auto max-w-3xl px-(--gutter) py-40">
          <p className="meta">{missing ? '404' : 'Error'}</p>
          <h1 className="mt-6 text-h1">
            {missing ? 'This piece is not here.' : 'It did not load.'}
          </h1>
          <LinkButton to="/writing" className="mt-10">
            All writing
          </LinkButton>
        </div>
      </PublicShell>
    );
  }

  const showToc = prefs.tableOfContents && headings.length >= 2;

  return (
    <PublicShell wide>
      {prefs.readingProgress && (
        <motion.div
          aria-hidden
          className="fixed inset-x-0 top-0 z-50 h-px origin-left bg-accent"
          style={{ scaleX: progress }}
        />
      )}
      <article ref={articleRef} className="mx-auto max-w-7xl px-(--gutter) pt-20 md:pt-28">
        <header className="mx-auto max-w-4xl">
          <motion.div
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: EASE }}
          >
            {entry.highlightLabel && (
              <span className="border-hair border-accent px-2.5 py-1 text-[0.625rem] tracking-[0.18em] text-accent uppercase">
                {entry.highlightLabel}
              </span>
            )}
            {entry.tags.map((t) => (
              <Link
                key={t.slug}
                to={`/writing?tag=${t.slug}`}
                className="meta transition-colors hover:text-accent"
              >
                {t.name}
              </Link>
            ))}
          </motion.div>
          <motion.h1
            className="mt-8 text-display leading-[0.98]"
            initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1.3, ease: EASE }}
          >
            {entry.title}
          </motion.h1>
          {entry.excerpt && (
            <motion.p
              className="mt-8 max-w-[42ch] font-serif text-h4 font-[300] text-muted italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.3, ease: EASE }}
            >
              {entry.excerpt}
            </motion.p>
          )}
          <Hairline tone="accent" draw="mount" delay={0.5} className="mt-10 w-16" />
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            <time dateTime={entry.publishedAt} className="meta text-ink">
              {formatDate(entry.publishedAt)}
            </time>
            <span className="meta">{entry.readingTimeMinutes} min read</span>
            <span className="num meta">{formatNumber(entry.wordCount)} words</span>
            {prefs.showReadCounts && entry.viewCount > 0 && (
              <span className="num meta">{formatNumber(entry.viewCount)} reads</span>
            )}
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-2 meta transition-colors hover:text-accent"
              onClick={() => {
                void navigator.clipboard.writeText(window.location.href).then(() => {
                  toast('Link copied');
                });
              }}
            >
              <Link2 aria-hidden className="size-3.5" strokeWidth={1.25} /> Copy link
            </button>
          </div>
        </header>

        {entry.coverImageUrl && (
          <motion.img
            src={entry.coverImageUrl}
            alt=""
            className="mx-auto mt-14 aspect-[16/9] w-full max-w-5xl object-cover"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, ease: EASE }}
          />
        )}

        <div
          className={cn(
            'mx-auto mt-16 grid max-w-7xl gap-12 xl:gap-16',
            showToc ? 'lg:grid-cols-[1fr_minmax(0,68ch)_1fr]' : '',
          )}
        >
          {showToc && <div className="hidden lg:block" />}
          <div
            className={cn('prose-words mx-auto w-full', prefs.dropCap && 'has-drop-cap')}
            // Sanitized on the server (jsoup safelist) before it was stored.
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {showToc && (
            <aside className="hidden lg:block">
              <Contents headings={headings} />
            </aside>
          )}
        </div>

        <footer className="mx-auto mt-24 max-w-4xl">
          <div className="flex justify-center">
            <span aria-hidden className="font-serif text-h3 text-accent">
              ∗
            </span>
          </div>
          <Hairline className="mt-12" draw="view" />
          <nav aria-label="More essays" className="grid gap-8 py-10 sm:grid-cols-2">
            {entry.previous ? (
              <Link to={`/writing/${entry.previous.slug}`} className="group flex flex-col gap-3">
                <span className="inline-flex items-center gap-2 meta">
                  <ArrowLeft
                    aria-hidden
                    className="size-3.5 transition-transform duration-500 group-hover:-translate-x-1"
                    strokeWidth={1.25}
                  />
                  Earlier
                </span>
                <span className="font-serif text-h4 text-ink transition-colors group-hover:text-accent">
                  {entry.previous.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {entry.next && (
              <Link
                to={`/writing/${entry.next.slug}`}
                className="group flex flex-col items-end gap-3 text-right"
              >
                <span className="inline-flex items-center gap-2 meta">
                  Later
                  <ArrowRight
                    aria-hidden
                    className="size-3.5 transition-transform duration-500 group-hover:translate-x-1"
                    strokeWidth={1.25}
                  />
                </span>
                <span className="font-serif text-h4 text-ink transition-colors group-hover:text-accent">
                  {entry.next.title}
                </span>
              </Link>
            )}
          </nav>
        </footer>
      </article>
    </PublicShell>
  );
}
