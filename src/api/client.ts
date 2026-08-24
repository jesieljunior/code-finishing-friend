/**
 * Cliente HTTP único do PayCrew.
 *
 * Todas as chamadas ao FastAPI passam por aqui. Erros são normalizados
 * em ApiError, distinguindo falha de rede/CORS de erro HTTP do backend.
 */

import { API_BASE_URL, isApiConfigured } from "./config";
import { getStoredToken } from "@/auth/session";

export type ApiErrorKind =
  | "not_configured"
  | "network"
  | "timeout"
  | "http"
  | "parse";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly detail: string | null;
  readonly url: string;

  constructor(params: {
    kind: ApiErrorKind;
    message: string;
    status?: number | null;
    detail?: string | null;
    url: string;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.kind = params.kind;
    this.status = params.status ?? null;
    this.detail = params.detail ?? null;
    this.url = params.url;
  }
}

/** Extrai o `detail` do FastAPI (string ou lista de erros de validação). */
function parseDetail(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object") {
          const loc = (item as { loc?: unknown[] }).loc;
          const msg = (item as { msg?: string }).msg;
          const campo = Array.isArray(loc) ? loc.slice(1).join(".") : "";
          return campo ? `${campo}: ${msg ?? ""}` : (msg ?? "");
        }
        return String(item);
      })
      .filter(Boolean)
      .join(" · ");
  }
  return null;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export function buildUrl(
  path: string,
  query?: RequestOptions["query"],
): string {
  const base = API_BASE_URL;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const search = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        search.set(key, String(value));
      }
    }
  }
  const qs = search.toString();
  return `${base}${normalized}${qs ? `?${qs}` : ""}`;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, query, signal, timeoutMs = 20000 } = options;

  if (!isApiConfigured()) {
    throw new ApiError({
      kind: "not_configured",
      message:
        "VITE_API_BASE_URL não está definida. Configure a URL do FastAPI para conectar o frontend.",
      url: path,
    });
  }

  const url = buildUrl(path, query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener("abort", () => controller.abort());

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  // Compatível com a futura autenticação JWT do FastAPI: quando existir
  // token de sessão, ele já viaja em toda requisição.
  const token = getStoredToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? null : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    if (controller.signal.aborted) {
      throw new ApiError({
        kind: "timeout",
        message: `A API não respondeu em ${Math.round(timeoutMs / 1000)}s.`,
        url,
      });
    }
    throw new ApiError({
      kind: "network",
      message:
        "Não foi possível falar com a API. Pode ser a API fora do ar, a URL errada ou CORS bloqueado no FastAPI.",
      url,
    });
  }
  clearTimeout(timeout);

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      if (response.ok) {
        throw new ApiError({
          kind: "parse",
          message: "A API respondeu em um formato inesperado (não é JSON).",
          status: response.status,
          url,
        });
      }
    }
  }

  if (!response.ok) {
    const detail = parseDetail(payload);
    throw new ApiError({
      kind: "http",
      status: response.status,
      detail,
      message: detail ?? `Erro ${response.status} ao chamar a API.`,
      url,
    });
  }

  return payload as T;
}

export function mensagemDeErro(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Erro inesperado.";
}
