import React, { useState } from 'react';
import {
  ActivityIndicator,
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
    // ── Warm-tone base (aligned with current-ait-preview.html) ──
    background: '#FFFAF5',
    surface: '#FFFFFF',
    surfaceSecondary: '#FFF4E8',
    // ── Accent ──
    primary: '#2A6ED4',
    primarySoft: '#E8F2FF',
    primaryPressed: '#2360B8',
    // ── Text (warm) ──
    textPrimary: '#2E231B',
    textSecondary: '#7C6959',
    textTertiary: '#7A6B5D',
    // ── Borders (warm) ──
    border: '#F0DFCF',
    muted: '#7A6B5D',
    // ── Semantic ──
    success: '#0EA76F',
    successSoft: '#E9F9F2',
    successBorder: '#AEE6CF',
    warning: '#F59E0B',
    error: '#D93025',
    errorSoft: '#FDEDEE',
    errorBorder: '#F6C2C2',
    errorPressed: '#FADFE0',
    info: '#2A6ED4',
    infoSoft: '#EAF2FF',
    infoBorder: '#BED3F1',
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
    sm: 6,
    md: 14,
    lg: 18,
    xl: 24,
  },
  typography: {
    display: { fontSize: 28, lineHeight: 36, fontWeight: '900' as const },
    heading: { fontSize: 20, lineHeight: 28, fontWeight: '800' as const },
    subheading: { fontSize: 16, lineHeight: 24, fontWeight: '700' as const },
    body: { fontSize: 14, lineHeight: 22, fontWeight: '400' as const },
    label: { fontSize: 13, lineHeight: 20, fontWeight: '600' as const },
    caption: { fontSize: 12, lineHeight: 18, fontWeight: '500' as const },
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Page Header ── */
type PageHeaderProps = {
  title: string;
  onBack: () => void;
};

export function PageHeader({ title, onBack }: PageHeaderProps) {
  return (
    <View style={styles.pageHeaderRow}>
      <Text style={styles.pageHeaderTitle}>{title}</Text>
      <Pressable onPress={onBack} style={styles.pageHeaderBack}>
        <Text style={styles.pageHeaderBackText}>이전</Text>
      </Pressable>
    </View>
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

type FullScreenLoaderProps = {
  visible: boolean;
  message?: string;
};

export function FullScreenLoader({ visible, message = '로딩 중...' }: FullScreenLoaderProps) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.fullScreenLoader}>
        <View style={styles.loaderContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loaderMessage}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

/* ── InfoBox ──────────────────────────────────────────── */

type InfoBoxProps = {
  children: React.ReactNode;
  type?: 'info' | 'warning' | 'success';
};

const infoBoxColors = {
  info: { bg: 'rgba(96,165,250,0.12)', border: '#60A5FA' },
  warning: { bg: 'rgba(251,191,36,0.12)', border: '#FBBF24' },
  success: { bg: 'rgba(74,222,128,0.12)', border: '#4ADE80' },
};

export function InfoBox({ children, type = 'info' }: InfoBoxProps) {
  const c = infoBoxColors[type];
  return (
    <View style={[styles.infoBox, { backgroundColor: c.bg, borderLeftColor: c.border }]}>
      {typeof children === 'string' ? (
        <Text style={styles.infoBoxText}>{children}</Text>
      ) : (
        children
      )}
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

  /* ── Primary Button ── */
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#5F320E',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  primaryButtonPressed: {
    backgroundColor: theme.colors.primaryPressed,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  /* ── Secondary Button (glassmorphic dark) ── */
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    minHeight: 48,
    shadowColor: '#5F320E',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  secondaryButtonPressed: {
    backgroundColor: '#FFE8D0',
  },
  secondaryButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },

  /* ── Danger Button ── */
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
    opacity: 0.45,
  },

  /* ── Chip ── */
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipDefault: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSecondary,
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

  /* ── ColorSwatch ── */
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

  /* ── Card ── */
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#5F320E',
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 5,
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
    color: theme.colors.textPrimary,
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
    backgroundColor: 'rgba(46, 35, 27, 0.34)',
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
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
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
    backgroundColor: '#DAC8BB',
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
    color: theme.colors.textSecondary,
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

  /* FullScreenLoader */
  fullScreenLoader: {
    flex: 1,
    backgroundColor: 'rgba(46, 35, 27, 0.56)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xxl,
    alignItems: 'center',
    minWidth: 200,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  loaderMessage: {
    marginTop: theme.spacing.lg,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },

  /* InfoBox */
  infoBox: {
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 15,
    borderRadius: 4,
  },
  infoBoxText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },

  /* PageHeader */
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  pageHeaderTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
  },
  pageHeaderBack: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSecondary,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pageHeaderBackText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
});

/* ── Badge ── */
type BadgeVariant = 'success' | 'warning' | 'error';
type BadgeProps = {
  variant: BadgeVariant;
  label: string;
};

const badgeConfig: Record<BadgeVariant, { bg: string; border: string; icon: string }> = {
  success: { bg: '#E9F9F2', border: '#AEE6CF', icon: '✅' },
  warning: { bg: '#FFF8E1', border: '#F5E6B8', icon: '⚠️' },
  error: { bg: '#FDEDEE', border: '#F6C2C2', icon: '❌' },
};

export function Badge({ variant, label }: BadgeProps) {
  const config = badgeConfig[variant];
  return (
    <View style={[badgeStyles.container, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Text style={badgeStyles.icon}>{config.icon}</Text>
      <Text style={badgeStyles.label}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  icon: { fontSize: 16, marginRight: 8 },
  label: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
});

/* ── ConfirmDialog ── */
type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={confirmStyles.overlay} onPress={onCancel}>
        <View style={confirmStyles.content}>
          <Text style={confirmStyles.title}>{title}</Text>
          <Text style={confirmStyles.message}>{message}</Text>
          <View style={confirmStyles.actions}>
            <Pressable style={confirmStyles.cancelBtn} onPress={onCancel}>
              <Text style={confirmStyles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={[confirmStyles.confirmBtn, destructive && confirmStyles.destructiveBtn]}
              onPress={onConfirm}
            >
              <Text style={[confirmStyles.confirmText, destructive && confirmStyles.destructiveText]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const confirmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
    width: '85%',
  },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 },
  message: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  cancelText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
  confirmBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: theme.colors.primary },
  confirmText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  destructiveBtn: { backgroundColor: theme.colors.error },
  destructiveText: { color: '#FFFFFF' },
});

/* ── Timeline ── */
type TimelineStep = {
  label: string;
  time?: string;
  completed: boolean;
};

type TimelineProps = {
  steps: TimelineStep[];
};

export function Timeline({ steps }: TimelineProps) {
  return (
    <View style={timelineStyles.container}>
      {steps.map((step, index) => (
        <View key={index} style={timelineStyles.row}>
          <View style={timelineStyles.dotCol}>
            <View style={[timelineStyles.dot, step.completed && timelineStyles.dotCompleted]} />
            {index < steps.length - 1 && (
              <View style={[timelineStyles.line, step.completed && timelineStyles.lineCompleted]} />
            )}
          </View>
          <View style={timelineStyles.content}>
            <Text style={[timelineStyles.label, step.completed && timelineStyles.labelCompleted]}>
              {step.label}
            </Text>
            {step.time ? <Text style={timelineStyles.time}>{step.time}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const timelineStyles = StyleSheet.create({
  container: { paddingVertical: 8 },
  row: { flexDirection: 'row', minHeight: 40 },
  dotCol: { width: 24, alignItems: 'center' },
  dot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#E8DCC0', borderWidth: 2, borderColor: '#E8DCC0',
  },
  dotCompleted: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  line: { width: 2, flex: 1, backgroundColor: '#E8DCC0' },
  lineCompleted: { backgroundColor: theme.colors.primary },
  content: { flex: 1, paddingLeft: 12, paddingBottom: 8 },
  label: { fontSize: 14, color: theme.colors.textTertiary },
  labelCompleted: { color: theme.colors.textPrimary, fontWeight: '600' },
  time: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
});
