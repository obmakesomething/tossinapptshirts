import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
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
import { calcPricing, BULK_UNIT_THRESHOLD, BULK_UNIT_PRICE, FREE_SHIPPING_THRESHOLD_QTY } from '../data/pricing';
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
    printBackEnabled,
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
    setPrintBackEnabled,
    setQuantity,
    setImageTransform,
    setTextTransform,
    setActiveLayer,
    setTextLayer,
  } = useCatalog();
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const goPreview = () => {
    navigation.navigate('/preview');
  };

  const template = buildTemplate(selectedProduct, selectedColor, selectedPlacement);
  const selectedPrintOption = selectedPrint;
  const pricing = calcPricing(quantity);

  const activeTransform = activeLayer === 'text' ? textTransform : imageTransform;
  const updateActiveTransform = (next: typeof activeTransform) => {
    if (activeLayer === 'text') {
      setTextTransform(next);
    } else {
      setImageTransform(next);
    }
  };

  const ensureTextLayer = () => {
    if (!textLayer.enabled) {
      setTextLayer({
        ...textLayer,
        enabled: true,
        text: textLayer.text?.trim() ? textLayer.text : '텍스트',
      });
    }
    setActiveLayer('text');
  };

  return (
    <Screen scrollEnabled={scrollEnabled}>
      <TopBar title="상품 편집" onBack={() => navigation.goBack()} />

      <Card style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={styles.productText}>
            <Text style={styles.productTitle}>{selectedProduct.name}</Text>
            <Text style={styles.productMeta}>
              모델명 {selectedProduct.modelName}
            </Text>
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
            return (
              <Chip
                key={size.label}
                label={size.label}
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
        <Text style={styles.sectionTitle}>프린팅 옵션</Text>
        <View style={styles.optionRow}>
          <Text style={styles.optionTitle}>뒷면 프린팅 추가</Text>
          <Switch
            value={printBackEnabled}
            onValueChange={setPrintBackEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
        {printBackEnabled ? (
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
        ) : null}
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
            onPress={ensureTextLayer}
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
            onInteractionStart={() => setScrollEnabled(false)}
            onInteractionEnd={() => setScrollEnabled(true)}
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
          <SecondaryButton
            label={textLayer.enabled ? '텍스트 삭제' : '텍스트 생성'}
            onPress={() => {
              if (textLayer.enabled) {
                setTextLayer({ ...textLayer, enabled: false });
                setActiveLayer('image');
              } else {
                ensureTextLayer();
              }
            }}
          />
        </View>
        {textLayer.enabled ? (
          <>
            <TextInput
              style={styles.textInput}
              value={textLayer.text}
              onChangeText={(value) => setTextLayer({ ...textLayer, text: value })}
              placeholder="예: MERCH STUDIO"
              placeholderTextColor={theme.colors.muted}
            />
            <View style={styles.fontRow}>
              <Text style={styles.fontLabel}>굵기</Text>
              <View style={styles.fontButtons}>
                {['regular', 'bold'].map((weight) => (
                  <Pressable
                    key={weight}
                    onPress={() =>
                      setTextLayer({ ...textLayer, fontWeight: weight as 'regular' | 'bold' })
                    }
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
          </>
        ) : null}
      </Card>

      <Card style={styles.priceCard}>
        <Text style={styles.priceTitle}>예상 결제 금액</Text>
        <Text style={styles.priceValue}>{formatPrice(pricing.total)}</Text>
        <Text style={styles.priceNote}>
          개당 {formatPrice(pricing.unitPrice)} · 배송비{' '}
          {pricing.shippingFee === 0 ? '무료' : formatPrice(pricing.shippingFee)}
        </Text>
        <Text style={styles.priceNote}>
          {FREE_SHIPPING_THRESHOLD_QTY}개부터 무료배송 · {BULK_UNIT_THRESHOLD}개부터{' '}
          {formatPrice(BULK_UNIT_PRICE)} 적용
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
  productMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
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
  toolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.md,
  },
  toolButton: {
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
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
