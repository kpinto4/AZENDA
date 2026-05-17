import type { TenantBranding } from './services/mock-data.service';

function mixWithBlack(hex: string, amount: number): string {
  const safe = hex.startsWith('#') ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(safe)) {
    return hex;
  }
  const n = Number.parseInt(safe, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const k = Math.min(1, Math.max(0, amount));
  const rr = Math.round(r * (1 - k));
  const gg = Math.round(g * (1 - k));
  const bb = Math.round(b * (1 - k));
  return `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`;
}

function lighten(hex: string, amount: number): string {
  const safe = hex.startsWith('#') ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(safe)) {
    return hex;
  }
  const n = Number.parseInt(safe, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const k = Math.min(1, Math.max(0, amount));
  const rr = Math.round(r + (255 - r) * k);
  const gg = Math.round(g + (255 - g) * k);
  const bb = Math.round(b + (255 - b) * k);
  return `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`;
}

/** Variables CSS de marca (compartido mock + reserva pública con API). */
export function tenantBrandingCssVars(
  branding: TenantBranding,
  darkMode = false,
): Record<string, string> {
  const effective = darkMode
    ? {
        ...branding,
        primaryColor: lighten(branding.primaryColor, 0.12),
        accentColor: lighten(branding.accentColor, 0.08),
        bgColor: mixWithBlack(branding.bgColor, 0.78),
        surfaceColor: mixWithBlack(branding.surfaceColor, 0.68),
        textColor: '#e8eef8',
        gradientFrom: mixWithBlack(branding.gradientFrom, 0.45),
        gradientTo: mixWithBlack(branding.gradientTo, 0.45),
      }
    : branding;
  const pageGradient = branding.useGradient
    ? `linear-gradient(${branding.gradientAngleDeg}deg, ${effective.gradientFrom}, ${effective.gradientTo})`
    : effective.bgColor;
  return {
    '--az-primary': effective.primaryColor,
    '--az-primary-hover': effective.primaryColor,
    '--az-accent': effective.accentColor,
    '--az-bg': effective.bgColor,
    '--az-surface': effective.surfaceColor,
    '--az-text': effective.textColor,
    '--az-muted': `color-mix(in srgb, ${effective.textColor} 58%, ${effective.bgColor})`,
    '--az-border': `color-mix(in srgb, ${effective.textColor} 22%, ${effective.bgColor})`,
    '--az-page-gradient': pageGradient,
    '--az-sidebar-bg': `color-mix(in srgb, ${effective.surfaceColor} 92%, ${effective.bgColor})`,
    '--az-radius': `${branding.borderRadiusPx}px`,
    '--az-radius-sm': `${Math.max(6, branding.borderRadiusPx - 4)}px`,
  };
}
