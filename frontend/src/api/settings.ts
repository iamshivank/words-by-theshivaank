import { useQuery } from '@tanstack/react-query';
import { DEFAULT_PREFERENCES, DEFAULT_SETTINGS } from '@/lib/defaultSettings';
import { api } from './client';
import type { Preferences, PublicSettings } from './types';

export const publicSettingsQueryKey = ['settings', 'public'] as const;

export function usePublicSettings() {
  return useQuery({
    queryKey: publicSettingsQueryKey,
    queryFn: () => api<PublicSettings>('/public/settings'),
    staleTime: 10 * 60_000,
  });
}

/** The site's settings, falling back to the built-in defaults while loading or offline. */
export function useSiteSettings(): PublicSettings {
  return usePublicSettings().data ?? DEFAULT_SETTINGS;
}

/** The admin panel's on/off switches. */
export function usePreferences(): Preferences {
  const prefs = usePublicSettings().data?.preferences;
  return prefs ? { ...DEFAULT_PREFERENCES, ...prefs } : DEFAULT_PREFERENCES;
}
