import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([
          { path: 'auth/iniciar-sesion', component: LoginPageComponent },
          { path: 'app/panel', component: LoginPageComponent },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(LoginPageComponent);
  });

  it('demo: respeta redirect=/app/panel tras login tenant', async () => {
    const env = environment as { useLiveAuth: boolean };
    const prevLive = env.useLiveAuth;
    env.useLiveAuth = false;
    await router.navigateByUrl('/auth/iniciar-sesion?redirect=%2Fapp%2Fpanel');
    fixture.detectChanges();

    const session = TestBed.inject(MockSessionService);
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    fixture.componentInstance.form.patchValue({
      email: 'admin-spa@azenda.dev',
      password: 'x',
    });
    fixture.componentInstance.submit();

    expect(session.role()).toBe('TENANT_ADMIN');
    expect(navigateSpy).toHaveBeenCalledWith('/app/panel');
    env.useLiveAuth = prevLive;
  });
});
