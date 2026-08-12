import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import {
  BOTTOM_TAB_HEIGHT,
  BottomTabBar,
  type BottomTabKey,
  Card,
  PageHeader,
  PrimaryButton,
  Screen,
  theme,
} from '../components/ui';
import { useCatalog } from '../context/catalog';
import { printSizeByCategory } from '../data/mockupTemplates';
import { textRole } from '../utils/textRole';
import { trackClick, trackScreenView } from '../utils/analytics';


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

  const handleStartWith = (product: (typeof products)[0]) => {
    trackClick('products_start_with_product_click', {
      product_id: product.id,
      category: product.category,
    });
    setSelectedProductId(product.id);
    setSelectedColor(product.colors[0] ?? '');
    navigation.navigate('/editor');
  };

  const onSelectTab = (key: BottomTabKey) => {
    if (key === 'products') return;
    trackClick('bottom_tab_click', { tab: key, from: 'products' });
    navigation.navigate((key === 'home' ? '/' : '/my') as never);
  };

  return (
    <>
    <Screen contentStyle={styles.screenContent}>
      <PageHeader title="상품" onBack={() => navigation.goBack()} />

      <Text style={styles.subtitle} {...textRole('lead')}>
        모두 Printstar 제품이에요. 색상과 사이즈는 사진을 올린 뒤 고르면 돼요.
      </Text>

      <View style={styles.list}>
        {categories.map((category) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {(grouped[category] ?? []).map((product) => {
              return (
                <View key={product.id} style={styles.cardPressable}>
                  <Card style={styles.card}>
                    <View style={styles.cardTop}>
                      <Image
                        source={product.mainImage}
                        style={styles.thumbnail}
                        resizeMode="contain"
                      />
                      <View style={styles.cardBody}>
                        <Text style={styles.cardTitle}>
                          {product.name} {product.priceText}
                        </Text>
                        <Text style={styles.cardMeta}>{product.modelName}</Text>
                        <Text style={styles.cardMeta}>
                          {product.colors.join('·')} · {product.sizes[0]?.label}~
                          {product.sizes[product.sizes.length - 1]?.label}
                        </Text>
                        <Text style={styles.cardMeta}>
                          인쇄 영역 약 {printSizeByCategory[product.category]?.widthCm ?? 28}×
                          {printSizeByCategory[product.category]?.heightCm ?? 36}cm
                        </Text>
                      </View>
                    </View>
                    <PrimaryButton
                      label="이 옷으로 만들기"
                      onPress={() => handleStartWith(product)}
                      style={styles.startButton}
                    />
                  </Card>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </Screen>
    <BottomTabBar active="products" onSelect={onSelectTab} />
    </>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    backgroundColor: '#FFFFFF',
    paddingBottom: BOTTOM_TAB_HEIGHT + theme.spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#191F28',
  },
  headerBack: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    backgroundColor: '#F2F4F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerBackText: {
    fontSize: 12,
    color: '#4E5968',
    fontWeight: '700',
  },
  subtitle: {
    ...theme.typography.body,
    color: '#4E5968',
    marginBottom: theme.spacing.lg,
  },
  list: {},
  categorySection: {
    marginBottom: theme.spacing.lg,
  },
  categoryTitle: {
    ...theme.typography.subheading,
    color: '#191F28',
    marginBottom: theme.spacing.sm,
  },
  cardPressable: {
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#191F28',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    shadowColor: '#191F28',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    ...theme.typography.subheading,
    color: '#191F28',
    marginBottom: theme.spacing.xs,
  },
  cardMeta: {
    ...theme.typography.caption,
    color: '#4E5968',
  },
  startButton: {
    marginTop: theme.spacing.md,
  },
});
