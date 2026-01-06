import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Card,
  Chip,
  ColorSwatch,
  PrimaryButton,
  SecondaryButton,
  Screen,
  TopBar,
  theme,
} from '../components/ui';
import { MockupCanvas } from '../components/MockupCanvas';
import { buildTemplate } from '../data/mockupTemplates';
import type { Placement } from '../data/mockupTemplates';
import { useCatalog } from '../context/catalog';
import { resolveColorValue } from '../data/colorMap';
import { printOptions } from '../data/printOptions';
import { formatPrice } from '../utils/format';

export const Route = createRoute('/editor', {
  component: Page,
});

const placementOptions: { label: string; value: Placement }[] = [
  { label: '앞면', value: 'front' },
  { label: '뒷면', value: 'back' },
];

function Page() {
  const navigation = Route.useNavigation();
  const {
    selectedProduct,
    selectedColor,
    selectedSize,
    selectedPlacement,
    selectedPrint,
    setSelectedColor,
    setSelectedSizeLabel,
    setSelectedPlacement,
    setSelectedPrintId,
  } = useCatalog();

  const goPreview = () => {
    navigation.navigate('/preview');
  };

  const template = buildTemplate(selectedProduct, selectedColor, selectedPlacement);
  const selectedPrintOption = selectedPrint;
  const sizeExtra = selectedSize?.extraPrice ?? 0;
  const basePrice = selectedProduct.price ?? 0;
  const totalPrice = basePrice + sizeExtra + selectedPrintOption.price;

  return (
    <Screen>
      <TopBar title="상품 편집" onBack={() => navigation.goBack()} />

      <Card style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={styles.productText}>
            <Text style={styles.productTitle}>{selectedProduct.name}</Text>
            <Text style={styles.productDesc}>
              제품가 {formatPrice(selectedProduct.price ?? 0)}
            </Text>
            {selectedProduct.originalPrice &&
            selectedProduct.originalPrice > (selectedProduct.price ?? 0) ? (
              <Text style={styles.productOriginal}>
                정가 {formatPrice(selectedProduct.originalPrice)}
              </Text>
            ) : null}
          </View>
          <SecondaryButton
            label="상품 변경"
            onPress={() => navigation.navigate('/products')}
          />
        </View>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>색상</Text>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>사이즈</Text>
        <View style={styles.chipRow}>
          {selectedProduct.sizes.map((size) => {
            const label =
              size.extraPrice !== 0
                ? `${size.label} (${size.extraPrice > 0 ? '+' : ''}${formatPrice(
                    size.extraPrice
                  )})`
                : size.label;
            return (
            <Chip
              key={size.label}
              label={label}
              selected={selectedSize?.label === size.label}
              onPress={() => setSelectedSizeLabel(size.label)}
              style={styles.chipSpacing}
            />
          );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>프린트 크기</Text>
        <View style={styles.printOptionList}>
          {printOptions.map((option, index) => (
            <Card
              key={option.id}
              style={[
                styles.printOption,
                selectedPrintOption.id === option.id && styles.printOptionSelected,
                index < printOptions.length - 1 && styles.printOptionSpacing,
              ]}
            >
              <Text style={styles.printOptionTitle}>{option.label}</Text>
              <Text style={styles.printOptionDesc}>{option.description}</Text>
              <Text style={styles.printOptionPrice}>{formatPrice(option.price)}</Text>
              <SecondaryButton
                label={selectedPrintOption.id === option.id ? '선택됨' : '선택'}
                onPress={() => setSelectedPrintId(option.id)}
                style={styles.printOptionButton}
              />
            </Card>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>프린트 위치</Text>
        <View style={styles.chipRow}>
          {placementOptions.map((placement) => (
            <Chip
              key={placement.value}
              label={placement.label}
              selected={selectedPlacement === placement.value}
              onPress={() => setSelectedPlacement(placement.value)}
              style={styles.chipSpacing}
            />
          ))}
        </View>
      </View>

      <Card style={styles.canvasCard}>
        <Text style={styles.canvasTitle}>
          {selectedPlacement === 'back' ? '뒷면' : '앞면'} 프린트 영역
        </Text>
        <View style={styles.canvas}>
          <MockupCanvas
            template={template}
            width={220}
            height={280}
            showPrintArea
            showDesign
            designScale={selectedPrintOption.designScale}
          />
        </View>
        <Text style={styles.canvasHint}>
          권장 해상도: 3600 x 4800px (12x16in @300DPI)
        </Text>
        <View style={styles.toolRow}>
          <SecondaryButton label="중앙 맞춤" onPress={() => {}} style={styles.toolButton} />
          <SecondaryButton label="크기 100%" onPress={() => {}} style={styles.toolButton} />
          <SecondaryButton label="회전" onPress={() => {}} />
        </View>
      </Card>

      <Card style={styles.priceCard}>
        <Text style={styles.priceTitle}>예상 비용</Text>
        <Text style={styles.priceValue}>{formatPrice(totalPrice)}</Text>
        <Text style={styles.priceNote}>
          제품가 {formatPrice(basePrice)} + 프린트 {formatPrice(selectedPrintOption.price)}
          {sizeExtra !== 0 ? ` + 사이즈 ${formatPrice(sizeExtra)}` : ''}
        </Text>
      </Card>

      <Card style={styles.warningCard}>
        <Text style={styles.warningTitle}>해상도 확인</Text>
        <Text style={styles.warningDesc}>
          현재 이미지 해상도가 낮아 인쇄 시 흐릿해질 수 있어요.
        </Text>
      </Card>

      <PrimaryButton label="목업 미리보기" onPress={goPreview} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  productCard: {
    marginBottom: theme.spacing.lg,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  productText: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  productTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  productDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  productOriginal: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
    textDecorationLine: 'line-through',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  printOptionList: {
  },
  printOption: {
    paddingVertical: theme.spacing.md,
  },
  printOptionSpacing: {
    marginBottom: theme.spacing.sm,
  },
  printOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  printOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  printOptionDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  printOptionPrice: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  printOptionButton: {
    alignSelf: 'flex-start',
  },
  chipSpacing: {
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  canvasCard: {
    marginBottom: theme.spacing.lg,
  },
  canvasTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  canvas: {
    height: 300,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  canvasHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  toolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.md,
  },
  toolButton: {
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  warningCard: {
    borderColor: '#FACC15',
    backgroundColor: '#FFFBEB',
    marginBottom: theme.spacing.lg,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  warningDesc: {
    fontSize: 13,
    color: '#A16207',
  },
  priceCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  priceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  priceNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
