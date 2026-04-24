// src/lib/api.ts
// Central API client — all requests go through here

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const TOKEN = process.env.NEXT_PUBLIC_API_TOKEN || "";

export type ApiResult<T = unknown> = {
  ok: boolean;
  status: number | null;
  data: T | null;
  error: string | null;
  latencyMs: number;
};

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const latencyMs = Date.now() - start;
    let data: T | null = null;

    try {
      data = await res.json();
    } catch {
      // non-JSON response
    }

    return {
      ok: res.ok,
      status: res.status,
      data,
      error: res.ok ? null : `HTTP ${res.status} ${res.statusText}`,
      latencyMs,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      status: null,
      data: null,
      error: err instanceof Error ? err.message : "Network error",
      latencyMs: Date.now() - start,
    };
  }
}

// ── Public endpoints ──────────────────────────────────────────────────────────

export const checkHealth = () => request("/api/v1/health");

export const checkUsername = (username: string) =>
  request(`/api/v1/username/check?username=${encodeURIComponent(username)}`);

export const getVendors = () => request("/public/v1/vendors");

// ── Protected endpoint ────────────────────────────────────────────────────────

export const getVendorServices = (token?: string) =>
  request("/api/v1/vendor-services", {
    headers: {
      Authorization: `Bearer ${token || TOKEN}`,
    },
  });
