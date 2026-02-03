/**
 * Toast UI Component
 * 
 * Floating toast notifications with action buttons.
 */

import React from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { theme } from './ui';
import { type Toast, useToast } from '../context/toastContext';

const ToastItem: React.FC<{ toast: Toast; onDismiss: () => void }> = ({
    toast,
    onDismiss,
}) => {
    const getBackgroundColor = () => {
        switch (toast.type) {
            case 'success':
                return theme.colors.successSoft;
            case 'error':
                return theme.colors.errorSoft;
            case 'loading':
                return theme.colors.surface;
            default:
                return theme.colors.surface;
        }
    };

    const getBorderColor = () => {
        switch (toast.type) {
            case 'success':
                return theme.colors.successBorder;
            case 'error':
                return theme.colors.errorBorder;
            case 'loading':
                return theme.colors.border;
            default:
                return theme.colors.border;
        }
    };

    const getTextColor = () => {
        switch (toast.type) {
            case 'success':
                return theme.colors.success;
            case 'error':
                return theme.colors.error;
            default:
                return theme.colors.textPrimary;
        }
    };

    return (
        <View
            style={[
                styles.toast,
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor: getBorderColor(),
                },
            ]}
        >
            <View style={styles.content}>
                {toast.type === 'loading' && (
                    <Text style={styles.loadingIcon}>⏳</Text>
                )}
                {toast.type === 'success' && (
                    <Text style={styles.successIcon}>✓</Text>
                )}
                {toast.type === 'error' && (
                    <Text style={styles.errorIcon}>✕</Text>
                )}
                <Text style={[styles.message, { color: getTextColor() }]}>
                    {toast.message}
                </Text>
            </View>
            {toast.action && (
                <Pressable onPress={toast.action.onPress} style={styles.actionButton}>
                    <Text style={styles.actionText}>{toast.action.label}</Text>
                </Pressable>
            )}
            {!toast.action && toast.type !== 'loading' && (
                <Pressable onPress={onDismiss} style={styles.dismissButton}>
                    <Text style={styles.dismissText}>×</Text>
                </Pressable>
            )}
        </View>
    );
};

export function ToastContainer() {
    const { toasts, hideToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <View style={styles.container}>
            {toasts.map((toast) => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onDismiss={() => hideToast(toast.id)}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        zIndex: 9999,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    loadingIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    successIcon: {
        fontSize: 16,
        color: theme.colors.success,
        marginRight: 8,
        fontWeight: '700',
    },
    errorIcon: {
        fontSize: 16,
        color: theme.colors.error,
        marginRight: 8,
        fontWeight: '700',
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
    },
    actionButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: theme.colors.primary,
        borderRadius: 8,
        marginLeft: 12,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    dismissButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginLeft: 8,
    },
    dismissText: {
        fontSize: 20,
        color: theme.colors.textSecondary,
        fontWeight: '300',
    },
});
