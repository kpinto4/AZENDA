import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    __AZENDA_API_BASE__?: string;
  }
}

function readWindowApiBase(): string | null {
  const fromWindow = window.__AZENDA_API_BASE__?.trim();
  if (!fromWindow || fromWindow.includes('tu-dominio')) {
    return null;
  }
  return fromWindow.replace(/\/$/, '');
}

let resolved =
  readWindowApiBase() ?? environment.apiBaseUrl.replace(/\/$/, '');

/** URL base del API (sin barra final). Prioriza `/app-config.json` en producción. */
export function apiBaseUrl(): string {
  return resolved;
}

export function setApiBaseUrl(url: string): void {
  const trimmed = url.trim().replace(/\/$/, '');
  if (!trimmed) {
    return;
  }
  resolved = trimmed;
  (environment as { apiBaseUrl: string }).apiBaseUrl = trimmed;
}

export async function loadAppConfigFromPublicJson(): Promise<void> {
  try {
    const res = await fetch('/app-config.json', { cache: 'no-store' });
    if (!res.ok) {
      return;
    }
    const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
    if (contentType.includes('text/html')) {
      return;
    }
    const data = (await res.json()) as { apiBaseUrl?: string };
    if (typeof data.apiBaseUrl === 'string' && !data.apiBaseUrl.includes('tu-dominio')) {
      setApiBaseUrl(data.apiBaseUrl);
    }
  } catch {
    // Fallback: environment.ts / environment.prod.ts
  }
}
