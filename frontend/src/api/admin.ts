/** Hooks for the admin panel: account, settings, overview, media, export and import. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { meQueryKey } from './auth';
import { api, apiForm } from './client';
import { publicSettingsQueryKey } from './settings';
import type { Account, AdminOverview, ImportResult, MediaItem, SiteSettings } from './types';

export function useAccount() {
  return useQuery({ queryKey: ['account'], queryFn: () => api<Account>('/account') });
}

function useAccountMutation<TBody>(path: string, method: 'PUT' | 'POST') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TBody) => api<Account>(path, { method, json: body }),
    onSuccess: (account) => {
      queryClient.setQueryData(['account'], account);
      void queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}

export const useChangePassword = () =>
  useAccountMutation<{ currentPassword: string; newPassword: string }>('/account/password', 'PUT');
export const useChangeEmail = () =>
  useAccountMutation<{ currentPassword: string; email: string }>('/account/email', 'PUT');
export const useSignOutEverywhere = () =>
  useAccountMutation<undefined>('/account/sign-out-everywhere', 'POST');

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => api<AdminOverview>('/admin/overview'),
  });
}

export const ownerSettingsKey = ['settings', 'owner'] as const;

export function useOwnerSettings() {
  return useQuery({ queryKey: ownerSettingsKey, queryFn: () => api<SiteSettings>('/settings') });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: SiteSettings) =>
      api<SiteSettings>('/settings', { method: 'PUT', json: settings }),
    onSuccess: (saved) => {
      queryClient.setQueryData(ownerSettingsKey, saved);
      void queryClient.invalidateQueries({ queryKey: publicSettingsQueryKey });
    },
  });
}

export function useMedia() {
  return useQuery({ queryKey: ['media'], queryFn: () => api<MediaItem[]>('/media') });
}

export function uploadImage(file: File) {
  const form = new FormData();
  form.append('file', file);
  return apiForm<MediaItem>('/media', form);
}

export function useUploadImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadImage,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media'] }),
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<undefined>(`/media/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media'] }),
  });
}

export function useImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => {
      const form = new FormData();
      files.forEach((f) => {
        form.append('files', f);
      });
      return apiForm<ImportResult>('/import', form);
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export const EXPORT_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1/export`;
