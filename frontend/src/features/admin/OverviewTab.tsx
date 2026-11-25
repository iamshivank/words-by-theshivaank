import { Link } from 'react-router';
import { useAdminOverview } from '@/api/admin';
import { Hairline, LoadingLine, Notice, SectionLabel } from '@/design';
import { errorMessage } from '@/api/client';
import { formatAgo, formatBytes, formatNumber } from '@/lib/format';

function Figure({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="flex flex-col gap-2 border-t-hair border-hairline pt-4">
      <span className="meta">{label}</span>
      <span className="num text-h3 leading-none font-[300] text-ink">
        {typeof value === 'number' ? formatNumber(value) : value}
      </span>
      {note && <span className="text-ui text-muted">{note}</span>}
    </div>
  );
}

export function OverviewTab() {
  const { data, isPending, error } = useAdminOverview();
  if (isPending) return <LoadingLine />;
  if (error) return <Notice tone="error">{errorMessage(error)}</Notice>;
  const c = data.counts;
  const uptimeHours = Math.floor(data.system.uptimeSeconds / 3600);

  return (
    <div className="flex flex-col gap-16">
      <section className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
        <Figure
          label="Essays"
          value={c.essays}
          note={`${c.published} published, ${c.drafts} drafts overall`}
        />
        <Figure label="Journal entries" value={c.journals} />
        <Figure label="Notes" value={c.notes} />
        <Figure label="Words" value={c.words} />
        <Figure
          label="Public or unlisted"
          value={c.publicEntries}
          note={`${c.privateEntries} private`}
        />
        <Figure label="Reads" value={c.reads} note="Visitors only, once per visit" />
        <Figure
          label="Decisions"
          value={c.decisionsOpen + c.decisionsReviewed}
          note={`${c.decisionsOpen} open`}
        />
        <Figure label="Writing sessions" value={c.sessions} />
        <Figure label="Quotes" value={c.quotes} note={`${c.customQuotes} of yours`} />
        <Figure label="Prompts" value={c.prompts} />
        <Figure label="Goals" value={c.goals} />
        <Figure label="Uploads" value={c.media} note={formatBytes(c.mediaBytes)} />
      </section>

      <div className="grid gap-16 lg:grid-cols-2">
        <section className="flex flex-col gap-5">
          <SectionLabel index="01">Most read</SectionLabel>
          {data.topEssays.length === 0 && (
            <p className="text-ui text-muted">No public essays yet.</p>
          )}
          <ol>
            {data.topEssays.map((e, i) => (
              <li key={e.slug}>
                <Link
                  to={`/writing/${e.slug}`}
                  className="group flex items-baseline justify-between gap-4 py-3"
                >
                  <span className="flex items-baseline gap-4">
                    <span className="num meta text-accent">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-serif text-h4 text-ink transition-colors group-hover:text-accent">
                      {e.title}
                    </span>
                  </span>
                  <span className="num meta">{formatNumber(e.views)}</span>
                </Link>
                <Hairline />
              </li>
            ))}
          </ol>
        </section>
        <section className="flex flex-col gap-5">
          <SectionLabel index="02">System</SectionLabel>
          <dl className="grid grid-cols-[10rem_1fr] gap-y-3 text-ui">
            <dt className="meta">Last sign in</dt>
            <dd className="text-ink">{formatAgo(data.lastLoginAt)}</dd>
            <dt className="meta">Last write</dt>
            <dd className="text-ink">{formatAgo(data.lastWriteAt)}</dd>
            <dt className="meta">App version</dt>
            <dd className="num text-ink">{data.system.version}</dd>
            <dt className="meta">Server up</dt>
            <dd className="num text-ink">{uptimeHours}h</dd>
            <dt className="meta">Java</dt>
            <dd className="num text-ink">{data.system.javaVersion}</dd>
            <dt className="meta">Database</dt>
            <dd className="num text-ink">
              Postgres {data.system.databaseVersion} · {data.system.databaseSize}
            </dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
