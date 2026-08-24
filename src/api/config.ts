/**
 * Configuração da API PayCrew.
 *
 * A URL do FastAPI NÃO é hardcoded. Ela vem de VITE_API_BASE_URL.
 * Em desenvolvimento local pode apontar para http://localhost:8000.
 * Em produção, para a URL definitiva do backend.
 */

export const API_BASE_URL: string = (
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? ""
).replace(/\/+$/, "");

export const isApiConfigured = (): boolean => API_BASE_URL.length > 0;
