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
import { Card, PrimaryButton, Screen, theme } from '../components/ui';
import { useCatalog } from '../context/catalog';
import { faqCategories, faqItems } from '../data/faq';
import { buildTemplate } from '../data/mockupTemplates';
import { API_BASE_URL } from '../config';
import { resolveColorValue } from '../data/colorMap';
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
const HERO_STATS = [
  { value: '2,400+', label: '월 주문' },
  { value: '4.9★', label: '만족도' },
  { value: '3~5일', label: '배송' },
];

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
  const selectedCategoryColor = resolveCategoryPreviewColor(
    selectedCategoryProduct,
    selectedColorByCategory,
  );

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
  const openProductEditor = (category: string) => {
    const product = productByCategory[category];
    trackClick('home_product_card_click', {
      category,
      product_id: product?.id,
      placement: 'carousel',
    });
    selectCategory(category);
  };
  const renderSizeLabel = (label: string) => {
    if (label === '2XL') return '2X';
    if (label === '3XL') return '3X';
    if (label === '4XL') return '4X';
    return label;
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.heroSection}>
        <View style={styles.heroBadgeRow}>
          <View style={styles.heroBadgePrimary}>
            <Text style={styles.heroBadgePrimaryText}>AI 디자인 굿즈 제작</Text>
          </View>
          <View style={styles.heroBadgeSecondary}>
            <Text style={styles.heroBadgeSecondaryText}>토스 독점</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>
          나만의{'\n'}커스텀 의류를{'\n'}지금 만들어요
        </Text>
        <Text style={styles.heroSubtitle}>
          티셔츠 · 후드 · 맨투맨
          {'\n'}
          AI 디자인부터 결제까지 한 번에
        </Text>
        <PrimaryButton
          label="✦ 지금 만들어보기"
          onPress={goToEditor}
          style={styles.heroCtaButton}
        />
        <View style={styles.heroStatRow}>
          {HERO_STATS.map((stat) => (
            <View key={stat.label} style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{stat.value}</Text>
              <Text style={styles.heroStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
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

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>색상</Text>
            <View style={styles.colorDotRow}>
              {selectedCategoryProduct.colors.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => {
                    trackClick('home_color_dot_click', {
                      category: selectedCategory,
                      product_id: selectedCategoryProduct.id,
                      color,
                    });
                    setSelectedColorByCategory((prev) => ({
                      ...prev,
                      [selectedCategory]: color,
                    }));
                    setSelectedColor(color);
                  }}
                  style={styles.colorDotButton}
                  accessibilityRole="button"
                  accessibilityLabel={`${color} 색상`}
                >
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: resolveColorValue(color) },
                      resolveColorValue(color) === '#FFFFFF' &&
                      styles.colorDotWhite,
                      selectedCategoryColor === color && styles.colorDotSelected,
                    ]}
                  />
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.metaCol, styles.metaColRight]}>
            <Text style={styles.metaLabel}>소재</Text>
            <Text style={styles.metaValue}>
              {MATERIAL_BY_CATEGORY[selectedCategoryProduct.category] ?? '코튼 혼방'}
            </Text>
          </View>
        </View>

        <View style={styles.sizeBlock}>
          <Text style={styles.metaLabel}>사이즈</Text>
          <View style={styles.sizeChipRow}>
            {selectedCategoryProduct.sizes.map((size) => (
              <View key={size.label} style={styles.sizeChip}>
                <Text style={styles.sizeChipText}>
                  {renderSizeLabel(size.label)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable onPress={goToProducts} style={styles.detailLinkButton}>
          <Text style={styles.detailLinkText}>세부 정보 보기 {'>'}</Text>
        </Pressable>
      </View>

      <Text style={styles.noticeText}>
        제작 주문 특성상 제작/배송은 보통 7-14일 소요될 수 있어요. (3만원 이상 배송비 무료)
      </Text>

      {/* FAQ 섹션 - 인터랙션 완료 후 렌더 */}
      {interactionComplete && (
        <View style={styles.faqSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>자주 묻는 질문</Text>
            <Pressable onPress={goToFAQ}>
              <Text style={styles.sectionAction}>전체 보기</Text>
            </Pressable>
          </View>
          <Text style={styles.faqDescription}>
            카테고리별 핵심 질문만 먼저 보여드려요. 더 자세한 내용은 전체 보기에서 확인할 수 있어요.
          </Text>
          {groupedFaqs.map(({ category, items }) => {
            const previewItems = items.slice(0, 2);
            return (
              <View key={category.id} style={styles.faqCategoryBlock}>
                <View style={styles.faqCategoryHeader}>
                  <Text style={styles.faqCategoryTitle}>
                    {category.icon} {category.title}
                  </Text>
                  <Text style={styles.faqCategoryCount}>
                    {previewItems.length}/{items.length}개
                  </Text>
                </View>
                {previewItems.map((item) => {
                  const expanded = !!expandedFaqMap[item.id];
                  return (
                    <Card key={item.id} style={styles.faqCard}>
                      <Pressable onPress={() => toggleFAQ(item.id)}>
                        <View style={styles.faqRow}>
                          <Text style={styles.faqQ}>Q</Text>
                          <Text style={styles.faqQuestion}>{item.question}</Text>
                          <Text style={styles.faqArrow}>
                            {expanded ? '▾' : '▸'}
                          </Text>
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
  );
}

const styles = StyleSheet.create({
  screenContent: {
    backgroundColor: theme.colors.background,
    paddingBottom: 42,
  },
  heroSection: {
    borderRadius: 26,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: '#141A2B',
    shadowColor: '#0A1020',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    borderWidth: 1,
    borderColor: '#26314D',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  heroBadgePrimary: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  heroBadgePrimaryText: {
    fontSize: 11,
    color: '#F1F5FF',
    fontWeight: '700',
  },
  heroBadgeSecondary: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(126, 114, 255, 0.42)',
    backgroundColor: 'rgba(107, 72, 255, 0.22)',
  },
  heroBadgeSecondaryText: {
    fontSize: 11,
    color: '#D6CCFF',
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#B8C4DE',
    marginBottom: 14,
  },
  heroCtaButton: {
    borderRadius: 16,
    minHeight: 52,
    marginBottom: theme.spacing.md,
  },
  heroStatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroStatValue: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: '#B6C3DF',
    marginTop: 2,
  },
  homeCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    borderRadius: 26,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#1B3B76',
    shadowOpacity: 0.11,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  carouselShell: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E1E8F6',
    backgroundColor: '#F7FAFF',
  },
  carouselContent: {
    paddingVertical: theme.spacing.sm,
  },
  carouselCard: {
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  cardImageWrap: {
    width: '100%',
    aspectRatio: 4 / 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F8FD',
    borderRadius: 18,
  },
  mockupObjectShadow: {
    shadowColor: '#1F2D47',
    shadowOpacity: 0.19,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 11 },
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
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: theme.colors.border,
  },
  carouselDotActive: {
    width: 20,
    backgroundColor: theme.colors.primary,
  },
  productMetaHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  productName: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: '#1A1F2E',
    letterSpacing: -0.4,
  },
  productPrice: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  productSpecLine: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
    color: '#6E7992',
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
    borderRadius: 13,
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
    borderRadius: 18,
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
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  detailLinkText: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 26,
  },
  sectionAction: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '700',
    lineHeight: 20,
  },
  noticeText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.md,
  },
  faqSection: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  faqDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  faqCategoryBlock: {
    marginBottom: theme.spacing.md,
  },
  faqCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  faqCategoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  faqCategoryCount: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  faqCard: {
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    shadowColor: '#1A2A46',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  faqQ: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  faqArrow: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textTertiary,
    marginLeft: theme.spacing.sm,
    marginTop: 1,
  },
  faqAnswerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  faqA: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },
  faqAnswer: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
});
