/** Usuario super admin creado por `db:bootstrap` si la base está vacía. */
export const SUPER_ADMIN_SEED_USER_ID = 'usr_super_1';
export const SUPER_ADMIN_SEED_EMAIL = 'super@azenda.dev';

/**
 * Clave inicial del super admin (semilla y sincronización en arranque si cambió).
 * Puede sobreescribirse con `SUPER_ADMIN_SEED_PASSWORD` en el entorno del API.
 */
export function getSuperAdminSeedPassword(): string {
  const fromEnv = (process.env.SUPER_ADMIN_SEED_PASSWORD ?? '').trim();
  return fromEnv || '1097092773';
}
