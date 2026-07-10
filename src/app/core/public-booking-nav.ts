import { Router } from '@angular/router';

export function publicBookingUrl(slug: string): string {
  return `/reservar/${encodeURIComponent(slug.trim())}`;
}

export function isWideViewport(breakpoint = 860): boolean {
  return typeof window !== 'undefined' && window.innerWidth > breakpoint;
}

/** Navegación fiable en Safari/Firefox móvil (evita routerLink + target _blank en drawer). */
export function goToPublicBookingPage(
  router: Router,
  slug: string | null | undefined,
  options?: { newTabOnWide?: boolean },
): void {
  const s = slug?.trim();
  if (!s) {
    return;
  }
  const url = publicBookingUrl(s);
  const newTab = options?.newTabOnWide !== false && isWideViewport();
  if (newTab && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  if (!isWideViewport() && typeof window !== 'undefined') {
    window.location.assign(url);
    return;
  }
  void router.navigateByUrl(url);
}
