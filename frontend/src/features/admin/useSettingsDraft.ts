import { useState } from 'react';
import { useOwnerSettings, useUpdateSettings } from '@/api/admin';
import { errorMessage } from '@/api/client';
import type { SiteSettings } from '@/api/types';
import { toast } from '@/design';

/** Edit a local copy of the settings. Until something changes, the server's copy is shown. */
export function useSettingsDraft() {
  const settings = useOwnerSettings();
  const update = useUpdateSettings();
  const [edited, setEdited] = useState<SiteSettings | null>(null);
  const draft = edited ?? settings.data ?? null;
  const dirty = edited !== null && JSON.stringify(edited) !== JSON.stringify(settings.data);

  const save = (next: SiteSettings | null = draft, message = 'Settings saved') => {
    if (!next) return;
    update.mutate(next, {
      onSuccess: () => {
        // The query cache now holds the saved settings; drop the local copy.
        setEdited(null);
        toast(message);
      },
      onError: (error) => {
        toast(errorMessage(error), 'error');
      },
    });
  };

  return {
    draft,
    setDraft: setEdited,
    dirty,
    save,
    saving: update.isPending,
    reset: () => {
      setEdited(null);
    },
    isPending: settings.isPending,
    error: settings.error,
  };
}
