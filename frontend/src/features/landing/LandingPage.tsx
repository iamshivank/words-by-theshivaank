import { motion } from 'motion/react';
import { Link } from 'react-router';
import { usePublicEntries } from '@/api/entries';
import { usePreferences, useSiteSettings } from '@/api/settings';
import type { LandingSectionId } from '@/api/types';
import { EASE, Hairline, LinkButton } from '@/design';
import { SiteFooter } from '@/features/public/PublicShell';
import { useDocumentTitle, useMeta, useSmoothScroll } from '@/lib/hooks';
import { FlyingPosts } from './FlyingPosts';
import { Hero } from './Hero';
import { EssayIndex } from './LatestIndex';

function Latest() {
  const { data } = usePublicEntries({ size: 6 });
  if (!data || data.items.length === 0) return null;
  return (
    <section aria-labelledby="latest-title" className="mx-auto max-w-6xl px-(--gutter) py-24">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="meta">The index</p>
          <h2 id="latest-title" className="mt-3 text-h1">
            Latest
          </h2>
        </div>
        <span className="num meta">{data.totalItems} essays</span>
      </div>
      <Hairline draw="view" className="mt-8" />
      <EssayIndex entries={data.items} />
      <div className="mt-10">
        <LinkButton to="/writing">Read everything</LinkButton>
      </div>
    </section>
  );
}

function AboutStrip() {
  const settings = useSiteSettings();
  const first = settings.about
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find(Boolean);
  return (
    <section aria-labelledby="about-strip" className="mx-auto max-w-6xl px-(--gutter) py-24">
      <div className="grid gap-10 md:grid-cols-[14rem_1fr]">
        <div>
          <p className="meta">About</p>
          <h2 id="about-strip" className="sr-only">
            About
          </h2>
          <Hairline tone="accent" draw="view" className="mt-4 w-10" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: EASE }}
        >
          <p className="max-w-[34ch] font-serif text-h2 leading-[1.12] font-[300] tracking-tight text-ink">
            {first ?? (
              <>
                {settings.displayName} writes here every day: essays in public, and the rest in a{' '}
                <em className="font-[280]">private journal</em>.
              </>
            )}
          </p>
          <Link
            to="/about"
            className="group relative mt-8 inline-block pb-1 meta transition-colors hover:text-ink"
          >
            More about {settings.displayName}
            <span className="absolute inset-x-0 bottom-0 h-hair origin-left scale-x-0 bg-accent transition-transform duration-700 group-hover:scale-x-100" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/** Sections render in the order and on/off state chosen in the admin panel. */
export function LandingPage() {
  const settings = useSiteSettings();
  const prefs = usePreferences();
  useSmoothScroll(prefs.smoothScroll);
  useDocumentTitle(null, settings.siteName);
  useMeta({ description: settings.tagline });

  const render = (id: LandingSectionId) => {
    switch (id) {
      case 'hero':
        return <Hero key="hero" />;
      case 'flying':
        return prefs.flyingPosts ? <FlyingPosts key="flying" /> : null;
      case 'latest':
        return <Latest key="latest" />;
      case 'about':
        return <AboutStrip key="about" />;
    }
  };

  return (
    <>
      <main id="main">
        {settings.landing.sections.filter((s) => s.enabled).map((s) => render(s.id))}
      </main>
      <SiteFooter />
    </>
  );
}
