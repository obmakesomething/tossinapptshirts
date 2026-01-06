import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export const theme = {
  colors: {
    background: '#F2F5F9',
    surface: '#FFFFFF',
    primary: '#3182F6',
    primarySoft: '#E8F1FF',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    border: '#E2E8F0',
    muted: '#94A3B8',
    success: '#16A34A',
    warning: '#F59E0B',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
};

type ScreenProps = {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({ children, contentStyle }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.container, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

type TopBarProps = {
  title: string;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
};

export function TopBar({ title, onBack, rightLabel, onRightPress }: TopBarProps) {
  return (
    <View style={styles.topBar}>
      {onBack ? (
        <Pressable
          style={styles.topBarButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="뒤로"
        >
          <Text style={styles.topBarAction}>←</Text>
        </Pressable>
      ) : (
        <View style={styles.topBarButton} />
      )}
      <Text style={styles.topBarTitle}>{title}</Text>
      {rightLabel ? (
        <Pressable
          style={styles.topBarButton}
          onPress={onRightPress}
          accessibilityRole="button"
          accessibilityLabel={rightLabel}
        >
          <Text style={styles.topBarAction}>{rightLabel}</Text>
        </Pressable>
      ) : (
        <View style={styles.topBarButton} />
      )}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ label, onPress, disabled, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && styles.primaryButtonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondaryButton,
        pressed && styles.secondaryButtonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

export function Chip({ label, selected, onPress, style }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipDefault,
        style,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

type ColorSwatchProps = {
  label: string;
  color: string;
  selected?: boolean;
  onPress?: () => void;
};

export function ColorSwatch({
  label,
  color,
  selected,
  onPress,
}: ColorSwatchProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.swatchWrapper}
      accessibilityRole="button"
      accessibilityLabel={`${label} 색상`}
    >
      <View
        style={[
          styles.swatch,
          { backgroundColor: color },
          selected && styles.swatchSelected,
        ]}
      />
      <Text style={styles.swatchLabel}>{label}</Text>
    </Pressable>
  );
}

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  topBarButton: {
    width: 48,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarAction: {
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  secondaryButtonPressed: {
    backgroundColor: theme.colors.primarySoft,
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipDefault: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  chipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: theme.colors.primary,
  },
  swatchWrapper: {
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 6,
  },
  swatchSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  swatchLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
});
