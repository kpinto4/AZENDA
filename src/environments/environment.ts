export const environment = {
  /**
   * Base del API (prefijo `/api`). Con `ng serve` y `proxy.conf.json` va al Nest en :3000
   * sin CORS; misma URL sirve si el SPA y el API comparten origen en producción.
   */
  apiBaseUrl: '/api',
  /**
   * Si es true, el login del formulario usa el backend real.
   * Los accesos rápidos de la landing siguen siendo demo en memoria.
   */
  useLiveAuth: true,
};
