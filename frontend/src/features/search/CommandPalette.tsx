import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useIsOwner, useLogout } from '@/api/auth';
import { useSearch } from '@/api/entries';
import { EASE, useTheme } from '@/design';
import { useStartEntry } from '@/features/editor/useStartEntry';
import { snippetParts } from '@/lib/format';
import { isModKey, useDebounced } from '@/lib/hooks';
import { usePalette } from './paletteStore';

function Item({
  onSelect,
  children,
  hint,
  value,
}: {
  onSelect: () => void;
  children: ReactNode;
  hint?: string;
  value?: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="relative flex cursor-pointer items-center justify-between gap-4 px-5 py-2.5 text-ui text-muted transition-colors data-[selected=true]:text-ink data-[selected=true]:before:absolute data-[selected=true]:before:top-1/2 data-[selected=true]:before:left-0 data-[selected=true]:before:h-hair data-[selected=true]:before:w-2.5 data-[selected=true]:before:bg-accent"
    >
      <span className="min-w-0 flex-1">{children}</span>
      {hint && <span className="shrink-0 num text-[0.6875rem] opacity-60">{hint}</span>}
    </Command.Item>
  );
}

const groupClass =
  '[&_[cmdk-group-heading]]:px-5 [&_[cmdk-group-heading]]:pt-4 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:meta';

/** Ctrl/Cmd + K: search everything, jump anywhere, start writing, switch the theme. */
export function CommandPalette() {
  const { isOpen, close, toggle } = usePalette();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isModKey(event) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [toggle]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-bg/60 px-4 pt-[14vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <PaletteBody close={close} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Mounted only while open, so the query starts empty every time. */
function PaletteBody({ close }: { close: () => void }) {
  const isOwner = useIsOwner();
  const navigate = useNavigate();
  const { toggle: toggleTheme } = useTheme();
  const logout = useLogout();
  const { start } = useStartEntry();
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 200);
  const search = useSearch(debounced, isOwner);

  const go = (to: string) => {
    close();
    void navigate(to);
  };
  const act = (fn: () => void) => {
    close();
    fn();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="w-full max-w-xl"
    >
      <Command
        label="Command palette"
        className="border-hair border-hairline-strong bg-bg"
        onKeyDown={(e) => {
          if (e.key === 'Escape') close();
        }}
      >
        <div className="relative">
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder={isOwner ? 'Search your writing, or type a command' : 'Search the essays'}
            className="w-full bg-transparent px-5 py-5 font-serif text-h4 font-[320] text-ink placeholder:text-muted placeholder:opacity-60 focus:outline-none"
          />
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-hair bg-accent" />
        </div>
        <Command.List className="max-h-[56vh] overflow-y-auto pb-3">
          <Command.Empty className="px-5 py-6 text-ui text-muted">Nothing matches.</Command.Empty>

          {search.data && search.data.length > 0 && debounced.trim().length >= 2 && (
            <Command.Group heading="Writing" className={groupClass}>
              {search.data.map((hit) => (
                <Item
                  key={hit.id}
                  value={`${query} ${hit.title} ${hit.id}`}
                  hint={hit.type}
                  onSelect={() => {
                    go(isOwner ? `/desk/write/${hit.id}` : `/writing/${hit.slug ?? ''}`);
                  }}
                >
                  <span className="block truncate text-ink">{hit.title || 'Untitled'}</span>
                  {hit.snippet && (
                    <span className="mt-0.5 block truncate text-[0.75rem]">
                      {snippetParts(hit.snippet).map((p, i) =>
                        p.hit ? (
                          <mark key={i} className="bg-accent-soft text-ink">
                            {p.text}
                          </mark>
                        ) : (
                          <span key={i}>{p.text}</span>
                        ),
                      )}
                    </span>
                  )}
                </Item>
              ))}
            </Command.Group>
          )}

          {isOwner && (
            <Command.Group heading="Write" className={groupClass}>
              <Item
                onSelect={() => {
                  act(() => {
                    start('journal');
                  });
                }}
              >
                New journal entry
              </Item>
              <Item
                onSelect={() => {
                  act(() => {
                    start('essay');
                  });
                }}
              >
                New essay
              </Item>
              <Item
                onSelect={() => {
                  act(() => {
                    start('note');
                  });
                }}
              >
                New note
              </Item>
              <Item
                onSelect={() => {
                  go('/desk/decisions?new=1');
                }}
              >
                Log a decision
              </Item>
              {[10, 15, 25].map((m) => (
                <Item
                  key={m}
                  onSelect={() => {
                    act(() => {
                      start('journal', { sprint: m });
                    });
                  }}
                >
                  Start a {m} minute sprint
                </Item>
              ))}
            </Command.Group>
          )}

          <Command.Group heading="Go to" className={groupClass}>
            <Item
              onSelect={() => {
                go('/');
              }}
            >
              Home
            </Item>
            <Item
              onSelect={() => {
                go('/writing');
              }}
            >
              Writing
            </Item>
            <Item
              onSelect={() => {
                go('/archive');
              }}
            >
              Archive
            </Item>
            <Item
              onSelect={() => {
                go('/about');
              }}
            >
              About
            </Item>
            {isOwner && (
              <>
                <Item
                  onSelect={() => {
                    go('/desk');
                  }}
                >
                  Desk
                </Item>
                <Item
                  onSelect={() => {
                    go('/desk/journal');
                  }}
                >
                  Journal
                </Item>
                <Item
                  onSelect={() => {
                    go('/desk/essays');
                  }}
                >
                  Essays
                </Item>
                <Item
                  onSelect={() => {
                    go('/desk/notes');
                  }}
                >
                  Notes
                </Item>
                <Item
                  onSelect={() => {
                    go('/desk/decisions');
                  }}
                >
                  Decisions
                </Item>
                <Item
                  onSelect={() => {
                    go('/desk/review');
                  }}
                >
                  Weekly and monthly review
                </Item>
                <Item
                  onSelect={() => {
                    go('/desk/goals');
                  }}
                >
                  Goals
                </Item>
                <Item
                  onSelect={() => {
                    go('/desk/quotes');
                  }}
                >
                  Quotes and prompts
                </Item>
                <Item
                  onSelect={() => {
                    go('/desk/admin/overview');
                  }}
                >
                  Admin panel
                </Item>
                <Item
                  onSelect={() => {
                    go('/desk/admin/preferences');
                  }}
                >
                  Preferences
                </Item>
                <Item
                  onSelect={() => {
                    go('/desk/admin/account');
                  }}
                >
                  Account
                </Item>
                <Item
                  onSelect={() => {
                    go('/desk/admin/data');
                  }}
                >
                  Export or import
                </Item>
              </>
            )}
          </Command.Group>

          <Command.Group heading="Do" className={groupClass}>
            <Item
              onSelect={() => {
                act(toggleTheme);
              }}
            >
              Switch theme
            </Item>
            {isOwner ? (
              <Item
                onSelect={() => {
                  act(() => {
                    logout.mutate(undefined, {
                      onSuccess: () => {
                        void navigate('/');
                      },
                    });
                  });
                }}
              >
                Sign out
              </Item>
            ) : (
              <Item
                onSelect={() => {
                  go('/login');
                }}
              >
                Sign in
              </Item>
            )}
          </Command.Group>
        </Command.List>
        <div className="flex items-center justify-between border-t-hair border-hairline px-5 py-2.5">
          <span className="num text-[0.6875rem] text-muted">
            ↑↓ to move · Enter to open · Esc to close
          </span>
          {search.isFetching && <span className="meta">Searching</span>}
        </div>
      </Command>
    </motion.div>
  );
}
