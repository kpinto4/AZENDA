import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import {
  ApiAdminAppSystem,
  ApiAdminUserDto,
  ApiAdminUserRole,
  ApiAdminUsersService,
} from '../../core/services/api-admin-users.service';
import {
  ApiTenantsAdminService,
  ApiTenantAdminDto,
} from '../../core/services/api-tenants-admin.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-super-users',
  imports: [ReactiveFormsModule],
  templateUrl: './super-users.component.html',
  styleUrl: './super-users.component.scss',
})
export class SuperUsersComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);
  private readonly session = inject(MockSessionService);
  private readonly apiUsers = inject(ApiAdminUsersService);
  private readonly apiTenants = inject(ApiTenantsAdminService);

  readonly roles: ApiAdminUserRole[] = ['ADMIN', 'EMPLEADO', 'SUPER_ADMIN'];

  readonly apiRows = signal<ApiAdminUserDto[]>([]);
  readonly tenantOptions = signal<ApiTenantAdminDto[]>([]);
  readonly apiError = signal<string>('');
  readonly apiFlash = signal<string>('');

  readonly useApiUsers = computed(
    () =>
      environment.useLiveAuth &&
      !!this.session.accessToken() &&
      this.session.isSuperAdmin(),
  );

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    role: ['ADMIN' as ApiAdminUserRole, Validators.required],
    tenantId: [''],
    tenantLabel: [''],
  });

  readonly tableRowsLive = computed(() => {
    const tenants = this.tenantOptions();
    return this.apiRows().map((u) => ({
      ...u,
      tenantLabel:
        u.tenantId == null
          ? '—'
          : tenants.find((t) => t.id === u.tenantId)?.name ?? u.tenantId,
    }));
  });

  constructor() {
    effect(() => {
      if (this.useApiUsers()) {
        untracked(() => this.reloadApiData());
      }
    });
  }

  private systemsForRole(role: ApiAdminUserRole): ApiAdminAppSystem[] {
    if (role === 'SUPER_ADMIN') {
      return ['SUPER_ADMIN', 'TENANT', 'PUBLIC_BOOKING'];
    }
    if (role === 'ADMIN') {
      return ['TENANT', 'PUBLIC_BOOKING'];
    }
    return ['TENANT'];
  }

  reloadApiData(): void {
    this.apiError.set('');
    this.apiTenants.list().subscribe({
      next: (rows) => this.tenantOptions.set(rows),
      error: () => this.tenantOptions.set([]),
    });
    this.apiUsers.list().subscribe({
      next: (rows) => this.apiRows.set(rows),
      error: () => {
        this.apiRows.set([]);
        this.apiError.set('No se pudo cargar la lista de usuarios.');
      },
    });
  }

  add(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.apiFlash.set('');

    if (this.useApiUsers()) {
      const pwd = v.password.trim();
      if (pwd.length < 6) {
        this.apiError.set('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      const role = v.role;
      let tenantId: string | null = v.tenantId.trim() || null;
      if (role === 'SUPER_ADMIN') {
        tenantId = null;
      } else if (!tenantId) {
        this.apiError.set('Elige un tenant para ADMIN o EMPLEADO.');
        return;
      }
      this.apiError.set('');
      const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      this.apiUsers
        .create({
          id,
          email: v.email.trim().toLowerCase(),
          password: pwd,
          role,
          tenantId,
          systems: this.systemsForRole(role),
          status: 'ACTIVE',
        })
        .subscribe({
          next: () => {
            this.apiFlash.set('Usuario creado.');
            this.form.patchValue({ email: '', password: '' });
            this.reloadApiData();
          },
          error: () => {
            this.apiError.set(
              'No se pudo crear el usuario (correo duplicado, datos invalidos o sin permiso).',
            );
          },
        });
      return;
    }

    this.data.addPlatformUser(v.email, v.role, v.tenantLabel.trim() || 'Sin tenant');
    this.form.patchValue({ email: '', tenantLabel: '' });
  }

  remove(row: { id: string }): void {
    if (this.useApiUsers()) {
      if (row.id === this.session.currentUserId()) {
        this.apiError.set('No puedes eliminar tu propia cuenta desde aqui.');
        return;
      }
      if (!confirm('Eliminar este usuario de la base de datos?')) {
        return;
      }
      this.apiError.set('');
      this.apiUsers.delete(row.id).subscribe({
        next: () => {
          this.apiFlash.set('Usuario eliminado.');
          this.reloadApiData();
        },
        error: () => {
          this.apiError.set('No se pudo eliminar el usuario.');
        },
      });
      return;
    }
    this.data.removePlatformUser(row.id);
  }
}
