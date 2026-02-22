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
import { InquiryModal } from '../components/InquiryModal';
import { Card, PrimaryButton, Screen, theme } from '../components/ui';
import { useCatalog } from '../context/catalog';
import { faqCategories, faqItems } from '../data/faq';
import { buildTemplate } from '../data/mockupTemplates';
import { API_BASE_URL } from '../config';
import { resolveColorValue } from '../data/colorMap';
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
    setSelectedProductId,
  } = useCatalog();
  const [selectedCategory, setSelectedCategory] =
    React.useState<string>('티셔츠');
  const [inquiryModalVisible, setInquiryModalVisible] =
    React.useState<boolean>(false);
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

  const selectCategory = (category: string) => {
    setSelectedCategory(category);
    const product = productByCategory[category];
    if (product) {
      setSelectedProductId(product.id);
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

  const goToInquiry = () => {
    trackClick('home_inquiry_click');
    setInquiryModalVisible(true);
  };
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
      <View style={styles.header}>
        <View />
        <Pressable onPress={goToInquiry} style={styles.inquiryButton}>
          <Text style={styles.inquiryButtonText}>문의</Text>
        </Pressable>
      </View>

      <View style={styles.homeGuide}>
        <Text style={styles.homeGuideTitle}>무엇을 만들까요?</Text>
        <Text style={styles.homeGuideText}>상품을 선택하고 디자인을 시작하세요</Text>
      </View>
      <PrimaryButton
        label="✦ 지금 만들어보기"
        onPress={goToEditor}
        style={styles.topCtaButton}
      />

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
                          product.colors[0] || '블랙',
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
                <View
                  key={color}
                  style={[
                    styles.colorDot,
                    { backgroundColor: resolveColorValue(color) },
                    resolveColorValue(color) === '#FFFFFF' &&
                    styles.colorDotWhite,
                  ]}
                />
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

      <InquiryModal
        visible={inquiryModalVisible}
        onClose={() => setInquiryModalVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    backgroundColor: theme.colors.background,
    paddingBottom: 42,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  inquiryButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inquiryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  homeGuide: {
    marginBottom: theme.spacing.xs,
    paddingHorizontal: 2,
  },
  homeGuideTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    color: '#32251B',
    marginBottom: 2,
  },
  homeGuideText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#776556',
  },
  topCtaButton: {
    borderRadius: 18,
    minHeight: 50,
    marginBottom: theme.spacing.md,
    shadowColor: '#E65F00',
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  homeCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: '#F1E0CE',
    borderRadius: 26,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#5F320E',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  carouselShell: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F6E5D3',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
  },
  mockupObjectShadow: {
    shadowColor: '#4D3622',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
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
    color: '#2F241B',
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
    color: '#765F4E',
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
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: '#CC590A',
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
    shadowColor: '#000',
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
    borderTopColor: '#eeeeee',
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
