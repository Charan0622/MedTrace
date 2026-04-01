import type { ApiResponse } from "./types";
import { logger } from "./logger";

const BASE_URL = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

export async function apiClient<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const startTime = Date.now();

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    const json = await res.json();
    const queryTime = Date.now() - startTime;

    if (!res.ok) {
      logger.warn(`API error: ${path}`, { status: res.status, error: json.error });
      return {
        success: false,
        data: null,
        error: json.error ?? { code: "API_ERROR", message: `Request failed with status ${res.status}` },
        meta: { query_time_ms: queryTime },
      };
    }

    return {
      ...json,
      meta: { ...json.meta, query_time_ms: queryTime },
    };
  } catch (error) {
    const queryTime = Date.now() - startTime;
    logger.error(`API fetch failed: ${path}`, error);
    return {
      success: false,
      data: null,
      error: { code: "NETWORK_ERROR", message: "Failed to connect to API" },
      meta: { query_time_ms: queryTime },
    };
  }
}
