/**
 * Toast Notification Context
 * 
 * Manages global toast notifications for the app.
 */

import React, {
    createContext,
    useCallback,
    useContext,
    useState,
} from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface ToastAction {
    label: string;
    onPress: () => void;
}

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    action?: ToastAction;
    duration?: number; // ms, 0 = persistent
}

interface ToastContextValue {
    toasts: Toast[];
    showToast: (toast: Omit<Toast, 'id'>) => string;
    hideToast: (id: string) => void;
    clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((toast: Omit<Toast, 'id'>): string => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const newToast: Toast = { ...toast, id };

        setToasts((prev) => [...prev, newToast]);

        // Auto-hide after duration (default 4s, 0 = persistent)
        const duration = toast.duration ?? 4000;
        if (duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, duration);
        }

        return id;
    }, []);

    const hideToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const clearAllToasts = useCallback(() => {
        setToasts([]);
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, showToast, hideToast, clearAllToasts }}>
            {children}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}
