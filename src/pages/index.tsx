import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
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

const APP_ICON_URL =
  'https://static.toss.im/appsintoss/14401/d0c0ede6-31b9-400d-b236-196c02293df1.png';
// Light theme - Toss native style
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
  const carouselCardWidth = Math.min(236, Math.max(196, screenWidth - 124));
  const carouselGap = theme.spacing.md;
  const carouselInterval = carouselCardWidth + carouselGap;
  const carouselSidePadding = Math.max(
    theme.spacing.md,
    Math.floor((screenWidth - carouselCardWidth) / 2),
  );
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
      source: 'info_panel',
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
    navigation.navigate('/editor');
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
        <View style={styles.headerLeft}>
          <Image source={{ uri: APP_ICON_URL }} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>굿즈 gpt</Text>
        </View>
        <Pressable onPress={goToInquiry} style={styles.inquiryButton}>
          <Text style={styles.inquiryButtonText}>문의</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>굿즈 gpt</Text>
        <Text style={styles.heroSubtitle}>
          이미지를 업로드하거나 AI로 새로 만들어,{'\n'}
          티셔츠·후드·맨투맨을 바로 제작하고 배송까지 해드립니다
        </Text>
      </View>

      <View style={styles.carouselSection}>
        <Text style={styles.sectionTitle}>티셔츠 · 후드 · 맨투맨</Text>
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
            const diff = index - activeCategoryIndex;
            const active = selectedCategory === category;
            return (
              <Pressable
                key={category}
                onPress={() => openProductEditor(category)}
                onLongPress={() => selectCategory(category)}
                style={[
                  styles.carouselCard,
                  {
                    width: carouselCardWidth,
                    marginRight: index === categories.length - 1 ? 0 : carouselGap,
                    opacity: active ? 1 : 0.84,
                    transform: [
                      { perspective: 1000 },
                      { rotateY: `${diff * -8}deg` },
                      { scale: active ? 1 : 0.94 },
                      { translateY: active ? 0 : 8 },
                    ],
                  },
                ]}
              >
                <View style={styles.cardImageWrap}>
                  <MockupCanvas
                    template={buildTemplate(
                      product,
                      product.colors[0] || '블랙',
                      'front',
                    )}
                    width={150}
                    height={180}
                    showDesign
                    designImageUri={heroDesignImageUri}
                    imageTransform={{
                      offsetX: 0,
                      offsetY: 0,
                      scale: 0.9,
                      rotation: 0,
                    }}
                  />
                </View>
                <View style={styles.cardLinkRow}>
                  <Text style={styles.cardProductText}>{category}</Text>
                  <View style={styles.cardLinkLine} />
                  <Text style={styles.cardActionText}>지금 바로 만들기</Text>
                </View>
              </Pressable>
            );
          }}
        />
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
        <Text style={styles.carouselHint}>
          카드 탭으로 바로 편집 화면에 들어갈 수 있어요.
        </Text>
      </View>

      <Card style={styles.infoPanel}>
        <View style={styles.infoTopRow}>
          <View style={styles.infoTitleWrap}>
            <Text style={styles.infoTitle}>{selectedCategoryProduct.name}</Text>
            <Text style={styles.infoSubtitle}>
              {selectedCategoryProduct.modelName}
            </Text>
          </View>
          <Pressable onPress={goToProducts} style={styles.detailButton}>
            <Text style={styles.detailButtonText}>세부 정보 보기</Text>
          </Pressable>
        </View>

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

        <PrimaryButton
          label="지금 바로 제작하기"
          onPress={goToEditor}
          style={styles.createButton}
        />
      </Card>

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
    marginBottom: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
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
  hero: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  heroTitle: {
    ...theme.typography.display,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textTransform: 'lowercase',
  },
  heroSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '500',
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
  carouselSection: {
    marginBottom: theme.spacing.lg,
  },
  carouselContent: {
    paddingVertical: theme.spacing.md,
  },
  carouselCard: {
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardImageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 190,
  },
  cardLinkRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  cardProductText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  cardLinkLine: {
    flex: 1,
    height: 1,
    marginHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.border,
  },
  cardActionText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '800',
    letterSpacing: 0.1,
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
  carouselHint: {
    marginTop: theme.spacing.sm,
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  infoPanel: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  infoTitleWrap: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    lineHeight: 23,
  },
  infoSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  detailButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  detailButtonText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
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
  createButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
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
