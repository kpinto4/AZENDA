import { Routes } from '@angular/router';
import { superAdminGuard, tenantGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing-page.component').then((m) => m.LandingPageComponent),
  },
  {
    path: 'auth/iniciar-sesion',
    loadComponent: () => import('./features/auth/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'auth/registro',
    loadComponent: () => import('./features/auth/register-page.component').then((m) => m.RegisterPageComponent),
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
          import('./features/tenant/tenant-dashboard.component').then((m) => m.TenantDashboardComponent),
      },
      {
        path: 'citas',
        loadComponent: () =>
          import('./features/tenant/tenant-appointments.component').then((m) => m.TenantAppointmentsComponent),
      },
      {
        path: 'ventas',
        loadComponent: () => import('./features/tenant/tenant-sales.component').then((m) => m.TenantSalesComponent),
      },
      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/tenant/tenant-inventory.component').then((m) => m.TenantInventoryComponent),
      },
      {
        path: 'catalogo',
        loadComponent: () =>
          import('./features/tenant/tenant-catalog.component').then((m) => m.TenantCatalogComponent),
      },
      {
        path: 'empleados',
        loadComponent: () =>
          import('./features/tenant/tenant-employees.component').then((m) => m.TenantEmployeesComponent),
      },
      {
        path: 'configuracion',
        loadComponent: () =>
          import('./features/tenant/tenant-settings.component').then((m) => m.TenantSettingsComponent),
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
          import('./features/super-admin/super-dashboard.component').then((m) => m.SuperDashboardComponent),
      },
      {
        path: 'tenants',
        loadComponent: () =>
          import('./features/super-admin/super-tenants.component').then((m) => m.SuperTenantsComponent),
      },
      {
        path: 'modulos',
        loadComponent: () =>
          import('./features/super-admin/super-modules.component').then((m) => m.SuperModulesComponent),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./features/super-admin/super-users.component').then((m) => m.SuperUsersComponent),
      },
      {
        path: 'estadisticas',
        loadComponent: () =>
          import('./features/super-admin/super-stats.component').then((m) => m.SuperStatsComponent),
      },
    ],
  },
  {
    path: 'reservar/:slug',
    loadComponent: () =>
      import('./features/public-booking/public-booking-page.component').then((m) => m.PublicBookingPageComponent),
  },
  { path: '**', redirectTo: '' },
];
