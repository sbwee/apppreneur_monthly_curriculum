const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const payload = err as { error?: { message?: string; code?: string } };
    throw new ApiRequestError(
      payload?.error?.message ?? res.statusText,
      res.status,
      payload?.error?.code,
    );
  }

  return res.status === 204 ? (undefined as T) : res.json();
}
