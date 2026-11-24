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
