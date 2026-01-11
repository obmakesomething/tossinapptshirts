import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Screen, TopBar, theme } from '../components/ui';
import { useCatalog } from '../context/catalog';

export const Route = createRoute('/products', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const { products, selectedProduct, setSelectedProductId } = useCatalog();
  const categoryOrder = ['티셔츠', '후드', '맨투맨', '에코백'];
  const grouped = products.reduce<Record<string, typeof products>>((acc, product) => {
    const key = product.category;
    acc[key] = acc[key] ?? [];
    acc[key].push(product);
    return acc;
  }, {});
  const categories = [
    ...categoryOrder.filter((category) => grouped[category]?.length),
    ...Object.keys(grouped).filter((category) => !categoryOrder.includes(category)),
  ];

  const handleSelect = (id: string) => {
    setSelectedProductId(id);
    navigation.goBack();
  };

  return (
    <Screen>
      <TopBar title="상품 선택" onBack={() => navigation.goBack()} />

      <Text style={styles.subtitle}>
        원하는 제품을 선택하세요.
      </Text>

      <View style={styles.list}>
        {categories.map((category) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category}</Text>
            {(grouped[category] ?? []).map((product) => (
              <Pressable
                key={product.id}
                onPress={() => handleSelect(product.id)}
                style={styles.cardPressable}
              >
                <Card
                  style={[
                    styles.card,
                    selectedProduct.id === product.id && styles.cardSelected,
                  ]}
                >
                  <Image source={product.mainImage} style={styles.thumbnail} resizeMode="cover" />
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{product.name}</Text>
                    <Text style={styles.cardMeta}>
                      색상 {product.colors.length} · 사이즈 {product.sizes.length}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            ))}
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
    marginBottom: theme.spacing.lg,
  },
  list: {
  },
  categorySection: {
    marginBottom: theme.spacing.lg,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
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
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.md,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
