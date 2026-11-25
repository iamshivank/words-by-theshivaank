import { motion } from 'motion/react';
import { NavLink, useParams } from 'react-router';
import { useSiteSettings } from '@/api/settings';
import { EASE, Hairline } from '@/design';
import { DeskHeading } from '@/features/desk/DeskLayout';
import { cn } from '@/lib/cn';
import { useDocumentTitle } from '@/lib/hooks';
import { AccountTab } from './AccountTab';
import { ContentTab } from './ContentTab';
import { DataTab } from './DataTab';
import { OverviewTab } from './OverviewTab';
import { PreferencesTab } from './PreferencesTab';
import { SiteTab } from './SiteTab';

const TABS = [
  { id: 'overview', label: 'Overview', Component: OverviewTab },
  { id: 'content', label: 'Content', Component: ContentTab },
  { id: 'preferences', label: 'Preferences', Component: PreferencesTab },
  { id: 'site', label: 'Site', Component: SiteTab },
  { id: 'account', label: 'Account', Component: AccountTab },
  { id: 'data', label: 'Data', Component: DataTab },
] as const;

/** /desk/admin/:tab — manage the account, content, switches, site copy and data. */
export function AdminPage() {
  const { tab = 'overview' } = useParams();
  const settings = useSiteSettings();
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];
  useDocumentTitle(`Admin · ${current.label}`, settings.siteName);
  const Component = current.Component;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10">
      <DeskHeading eyebrow="Everything behind the page" title="Admin panel" />
      <div>
        <nav
          aria-label="Admin sections"
          className="-mx-(--gutter) flex gap-7 overflow-x-auto px-(--gutter) lg:mx-0 lg:px-0"
        >
          {TABS.map((t) => (
            <NavLink
              key={t.id}
              to={`/desk/admin/${t.id}`}
              className={() =>
                cn(
                  'relative shrink-0 py-3 meta transition-colors duration-500',
                  current.id === t.id ? 'text-ink' : 'hover:text-ink',
                )
              }
            >
              {t.label}
              {current.id === t.id && (
                <motion.span
                  layoutId="admin-tab"
                  className="absolute inset-x-0 bottom-0 h-hair bg-accent"
                  transition={{ duration: 0.6, ease: EASE }}
                />
              )}
            </NavLink>
          ))}
        </nav>
        <Hairline />
      </div>
      <motion.div
        key={current.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <Component />
      </motion.div>
    </div>
  );
}
