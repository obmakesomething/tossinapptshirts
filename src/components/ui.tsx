import React, { useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  View,
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
    textTertiary: '#94A3B8',
    border: '#E2E8F0',
    muted: '#94A3B8',
    success: '#16A34A',
    successSoft: '#ECFDF3',
    successBorder: '#BBF7D0',
    warning: '#F59E0B',
    error: '#DC2626',
    errorSoft: '#FEF2F2',
    errorBorder: '#FCA5A5',
    errorPressed: '#FECACA',
    info: '#3182F6',
    infoSoft: '#EFF6FF',
    infoBorder: '#BFDBFE',
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
  scrollEnabled?: boolean;
};

export function Screen({
  children,
  contentStyle,
  scrollEnabled = true,
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.container, contentStyle]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

type TopBarProps = {
  title: string;
  rightLabel?: string;
  onRightPress?: () => void;
};

export function TopBar({
  title,
  rightLabel,
  onRightPress,
}: TopBarProps) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarButton} />
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

export function PrimaryButton({
  label,
  onPress,
  disabled,
  style,
}: ButtonProps) {
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

export function SecondaryButton({
  label,
  onPress,
  disabled,
  style,
}: ButtonProps) {
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

export function DangerButton({ label, onPress, disabled, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.dangerButton,
        pressed && styles.dangerButtonPressed,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      <Text style={styles.dangerButtonText}>{label}</Text>
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

/* ── StickyFooter ─────────────────────────────────────── */

type StickyFooterProps = {
  children: React.ReactNode;
  fadeEnabled?: boolean;
};

export function StickyFooter({ children, fadeEnabled = true }: StickyFooterProps) {
  return (
    <View style={styles.stickyFooter}>
      {fadeEnabled && <View style={styles.stickyFooterFade} />}
      <View style={styles.stickyFooterInner}>{children}</View>
    </View>
  );
}

/* ── DisabledHint ─────────────────────────────────────── */

type DisabledHintProps = {
  text: string;
  visible?: boolean;
};

export function DisabledHint({ text, visible = true }: DisabledHintProps) {
  if (!visible) return null;
  return <Text style={styles.disabledHint}>{text}</Text>;
}

/* ── CollapsibleSection ───────────────────────────────── */

type CollapsibleSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.collapsible}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title} ${open ? '접기' : '펼치기'}`}
        onPress={() => setOpen((v) => !v)}
        style={styles.collapsibleHeader}
      >
        <Text style={styles.collapsibleTitle}>{title}</Text>
        <Text style={styles.collapsibleArrow}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && <View style={styles.collapsibleBody}>{children}</View>}
    </View>
  );
}

/* ── BottomSheet ──────────────────────────────────────── */

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <View />
      </Pressable>
      <View style={styles.sheetContainer}>
        <View style={styles.sheetHandleRow}>
          <View style={styles.sheetHandle} />
        </View>
        {title && (
          <View style={styles.sheetTitleRow}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="닫기">
              <Text style={styles.sheetClose}>✕</Text>
            </Pressable>
          </View>
        )}
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ── TabBar (for BottomSheet tabs) ────────────────────── */

type TabBarProps = {
  tabs: string[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
};

export function TabBar({ tabs, activeIndex, onChangeIndex }: TabBarProps) {
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab, i) => (
        <Pressable
          key={tab}
          accessibilityRole="tab"
          accessibilityLabel={tab}
          onPress={() => onChangeIndex(i)}
          style={[styles.tabItem, i === activeIndex && styles.tabItemActive]}
        >
          <Text style={[styles.tabText, i === activeIndex && styles.tabTextActive]}>
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  );
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
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
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
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    minHeight: 48,
  },
  secondaryButtonPressed: {
    backgroundColor: theme.colors.primarySoft,
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: theme.colors.errorBorder,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.errorSoft,
    minHeight: 48,
  },
  dangerButtonPressed: {
    backgroundColor: theme.colors.errorPressed,
  },
  dangerButtonText: {
    color: theme.colors.error,
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

  /* StickyFooter */
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  stickyFooterFade: {
    height: 24,
    backgroundColor: 'transparent',
    // RN doesn't support CSS gradients natively; approximate with a semi-transparent bar
    borderTopWidth: 0,
    opacity: 0.95,
  },
  stickyFooterInner: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },

  /* DisabledHint */
  disabledHint: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },

  /* CollapsibleSection */
  collapsible: {
    marginBottom: theme.spacing.md,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  collapsibleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  collapsibleArrow: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  collapsibleBody: {
    paddingTop: theme.spacing.sm,
  },

  /* BottomSheet */
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.7,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
  },
  sheetHandleRow: {
    alignItems: 'center',
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  sheetClose: {
    fontSize: 18,
    color: theme.colors.textTertiary,
    padding: theme.spacing.xs,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },

  /* TabBar */
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
});
