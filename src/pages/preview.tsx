import { share, getTossShareLink } from '@apps-in-toss/native-modules';
import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MockupCanvas } from '../components/MockupCanvas';
import {
  Badge,
  Card,
  ColorSwatch,
  ListRow,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Screen,
  theme,
} from '../components/ui';
import { useCatalog } from '../context/catalog';
import { resolveColorValue } from '../data/colorMap';
import { buildTemplate, printSizeByCategory } from '../data/mockupTemplates';
import { calcPricing } from '../data/pricing';
import { formatPrice } from '../utils/format';
import {
  type PrintResolutionResult,
  evaluatePrintResolution,
} from '../utils/printResolution';

const ACCENT = '#1B64DA';
const PAGE_BG = '#F2F4F6';
const PANEL = '#FFFFFF';

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
  const [printQuality, setPrintQuality] = useState<PrintResolutionResult | null>(null);
  const filteredShots = printBackEnabled
    ? mockupShots
    : mockupShots.slice(0, 1);

  const pricing = calcPricing({
    product: selectedProduct,
    orderLines,
    printOption: selectedPrint,
    printBackEnabled,
  });

  const designUri = frontDesignImageUri ?? backDesignImageUri;

  React.useEffect(() => {
    if (!designUri) {
      setPrintQuality(null);
      return;
    }
    let cancelled = false;
    /**
     * Judge the artwork at the size it will actually be printed.
     *
     * This used to measure against garmentSizes x the print option, which is a
     * different figure from the one the editor quotes and from the canvas the
     * press file is composed onto — for a tee it read 22.4x28cm against a real
     * 28x36cm, so the verdict came out about 28% optimistic and artwork rated
     * "선명하게 인쇄돼요" could still print soft.
     *
     * imageTransform.scale is a fraction of the print area, so the printed size
     * is the print area times that scale. Same arithmetic as artworkDpi in
     * server/printPipeline.js.
     */
    const printArea = printSizeByCategory[selectedProduct.category] ?? {
      widthCm: 28,
      heightCm: 36,
    };
    const designScale = Math.max(frontImageTransform.scale, 0.01);
    const printSize = {
      widthCm: printArea.widthCm * designScale,
      heightCm: printArea.heightCm * designScale,
    };
    Image.getSize(
      designUri,
      (pixelWidth, pixelHeight) => {
        if (cancelled) return;
        setPrintQuality(
          evaluatePrintResolution({
            pixelWidth,
            pixelHeight,
            printWidthCm: printSize.widthCm,
            printHeightCm: printSize.heightCm,
          }),
        );
      },
      // Size is unreadable for some URIs; stay silent rather than claim a level.
      () => {
        if (!cancelled) setPrintQuality(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [designUri, selectedProduct.category, frontImageTransform.scale]);

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
      <PageHeader
        title="완성 확인"
        subtitle={`${selectedProduct.name} · 다른 색상으로도 확인해 보세요`}
        onBack={() => navigation.goBack()}
      />

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

      {/* 인쇄 품질 — 올린 이미지의 실제 해상도 기준 */}
      {printQuality ? (
        <Card style={styles.qualityCard}>
          <Badge
            variant={
              printQuality.level === 'good'
                ? 'success'
                : printQuality.level === 'low'
                  ? 'warning'
                  : 'error'
            }
            label={
              printQuality.level === 'good'
                ? '인쇄 품질 양호'
                : printQuality.level === 'low'
                  ? '인쇄 품질 주의'
                  : '해상도 부족'
            }
          />
          <Text style={styles.qualityBadgeTitle}>{printQuality.title}</Text>
          <Text style={styles.qualityBadgeDesc}>{printQuality.description}</Text>
        </Card>
      ) : null}

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
        <ListRow label="예상 출고" value="결제 후 3~5영업일" />
        <ListRow label="배송" value="출고 후 1~2일" last />
      </Card>

      {/* 커스텀 제작 안내 */}
      <Card style={styles.policyCard}>
        <Text style={styles.policyTitle}>커스텀 제작 안내</Text>
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
    backgroundColor: PAGE_BG,
    paddingBottom: theme.spacing.xl,
  },
  mockupCard: {
    width: 220,
    alignItems: 'center',
    backgroundColor: PANEL,
    padding: theme.spacing.lg,
  },
  mockupSpacing: {
    marginLeft: theme.spacing.md,
  },
  mockupLabel: {
    ...theme.typography.label,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.md,
  },
  section: {
    marginTop: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  qualityCard: {
    marginTop: theme.spacing.xl,
  },
  qualityBadgeTitle: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  qualityBadgeDesc: {
    ...theme.typography.label,
    fontWeight: '500',
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },
  priceCard: {
    marginTop: theme.spacing.md,
    backgroundColor: PANEL,
  },
  priceLabel: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  priceRowLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  priceRowValue: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  priceSubDetail: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
  },
  priceDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing.md,
  },
  priceTotalLabel: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
  },
  priceTotalValue: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: theme.colors.textPrimary,
  },
  infoCard: {
    marginTop: theme.spacing.md,
    backgroundColor: PANEL,
  },
  infoTitle: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  policyCard: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.warningSoft,
  },
  policyTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  policyDesc: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  primaryActionRow: {
    marginTop: theme.spacing.xxl,
  },
  orderNowButton: {
    backgroundColor: ACCENT,
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
