import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { LoginRequest, Me } from './types';

export const meQueryKey = ['auth', 'me'] as const;

const SIGNED_OUT: Me = { authenticated: false };

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: () => api<Me>('/auth/me'),
    staleTime: 5 * 60_000,
  });
}

/** True only when the server has confirmed the owner's session. */
export function useIsOwner(): boolean {
  return useMe().data?.authenticated === true;
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginRequest) => api<Me>('/auth/login', { method: 'POST', json: body }),
    onSuccess: (me) => {
      queryClient.setQueryData(meQueryKey, me);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<undefined>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(meQueryKey, SIGNED_OUT);
    },
  });
}
