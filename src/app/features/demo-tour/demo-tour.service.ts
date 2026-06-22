import { Injectable, signal } from '@angular/core';

export type DemoTourRole = 'admin' | 'employee';

export interface DemoTourStep {
  id: string;
  route: string;
  title: string;
  subtitle: string;
  intro: string;
  spotlight?: string;
  bullets?: string[];
  nextLabel?: string;
  audience?: DemoTourRole | 'all';
  externalUrl?: string;
  /** No avanzar hasta que la sesión tenga este rol (ej. cambiar a Laura). */
  requireRole?: DemoTourRole;
}

const STORAGE_KEY = 'azenda.demo.tour.v5';

@Injectable({ providedIn: 'root' })
export class DemoTourService {
  readonly active = signal(false);
  readonly dismissed = signal(false);
  readonly currentIndex = signal(0);
  readonly completed = signal<Set<string>>(new Set());

  readonly steps: DemoTourStep[] = [
    {
      id: 'panel-kpis',
      route: '/app/panel',
      spotlight: 'panel-kpis',
      title: 'Tus números del día',
      subtitle: 'Lo primero al abrir',
      intro: 'Estos tres recuadros te dicen, sin buscar en chats:',
      bullets: [
        'Citas hoy → cuántas personas vienen.',
        'Ventas registradas → lo que ya anotaste como cobrado.',
        'Alertas → si algún producto se está acabando.',
      ],
      nextLabel: 'Siguiente',
      audience: 'all',
    },
    {
      id: 'panel-agenda',
      route: '/app/panel',
      spotlight: 'panel-agenda',
      title: 'Calendario de la semana',
      subtitle: 'Vista rápida',
      intro:
        'Cada día muestra si hay citas. El día en morado es hoy; dentro ves hora y nombre del cliente.',
      nextLabel: 'Siguiente',
      audience: 'all',
    },
    {
      id: 'panel-proximas',
      route: '/app/panel',
      spotlight: 'panel-proximas',
      title: 'Próximos clientes',
      subtitle: 'Lista ordenada',
      intro:
        'Aquí ves quién viene después: nombre, servicio y hora. Sirve para preparar material antes de que entren.',
      nextLabel: 'Ir a Citas',
      audience: 'all',
    },
    {
      id: 'citas-calendario',
      route: '/app/citas',
      spotlight: 'citas-calendario',
      title: 'Agenda completa',
      subtitle: 'Todas las citas',
      intro: 'Aquí gestionas el día a día de las citas:',
      bullets: [
        'Toca una cita en el calendario para ver cliente, servicio y barbero asignado.',
        'Usa las flechas para cambiar de semana.',
      ],
      nextLabel: 'Siguiente',
      audience: 'all',
    },
    {
      id: 'citas-cierre',
      route: '/app/citas',
      spotlight: 'citas-cierre',
      title: 'Marcar asistencia',
      subtitle: 'Después de la hora',
      intro: 'Cuando pasa la hora de la cita, cierra el estado así:',
      bullets: [
        'Abre la cita en el calendario.',
        'Pulsa «Asistió» si vino, o «No asistió» si faltó.',
        'El historial queda guardado para consultarlo después.',
      ],
      nextLabel: 'Ir a Ventas',
      audience: 'all',
    },
    {
      id: 'ventas-buscar',
      route: '/app/ventas',
      spotlight: 'ventas-buscar',
      title: 'Buscar el producto',
      subtitle: 'Paso 1 de la venta',
      intro: 'Para anotar una venta, primero encuentra qué vendiste:',
      bullets: [
        'Escribe el nombre en «Buscar producto» (prueba con «Cera» o «Shampoo»).',
        'Toca el producto en la lista que aparece.',
        'Elige la cantidad con + y − si vendiste más de una unidad.',
      ],
      nextLabel: 'Siguiente: cobrar',
      audience: 'all',
    },
    {
      id: 'ventas-cobrar',
      route: '/app/ventas',
      spotlight: 'ventas-cobrar',
      title: 'Cobrar y confirmar',
      subtitle: 'Paso 2 de la venta',
      intro: 'Ya con el producto elegido, cierra la venta así:',
      bullets: [
        'Revisa el total que aparece abajo.',
        'Pulsa el método de pago (Efectivo, Nequi, Transferencia…).',
        'Pulsa «Confirmar venta». El stock baja solo; Azenda no cobra con tarjeta por ti.',
      ],
      nextLabel: 'Ver catálogo',
      audience: 'all',
    },
    {
      id: 'inventario-catalogo',
      route: '/app/inventario',
      spotlight: 'inventario-catalogo',
      title: 'Servicios y productos',
      subtitle: 'Tu catálogo',
      intro:
        'Aquí editas precios, duración de servicios y stock. Es lo mismo que el cliente ve al reservar en línea.',
      nextLabel: 'Ver equipo',
      audience: 'all',
    },
    {
      id: 'empleados',
      route: '/app/empleados',
      spotlight: 'empleados-lista',
      title: 'Tu equipo',
      subtitle: 'Roles del negocio',
      intro:
        'Aquí invitas personas y eliges si son administrador o empleado. En el siguiente paso probarás la vista de Laura.',
      nextLabel: 'Siguiente',
      audience: 'admin',
    },
    {
      id: 'empleado-invitacion',
      route: '/app/panel',
      spotlight: 'demo-role-switch',
      title: 'Cambiar a vista empleado',
      subtitle: 'Paso interactivo',
      intro:
        'Arriba, en el banner morado, pulsa el botón «Empleado (Laura)». Verás solo sus citas, como en la vida real.',
      nextLabel: 'Ya cambié a Laura',
      requireRole: 'employee',
      audience: 'admin',
    },
    {
      id: 'empleado-panel-kpis',
      route: '/app/panel',
      spotlight: 'panel-kpis',
      title: 'Lo que ve Laura',
      subtitle: 'Sus números del día',
      intro:
        'Fíjate: ahora los números y citas son solo las de Laura, no las de todo el salón. Así trabaja tu equipo sin ver datos ajenos.',
      nextLabel: 'Siguiente',
      audience: 'employee',
    },
    {
      id: 'empleado-panel-agenda',
      route: '/app/panel',
      spotlight: 'panel-agenda',
      title: 'Su agenda filtrada',
      subtitle: 'Solo sus citas',
      intro:
        'En el calendario solo aparecen las citas asignadas a Laura. Puede anotar ventas, pero no cambiar precios ni invitar gente.',
      nextLabel: 'Volver a administrador',
      audience: 'employee',
    },
    {
      id: 'empleado-volver-admin',
      route: '/app/panel',
      spotlight: 'demo-role-switch',
      title: 'Volver a administrador',
      subtitle: 'Seguir el recorrido',
      intro:
        'Pulsa «Administrador» en el banner de arriba para recuperar la vista completa y continuar con la configuración.',
      nextLabel: 'Ya volví a administrador',
      requireRole: 'admin',
      audience: 'employee',
    },
    {
      id: 'configuracion-enlace',
      route: '/app/configuracion',
      spotlight: 'config-enlace',
      title: 'Tu enlace para clientes',
      subtitle: 'Compartir por WhatsApp',
      intro: 'Copia este enlace y envíalo por Instagram o WhatsApp. El cliente reserva sin instalar ninguna app.',
      bullets: ['Pulsa «Copiar principal» y pégalo en un chat con tu cliente.'],
      nextLabel: 'Siguiente',
      audience: 'admin',
    },
    {
      id: 'configuracion-horario',
      route: '/app/configuracion',
      spotlight: 'config-horario',
      title: 'Días y horas de atención',
      subtitle: 'Cuándo reservan',
      intro: 'Marca qué días abres y a qué hora. Solo se ofrecen huecos dentro de ese horario.',
      bullets: [
        'Activa cada día con la casilla.',
        'Ajusta hora de inicio y cierre.',
        'Guarda los cambios al terminar.',
      ],
      nextLabel: 'Ver página del cliente',
      audience: 'admin',
    },
    {
      id: 'reserva-publica',
      route: '/app/panel',
      title: 'Como lo ve tu cliente',
      subtitle: 'Reserva en línea',
      intro:
        'Abre la página como si fueras un cliente. Elige servicio, día y hora. Tú confirmas por WhatsApp y cobras como siempre.',
      nextLabel: 'Abrir página de reserva',
      audience: 'all',
      externalUrl: '/reservar/azenda-demo',
    },
  ];

  constructor() {
    this.loadProgress();
  }

  start(role: DemoTourRole = 'admin'): void {
    this.dismissed.set(false);
    this.active.set(true);
    this.currentIndex.set(this.firstIndexForRole(role));
  }

  skip(): void {
    this.active.set(false);
    this.dismissed.set(true);
  }

  completeStep(stepId: string): void {
    const next = new Set(this.completed());
    next.add(stepId);
    this.completed.set(next);
    this.persist();
  }

  /** Paso actual según índice (sin filtrar por rol de sesión). */
  currentStep(): DemoTourStep | null {
    if (!this.active()) {
      return null;
    }
    return this.steps[this.currentIndex()] ?? null;
  }

  canAdvance(sessionRole: DemoTourRole): boolean {
    const step = this.currentStep();
    if (!step?.requireRole) {
      return true;
    }
    return step.requireRole === sessionRole;
  }

  gateHint(sessionRole: DemoTourRole): string | null {
    const step = this.currentStep();
    if (!step?.requireRole || step.requireRole === sessionRole) {
      return null;
    }
    if (step.requireRole === 'employee') {
      return 'Primero pulsa «Empleado (Laura)» en el banner morado de arriba.';
    }
    return 'Primero pulsa «Administrador» en el banner morado de arriba.';
  }

  onDemoRoleChanged(role: DemoTourRole): void {
    if (!this.active()) {
      return;
    }
    const step = this.currentStep();
    if (!step) {
      return;
    }
    if (
      role === 'employee' &&
      (step.id === 'empleados' || step.id === 'empleado-invitacion')
    ) {
      if (step.id === 'empleado-invitacion') {
        this.completeStep('empleado-invitacion');
      }
      this.goToStepId('empleado-panel-kpis');
    }
  }

  stepNumber(sessionRole: DemoTourRole): number {
    const step = this.currentStep();
    if (!step) {
      return 1;
    }
    const list = this.progressSteps(sessionRole);
    const idx = list.findIndex((s) => s.id === step.id);
    return idx >= 0 ? idx + 1 : 1;
  }

  totalSteps(sessionRole: DemoTourRole): number {
    return this.progressSteps(sessionRole).length;
  }

  progressSteps(sessionRole: DemoTourRole): DemoTourStep[] {
    if (sessionRole === 'employee') {
      return this.steps.filter(
        (s) =>
          s.audience !== 'admin' &&
          s.id !== 'empleado-invitacion' &&
          s.id !== 'empleado-volver-admin',
      );
    }
    return [...this.steps];
  }

  advanceNext(sessionRole: DemoTourRole): DemoTourStep | null {
    const step = this.currentStep();
    if (step && !this.canAdvance(sessionRole)) {
      return null;
    }
    if (step) {
      this.completeStep(step.id);
    }
    let idx = this.currentIndex();
    while (++idx < this.steps.length) {
      const candidate = this.steps[idx];
      if (this.isStepReachable(candidate, sessionRole)) {
        this.currentIndex.set(idx);
        return candidate;
      }
    }
    this.active.set(false);
    return null;
  }

  goToStepId(stepId: string): DemoTourStep | null {
    const idx = this.steps.findIndex((s) => s.id === stepId);
    if (idx < 0) {
      return null;
    }
    this.currentIndex.set(idx);
    this.active.set(true);
    this.dismissed.set(false);
    return this.steps[idx];
  }

  goToStepIdForRole(stepId: string, sessionRole: DemoTourRole): DemoTourStep | null {
    const step = this.goToStepId(stepId);
    if (!step || !this.isStepReachable(step, sessionRole)) {
      return null;
    }
    return step;
  }

  private isStepReachable(step: DemoTourStep, sessionRole: DemoTourRole): boolean {
    if (!step.audience || step.audience === 'all') {
      return true;
    }
    return step.audience === sessionRole;
  }

  private firstIndexForRole(role: DemoTourRole): number {
    const idx = this.steps.findIndex((s) => this.isStepReachable(s, role));
    return idx >= 0 ? idx : 0;
  }

  private loadProgress(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as { completed?: string[] };
      if (Array.isArray(parsed.completed)) {
        this.completed.set(new Set(parsed.completed));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ completed: [...this.completed()] }),
    );
  }
}
