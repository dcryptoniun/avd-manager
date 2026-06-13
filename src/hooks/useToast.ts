import { useState, useCallback } from 'react';
import type { ToastMessage } from '../lib/types';

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (type: ToastMessage['type'], message: string, duration: number = 4000) => {
      const id = `toast-${++toastIdCounter}`;
      const toast: ToastMessage = { id, type, message, duration };
      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (msg: string) => addToast('success', msg),
    [addToast]
  );

  const error = useCallback(
    (msg: string) => addToast('error', msg, 6000),
    [addToast]
  );

  const info = useCallback(
    (msg: string) => addToast('info', msg),
    [addToast]
  );

  const warning = useCallback(
    (msg: string) => addToast('warning', msg),
    [addToast]
  );

  return { toasts, addToast, removeToast, success, error, info, warning };
}
