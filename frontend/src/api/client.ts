/** RFC 9457 problem details, as returned by every API error. */
export type Problem = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string>;
  retryAfterSeconds?: number;
};

export class ApiError extends Error {
  readonly status: number;
  readonly problem: Problem;
  /** False when the body was not our problem JSON, e.g. a proxy error because the API is down. */
  readonly fromApi: boolean;

  constructor(status: number, problem: Problem, fromApi: boolean) {
    super(problem.detail ?? problem.title ?? `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
    this.fromApi = fromApi;
  }
}

const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

type RequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  json?: unknown;
  headers?: Record<string, string>;
};

/** Fetch wrapper: sends the session cookie, encodes JSON, and turns failures into ApiError. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, headers, ...init } = options;
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json, application/problem+json',
      ...(json === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: json === undefined ? null : JSON.stringify(json),
  });

  if (!response.ok) {
    let problem: Problem = { status: response.status, title: response.statusText };
    let fromApi = false;
    try {
      problem = { ...problem, ...((await response.json()) as Problem) };
      fromApi = true;
    } catch {
      // Not JSON (e.g. a proxy error page); keep the status-only problem.
    }
    throw new ApiError(response.status, problem, fromApi);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Multipart upload (images, imports). The browser sets the boundary header itself. */
export async function apiForm<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json, application/problem+json' },
    body: form,
  });
  if (!response.ok) {
    let problem: Problem = { status: response.status, title: response.statusText };
    let fromApi = false;
    try {
      problem = { ...problem, ...((await response.json()) as Problem) };
      fromApi = true;
    } catch {
      // Not JSON.
    }
    throw new ApiError(response.status, problem, fromApi);
  }
  return (await response.json()) as T;
}

/** Builds a query string, skipping empty values. */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** A short, human message for any failure, preferring the API's own words. */
export function errorMessage(
  error: unknown,
  fallback = 'Something went wrong. Try again.',
): string {
  if (error instanceof ApiError && error.fromApi) {
    const fieldErrors = error.problem.errors ? Object.values(error.problem.errors) : [];
    return fieldErrors.length ? `${error.message} ${fieldErrors.join('. ')}` : error.message;
  }
  if (error instanceof ApiError) return 'The server is not answering. Is the backend running?';
  return fallback;
}
