export function isProductionEnv(): boolean {
  return (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';
}

export function isDemoFeaturesEnabled(): boolean {
  if (isProductionEnv()) {
    return (process.env.AZENDA_DEMO_ENABLED ?? '').trim().toLowerCase() === 'true';
  }
  return true;
}
