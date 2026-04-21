/** Decodifica payload JWT (sin verificar firma; solo cliente para expiración). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) {
      return null;
    }
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** true si el JWT tiene `exp` en el pasado (margen 30s). */
export function isJwtExpired(token: string, skewMs = 30_000): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.['exp'];
  if (typeof exp !== 'number') {
    return false;
  }
  return exp * 1000 <= Date.now() + skewMs;
}
