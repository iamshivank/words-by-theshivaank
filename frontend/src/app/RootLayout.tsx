import { Outlet, ScrollRestoration } from 'react-router';
import { usePreferences } from '@/api/settings';
import { Cursor, Grain, Toaster } from '@/design';
import { CommandPalette } from '@/features/search/CommandPalette';

/** Site-wide layers: grain, the ink cursor, the command palette and toasts (each can be switched off in Preferences). */
export function RootLayout() {
  const prefs = usePreferences();
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-bg focus:px-3 focus:py-2 focus:meta focus:text-ink"
      >
        Skip to content
      </a>
      <Outlet />
      <ScrollRestoration />
      <CommandPalette />
      <Toaster />
      {prefs.grain && <Grain />}
      {prefs.customCursor && <Cursor />}
    </>
  );
}
