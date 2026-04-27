import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiTenantEmployeeDto, ApiTenantEmployeesService } from '../../core/services/api-tenant-employees.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { MockSessionService } from '../../core/services/mock-session.service';

@Component({
  selector: 'app-tenant-employees',
  imports: [ReactiveFormsModule],
  templateUrl: './tenant-employees.component.html',
  styleUrl: './tenant-employees.component.scss',
})
export class TenantEmployeesComponent {
  private readonly fb = inject(FormBuilder);
  readonly data = inject(MockDataService);
  readonly session = inject(MockSessionService);
  private readonly apiEmployees = inject(ApiTenantEmployeesService);
  readonly msg = signal('');
  readonly employeesApi = signal<ApiTenantEmployeeDto[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly isEditorOpen = signal(false);
  readonly pendingDelete = signal<{ id: string; name: string; email: string } | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(6)]],
    role: ['EMPLEADO' as 'ADMIN' | 'EMPLEADO', Validators.required],
  });

  readonly employees = computed(() => {
    if (environment.useLiveAuth && this.session.accessToken()) {
      return this.employeesApi().map((e) => ({
        id: e.id,
        name: e.name,
        email: e.email,
        password: e.password ?? '',
        panelRole: e.role,
      }));
    }
    return this.data.employees();
  });

  constructor() {
    effect(() => {
      if (!environment.useLiveAuth || !this.session.accessToken()) {
        return;
      }
      untracked(() => this.reloadApiEmployees());
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ name: '', email: '', password: '', role: 'EMPLEADO' });
    this.msg.set('');
    this.showPassword.set(false);
    this.isEditorOpen.set(true);
  }

  openEdit(e: {
    id: string;
    name: string;
    email: string;
    password?: string;
    panelRole: 'ADMIN' | 'EMPLEADO';
  }): void {
    this.editingId.set(e.id);
    this.form.reset({ name: e.name, email: e.email, password: e.password ?? '', role: e.panelRole });
    this.msg.set('');
    this.showPassword.set(true);
    this.isEditorOpen.set(true);
  }

  closeEditor(): void {
    this.isEditorOpen.set(false);
    this.editingId.set(null);
    this.showPassword.set(false);
    this.form.reset({ name: '', email: '', password: '', role: 'EMPLEADO' });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  saveEmployee(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (environment.useLiveAuth && this.session.accessToken()) {
      const payload = {
        name: v.name,
        email: v.email,
        password: v.password?.trim() || undefined,
        role: v.role,
      };
      const editing = this.editingId();
      const req = editing ? this.apiEmployees.patch(editing, payload) : this.apiEmployees.create(payload);
      req.subscribe({
        next: () => {
          this.msg.set(editing ? 'Empleado actualizado.' : 'Empleado creado.');
          this.closeEditor();
          this.reloadApiEmployees();
        },
        error: () => this.msg.set('No se pudo guardar empleado en API.'),
      });
      return;
    }
    this.data.addEmployee(v.name, v.email, v.role);
    this.closeEditor();
  }

  requestDelete(e: { id: string; name: string; email: string }): void {
    this.pendingDelete.set({ id: e.id, name: e.name, email: e.email });
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const pending = this.pendingDelete();
    if (!pending) {
      return;
    }
    this.pendingDelete.set(null);
    this.removeRow(pending.id);
  }

  private removeRow(id: string): void {
    if (environment.useLiveAuth && this.session.accessToken()) {
      this.apiEmployees.delete(id).subscribe({
        next: () => {
          this.msg.set('Empleado eliminado.');
          this.reloadApiEmployees();
        },
        error: () => this.msg.set('No se pudo eliminar empleado en API.'),
      });
      return;
    }
  }

  private reloadApiEmployees(): void {
    this.apiEmployees.list().subscribe({
      next: (rows) => this.employeesApi.set(rows),
      error: () => this.msg.set('No se pudo cargar empleados desde API.'),
    });
  }
}
