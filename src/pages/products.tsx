import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Card,
  Chip,
  ColorSwatch,
  PrimaryButton,
  Screen,
  TopBar,
  theme,
} from '../components/ui';
import { useCatalog } from '../context/catalog';
import { resolveColorValue } from '../data/colorMap';

export const Route = createRoute('/products', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const {
    products,
    selectedProduct,
    selectedColor,
    setSelectedProductId,
    setSelectedColor,
  } = useCatalog();
  const [expandedProductId, setExpandedProductId] = React.useState<
    string | null
  >(null);
  const [tempColor, setTempColor] = React.useState<string>('');
  const categoryOrder = ['티셔츠', '후드', '맨투맨', '에코백'];
  const grouped = products.reduce<Record<string, typeof products>>(
    (acc, product) => {
      const key = product.category;
      acc[key] = acc[key] ?? [];
      acc[key].push(product);
      return acc;
    },
    {},
  );
  const categories = [
    ...categoryOrder.filter((category) => grouped[category]?.length),
    ...Object.keys(grouped).filter(
      (category) => !categoryOrder.includes(category),
    ),
  ];

  const handleProductClick = (product: (typeof products)[0]) => {
    if (expandedProductId === product.id) {
      setExpandedProductId(null);
    } else {
      setExpandedProductId(product.id);
      setTempColor(product.colors[0] ?? '');
    }
  };

  const handleConfirm = () => {
    if (expandedProductId && tempColor) {
      setSelectedProductId(expandedProductId);
      setSelectedColor(tempColor);
      navigation.goBack();
    }
  };

  return (
    <Screen>
      <TopBar title="상품 선택" onBack={() => navigation.goBack()} />

      <Text style={styles.subtitle}>원하는 제품을 선택하세요.</Text>

      <View style={styles.list}>
        {categories.map((category) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {(grouped[category] ?? []).map((product) => {
              const isExpanded = expandedProductId === product.id;
              return (
                <View key={product.id} style={styles.cardPressable}>
                  <Pressable onPress={() => handleProductClick(product)}>
                    <Card
                      style={[
                        styles.card,
                        selectedProduct.id === product.id &&
                          styles.cardSelected,
                        isExpanded && styles.cardExpanded,
                      ]}
                    >
                      <Image
                        source={product.mainImage}
                        style={styles.thumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.cardBody}>
                        <Text style={styles.cardTitle}>{product.name}</Text>
                        <Text style={styles.cardMeta}>
                          색상 {product.colors.length} · 사이즈{' '}
                          {product.sizes.length}
                        </Text>
                      </View>
                    </Card>
                  </Pressable>
                  {isExpanded && (
                    <View style={styles.colorSection}>
                      <Text style={styles.colorTitle}>색상 선택</Text>
                      <View style={styles.colorRow}>
                        {product.colors.map((color) => (
                          <ColorSwatch
                            key={color}
                            label={color}
                            color={resolveColorValue(color)}
                            selected={tempColor === color}
                            onPress={() => setTempColor(color)}
                          />
                        ))}
                      </View>
                      <PrimaryButton
                        label="선택 완료"
                        onPress={handleConfirm}
                        disabled={!tempColor}
                        style={styles.confirmButton}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  list: {},
  categorySection: {
    marginBottom: theme.spacing.lg,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 22,
    marginBottom: theme.spacing.sm,
  },
  cardPressable: {
    marginBottom: theme.spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  cardExpanded: {
    borderColor: theme.colors.primary,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.md,
  },
  colorSection: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  colorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  confirmButton: {
    marginTop: theme.spacing.xs,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  cardMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
