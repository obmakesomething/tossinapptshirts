import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BottomSheet,
  Chip,
  ColorSwatch,
  PrimaryButton,
  theme,
} from './ui';
import { resolveColorValue } from '../data/colorMap';
import type { CatalogProduct } from '../data/catalog';
import { formatPrice } from '../utils/format';

type GarmentSheetProps = {
  visible: boolean;
  onClose: () => void;
  products: CatalogProduct[];
  product: CatalogProduct;
  selectedColor: string;
  onSelectProduct: (productId: string) => void;
  onSelectColor: (color: string) => void;
};

/**
 * The two choices that change what the mockup looks like, and only those.
 *
 * Garment and colour belong next to the design because you can see them on it.
 * Size and quantity cannot be seen on a flat mockup at all, so they are asked
 * once at the order screen instead of sitting on this one — the editor is for
 * looking at the shirt, not for filling in a form about it.
 */
export function GarmentSheet({
  visible,
  onClose,
  products,
  product,
  selectedColor,
  onSelectProduct,
  onSelectColor,
}: GarmentSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="옷 고르기">
      <Text style={styles.sectionTitle}>상품</Text>
      <View style={styles.row}>
        {products.map((item) => (
          <Chip
            key={item.id}
            label={`${item.name} ${formatPrice(item.price ?? 0)}`}
            selected={item.id === product.id}
            onPress={() => onSelectProduct(item.id)}
            style={styles.chip}
          />
        ))}
      </View>

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

      <View style={styles.spacer} />
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    marginRight: 0,
  },
  colorRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  spacer: {
    height: theme.spacing.xl,
  },
});
