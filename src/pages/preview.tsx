import { share, getTossShareLink } from '@apps-in-toss/framework';
import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MockupCanvas } from '../components/MockupCanvas';
import {
  Card,
  ColorSwatch,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Screen,
  theme,
} from '../components/ui';
import { useCatalog } from '../context/catalog';
import { resolveColorValue } from '../data/colorMap';
import { buildTemplate } from '../data/mockupTemplates';
import { calcPricing } from '../data/pricing';
import { formatPrice } from '../utils/format';

const ORANGE_RED = '#FF6A00';
const NAVY_DEEP = '#FFF8F1';
const NAVY_PANEL = '#FFFFFF';

export const Route = createRoute('/preview', {
  component: Page,
});

const mockupShots = ['Front', 'Back'];

function Page() {
  const navigation = Route.useNavigation();
  const {
    selectedProduct,
    selectedColor,
    printBackEnabled,
    setSelectedColor,
    frontDesignImageUri,
    frontImageTransform,
    frontTextLayer,
    frontTextTransform,
    backDesignImageUri,
    backImageTransform,
    backTextLayer,
    backTextTransform,
    saveCurrentDesign,
    orderLines,
    selectedPrint,
  } = useCatalog();
  const [saving, setSaving] = useState(false);
  const filteredShots = printBackEnabled
    ? mockupShots
    : mockupShots.slice(0, 1);

  const pricing = calcPricing({
    product: selectedProduct,
    orderLines,
    printOption: selectedPrint,
    printBackEnabled,
  });

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const title = `${selectedProduct.name} - ${selectedColor}`;
      await saveCurrentDesign(title);
      // Designs list will auto-refresh via useEffect in designs.tsx
      Alert.alert('저장 완료', '디자인을 저장했어요!', [
        {
          text: '확인',
          onPress: () => navigation.navigate('/designs'),
        },
      ]);
    } catch {
      Alert.alert('저장 실패', '저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      const ogImageUrl = frontDesignImageUri || undefined;
      const shareLink = await getTossShareLink('intoss://merchandisegpt/preview', ogImageUrl);
      await share({
        message: `${selectedProduct.name} 디자인을 확인해보세요! 🎨\n${shareLink}`,
      });
    } catch {
      // User cancelled or share failed - ignore
    }
  };

  const goOrder = () => {
    navigation.navigate('/order');
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />
      <PageHeader title="완성 미리보기" onBack={() => navigation.goBack()} />

      <Text style={styles.title}>{selectedProduct.name}</Text>
      <Text style={styles.subtitle}>다른 색상으로도 확인해 보세요</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {filteredShots.map((label, index) => {
          const isBack = label === 'Back';
          return (
            <Card
              key={label}
              style={[styles.mockupCard, index > 0 && styles.mockupSpacing]}
            >
              <MockupCanvas
                template={buildTemplate(
                  selectedProduct,
                  selectedColor,
                  isBack ? 'back' : 'front',
                )}
                width={220}
                height={275}
                sizeLabel={orderLines[0]?.sizeLabel ?? selectedProduct.sizes[0]?.label}
                showDesign
                designImageUri={
                  isBack ? backDesignImageUri : frontDesignImageUri
                }
                imageTransform={
                  isBack ? backImageTransform : frontImageTransform
                }
                textLayer={isBack ? backTextLayer : frontTextLayer}
                textTransform={isBack ? backTextTransform : frontTextTransform}
              />
              <Text style={styles.mockupLabel}>{label} · Flat</Text>
            </Card>
          );
        })}
      </ScrollView>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>색상 바꿔보기</Text>
        <View style={styles.swatchRow}>
          {selectedProduct.colors.map((color) => (
            <ColorSwatch
              key={color}
              label={color}
              color={resolveColorValue(color)}
              selected={selectedColor === color}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>
      </View>

      <Card style={styles.priceCard}>
        <Text style={styles.priceLabel}>예상 결제 금액</Text>
        <Text style={styles.priceAmount}>{formatPrice(pricing.total)}</Text>
        <View style={styles.priceDetail}>
          <Text style={styles.priceDetailText}>
            기본가 {formatPrice(pricing.subtotal)} + 배송비{' '}
            {pricing.shippingFee === 0
              ? '무료'
              : formatPrice(pricing.shippingFee)}
          </Text>
        </View>
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>파일 준비가 완료됐어요</Text>
        <Text style={styles.infoDesc}>
          저장한 뒤 언제든 다시 편집하거나 공유할 수 있어요.
        </Text>
      </Card>

      <View style={styles.primaryActionRow}>
        <PrimaryButton label="💰 바로 주문하기" onPress={goOrder} style={styles.orderNowButton} />
      </View>

      <View style={styles.actionRow}>
        <View style={styles.flex1}>
          <SecondaryButton label={saving ? '저장하고 있어요...' : '저장하기'} onPress={handleSave} disabled={saving} />
        </View>
        <View style={styles.flex1}>
          <SecondaryButton label="공유하기" onPress={handleShare} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    backgroundColor: NAVY_DEEP,
    paddingBottom: theme.spacing.xl,
  },
  bgOrbTop: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(255,196,146,0.35)',
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: 20,
    left: -70,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255,221,186,0.42)',
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
    color: '#776556',
    fontWeight: '700',
  },
  title: {
    ...theme.typography.heading,
    color: '#2E231B',
  },
  subtitle: {
    ...theme.typography.body,
    color: '#776556',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  mockupCard: {
    width: 220,
    alignItems: 'center',
    backgroundColor: NAVY_PANEL,
    borderColor: 'rgba(240,223,207,0.92)',
    borderWidth: 1,
  },
  mockupSpacing: {
    marginLeft: theme.spacing.md,
  },
  mockupLabel: {
    fontSize: 13,
    color: '#776556',
    lineHeight: 20,
    marginTop: theme.spacing.sm,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.subheading,
    color: '#2E231B',
    marginBottom: theme.spacing.sm,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  priceCard: {
    marginTop: theme.spacing.lg,
    backgroundColor: NAVY_PANEL,
    borderColor: 'rgba(240,223,207,0.92)',
    borderWidth: 1,
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#776556',
    marginBottom: theme.spacing.xs,
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: ORANGE_RED,
    marginBottom: theme.spacing.xs,
  },
  priceDetail: {
    marginTop: theme.spacing.xs,
  },
  priceDetailText: {
    fontSize: 13,
    color: '#776556',
  },
  infoCard: {
    marginTop: theme.spacing.md,
    backgroundColor: NAVY_PANEL,
    borderColor: 'rgba(240,223,207,0.92)',
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E231B',
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
  infoDesc: {
    fontSize: 13,
    color: '#776556',
    lineHeight: 20,
  },
  primaryActionRow: {
    marginTop: theme.spacing.lg,
  },
  orderNowButton: {
    backgroundColor: ORANGE_RED,
  },
  actionRow: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
});
