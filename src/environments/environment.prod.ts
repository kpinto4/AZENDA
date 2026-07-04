export const environment = {
  production: true,
  /**
   * API en dominio propio (front y back separados).
   * Sustituye por tu URL real, ej. https://api.azenda.com/api
   * Debe coincidir con `CORS_ORIGINS` del API (origen = solo el dominio del front).
   */
  apiBaseUrl: 'https://api.TU-DOMINIO.com/api',
  useLiveAuth: true,
  /** Oculta pistas de cuentas demo en login. */
  showDemoLoginHints: false,
};
