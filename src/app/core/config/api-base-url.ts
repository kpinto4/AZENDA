import { environment } from '../../../environments/environment';

let resolved = environment.apiBaseUrl.replace(/\/$/, '');

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
    const data = (await res.json()) as { apiBaseUrl?: string };
    if (typeof data.apiBaseUrl === 'string') {
      setApiBaseUrl(data.apiBaseUrl);
    }
  } catch {
    // Fallback: environment.ts / environment.prod.ts
  }
}
