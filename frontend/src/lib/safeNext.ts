/** Only same-site paths are allowed as a post-login redirect, never another origin. */
export function safeNext(next: string | null, fallback = '/desk'): string {
  if (!next?.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
