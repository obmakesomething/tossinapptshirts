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

const ORANGE_RED = '#2A6ED4';
const WARM_DEEP = '#FFFAF5';
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
      const shareLink = await getTossShareLink('intoss://merchandisegpt/preview');
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
      <PageHeader title="완성 확인" onBack={() => navigation.goBack()} />

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

      {/* 인쇄 품질 배지 */}
      <Card style={styles.qualityCard}>
        <View style={styles.qualityBadgeRow}>
          <Text style={styles.qualityBadgeIcon}>✅</Text>
          <View style={styles.qualityBadgeContent}>
            <Text style={styles.qualityBadgeTitle}>양호 — 선명하게 인쇄돼요</Text>
            <Text style={styles.qualityBadgeDesc}>해상도 3200×3200px (300DPI)</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.priceCard}>
        <Text style={styles.priceLabel}>가격 정보</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceRowLabel}>상품 금액</Text>
          <Text style={styles.priceRowValue}>{formatPrice(pricing.subtotal)}</Text>
        </View>
        {printBackEnabled && (
          <>
            <View style={styles.priceRow}>
              <Text style={styles.priceRowLabel}>뒷면 인쇄</Text>
              <Text style={styles.priceRowValue}>{formatPrice(pricing.backPrintingFee)}</Text>
            </View>
            <Text style={styles.priceSubDetail}>뒷면 디자인 1장당 ₩6,000</Text>
          </>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.priceRowLabel}>배송비</Text>
          <Text style={styles.priceRowValue}>
            {pricing.shippingFee === 0 ? '무료' : formatPrice(pricing.shippingFee)}
          </Text>
        </View>
        {pricing.shippingFee === 0 && (
          <Text style={styles.priceSubDetail}>₩60,000 이상 무료배송</Text>
        )}
        <View style={styles.priceDivider} />
        <View style={styles.priceRow}>
          <Text style={styles.priceTotalLabel}>총 금액</Text>
          <Text style={styles.priceTotalValue}>{formatPrice(pricing.total)}</Text>
        </View>
      </Card>

      {/* 배송 안내 */}
      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>배송 안내</Text>
        <Text style={styles.infoDesc}>📦 예상 출고: 결제 후 3~5영업일</Text>
        <Text style={styles.infoDesc}>🚚 배송: 출고 후 1~2일</Text>
      </Card>

      {/* 커스텀 제작 안내 */}
      <Card style={styles.policyCard}>
        <Text style={styles.policyTitle}>⚠️ 커스텀 제작 안내</Text>
        <Text style={styles.policyDesc}>
          주문 제작 상품이라 단순 변심으로 교환·환불이 어렵습니다.{'\n'}
          불량 시 100% 재제작해드려요.
        </Text>
      </Card>

      <View style={styles.primaryActionRow}>
        <PrimaryButton
          label={`주문하기 ${formatPrice(pricing.total)}`}
          onPress={goOrder}
          style={styles.orderNowButton}
        />
      </View>

      <View style={styles.actionRow}>
        <View style={styles.flex1}>
          <SecondaryButton label={saving ? '저장하고 있어요...' : '디자인 저장하기'} onPress={handleSave} disabled={saving} />
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
    backgroundColor: WARM_DEEP,
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
    color: '#7C6959',
    fontWeight: '700',
  },
  title: {
    ...theme.typography.heading,
    color: '#2E231B',
  },
  subtitle: {
    ...theme.typography.body,
    color: '#7C6959',
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
    color: '#7C6959',
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
  qualityCard: {
    marginTop: theme.spacing.lg,
    backgroundColor: '#E9F9F2',
    borderColor: '#AEE6CF',
    borderWidth: 1,
  },
  qualityBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityBadgeIcon: {
    fontSize: 20,
    marginRight: theme.spacing.sm,
  },
  qualityBadgeContent: {
    flex: 1,
  },
  qualityBadgeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E231B',
    lineHeight: 20,
  },
  qualityBadgeDesc: {
    fontSize: 12,
    color: '#7C6959',
    lineHeight: 18,
    marginTop: 2,
  },
  priceCard: {
    marginTop: theme.spacing.md,
    backgroundColor: NAVY_PANEL,
    borderColor: 'rgba(240,223,207,0.92)',
    borderWidth: 1,
    padding: theme.spacing.lg,
  },
  priceLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E231B',
    marginBottom: theme.spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  priceRowLabel: {
    fontSize: 14,
    color: '#7C6959',
  },
  priceRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E231B',
  },
  priceSubDetail: {
    fontSize: 12,
    color: '#7A6B5D',
    marginLeft: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  priceDivider: {
    height: 1,
    backgroundColor: 'rgba(240,223,207,0.92)',
    marginVertical: theme.spacing.sm,
  },
  priceTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E231B',
  },
  priceTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: ORANGE_RED,
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
    marginBottom: theme.spacing.sm,
  },
  infoDesc: {
    fontSize: 13,
    color: '#7C6959',
    lineHeight: 22,
  },
  policyCard: {
    marginTop: theme.spacing.md,
    backgroundColor: '#FFF8E1',
    borderColor: '#F5E6B8',
    borderWidth: 1,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E231B',
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
  },
  policyDesc: {
    fontSize: 13,
    color: '#7C6959',
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
