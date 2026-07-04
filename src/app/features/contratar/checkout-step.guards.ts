import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CheckoutSessionService } from './checkout-session.service';

export const checkoutPlanGuard: CanActivateFn = () => {
  const checkout = inject(CheckoutSessionService);
  const router = inject(Router);
  if (checkout.hasEmail()) {
    return true;
  }
  return router.createUrlTree(['/contratar']);
};

export const checkoutPlanSelectedGuard: CanActivateFn = () => {
  const checkout = inject(CheckoutSessionService);
  const router = inject(Router);
  if (checkout.hasPlan()) {
    return true;
  }
  return router.createUrlTree(['/contratar/planes/elegir']);
};

export const checkoutAccountGuard: CanActivateFn = () => {
  const checkout = inject(CheckoutSessionService);
  const router = inject(Router);
  if (checkout.isReadyForAccount()) {
    return true;
  }
  return router.createUrlTree(['/contratar']);
};

export const checkoutPaymentGuard: CanActivateFn = () => {
  const checkout = inject(CheckoutSessionService);
  const router = inject(Router);
  if (checkout.accountCreated()) {
    return true;
  }
  return router.createUrlTree(['/contratar/cuenta']);
};

export const checkoutConfirmationGuard: CanActivateFn = () => {
  const checkout = inject(CheckoutSessionService);
  const router = inject(Router);
  if (checkout.canShowConfirmation()) {
    return true;
  }
  return router.createUrlTree([checkout.resolveRegisterEntryUrl()]);
};
