import { Component, inject, OnInit } from '@angular/core';
import { CheckoutSessionService } from '../../../contratar/checkout-session.service';
import { Router } from '@angular/router';

/** Redirige al paso correcto del flujo `/contratar` (único registro con plan). */
@Component({
  selector: 'app-register-redirect',
  template: `<p class="sr-only" aria-live="polite">Redirigiendo al registro…</p>`,
  styles: `
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    }
  `,
})
export class RegisterRedirectPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly checkout = inject(CheckoutSessionService);

  ngOnInit(): void {
    void this.router.navigateByUrl(this.checkout.resolveRegisterEntryUrl());
  }
}
