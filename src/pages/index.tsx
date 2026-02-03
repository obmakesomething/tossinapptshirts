import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useState } from 'react';
import { Image, InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { MockupCanvas } from '../components/MockupCanvas';
import { InquiryModal } from '../components/InquiryModal';
import {
  BottomSheet,
  Card,
  Chip,
  PrimaryButton,
  Screen,
  SecondaryButton,
  theme,
} from '../components/ui';
import { useCatalog } from '../context/catalog';
import { faqItems } from '../data/faq';
import { buildTemplate } from '../data/mockupTemplates';

import { API_BASE_URL } from '../config';

const heroDesignImageUri = `${API_BASE_URL}/mockups/hero_design.png`;

export const Route = createRoute('/', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const {
    products,
    selectedProduct,
    selectedColor,
    designImageUri,
    imageTransform,
    textLayer,
    textTransform,
    setSelectedProductId,
  } = useCatalog();
  const [selectedCategory, setSelectedCategory] =
    React.useState<string>('티셔츠');
  const [inquiryModalVisible, setInquiryModalVisible] =
    React.useState<boolean>(false);
  const [startSheetVisible, setStartSheetVisible] =
    React.useState<boolean>(false);
  const [interactionComplete, setInteractionComplete] = useState(false);

  // 초기 인터랙션 완료 후 아래 섹션 렌더 (랜딩 속도 개선)
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setInteractionComplete(true);
    });
    return () => handle.cancel();
  }, []);

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

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.headerLogo}
          />
          <Text style={styles.headerTitle}>굿즈 GPT</Text>
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
            designImageUri={heroDesignImageUri}
            imageTransform={{
              offsetX: 0,
              offsetY: 0,
              scale: 0.9,
              rotation: 0,
            }}
          />
        </View>
      </View>

      <View style={styles.heroActions}>
        <PrimaryButton
          label="굿즈 만들기 시작하기"
          onPress={() => setStartSheetVisible(true)}
          style={styles.actionButton}
        />
      </View>

      <BottomSheet
        visible={startSheetVisible}
        onClose={() => setStartSheetVisible(false)}
        title="어떻게 시작할까요?"
      >
        <PrimaryButton
          label="내 사진으로 만들기"
          onPress={() => {
            setStartSheetVisible(false);
            goToUpload();
          }}
          style={styles.sheetOption}
        />
        <Text style={styles.sheetOptionDesc}>
          갤러리에서 사진을 골라 굿즈에 넣을 수 있어요
        </Text>
        <SecondaryButton
          label="AI로 이미지 만들기"
          onPress={() => {
            setStartSheetVisible(false);
            goToGenerate();
          }}
          style={styles.sheetOption}
        />
        <Text style={styles.sheetOptionDesc}>
          텍스트만 입력하면 AI가 이미지를 만들어 줘요
        </Text>
      </BottomSheet>

      <View style={styles.scrollHint}>
        <Text style={styles.scrollHintText}>아래에 더 있어요</Text>
        <Text style={styles.scrollHintArrow}>▼</Text>
      </View>

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
      )}

      {/* 최근 작업 섹션 - 인터랙션 완료 후 렌더 */}
      {interactionComplete && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>최근 작업</Text>
            <Pressable onPress={goToDesigns}>
              <Text style={styles.sectionAction}>전체 보기</Text>
            </Pressable>
          </View>
          <Card style={styles.recentCard}>
            <MockupCanvas
              template={buildTemplate(selectedProduct, selectedColor, 'front')}
              width={56}
              height={72}
              showDesign
              designImageUri={designImageUri}
              imageTransform={imageTransform}
              textLayer={textLayer}
              textTransform={textTransform}
            />
            <View style={styles.recentText}>
              <Text style={styles.recentTitle}>Ocean Wave Tee</Text>
              <Text style={styles.recentDesc}>블랙 / M · 2시간 전</Text>
            </View>
          </Card>
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
  },
  recentText: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  recentDesc: {
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
  sheetOption: {
    marginBottom: theme.spacing.xs,
  },
  sheetOptionDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  scrollHint: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  scrollHintText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
  },
  scrollHintArrow: {
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
});
