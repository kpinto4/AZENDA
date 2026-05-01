import { Injectable, signal } from '@angular/core';

export type UiAlertKind = 'success' | 'info' | 'warning' | 'error' | 'confirm';

export interface UiAlertState {
  kind: UiAlertKind;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  dismissible: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

@Injectable({ providedIn: 'root' })
export class UiAlertService {
  readonly current = signal<UiAlertState | null>(null);

  show(payload: Partial<UiAlertState> & Pick<UiAlertState, 'kind' | 'message'>): void {
    const fallbackTitle = this.defaultTitle(payload.kind);
    this.current.set({
      kind: payload.kind,
      message: payload.message,
      title: payload.title ?? fallbackTitle,
      confirmText: payload.confirmText ?? 'Cerrar',
      cancelText: payload.cancelText,
      dismissible: payload.dismissible ?? true,
      onConfirm: payload.onConfirm,
      onCancel: payload.onCancel,
    });
  }

  success(message: string, title = 'Operacion exitosa'): void {
    this.show({ kind: 'success', title, message });
  }

  info(message: string, title = 'Informacion'): void {
    this.show({ kind: 'info', title, message });
  }

  warning(message: string, title = 'Advertencia'): void {
    this.show({ kind: 'warning', title, message });
  }

  error(message: string, title = 'Error'): void {
    this.show({ kind: 'error', title, message });
  }

  confirm(opts: { title?: string; message: string; confirmText?: string; cancelText?: string }): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.show({
        kind: 'confirm',
        title: opts.title ?? 'Confirmar',
        message: opts.message,
        confirmText: opts.confirmText ?? 'Aceptar',
        cancelText: opts.cancelText ?? 'Cancelar',
        dismissible: false,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }

  confirmCurrent(): void {
    const cur = this.current();
    if (!cur) {
      return;
    }
    this.current.set(null);
    cur.onConfirm?.();
  }

  cancelCurrent(): void {
    const cur = this.current();
    if (!cur) {
      return;
    }
    this.current.set(null);
    cur.onCancel?.();
  }

  close(): void {
    const cur = this.current();
    if (!cur?.dismissible) {
      return;
    }
    this.current.set(null);
  }

  private defaultTitle(kind: UiAlertKind): string {
    if (kind === 'success') {
      return 'Operacion exitosa';
    }
    if (kind === 'warning') {
      return 'Advertencia';
    }
    if (kind === 'error') {
      return 'Error';
    }
    if (kind === 'confirm') {
      return 'Confirmar';
    }
    return 'Informacion';
  }
}

