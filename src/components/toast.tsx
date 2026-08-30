/**
 * Toast UI Component
 *
 * Floating toast notifications with action buttons.
 * Dark neutral pill so it reads on any screen background;
 * status is carried by a colored dot rather than the whole surface.
 */

import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { CloseIcon, theme } from './ui';
import { type Toast, useToast } from '../context/toastContext';

const statusDotColor: Record<string, string> = {
    success: '#3DD68C',
    error: '#FF6B78',
    loading: theme.colors.textTertiary,
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: () => void }> = ({
    toast,
    onDismiss,
}) => {
    return (
        <View style={styles.toast}>
            <View style={styles.content}>
                {toast.type === 'loading' ? (
                    <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                        style={styles.spinner}
                    />
                ) : (
                    <View
                        style={[
                            styles.statusDot,
                            { backgroundColor: statusDotColor[toast.type] ?? '#FFFFFF' },
                        ]}
                    />
                )}
                <Text style={styles.message} numberOfLines={3}>
                    {toast.message}
                </Text>
            </View>
            {toast.action && (
                <Pressable
                    onPress={toast.action.onPress}
                    style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={toast.action.label}
                >
                    <Text style={styles.actionText}>{toast.action.label}</Text>
                </Pressable>
            )}
            {!toast.action && toast.type !== 'loading' && (
                <Pressable
                    onPress={onDismiss}
                    style={styles.dismissButton}
                    accessibilityRole="button"
                    accessibilityLabel="알림 닫기"
                    hitSlop={8}
                >
                    <CloseIcon size={12} color="#B0B8C1" />
                </Pressable>
            )}
        </View>
    );
};

export function ToastContainer() {
    const { toasts, hideToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <View style={styles.container} pointerEvents="box-none">
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
        minHeight: 52,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: theme.radius.lg,
        marginBottom: 8,
        backgroundColor: 'rgba(25, 31, 40, 0.94)',
        shadowColor: '#191F28',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 8,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 10,
    },
    spinner: {
        marginRight: 10,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
        letterSpacing: -0.2,
        color: '#FFFFFF',
        flex: 1,
    },
    actionButton: {
        paddingVertical: 7,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        borderRadius: theme.radius.sm,
        marginLeft: 12,
    },
    pressed: {
        opacity: 0.7,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    dismissButton: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
});
