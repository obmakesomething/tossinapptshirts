import { createRoute } from '@granite-js/react-native';
import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MockupCanvas } from '../components/MockupCanvas';
import { InquiryModal } from '../components/InquiryModal';
import {
  Card,
  Chip,
  PrimaryButton,
  Screen,
  SecondaryButton,
  theme,
} from '../components/ui';
import { type SavedDesign, useCatalog } from '../context/catalog';
import { catalogProducts } from '../data/catalog';
import { faqItems } from '../data/faq';
import { buildTemplate } from '../data/mockupTemplates';

export const Route = createRoute('/', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const {
    products,
    selectedProduct,
    selectedColor,
    setSelectedProductId,
    savedDesigns,
    loadDesign,
    refreshSavedDesigns,
  } = useCatalog();
  const [selectedCategory, setSelectedCategory] =
    React.useState<string>('티셔츠');
  const [inquiryModalVisible, setInquiryModalVisible] =
    React.useState<boolean>(false);

  useEffect(() => {
    refreshSavedDesigns();
  }, [refreshSavedDesigns]);

  const categories = ['티셔츠', '후드', '맨투맨'];

  const categoryProduct = products.find((p) => p.category === selectedCategory) || selectedProduct;

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    const product = products.find((p) => p.category === category);
    if (product) {
      setSelectedProductId(product.id);
    }
  };

  const goToUpload = () => {
    navigation.navigate('/upload');
  };

  const goToGenerate = () => {
    navigation.navigate('/generate');
  };

  const goToDesigns = () => {
    navigation.navigate('/designs');
  };

  const goToFAQ = () => {
    navigation.navigate('/faq');
  };

  const goToInquiry = () => {
    setInquiryModalVisible(true);
  };

  const handleContinueDesign = (design: SavedDesign) => {
    loadDesign(design);
    navigation.navigate('/editor');
  };

  const handlePreviewDesign = (design: SavedDesign) => {
    loadDesign(design);
    navigation.navigate('/preview');
  };

  function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffHours < 1) return '방금';
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays === 1) return '어제';
    return `${diffDays}일 전`;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/logo.jpg')}
            style={styles.headerLogo}
          />
          <Text style={styles.headerTitle}>머천다이즈 Gpt</Text>
        </View>
        <Pressable onPress={goToInquiry} style={styles.inquiryButton}>
          <Text style={styles.inquiryButtonText}>문의</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>AI로 나만의 굿즈를 만들어 보세요</Text>
        <Text style={styles.heroSubtitle}>
          내 이미지를 업로드하거나 AI로 새 이미지를 만들어서 티셔츠, 후디, 맨투맨을 제작할 수 있어요.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>제품 카테고리 선택</Text>
        <View style={styles.chipRow}>
          {categories.map((category) => (
            <Chip
              key={category}
              label={category}
              selected={selectedCategory === category}
              onPress={() => handleCategoryChange(category)}
              style={styles.chipSpacing}
            />
          ))}
        </View>
      </View>

      <View style={styles.exampleSection}>
        <View style={styles.exampleImageContainer}>
          <MockupCanvas
            template={buildTemplate(categoryProduct, selectedColor, 'front')}
            width={260}
            height={340}
            showDesign
            designImageUri={null}
            textLayer={{
              enabled: true,
              text: 'MERCHANDISE\nGPT',
              fontSize: 36,
              fontWeight: 'bold',
              color:
                selectedColor === '블랙'
                  ? theme.colors.surface
                  : theme.colors.textPrimary,
            }}
            textTransform={{
              offsetX: 0,
              offsetY: 0,
              scale: 0.6,
              rotation: 0,
            }}
          />
        </View>
      </View>

      <View style={styles.heroActions}>
        <PrimaryButton
          label="내 이미지 업로드하기"
          onPress={goToUpload}
          style={styles.actionButton}
        />
        <SecondaryButton
          label="AI로 이미지 만들기"
          onPress={goToGenerate}
          style={styles.actionButton}
        />
      </View>

      <View style={styles.faqSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>자주 묻는 질문</Text>
          <Pressable onPress={goToFAQ}>
            <Text style={styles.sectionAction}>전체 보기</Text>
          </Pressable>
        </View>
        <Text style={styles.faqDescription}>
          궁금한 점이 있으신가요? 답변을 확인해 보세요.
        </Text>
        {faqItems.slice(0, 3).map((item) => (
          <Pressable key={item.id} onPress={goToFAQ}>
            <Card style={styles.faqCard}>
              <View style={styles.faqRow}>
                <Text style={styles.faqQ}>Q</Text>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <Text style={styles.faqArrow}>›</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>내 디자인</Text>
          {savedDesigns.length > 0 && (
            <Pressable onPress={goToDesigns}>
              <Text style={styles.sectionAction}>전체 보기</Text>
            </Pressable>
          )}
        </View>
        {savedDesigns.length === 0 ? (
          <Card style={styles.emptyDesignCard}>
            <Text style={styles.emptyDesignText}>아직 저장한 디자인이 없어요</Text>
            <Text style={styles.emptyDesignSubtext}>
              에디터에서 디자인을 저장하면 여기에 나타나요
            </Text>
          </Card>
        ) : (
          savedDesigns.slice(0, 3).map((design) => {
            const product = catalogProducts.find((p) => p.id === design.productId) ?? selectedProduct;
            return (
              <Card key={design.id} style={styles.recentCard}>
                <MockupCanvas
                  template={buildTemplate(product, design.color, 'front')}
                  width={56}
                  height={72}
                  showDesign
                  designImageUri={design.designImageUri}
                  imageTransform={design.imageTransform}
                  textLayer={design.textLayer}
                  textTransform={design.textTransform}
                />
                <View style={styles.recentText}>
                  <Text style={styles.recentTitle}>{design.title}</Text>
                  <Text style={styles.recentDesc}>
                    {design.color} · {formatTimeAgo(design.createdAt)}
                  </Text>
                </View>
                <View style={styles.recentActions}>
                  <Pressable
                    onPress={() => handleContinueDesign(design)}
                    style={styles.recentActionButton}
                  >
                    <Text style={styles.recentActionText}>편집</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handlePreviewDesign(design)}
                    style={styles.recentActionButtonPrimary}
                  >
                    <Text style={styles.recentActionTextPrimary}>주문</Text>
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}
      </View>

      <InquiryModal
        visible={inquiryModalVisible}
        onClose={() => setInquiryModalVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
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
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  inquiryButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 999,
    backgroundColor: theme.colors.primarySoft,
  },
  inquiryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  hero: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    lineHeight: 34,
    marginBottom: theme.spacing.sm,
  },
  heroSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: theme.spacing.lg,
  },
  heroActions: {
    marginTop: theme.spacing.xs,
  },
  actionButton: {
    marginBottom: theme.spacing.sm,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 26,
  },
  sectionAction: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.md,
  },
  chipSpacing: {
    marginRight: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  exampleSection: {
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.xxl + theme.spacing.xl,
    alignItems: 'center',
  },
  exampleImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGrid: {
    marginTop: theme.spacing.sm,
  },
  exampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exampleCard: {
    width: '31%',
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  exampleImage: {
    width: '100%',
    height: 80,
    resizeMode: 'cover',
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.sm,
  },
  exampleLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  stepCard: {
    paddingVertical: theme.spacing.lg,
  },
  stepCardSpacing: {
    marginBottom: theme.spacing.sm,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  stepDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productText: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  productMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  recentText: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 22,
    marginBottom: 2,
  },
  recentDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  recentActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  recentActionButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  recentActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  recentActionButtonPrimary: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  recentActionTextPrimary: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyDesignCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyDesignText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  emptyDesignSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  faqSection: {
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  faqDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  faqCard: {
    marginBottom: theme.spacing.sm,
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  faqArrow: {
    fontSize: 20,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
});
