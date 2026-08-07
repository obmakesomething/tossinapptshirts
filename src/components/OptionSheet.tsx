import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomSheet,
  Chip,
  ColorSwatch,
  PrimaryButton,
  theme,
} from './ui';
import { resolveColorValue } from '../data/colorMap';
import type { CatalogProduct } from '../data/catalog';
import type { OrderLine } from '../context/catalog';
import { formatPrice } from '../utils/format';

type OptionSheetProps = {
  visible: boolean;
  onClose: () => void;
  product: CatalogProduct;
  selectedColor: string;
  orderLines: OrderLine[];
  total: number;
  onSelectColor: (color: string) => void;
  onAddSize: (sizeLabel: string) => void;
  onChangeQuantity: (lineId: string, quantity: number) => void;
  onRemoveLine: (lineId: string) => void;
};

/**
 * Colour, size and quantity, in one place, over the design being bought.
 *
 * These three used to live behind 옵션 수정하기 on the order screen — the
 * customer designed a shirt, went to pay, and only there discovered which size
 * they were buying. Choosing is now done next to the result, with the running
 * total in view, so nothing about the order is a surprise at the till.
 */
export function OptionSheet({
  visible,
  onClose,
  product,
  selectedColor,
  orderLines,
  total,
  onSelectColor,
  onAddSize,
  onChangeQuantity,
  onRemoveLine,
}: OptionSheetProps) {
  const unchosenSizes = product.sizes.filter(
    (size) => !orderLines.some((line) => line.sizeLabel === size.label),
  );

  return (
    <BottomSheet visible={visible} onClose={onClose} title="옵션 선택">
      <Text style={styles.sectionTitle}>색상</Text>
      <View style={styles.colorRow}>
        {product.colors.map((color) => (
          <ColorSwatch
            key={color}
            label={color}
            color={resolveColorValue(color)}
            selected={selectedColor === color}
            onPress={() => onSelectColor(color)}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>사이즈 · 수량</Text>
      {orderLines.length === 0 ? (
        <Text style={styles.emptyHint}>
          아래에서 사이즈를 골라주세요.
        </Text>
      ) : null}
      {orderLines.map((line) => {
        const size = product.sizes.find((s) => s.label === line.sizeLabel);
        return (
          <View key={line.id} style={styles.lineRow}>
            <View style={styles.lineLabel}>
              <Text style={styles.lineSize}>{line.sizeLabel}</Text>
              {size?.extraPrice ? (
                <Text style={styles.lineExtra}>
                  +{formatPrice(size.extraPrice)}
                </Text>
              ) : null}
            </View>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => {
                  if (line.quantity > 1) {
                    onChangeQuantity(line.id, line.quantity - 1);
                  } else {
                    onRemoveLine(line.id);
                  }
                }}
                style={styles.stepperButton}
                accessibilityRole="button"
                accessibilityLabel={`${line.sizeLabel} 수량 줄이기`}
              >
                <Text style={styles.stepperText}>−</Text>
              </Pressable>
              <Text style={styles.stepperValue}>{line.quantity}</Text>
              <Pressable
                onPress={() => onChangeQuantity(line.id, line.quantity + 1)}
                style={styles.stepperButton}
                accessibilityRole="button"
                accessibilityLabel={`${line.sizeLabel} 수량 늘리기`}
              >
                <Text style={styles.stepperText}>+</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      {unchosenSizes.length > 0 ? (
        <View style={styles.addSizeRow}>
          {unchosenSizes.map((size) => (
            <Chip
              key={size.label}
              label={size.label}
              onPress={() => onAddSize(size.label)}
              style={styles.addSizeChip}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>합계</Text>
        <Text style={styles.totalValue}>{formatPrice(total)}</Text>
      </View>
      <PrimaryButton label="적용" onPress={onClose} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...theme.typography.label,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  colorRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  emptyHint: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  lineLabel: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.sm,
  },
  lineSize: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  lineExtra: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  stepperValue: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  addSizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  addSizeChip: {
    marginRight: 0,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  totalValue: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
  },
});
