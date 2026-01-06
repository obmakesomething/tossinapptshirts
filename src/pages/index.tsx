import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, PrimaryButton, Screen, SecondaryButton, theme } from '../components/ui';
import { MockupCanvas } from '../components/MockupCanvas';
import { buildTemplate } from '../data/mockupTemplates';
import { useCatalog } from '../context/catalog';
import { formatPrice } from '../utils/format';

export const Route = createRoute('/', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const { selectedProduct, selectedColor } = useCatalog();

  const steps = [
    { title: '이미지 준비', desc: '업로드 또는 생성' },
    { title: '상품 선택', desc: '컬러·사이즈' },
    { title: '목업 완성', desc: '미리보기·저장' },
  ];

  const goToUpload = () => {
    navigation.navigate('/upload');
  };

  const goToGenerate = () => {
    navigation.navigate('/generate');
  };

  const goToDesigns = () => {
    navigation.navigate('/designs');
  };

  const goToProducts = () => {
    navigation.navigate('/products');
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>티셔츠 목업 스튜디오</Text>
        <Text style={styles.heroSubtitle}>
          이미지 업로드 또는 Imagen 생성으로 바로 목업을 만들고 저장하세요.
        </Text>
        <View style={styles.heroActions}>
          <PrimaryButton label="이미지 업로드" onPress={goToUpload} style={styles.actionButton} />
          <SecondaryButton
            label="Imagen으로 생성"
            onPress={goToGenerate}
            style={styles.actionButton}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>선택된 상품</Text>
          <Text style={styles.sectionAction} onPress={goToProducts}>
            상품 변경
          </Text>
        </View>
        <Card style={styles.productCard}>
          <MockupCanvas
            template={buildTemplate(selectedProduct, selectedColor, 'front')}
            width={90}
            height={120}
          />
          <View style={styles.productText}>
            <Text style={styles.productTitle}>{selectedProduct.name}</Text>
            <Text style={styles.productMeta}>
              제품가 {formatPrice(selectedProduct.price ?? 0)}
            </Text>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>빠른 시작</Text>
        <View style={styles.stepGrid}>
          {steps.map((step, index) => (
            <Card
              key={step.title}
              style={[styles.stepCard, index < steps.length - 1 && styles.stepCardSpacing]}
            >
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </Card>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>최근 작업</Text>
          <Text style={styles.sectionAction} onPress={goToDesigns}>
            전체 보기
          </Text>
        </View>
        <Card style={styles.recentCard}>
          <MockupCanvas
            template={buildTemplate(selectedProduct, selectedColor, 'front')}
            width={56}
            height={72}
            showDesign
          />
          <View style={styles.recentText}>
            <Text style={styles.recentTitle}>Ocean Wave Tee</Text>
            <Text style={styles.recentDesc}>블랙 / M · 2시간 전</Text>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  },
  sectionAction: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  stepGrid: {
    marginTop: theme.spacing.sm,
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
    marginBottom: theme.spacing.xs,
  },
  stepDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
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
    marginBottom: 4,
  },
  productMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
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
    marginBottom: 4,
  },
  recentDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});
