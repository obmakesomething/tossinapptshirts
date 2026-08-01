import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  InteractionManager,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MockupCanvas } from '../components/MockupCanvas';
import {
  BOTTOM_TAB_HEIGHT,
  Badge,
  BottomTabBar,
  type BottomTabKey,
  Card,
  Chevron,
  PrimaryButton,
  Screen,
  SectionTitle,
  theme,
} from '../components/ui';
import { useCatalog } from '../context/catalog';
import { faqCategories, faqItems } from '../data/faq';
import { buildTemplate } from '../data/mockupTemplates';
import { API_BASE_URL } from '../config';
import {
  resolveCategoryPreviewColor,
  syncCategoryColorMap,
} from './indexColorSelection';
import {
  trackClick,
  trackImpression,
  trackScreenView,
} from '../utils/analytics';

const CATEGORIES = ['티셔츠', '후드', '맨투맨'];
const MATERIAL_BY_CATEGORY: Record<string, string> = {
  티셔츠: '코튼 100%',
  후드: '코튼 52% · 폴리 48%',
  맨투맨: '코튼 52% · 폴리 48%',
};

const heroDesignImageUri = `${API_BASE_URL}/mockups/hero_design.png`;
// 통계는 실제 수치 확보 전까지 미노출

export const Route = createRoute('/', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const { width: screenWidth } = Dimensions.get('window');
  const carouselRef = React.useRef<FlatList<string> | null>(null);
  const {
    products,
    selectedProduct,
    selectedColor,
    setSelectedProductId,
    setSelectedColor,
  } = useCatalog();
  const [selectedCategory, setSelectedCategory] =
    React.useState<string>('티셔츠');
  const [selectedColorByCategory, setSelectedColorByCategory] = React.useState<
    Record<string, string>
  >({});
  const [interactionComplete, setInteractionComplete] = useState(false);
  const [expandedFaqMap, setExpandedFaqMap] = useState<Record<string, boolean>>(
    {},
  );

  // 초기 인터랙션 완료 후 아래 섹션 렌더 (랜딩 속도 개선)
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setInteractionComplete(true);
    });
    return () => handle.cancel();
  }, []);

  useEffect(() => {
    trackScreenView('home', { entry: 'root' });
    trackImpression('home_hero_impression', { section: 'hero' });
  }, []);

  const categories = CATEGORIES;
  const carouselCardWidth = Math.min(screenWidth - 72, 330);
  const carouselGap = theme.spacing.sm;
  const carouselInterval = carouselCardWidth + carouselGap;
  const carouselSidePadding = 0;
  const productByCategory = React.useMemo(() => {
    const map: Record<string, (typeof products)[number] | undefined> = {};
    categories.forEach((category) => {
      map[category] = products.find((p) => p.category === category);
    });
    return map;
  }, [products]);
  const selectedCategoryProduct =
    productByCategory[selectedCategory] ?? selectedProduct;
  const activeCategoryIndex = categories.indexOf(selectedCategory);

  useEffect(() => {
    setSelectedColorByCategory((prev) => syncCategoryColorMap(products, prev));
  }, [products]);

  useEffect(() => {
    if (!selectedProduct.category || !selectedColor) return;
    setSelectedColorByCategory((prev) => {
      const current = prev[selectedProduct.category];
      if (current === selectedColor) return prev;
      return { ...prev, [selectedProduct.category]: selectedColor };
    });
  }, [selectedProduct.category, selectedColor]);

  const selectCategory = (category: string) => {
    setSelectedCategory(category);
    const product = productByCategory[category];
    if (product) {
      setSelectedProductId(product.id);
      const nextColor = resolveCategoryPreviewColor(
        product,
        selectedColorByCategory,
      );
      if (nextColor) {
        setSelectedColor(nextColor);
      }
    }
  };

  const handleCarouselMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / carouselInterval,
    );
    const clampedIndex = Math.max(0, Math.min(nextIndex, categories.length - 1));
    const nextCategory = categories[clampedIndex];
    if (nextCategory && nextCategory !== selectedCategory) {
      trackClick('home_carousel_swipe', {
        from: selectedCategory,
        to: nextCategory,
      });
      selectCategory(nextCategory);
    }
  };

  useEffect(() => {
    if (activeCategoryIndex < 0) return;
    carouselRef.current?.scrollToOffset({
      offset: activeCategoryIndex * carouselInterval,
      animated: true,
    });
  }, [activeCategoryIndex, carouselInterval]);

  const goToEditor = () => {
    const editorColor = resolveCategoryPreviewColor(
      selectedCategoryProduct,
      selectedColorByCategory,
    );
    if (editorColor && editorColor !== selectedColor) {
      setSelectedColor(editorColor);
    }
    trackClick('home_primary_cta_click', {
      source: 'home_card',
      category: selectedCategory,
      product_id: selectedCategoryProduct.id,
    });
    navigation.navigate('/editor');
  };

  const goToFAQ = () => {
    trackClick('home_faq_view_all_click');
    navigation.navigate('/faq');
  };

  const toggleFAQ = (id: string) => {
    const nextExpanded = !expandedFaqMap[id];
    trackClick('home_faq_toggle_click', {
      faq_id: id,
      expanded: nextExpanded,
    });
    setExpandedFaqMap((prev) => ({
      ...prev,
      [id]: nextExpanded,
    }));
  };

  const groupedFaqs = React.useMemo(
    () =>
      faqCategories
        .map((category) => ({
          category,
          items: faqItems.filter((item) => item.category === category.id),
        }))
        .filter((group) => group.items.length > 0),
    [],
  );

  const goToProducts = () => {
    trackClick('home_product_detail_click', {
      category: selectedCategory,
      product_id: selectedCategoryProduct.id,
    });
    navigation.navigate('/products');
  };
  const onSelectTab = (key: BottomTabKey) => {
    if (key === 'home') return;
    trackClick('bottom_tab_click', { tab: key, from: 'home' });
    navigation.navigate((key === 'products' ? '/products' : '/my') as never);
  };

  const openProductEditor = (category: string) => {
    const product = productByCategory[category];
    trackClick('home_product_card_click', {
      category,
      product_id: product?.id,
      placement: 'carousel',
    });
    selectCategory(category);
  };

  return (
    <>
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.heroSection}>
        <View style={styles.heroBadgeRow}>
          <Badge variant="info" label="토스 독점" dot={false} />
        </View>
        <Text style={styles.heroTitle}>
          내 사진으로{'\n'}나만의 굿즈 만들기
        </Text>
        <Text style={styles.heroSubtitle}>
          사진 한 장만 있으면 돼요. 티셔츠 · 후드 · 맨투맨
        </Text>
        <PrimaryButton
          label="지금 만들어보기"
          onPress={goToEditor}
          style={styles.heroCtaButton}
        />
      </View>

      <View style={styles.homeCard}>
        <View style={styles.carouselShell}>
          <FlatList
            ref={carouselRef}
            data={categories}
            keyExtractor={(category) => category}
            horizontal
            showsHorizontalScrollIndicator={false}
            bounces={false}
            snapToInterval={carouselInterval}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            onMomentumScrollEnd={handleCarouselMomentumEnd}
            contentContainerStyle={[
              styles.carouselContent,
              { paddingHorizontal: carouselSidePadding },
            ]}
            renderItem={({ item: category, index }) => {
              const product = productByCategory[category];
              if (!product) return null;
              const active = selectedCategory === category;
              const mockupWidth = Math.max(180, carouselCardWidth - 44);
              const mockupHeight = Math.round(mockupWidth * 1.22);
              const previewColor = resolveCategoryPreviewColor(
                product,
                selectedColorByCategory,
              );
              return (
                <Pressable
                  key={category}
                  onPress={() => openProductEditor(category)}
                  style={[
                    styles.carouselCard,
                    {
                      width: carouselCardWidth,
                      marginRight: index === categories.length - 1 ? 0 : carouselGap,
                      opacity: active ? 1 : 0.84,
                    },
                  ]}
                >
                  <View style={styles.cardImageWrap}>
                    <View style={styles.mockupObjectShadow}>
                      <MockupCanvas
                        template={buildTemplate(
                          product,
                          previewColor || '블랙',
                          'front',
                        )}
                        width={mockupWidth}
                        height={mockupHeight}
                        showDesign
                        designImageUri={heroDesignImageUri}
                        imageTransform={{
                          offsetX: 0,
                          offsetY: 0,
                          scale: 0.86,
                          rotation: 0,
                        }}
                      />
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
        <View style={styles.carouselDots}>
          {categories.map((category, index) => {
            const active = index === activeCategoryIndex;
            return (
              <Pressable
                key={`${category}-dot`}
                style={styles.carouselDotButton}
                onPress={() => {
                  trackClick('home_carousel_dot_click', {
                    from: selectedCategory,
                    to: category,
                  });
                  selectCategory(category);
                  carouselRef.current?.scrollToOffset({
                    offset: index * carouselInterval,
                    animated: true,
                  });
                }}
              >
                <View
                  style={[styles.carouselDot, active && styles.carouselDotActive]}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.productMetaHead}>
          <Text style={styles.productName}>{selectedCategoryProduct.category}</Text>
          <Text style={styles.productPrice}>{selectedCategoryProduct.priceText}</Text>
        </View>
        <Text style={styles.productSpecLine}>
          {MATERIAL_BY_CATEGORY[selectedCategoryProduct.category] ?? '코튼 혼방'} · {selectedCategoryProduct.modelName}
        </Text>

        <Text style={styles.productSpecLine}>
          {selectedCategoryProduct.colors.join('·')} | {selectedCategoryProduct.sizes.length > 0 ? `${selectedCategoryProduct.sizes[0]?.label}~${selectedCategoryProduct.sizes[selectedCategoryProduct.sizes.length - 1]?.label}` : ''}
        </Text>

        <Pressable
          onPress={goToProducts}
          style={({ pressed }) => [styles.detailLinkButton, pressed && styles.detailLinkPressed]}
          accessibilityRole="button"
        >
          <Text style={styles.detailLinkText}>사이즈·소재·인쇄 정보</Text>
          <Chevron direction="right" size={7} color={theme.colors.primary} />
        </Pressable>
      </View>

      <Text style={styles.noticeText}>
        제작 주문 특성상 배송까지 보통 7~14일 소요될 수 있어요. (₩60,000 이상 무료배송)
      </Text>

      {/* FAQ 섹션 - 인터랙션 완료 후 렌더 */}
      {interactionComplete && (
        <View style={styles.faqSection}>
          <SectionTitle
            title="자주 묻는 질문"
            description="카테고리별 핵심 질문만 먼저 보여드려요."
            action={{ label: '전체 보기', onPress: goToFAQ }}
          />
          {groupedFaqs.map(({ category, items }) => {
            const previewItems = items.slice(0, 1);
            return (
              <View key={category.id} style={styles.faqCategoryBlock}>
                <Text style={styles.faqCategoryTitle}>{category.title}</Text>
                {previewItems.map((item) => {
                  const expanded = !!expandedFaqMap[item.id];
                  return (
                    <Card key={item.id} style={styles.faqCard}>
                      <Pressable
                        onPress={() => toggleFAQ(item.id)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded }}
                        style={styles.faqPressable}
                      >
                        <View style={styles.faqRow}>
                          <Text style={styles.faqQ}>Q</Text>
                          <Text style={styles.faqQuestion}>{item.question}</Text>
                          <View style={styles.faqArrow}>
                            <Chevron direction={expanded ? 'up' : 'down'} size={8} />
                          </View>
                        </View>
                        {expanded && (
                          <View style={styles.faqAnswerRow}>
                            <Text style={styles.faqA}>A</Text>
                            <Text style={styles.faqAnswer}>{item.answer}</Text>
                          </View>
                        )}
                      </Pressable>
                    </Card>
                  );
                })}
              </View>
            );
          })}
        </View>
      )}
    </Screen>
    <BottomTabBar active="home" onSelect={onSelectTab} />
    </>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    backgroundColor: theme.colors.background,
    paddingBottom: BOTTOM_TAB_HEIGHT + theme.spacing.xxl,
  },
  /* Hero sits directly on the page — no card, so the product card below
     is the first thing that reads as elevated. */
  heroSection: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 40,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: -0.9,
  },
  heroSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  heroCtaButton: {
    marginBottom: 0,
  },
  homeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadow.card,
  },
  carouselShell: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  carouselContent: {
    paddingVertical: theme.spacing.sm,
  },
  carouselCard: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  cardImageWrap: {
    width: '100%',
    aspectRatio: 4 / 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.lg,
  },
  mockupObjectShadow: {
    shadowColor: '#191F28',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  carouselDots: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselDotButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: '#D1D6DB',
  },
  carouselDotActive: {
    width: 24,
    backgroundColor: theme.colors.primary,
  },
  productMetaHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
  },
  productName: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
  },
  productPrice: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: theme.colors.textPrimary,
  },
  productSpecLine: {
    marginTop: theme.spacing.xs,
    ...theme.typography.label,
    fontWeight: '500',
    color: theme.colors.textTertiary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
  },
  metaCol: {
    flex: 1,
  },
  metaColRight: {
    alignItems: 'flex-end',
    paddingLeft: theme.spacing.md,
  },
  metaLabel: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  metaValue: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    lineHeight: 18,
  },
  colorDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDotButton: {
    width: 26,
    height: 26,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  colorDotSelected: {
    borderWidth: 2.4,
    borderColor: theme.colors.primary,
  },
  colorDotWhite: {
    borderColor: theme.colors.textTertiary,
    borderWidth: 1.4,
  },
  sizeBlock: {
    marginTop: theme.spacing.lg,
  },
  sizeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeChip: {
    width: 36,
    height: 36,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 14,
  },
  detailLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    marginTop: theme.spacing.md,
  },
  detailLinkPressed: {
    opacity: 0.6,
  },
  detailLinkText: {
    ...theme.typography.label,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  noticeText: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.md,
  },
  faqSection: {
    marginBottom: theme.spacing.md,
  },
  faqCategoryBlock: {
    marginBottom: theme.spacing.lg,
  },
  faqCategoryTitle: {
    ...theme.typography.label,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
  },
  faqCard: {
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    // Padding lives on the Pressable below: on the Card it sat outside the
    // touch target, leaving a 22px-tall tappable strip inside a roomy card.
    padding: 0,
  },
  faqPressable: {
    padding: theme.spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  faqQ: {
    ...theme.typography.bodyStrong,
    fontWeight: '700',
    color: theme.colors.primary,
    marginRight: theme.spacing.md,
  },
  faqQuestion: {
    flex: 1,
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  faqArrow: {
    width: 20,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
  },
  faqAnswerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  faqA: {
    ...theme.typography.bodyStrong,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    marginRight: theme.spacing.md,
  },
  faqAnswer: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});
