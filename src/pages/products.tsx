import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Card,
  ColorSwatch,
  PageHeader,
  PrimaryButton,
  Screen,
  theme,
} from '../components/ui';
import { useCatalog } from '../context/catalog';
import { resolveColorValue } from '../data/colorMap';
import { trackClick, trackScreenView } from '../utils/analytics';

const ACCENT = '#2A6ED4';
const WARM_MID = '#FFF4E8';

export const Route = createRoute('/products', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const {
    products,
    selectedProduct,
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

  React.useEffect(() => {
    trackScreenView('products', {
      selected_product_id: selectedProduct.id,
      selected_category: selectedProduct.category,
    });
  }, []);

  const handleProductClick = (product: (typeof products)[0]) => {
    const nextAction = expandedProductId === product.id ? 'collapse' : 'expand';
    trackClick('products_product_card_click', {
      product_id: product.id,
      category: product.category,
      action: nextAction,
    });
    if (expandedProductId === product.id) {
      setExpandedProductId(null);
    } else {
      setExpandedProductId(product.id);
      setTempColor(product.colors[0] ?? '');
    }
  };

  const handleConfirm = () => {
    if (expandedProductId && tempColor) {
      trackClick('products_confirm_selection_click', {
        product_id: expandedProductId,
        color: tempColor,
      });
      setSelectedProductId(expandedProductId);
      setSelectedColor(tempColor);
      navigation.goBack();
    }
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      <PageHeader title="상품 선택" onBack={() => navigation.goBack()} />

      <Text style={styles.subtitle}>어떤 제품으로 만들어 볼까요?</Text>

      <View style={styles.list}>
        {categories.map((category) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {(grouped[category] ?? []).map((product) => {
              const isExpanded = expandedProductId === product.id;
              return (
                <View key={product.id} style={styles.cardPressable}>
                  <Pressable onPress={() => handleProductClick(product)}>
                    <Card style={[styles.card, selectedProduct.id === product.id && styles.cardSelected, isExpanded && styles.cardExpanded]}>
                      <Image
                        source={product.mainImage}
                        style={styles.thumbnail}
                        resizeMode="contain"
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
                      <Text style={styles.colorTitle}>어떤 색상으로 할까요?</Text>
                      <View style={styles.colorRow}>
                        {product.colors.map((color) => (
                          <ColorSwatch
                            key={color}
                            label={color}
                            color={resolveColorValue(color)}
                            selected={tempColor === color}
                            onPress={() => {
                              trackClick('products_color_swatch_click', {
                                product_id: product.id,
                                color,
                              });
                              setTempColor(color);
                            }}
                          />
                        ))}
                      </View>
                      <PrimaryButton
                        label="이 제품으로 할게요"
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
  screenContent: {
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E231B',
  },
  headerBack: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(240,223,207,0.92)',
    backgroundColor: 'rgba(255,244,232,0.92)',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerBackText: {
    fontSize: 12,
    color: '#7C6959',
    fontWeight: '700',
  },
  subtitle: {
    ...theme.typography.body,
    color: '#7C6959',
    marginBottom: theme.spacing.lg,
  },
  list: {},
  categorySection: {
    marginBottom: theme.spacing.lg,
  },
  categoryTitle: {
    ...theme.typography.subheading,
    color: '#2E231B',
    marginBottom: theme.spacing.sm,
  },
  cardPressable: {
    marginBottom: theme.spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(240,223,207,0.92)',
    borderWidth: 1,
    shadowColor: '#5F320E',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardSelected: {
    borderColor: ACCENT,
    backgroundColor: WARM_MID,
  },
  cardExpanded: {
    borderColor: ACCENT,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    shadowColor: '#5F320E',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  colorSection: {
    padding: theme.spacing.md,
    backgroundColor: WARM_MID,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(240,223,207,0.92)',
  },
  colorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E231B',
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
    backgroundColor: ACCENT,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    ...theme.typography.subheading,
    color: '#2E231B',
    marginBottom: theme.spacing.xs,
  },
  cardMeta: {
    ...theme.typography.caption,
    color: '#7C6959',
  },
});
