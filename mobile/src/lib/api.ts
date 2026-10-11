export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export function errorMessage(
  payload: { error?: string; errors?: unknown },
  fallback: string,
) {
  const flatten = (value: unknown): string[] =>
    typeof value === "string"
      ? [value]
      : Array.isArray(value)
        ? value.flatMap(flatten)
        : value && typeof value === "object"
          ? Object.entries(value).flatMap(([field, errors]) =>
              flatten(errors).map((message) =>
                field === "base" ? message : field + " " + message,
              ),
            )
          : [];
  return payload.error || flatten(payload.errors).join(". ") || fallback;
}
export class ApiClient {
  token: string | null = null;
  onUnauthorized?: () => void;
  constructor(
    public baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ||
      (__DEV__ ? "http://127.0.0.1:3000" : "https://shred.day"),
  ) {}
  async request<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      authenticated?: boolean;
      invalidateAuth?: boolean;
      signal?: AbortSignal;
    } = {},
  ): Promise<T> {
    const token = this.token;
    const headers: Record<string, string> = { Accept: "application/json" };
    const isForm = options.body instanceof FormData;
    if (!isForm) headers["Content-Type"] = "application/json";
    if (options.authenticated !== false && token)
      headers.Authorization = "Bearer " + token;
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort);
    if (options.signal?.aborted) controller.abort();
    const timeout = setTimeout(abort, isForm ? 120_000 : 30_000);
    let response: Response;
    try {
      response = await fetch(this.baseUrl.replace(/\/$/, "") + path, {
        method: options.method || "GET",
        headers,
        body:
          options.body === undefined
            ? undefined
            : isForm
              ? (options.body as FormData)
              : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new Error(
        "Could not reach Shred.Day. Check your connection and try again.",
      );
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    }
    if (!response.ok) {
      if (
        response.status === 401 &&
        options.authenticated !== false &&
        options.invalidateAuth !== false &&
        token === this.token
      )
        this.onUnauthorized?.();
      const payload = await response.json().catch(() => ({}));
      throw new ApiError(
        errorMessage(payload, "Request failed. Please try again."),
        response.status,
      );
    }
    return response.status === 204 ? (undefined as T) : response.json();
  }
}
export const api = new ApiClient();
