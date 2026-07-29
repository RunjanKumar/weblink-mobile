/**
 * Module-level dialog bridge — lets viewmodels and screens request a dialog
 * without context plumbing, mirroring the toast emitter. DialogProvider
 * subscribes and renders. Replaces `Alert.alert`, which is an empty stub on
 * react-native-web (its buttons never fired on the TV).
 */
export interface DialogAction {
  label: string;
  /** Resolution value returned from showDialog. */
  value: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export interface DialogRequest {
  title: string;
  message?: string;
  actions: DialogAction[];
  /** Value resolved when the dialog is dismissed via backdrop/Back. */
  dismissValue?: string;
}

type Listener = (request: DialogRequest, resolve: (value: string) => void) => void;

let listener: Listener | null = null;

export function setDialogListener(next: Listener | null): void {
  listener = next;
}

/** Show a dialog; resolves with the pressed action's `value`. */
export function showDialog(request: DialogRequest): Promise<string> {
  return new Promise<string>(resolve => {
    if (!listener) {
      // Provider not mounted (should not happen) — resolve as dismissed so
      // callers never hang.
      resolve(request.dismissValue ?? 'cancel');
      return;
    }
    listener(request, resolve);
  });
}

export const dialog = {
  /** Two-button confirm; resolves true when the primary action is chosen. */
  async confirm(options: {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
  }): Promise<boolean> {
    const value = await showDialog({
      title: options.title,
      message: options.message,
      dismissValue: 'cancel',
      actions: [
        {label: options.cancelLabel ?? 'Cancel', value: 'cancel', variant: 'secondary'},
        {
          label: options.confirmLabel ?? 'OK',
          value: 'confirm',
          variant: options.destructive ? 'danger' : 'primary',
        },
      ],
    });
    return value === 'confirm';
  },

  /** Single-button informational dialog. */
  async alert(options: {title: string; message?: string; buttonLabel?: string}): Promise<void> {
    await showDialog({
      title: options.title,
      message: options.message,
      dismissValue: 'ok',
      actions: [{label: options.buttonLabel ?? 'OK', value: 'ok', variant: 'primary'}],
    });
  },

  /** Arbitrary action list (menu-style dialog). */
  show: showDialog,
};
