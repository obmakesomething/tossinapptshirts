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
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';

/**
 * Design tokens — Toss-native neutral.
 * Grayscale surfaces, single blue accent, minimal elevation.
 * Text colors are AA-verified against the surface they sit on.
 */
export const theme = {
  colors: {
    // ── Surfaces ──
    background: '#F2F4F6',
    surface: '#FFFFFF',
    surfaceSecondary: '#F2F4F6',
    surfacePressed: '#EDF0F3',
    // ── Accent ──
    primary: '#1B64DA', // fills + text (white on this = 5.4:1)
    primaryBright: '#3182F6', // decorative only (borders, dots, focus)
    primarySoft: '#E8F3FF',
    primaryPressed: '#154FB0',
    // ── Text ──
    textPrimary: '#191F28',
    textSecondary: '#4E5968',
    textTertiary: '#8B95A1',
    textDisabled: '#B0B8C1',
    // ── Lines ──
    border: '#E5E8EB',
    divider: '#F2F4F6',
    muted: '#8B95A1',
    // ── Semantic ──
    success: '#0F8A5F',
    successSoft: '#E8F8F1',
    successBorder: '#B5E6D0',
    warning: '#B26A00',
    warningSoft: '#FFF6E5',
    error: '#E02D3C',
    errorSoft: '#FEECEE',
    errorBorder: '#F7C6CB',
    errorPressed: '#FBD9DD',
    info: '#1B64DA',
    infoSoft: '#E8F3FF',
    infoBorder: '#C4DDFB',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 999,
  },
  typography: {
    display: { fontSize: 26, lineHeight: 36, fontWeight: '700' as const, letterSpacing: -0.6 },
    heading: { fontSize: 20, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.4 },
    subheading: { fontSize: 17, lineHeight: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
    body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const, letterSpacing: -0.2 },
    bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const, letterSpacing: -0.2 },
    label: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const, letterSpacing: -0.1 },
    caption: { fontSize: 12, lineHeight: 17, fontWeight: '500' as const, letterSpacing: 0 },
  },
  /** Elevation is intentionally near-flat — separation comes from surface color. */
  shadow: {
    none: {},
    card: {
      shadowColor: '#191F28',
      shadowOpacity: 0.04,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    raised: {
      shadowColor: '#191F28',
      shadowOpacity: 0.08,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    footer: {
      shadowColor: '#191F28',
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: -4 },
      elevation: 8,
    },
  },
};

/* ── Chevron ──────────────────────────────────────────── */

type ChevronProps = {
  direction?: 'up' | 'down' | 'left' | 'right';
  size?: number;
  color?: string;
};

const chevronRotation = {
  down: '45deg',
  up: '-135deg',
  right: '-45deg',
  left: '135deg',
} as const;

export function Chevron({
  direction = 'down',
  size = 8,
  color = theme.colors.textTertiary,
}: ChevronProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRightWidth: 1.8,
        borderBottomWidth: 1.8,
        borderColor: color,
        transform: [{ rotate: chevronRotation[direction] }],
      }}
    />
  );
}

/* ── CloseIcon ────────────────────────────────────────── */

export function CloseIcon({ size = 14, color = theme.colors.textSecondary }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: 1.8,
          backgroundColor: color,
          borderRadius: 1,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size,
          height: 1.8,
          backgroundColor: color,
          borderRadius: 1,
          transform: [{ rotate: '-45deg' }],
        }}
      />
    </View>
  );
}

/* ── Screen ───────────────────────────────────────────── */

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

/* ── Page Header ──────────────────────────────────────── */

type PageHeaderProps = {
  title: string;
  onBack: () => void;
  subtitle?: string;
};

export function PageHeader({ title, onBack, subtitle }: PageHeaderProps) {
  return (
    <View style={styles.pageHeader}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.pageHeaderBack, pressed && styles.pageHeaderBackPressed]}
        accessibilityRole="button"
        accessibilityLabel="이전 화면으로"
        hitSlop={8}
      >
        <Chevron direction="left" size={10} color={theme.colors.textPrimary} />
      </Pressable>
      <Text style={styles.pageHeaderTitle}>{title}</Text>
      {subtitle ? <Text style={styles.pageHeaderSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/* ── SectionTitle ─────────────────────────────────────── */

type SectionTitleProps = {
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
};

export function SectionTitle({ title, description, action, style }: SectionTitleProps) {
  return (
    <View style={[styles.sectionTitleWrap, style]}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitleText}>{title}</Text>
        {action ? (
          <Pressable onPress={action.onPress} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.sectionTitleAction}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {description ? <Text style={styles.sectionTitleDesc}>{description}</Text> : null}
    </View>
  );
}

/* ── TopBar ───────────────────────────────────────────── */

type TopBarProps = {
  title: string;
  rightLabel?: string;
  onRightPress?: () => void;
};

export function TopBar({ title, rightLabel, onRightPress }: TopBarProps) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarButton} />
      <Text style={styles.topBarTitle} numberOfLines={1}>
        {title}
      </Text>
      {rightLabel ? (
        <Pressable
          style={styles.topBarButton}
          onPress={onRightPress}
          accessibilityRole="button"
          accessibilityLabel={rightLabel}
          hitSlop={8}
        >
          <Text style={styles.topBarAction}>{rightLabel}</Text>
        </Pressable>
      ) : (
        <View style={styles.topBarButton} />
      )}
    </View>
  );
}

/* ── Buttons ──────────────────────────────────────────── */

type ButtonSize = 'lg' | 'md' | 'sm';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
};

const buttonSizes: Record<ButtonSize, { height: number; radius: number; fontSize: number }> = {
  lg: { height: 56, radius: theme.radius.lg, fontSize: 17 },
  md: { height: 48, radius: theme.radius.md, fontSize: 15 },
  sm: { height: 38, radius: theme.radius.sm, fontSize: 14 },
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  size = 'lg',
  style,
}: ButtonProps) {
  const s = buttonSizes[size];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.buttonBase,
        { height: s.height, borderRadius: s.radius },
        styles.primaryButton,
        pressed && styles.primaryButtonPressed,
        disabled && styles.primaryButtonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text
          style={[
            styles.primaryButtonText,
            { fontSize: s.fontSize },
            disabled && styles.buttonTextDisabled,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  loading,
  size = 'lg',
  style,
}: ButtonProps) {
  const s = buttonSizes[size];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.buttonBase,
        { height: s.height, borderRadius: s.radius },
        styles.secondaryButton,
        pressed && styles.secondaryButtonPressed,
        disabled && styles.secondaryButtonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
      ) : (
        <Text
          style={[
            styles.secondaryButtonText,
            { fontSize: s.fontSize },
            disabled && styles.buttonTextDisabled,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function DangerButton({ label, onPress, disabled, size = 'lg', style }: ButtonProps) {
  const s = buttonSizes[size];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.buttonBase,
        { height: s.height, borderRadius: s.radius },
        styles.dangerButton,
        pressed && styles.dangerButtonPressed,
        disabled && styles.secondaryButtonDisabled,
        style,
      ]}
    >
      <Text style={[styles.dangerButtonText, { fontSize: s.fontSize }, disabled && styles.buttonTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ── Chip ─────────────────────────────────────────────── */

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
      accessibilityState={{ selected: Boolean(selected) }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : styles.chipDefault,
        pressed && !selected && styles.chipPressed,
        style,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

/* ── ColorSwatch ──────────────────────────────────────── */

type ColorSwatchProps = {
  label: string;
  color: string;
  selected?: boolean;
  onPress?: () => void;
};

export function ColorSwatch({ label, color, selected, onPress }: ColorSwatchProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.swatchWrapper}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      accessibilityLabel={`${label} 색상`}
    >
      <View style={[styles.swatchRing, selected && styles.swatchRingSelected]}>
        <View style={[styles.swatch, { backgroundColor: color }]} />
      </View>
      <Text style={[styles.swatchLabel, selected && styles.swatchLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

/* ── Card ─────────────────────────────────────────────── */

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** flat: no shadow, used inside already-elevated surfaces */
  flat?: boolean;
};

export function Card({ children, style, flat }: CardProps) {
  return <View style={[styles.card, !flat && theme.shadow.card, style]}>{children}</View>;
}

/* ── ListRow ──────────────────────────────────────────── */

type ListRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
  valueStyle?: StyleProp<TextStyle>;
};

export function ListRow({ label, value, onPress, last, valueStyle }: ListRowProps) {
  const content = (
    <View style={[styles.listRow, last && styles.listRowLast]}>
      <Text style={styles.listRowLabel}>{label}</Text>
      <View style={styles.listRowRight}>
        {value ? <Text style={[styles.listRowValue, valueStyle]}>{value}</Text> : null}
        {onPress ? <Chevron direction="right" size={7} /> : null}
      </View>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => pressed && styles.listRowPressed}
    >
      {content}
    </Pressable>
  );
}

/* ── StickyFooter ─────────────────────────────────────── */

type StickyFooterProps = {
  children: React.ReactNode;
  fadeEnabled?: boolean;
};

export function StickyFooter({ children, fadeEnabled = true }: StickyFooterProps) {
  return (
    <View style={[styles.stickyFooter, fadeEnabled && theme.shadow.footer]}>
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
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title} ${open ? '접기' : '펼치기'}`}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [styles.collapsibleHeader, pressed && styles.collapsibleHeaderPressed]}
      >
        <Text style={styles.collapsibleTitle}>{title}</Text>
        <Chevron direction={open ? 'up' : 'down'} size={8} />
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
      <Pressable style={styles.sheetOverlay} onPress={onClose} accessibilityLabel="닫기">
        <View />
      </Pressable>
      <View style={styles.sheetContainer}>
        <View style={styles.sheetHandleRow}>
          <View style={styles.sheetHandle} />
        </View>
        {title && (
          <View style={styles.sheetTitleRow}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="닫기"
              hitSlop={10}
              style={styles.sheetCloseButton}
            >
              <CloseIcon />
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

/* ── TabBar ───────────────────────────────────────────── */

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
          accessibilityState={{ selected: i === activeIndex }}
          accessibilityLabel={tab}
          onPress={() => onChangeIndex(i)}
          style={[styles.tabItem, i === activeIndex && styles.tabItemActive]}
        >
          <Text style={[styles.tabText, i === activeIndex && styles.tabTextActive]}>{tab}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ── SegmentedControl ─────────────────────────────────── */

export function SegmentedControl({ tabs, activeIndex, onChangeIndex }: TabBarProps) {
  return (
    <View style={styles.segmented}>
      {tabs.map((tab, i) => (
        <Pressable
          key={tab}
          accessibilityRole="tab"
          accessibilityState={{ selected: i === activeIndex }}
          onPress={() => onChangeIndex(i)}
          style={[styles.segmentedItem, i === activeIndex && styles.segmentedItemActive]}
        >
          <Text style={[styles.segmentedText, i === activeIndex && styles.segmentedTextActive]}>
            {tab}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ── BottomTabBar ─────────────────────────────────────── */

export type BottomTabKey = 'home' | 'products' | 'my';

type BottomTabBarProps = {
  active: BottomTabKey;
  onSelect: (key: BottomTabKey) => void;
};

/** Height reserved so screen content is not hidden behind the fixed bar. */
export const BOTTOM_TAB_HEIGHT = 64;

const bottomTabs: { key: BottomTabKey; label: string }[] = [
  { key: 'home', label: '홈' },
  { key: 'products', label: '상품' },
  { key: 'my', label: '마이' },
];

/**
 * Fixed bottom navigation.
 *
 * Granite renders each route as its own screen with no persistent shell, so
 * this is placed on the tab destinations themselves rather than wrapping them.
 * Flow screens (editor, order, …) deliberately do not show it.
 *
 * The glyphs are drawn from views rather than an icon font so they render
 * identically everywhere.
 */
export function BottomTabBar({ active, onSelect }: BottomTabBarProps) {
  return (
    <View style={bottomTabStyles.bar}>
      {bottomTabs.map((tab) => {
        const selected = tab.key === active;
        const color = selected ? theme.colors.primary : theme.colors.textTertiary;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            style={bottomTabStyles.item}
          >
            <View style={bottomTabStyles.glyphBox}>
              <TabGlyph tabKey={tab.key} color={color} selected={selected} />
            </View>
            <Text style={[bottomTabStyles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabGlyph({
  tabKey,
  color,
  selected,
}: {
  tabKey: BottomTabKey;
  color: string;
  selected: boolean;
}) {
  const weight = selected ? 2.2 : 1.8;

  if (tabKey === 'home') {
    // A roof over a body.
    return (
      <View style={bottomTabStyles.glyph}>
        <View
          style={{
            width: 13,
            height: 13,
            borderTopWidth: weight,
            borderLeftWidth: weight,
            borderColor: color,
            transform: [{ rotate: '45deg' }],
            marginBottom: -5,
          }}
        />
        <View
          style={{
            width: 15,
            height: 9,
            borderWidth: weight,
            borderTopWidth: 0,
            borderColor: color,
            borderBottomLeftRadius: 2,
            borderBottomRightRadius: 2,
          }}
        />
      </View>
    );
  }

  if (tabKey === 'products') {
    // A shirt: collar notch above a boxy body.
    return (
      <View style={bottomTabStyles.glyph}>
        <View
          style={{
            width: 8,
            height: 8,
            borderBottomWidth: weight,
            borderLeftWidth: weight,
            borderRightWidth: weight,
            borderColor: color,
            borderBottomLeftRadius: 4,
            borderBottomRightRadius: 4,
            marginBottom: -1,
          }}
        />
        <View
          style={{
            width: 16,
            height: 12,
            borderWidth: weight,
            borderColor: color,
            borderRadius: 3,
          }}
        />
      </View>
    );
  }

  // Person: head above shoulders.
  return (
    <View style={bottomTabStyles.glyph}>
      <View
        style={{
          width: 9,
          height: 9,
          borderRadius: 5,
          borderWidth: weight,
          borderColor: color,
          marginBottom: 2,
        }}
      />
      <View
        style={{
          width: 16,
          height: 8,
          borderWidth: weight,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      />
    </View>
  );
}

const bottomTabStyles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BOTTOM_TAB_HEIGHT,
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingBottom: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  glyphBox: {
    height: 22,
    justifyContent: 'flex-end',
  },
  glyph: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginTop: 4,
  },
});

/* ── FullScreenLoader ─────────────────────────────────── */

type FullScreenLoaderProps = {
  visible: boolean;
  message?: string;
  description?: string;
};

export function FullScreenLoader({
  visible,
  message = '로딩 중...',
  description,
}: FullScreenLoaderProps) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.fullScreenLoader}>
        <View style={styles.loaderContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loaderMessage}>{message}</Text>
          {description ? <Text style={styles.loaderDescription}>{description}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

/* ── InfoBox ──────────────────────────────────────────── */

type InfoBoxProps = {
  children: React.ReactNode;
  type?: 'info' | 'warning' | 'success' | 'neutral';
};

const infoBoxColors = {
  info: { bg: theme.colors.infoSoft, text: theme.colors.textSecondary },
  warning: { bg: theme.colors.warningSoft, text: theme.colors.textSecondary },
  success: { bg: theme.colors.successSoft, text: theme.colors.textSecondary },
  neutral: { bg: theme.colors.surfaceSecondary, text: theme.colors.textSecondary },
};

export function InfoBox({ children, type = 'info' }: InfoBoxProps) {
  const c = infoBoxColors[type];
  return (
    <View style={[styles.infoBox, { backgroundColor: c.bg }]}>
      {typeof children === 'string' ? (
        <Text style={[styles.infoBoxText, { color: c.text }]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

/* ── Badge ────────────────────────────────────────────── */

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';
type BadgeProps = {
  variant: BadgeVariant;
  label: string;
  /** dot: pill with a leading status dot. plain: text-only pill. */
  dot?: boolean;
};

const badgeConfig: Record<BadgeVariant, { bg: string; fg: string }> = {
  success: { bg: theme.colors.successSoft, fg: theme.colors.success },
  warning: { bg: theme.colors.warningSoft, fg: theme.colors.warning },
  error: { bg: theme.colors.errorSoft, fg: theme.colors.error },
  info: { bg: theme.colors.infoSoft, fg: theme.colors.info },
  neutral: { bg: theme.colors.surfaceSecondary, fg: theme.colors.textSecondary },
};

export function Badge({ variant, label, dot = true }: BadgeProps) {
  const config = badgeConfig[variant];
  return (
    <View style={[badgeStyles.container, { backgroundColor: config.bg }]}>
      {dot ? <View style={[badgeStyles.dot, { backgroundColor: config.fg }]} /> : null}
      <Text style={[badgeStyles.label, { color: config.fg }]}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
});

/* ── EmptyState ───────────────────────────────────────── */

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateMark} />
      <Text style={styles.emptyStateTitle}>{title}</Text>
      {description ? <Text style={styles.emptyStateDesc}>{description}</Text> : null}
      {action ? (
        <PrimaryButton label={action.label} onPress={action.onPress} size="md" style={styles.emptyStateAction} />
      ) : null}
    </View>
  );
}

/* ── Skeleton ─────────────────────────────────────────── */

export function Skeleton({
  height = 16,
  width,
  radius = theme.radius.sm,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { height, width: width ?? '100%', borderRadius: radius, backgroundColor: '#EDF0F3' },
        style,
      ]}
    />
  );
}

/* ── ConfirmDialog ────────────────────────────────────── */

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
      <View style={confirmStyles.overlay}>
        <Pressable style={confirmStyles.overlayFill} onPress={onCancel} accessibilityLabel="닫기" />
        <View style={confirmStyles.content}>
          <Text style={confirmStyles.title}>{title}</Text>
          <Text style={confirmStyles.message}>{message}</Text>
          <View style={confirmStyles.actions}>
            <Pressable
              style={({ pressed }) => [confirmStyles.cancelBtn, pressed && confirmStyles.cancelBtnPressed]}
              onPress={onCancel}
              accessibilityRole="button"
            >
              <Text style={confirmStyles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                confirmStyles.confirmBtn,
                destructive && confirmStyles.destructiveBtn,
                pressed && confirmStyles.confirmBtnPressed,
              ]}
              onPress={onConfirm}
              accessibilityRole="button"
            >
              <Text style={confirmStyles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const confirmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(25, 31, 40, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  overlayFill: { ...StyleSheet.absoluteFillObject },
  content: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  actions: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnPressed: { backgroundColor: '#E5E8EB' },
  cancelText: { fontSize: 15, fontWeight: '700', color: theme.colors.textSecondary },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnPressed: { opacity: 0.85 },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  destructiveBtn: { backgroundColor: theme.colors.error },
});

/* ── Timeline ─────────────────────────────────────────── */

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
        <View key={`${step.label}-${index}`} style={timelineStyles.row}>
          <View style={timelineStyles.dotCol}>
            <View style={[timelineStyles.dot, step.completed && timelineStyles.dotCompleted]}>
              {step.completed ? <View style={timelineStyles.dotInner} /> : null}
            </View>
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
  container: { paddingVertical: 4 },
  row: { flexDirection: 'row', minHeight: 48 },
  dotCol: { width: 24, alignItems: 'center' },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCompleted: { backgroundColor: theme.colors.primary },
  dotInner: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFFFFF' },
  line: { width: 2, flex: 1, backgroundColor: theme.colors.border, marginVertical: 2 },
  lineCompleted: { backgroundColor: theme.colors.primary },
  content: { flex: 1, paddingLeft: 12, paddingBottom: 16 },
  label: { ...theme.typography.body, color: theme.colors.textTertiary },
  labelCompleted: { color: theme.colors.textPrimary, fontWeight: '700' },
  time: { ...theme.typography.caption, color: theme.colors.textTertiary, marginTop: 2 },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: theme.spacing.xl,
    paddingBottom: 40,
  },

  /* ── TopBar ── */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    marginBottom: theme.spacing.md,
  },
  topBarButton: {
    minWidth: 48,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarAction: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  topBarTitle: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },

  /* ── PageHeader ── */
  pageHeader: {
    marginBottom: theme.spacing.xl,
  },
  pageHeaderBack: {
    width: 40,
    height: 40,
    marginLeft: -10,
    marginBottom: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
  },
  pageHeaderBackPressed: {
    backgroundColor: theme.colors.surfacePressed,
  },
  pageHeaderTitle: {
    ...theme.typography.display,
    color: theme.colors.textPrimary,
  },
  pageHeaderSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },

  /* ── SectionTitle ── */
  sectionTitleWrap: {
    marginBottom: theme.spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleText: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
  },
  sectionTitleAction: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  sectionTitleDesc: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  /* ── Buttons ── */
  buttonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  primaryButtonPressed: {
    backgroundColor: theme.colors.primaryPressed,
  },
  primaryButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  secondaryButton: {
    backgroundColor: '#EDF0F3',
  },
  secondaryButtonPressed: {
    backgroundColor: '#E1E5E9',
  },
  secondaryButtonDisabled: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  secondaryButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  dangerButton: {
    backgroundColor: theme.colors.errorSoft,
  },
  dangerButtonPressed: {
    backgroundColor: theme.colors.errorPressed,
  },
  dangerButtonText: {
    color: theme.colors.error,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  buttonTextDisabled: {
    color: theme.colors.textDisabled,
  },

  /* ── Chip ── */
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    justifyContent: 'center',
  },
  chipDefault: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipPressed: {
    backgroundColor: theme.colors.surfacePressed,
  },
  chipSelected: {
    borderColor: theme.colors.primaryBright,
    backgroundColor: theme.colors.primarySoft,
  },
  chipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  chipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },

  /* ── ColorSwatch ── */
  swatchWrapper: {
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  swatchRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 6,
  },
  swatchRingSelected: {
    borderColor: theme.colors.primaryBright,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  swatchLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textTertiary,
  },
  swatchLabelSelected: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },

  /* ── Card ── */
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
  },

  /* ── ListRow ── */
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  listRowPressed: {
    opacity: 0.6,
  },
  listRowLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  listRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  listRowValue: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    textAlign: 'right',
  },

  /* ── StickyFooter ── */
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
  },
  stickyFooterInner: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },

  /* ── DisabledHint ── */
  disabledHint: {
    ...theme.typography.label,
    fontWeight: '500',
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },

  /* ── CollapsibleSection ── */
  collapsible: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: theme.spacing.lg,
  },
  collapsibleHeaderPressed: {
    opacity: 0.6,
  },
  collapsibleTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  collapsibleBody: {
    paddingBottom: theme.spacing.lg,
  },

  /* ── BottomSheet ── */
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(25, 31, 40, 0.5)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.78,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xxl,
    borderTopRightRadius: theme.radius.xxl,
  },
  sheetHandleRow: {
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D6DB',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },
  sheetTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
  },
  sheetCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },

  /* ── TabBar ── */
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.textPrimary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    letterSpacing: -0.2,
  },
  tabTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },

  /* ── SegmentedControl ── */
  segmented: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    padding: 4,
  },
  segmentedItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: theme.radius.sm,
  },
  segmentedItemActive: {
    backgroundColor: theme.colors.surface,
    ...theme.shadow.card,
  },
  segmentedText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  segmentedTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },

  /* ── FullScreenLoader ── */
  fullScreenLoader: {
    flex: 1,
    backgroundColor: 'rgba(25, 31, 40, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loaderContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    minWidth: 220,
    ...theme.shadow.raised,
  },
  loaderMessage: {
    marginTop: theme.spacing.lg,
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  loaderDescription: {
    marginTop: theme.spacing.xs,
    ...theme.typography.label,
    fontWeight: '500',
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },

  /* ── InfoBox ── */
  infoBox: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  infoBoxText: {
    ...theme.typography.body,
  },

  /* ── EmptyState ── */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyStateMark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceSecondary,
    marginBottom: theme.spacing.lg,
  },
  emptyStateTitle: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptyStateDesc: {
    ...theme.typography.body,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  emptyStateAction: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xxl,
  },
});
