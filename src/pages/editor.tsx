import { createRoute } from '@granite-js/react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, Switch } from 'react-native';
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
import { DesignStage } from '../components/DesignStage';
import { ScaleSlider } from '../components/ScaleSlider';
import { buildTemplate } from '../data/mockupTemplates';
import type { Placement } from '../data/mockupTemplates';
import { useCatalog } from '../context/catalog';
import { resolveColorValue } from '../data/colorMap';
import { printOptions } from '../data/printOptions';
import { calcPricing, FREE_SHIPPING_THRESHOLD } from '../data/pricing';
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
    quantity,
    designImageUri,
    imageTransform,
    textTransform,
    activeLayer,
    textLayer,
    setSelectedColor,
    setSelectedSizeLabel,
    setSelectedPlacement,
    setSelectedPrintId,
    setQuantity,
    setImageTransform,
    setTextTransform,
    setActiveLayer,
    setTextLayer,
  } = useCatalog();

  const goPreview = () => {
    navigation.navigate('/preview');
  };

  const template = buildTemplate(selectedProduct, selectedColor, selectedPlacement);
  const selectedPrintOption = selectedPrint;
  const sizeExtra = selectedSize?.extraPrice ?? 0;
  const basePrice = selectedProduct.price ?? 0;
  const itemBase = basePrice + sizeExtra + selectedPrintOption.price;
  const pricing = calcPricing(itemBase, quantity);

  const activeTransform = activeLayer === 'text' ? textTransform : imageTransform;
  const updateActiveTransform = (next: typeof activeTransform) => {
    if (activeLayer === 'text') {
      setTextTransform(next);
    } else {
      setImageTransform(next);
    }
  };

  const textSizeLabel = useMemo(
    () => `${Math.round(textLayer.fontSize)}px`,
    [textLayer.fontSize]
  );

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
            <Text style={styles.productMeta}>
              모델명 {selectedProduct.modelName}
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
        <Text style={styles.sectionTitle}>수량</Text>
        <View style={styles.quantityRow}>
          <SecondaryButton label="-" onPress={() => setQuantity(Math.max(1, quantity - 1))} />
          <Text style={styles.quantityValue}>{quantity}</Text>
          <SecondaryButton label="+" onPress={() => setQuantity(quantity + 1)} />
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
        <View style={styles.layerRow}>
          <Chip
            label="이미지"
            selected={activeLayer === 'image'}
            onPress={() => setActiveLayer('image')}
            style={styles.chipSpacing}
          />
          <Chip
            label="텍스트"
            selected={activeLayer === 'text'}
            onPress={() => setActiveLayer('text')}
          />
        </View>
        <View style={styles.canvas}>
          <DesignStage
            template={template}
            width={240}
            height={300}
            showPrintArea
            imageUri={designImageUri}
            imageTransform={imageTransform}
            textLayer={textLayer}
            textTransform={textTransform}
            activeLayer={activeLayer}
            onImageTransformChange={setImageTransform}
            onTextTransformChange={setTextTransform}
          />
        </View>
        <Text style={styles.canvasHint}>
          드래그로 이동, 두 손가락으로 회전·확대 가능해요.
        </Text>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>크기</Text>
          <ScaleSlider
            min={0.2}
            max={1.6}
            value={activeTransform.scale}
            onChange={(scale) =>
              updateActiveTransform({ ...activeTransform, scale })
            }
          />
        </View>
        <View style={styles.toolRow}>
          <SecondaryButton
            label="중앙 맞춤"
            onPress={() =>
              updateActiveTransform({ ...activeTransform, offsetX: 0, offsetY: 0 })
            }
            style={styles.toolButton}
          />
          <SecondaryButton
            label="회전 초기화"
            onPress={() =>
              updateActiveTransform({ ...activeTransform, rotation: 0 })
            }
            style={styles.toolButton}
          />
          <SecondaryButton
            label="크기 초기화"
            onPress={() =>
              updateActiveTransform({
                ...activeTransform,
                scale: activeLayer === 'text' ? 0.45 : selectedPrintOption.designScale,
              })
            }
          />
        </View>
      </Card>

      <Card style={styles.textCard}>
        <View style={styles.optionRow}>
          <Text style={styles.optionTitle}>텍스트 추가</Text>
          <Switch
            value={textLayer.enabled}
            onValueChange={(value) =>
              setTextLayer({ ...textLayer, enabled: value })
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
        <TextInput
          style={styles.textInput}
          value={textLayer.text}
          onChangeText={(value) => setTextLayer({ ...textLayer, text: value })}
          placeholder="예: MERCH STUDIO"
          placeholderTextColor={theme.colors.muted}
          editable={textLayer.enabled}
        />
        <View style={styles.fontRow}>
          <Text style={styles.fontLabel}>굵기</Text>
          <View style={styles.fontButtons}>
            {['regular', 'bold'].map((weight) => (
              <Pressable
                key={weight}
                onPress={() => setTextLayer({ ...textLayer, fontWeight: weight as 'regular' | 'bold' })}
                style={[
                  styles.fontButton,
                  textLayer.fontWeight === weight && styles.fontButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.fontButtonText,
                    textLayer.fontWeight === weight && styles.fontButtonTextSelected,
                  ]}
                >
                  {weight === 'regular' ? 'Regular' : 'Bold'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>폰트 크기</Text>
          <ScaleSlider
            min={14}
            max={72}
            value={textLayer.fontSize}
            onChange={(fontSize) =>
              setTextLayer({ ...textLayer, fontSize })
            }
          />
          <Text style={styles.sliderValue}>{textSizeLabel}</Text>
        </View>
        <View style={styles.colorRow}>
          <Text style={styles.fontLabel}>색상</Text>
          {['#0F172A', '#FFFFFF'].map((color) => (
            <Pressable
              key={color}
              onPress={() => setTextLayer({ ...textLayer, color })}
              style={[
                styles.colorChip,
                { backgroundColor: color },
                textLayer.color === color && styles.colorChipSelected,
              ]}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.priceCard}>
        <Text style={styles.priceTitle}>예상 비용</Text>
        <Text style={styles.priceValue}>{formatPrice(pricing.customerTotal)}</Text>
        <Text style={styles.priceNote}>
          제품가 {formatPrice(basePrice)} + 프린트 {formatPrice(selectedPrintOption.price)}
          {sizeExtra !== 0 ? ` + 사이즈 ${formatPrice(sizeExtra)}` : ''} × {quantity}
        </Text>
        <Text style={styles.priceNote}>
          배송비 {pricing.shippingFee === 0 ? '무료' : formatPrice(pricing.shippingFee)} ·
          {` ${formatPrice(FREE_SHIPPING_THRESHOLD)} 이상 무료배송`}
        </Text>
        <Text style={styles.priceNote}>
          수수료 포함 {formatPrice(pricing.marginAmount)} ({Math.round(pricing.marginRate * 100)}%)
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
  productMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
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
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginHorizontal: theme.spacing.lg,
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
  layerRow: {
    flexDirection: 'row',
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
  sliderRow: {
    marginTop: theme.spacing.md,
  },
  sliderLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  sliderValue: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 6,
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
  textCard: {
    marginBottom: theme.spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  textInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    fontFamily: 'NotoSansKR-Regular',
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  fontRow: {
    marginTop: theme.spacing.md,
  },
  fontLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  fontButtons: {
    flexDirection: 'row',
  },
  fontButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  fontButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  fontButtonText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  fontButtonTextSelected: {
    color: theme.colors.primary,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  colorChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
  },
  colorChipSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
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
