/**
 * Single source of truth for API base URL.
 * Vite embeds env at BUILD time: set VITE_API_URL or VITE_LARAVEL_API in your build environment (e.g. DigitalOcean env vars) so production uses the correct server.
 */
const raw =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_LARAVEL_API ||
  "http://localhost:8000/api";

export const API_BASE_URL = raw.replace(/\/+$/, "");

if (import.meta.env.PROD && (API_BASE_URL.includes("localhost") || API_BASE_URL.startsWith("http://127.0.0.1"))) {
  console.error(
    "[CPC] Production build is using localhost for API. Set VITE_API_URL or VITE_LARAVEL_API in your build environment (e.g. DigitalOcean App env vars) and rebuild."
  );
}
