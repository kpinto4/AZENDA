import { Routes } from '@angular/router';
import { superAdminGuard, tenantAdminGuard, tenantGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/pages/landing/landing.page').then((m) => m.LandingPageComponent),
  },
  {
    path: 'auth/iniciar-sesion',
    loadComponent: () => import('./features/auth/pages/login/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'auth/registro',
    loadComponent: () =>
      import('./features/auth/pages/register/register.page').then((m) => m.RegisterPageComponent),
  },
  {
    path: 'app',
    loadComponent: () => import('./layout/tenant-shell/tenant-shell.component').then((m) => m.TenantShellComponent),
    canActivate: [tenantGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'panel' },
      {
        path: 'panel',
        loadComponent: () =>
          import('./features/tenant/pages/dashboard/tenant-dashboard.page').then(
            (m) => m.TenantDashboardComponent,
          ),
      },
      {
        path: 'citas',
        loadComponent: () =>
          import('./features/tenant/pages/appointments/tenant-appointments.page').then(
            (m) => m.TenantAppointmentsComponent,
          ),
      },
      {
        path: 'ventas',
        loadComponent: () =>
          import('./features/tenant/pages/sales/tenant-sales.page').then((m) => m.TenantSalesComponent),
      },
      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/tenant/pages/inventory/tenant-inventory.page').then(
            (m) => m.TenantInventoryComponent,
          ),
      },
      {
        path: 'catalogo',
        redirectTo: 'inventario',
      },
      {
        path: 'empleados',
        canActivate: [tenantAdminGuard],
        loadComponent: () =>
          import('./features/tenant/pages/employees/tenant-employees.page').then(
            (m) => m.TenantEmployeesComponent,
          ),
      },
      {
        path: 'configuracion',
        canActivate: [tenantAdminGuard],
        loadComponent: () =>
          import('./features/tenant/pages/settings/tenant-settings.page').then(
            (m) => m.TenantSettingsComponent,
          ),
      },
    ],
  },
  {
    path: 'super',
    loadComponent: () => import('./layout/super-shell/super-shell.component').then((m) => m.SuperShellComponent),
    canActivate: [superAdminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'panel' },
      {
        path: 'panel',
        loadComponent: () =>
          import('./features/super-admin/pages/dashboard/super-dashboard.page').then(
            (m) => m.SuperDashboardComponent,
          ),
      },
      {
        path: 'planes',
        loadComponent: () =>
          import('./features/super-admin/pages/plan-catalog/super-plans.page').then(
            (m) => m.SuperPlansPageComponent,
          ),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./features/super-admin/pages/site-config/super-site-config.page').then(
            (m) => m.SuperSiteConfigPageComponent,
          ),
      },
      {
        path: 'tenants/:tenantId/plan',
        loadComponent: () =>
          import('./features/super-admin/pages/tenant-plan/super-tenant-plan.page').then(
            (m) => m.SuperTenantPlanPageComponent,
          ),
      },
      {
        path: 'tenants',
        loadComponent: () =>
          import('./features/super-admin/pages/tenants/super-tenants.page').then(
            (m) => m.SuperTenantsComponent,
          ),
      },
      {
        path: 'modulos',
        loadComponent: () =>
          import('./features/super-admin/pages/modules/super-modules.page').then(
            (m) => m.SuperModulesComponent,
          ),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/super-admin/pages/users/super-users.page').then((m) => m.SuperUsersComponent),
      },
      {
        path: 'estadisticas',
        loadComponent: () =>
          import('./features/super-admin/pages/stats/super-stats.page').then((m) => m.SuperStatsComponent),
      },
    ],
  },
  {
    path: 'reservar/:slug',
    loadComponent: () =>
      import('./features/public-booking/pages/booking/public-booking.page').then(
        (m) => m.PublicBookingPageComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
