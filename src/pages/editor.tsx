import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useMemo, useState } from 'react';
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
import { MockupCanvas } from '../components/MockupCanvas';
import { ScaleSlider } from '../components/ScaleSlider';
import { buildTemplate } from '../data/mockupTemplates';
import type { Placement } from '../data/mockupTemplates';
import { useCatalog } from '../context/catalog';
import { resolveColorValue } from '../data/colorMap';
import { calcPricing } from '../data/pricing';
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
    orderLines,
    totalQuantity,
    selectedPlacement,
    printBackEnabled,
    selectedPrint,
    designImageUri,
    imageTransform,
    textTransform,
    activeLayer,
    textLayer,
    setSelectedColor,
    setSelectedPlacement,
    setPrintBackEnabled,
    addOrderLine,
    removeOrderLine,
    setOrderLineSize,
    setOrderLineQuantity,
    setImageTransform,
    setTextTransform,
    setActiveLayer,
    setTextLayer,
  } = useCatalog();
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);

  const goPreview = () => {
    navigation.navigate('/preview');
  };

  const template = buildTemplate(selectedProduct, selectedColor, selectedPlacement);
  const pricing = calcPricing(totalQuantity);

  useEffect(() => {
    const firstLine = orderLines[0];
    if (firstLine && !activeLineId) {
      setActiveLineId(firstLine.id);
      return;
    }
    if (activeLineId && !orderLines.find((line) => line.id === activeLineId)) {
      setActiveLineId(firstLine?.id ?? null);
    }
  }, [orderLines, activeLineId]);

  const activeLine = useMemo(
    () => orderLines.find((line) => line.id === activeLineId) ?? orderLines[0],
    [orderLines, activeLineId]
  );
  const usedSizes = useMemo(
    () => new Set(orderLines.map((line) => line.sizeLabel)),
    [orderLines]
  );
  const remainingSizes = selectedProduct.sizes.filter(
    (size) => !usedSizes.has(size.label)
  );

  const activeTransform = activeLayer === 'text' ? textTransform : imageTransform;
  const updateActiveTransform = (next: typeof activeTransform) => {
    if (activeLayer === 'text') {
      setTextTransform(next);
    } else {
      setImageTransform(next);
    }
  };

  // Individual transform property updaters to avoid closure issues
  const updateScale = (scale: number) => {
    if (activeLayer === 'text') {
      setTextTransform(prev => ({ ...prev, scale }));
    } else {
      setImageTransform(prev => ({ ...prev, scale }));
    }
  };

  const updateOffsetX = (offsetX: number) => {
    if (activeLayer === 'text') {
      setTextTransform(prev => ({ ...prev, offsetX }));
    } else {
      setImageTransform(prev => ({ ...prev, offsetX }));
    }
  };

  const updateOffsetY = (offsetY: number) => {
    if (activeLayer === 'text') {
      setTextTransform(prev => ({ ...prev, offsetY }));
    } else {
      setImageTransform(prev => ({ ...prev, offsetY }));
    }
  };

  const updateRotation = (rotation: number) => {
    if (activeLayer === 'text') {
      setTextTransform(prev => ({ ...prev, rotation }));
    } else {
      setImageTransform(prev => ({ ...prev, rotation }));
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
            <Text style={styles.productMeta}>{selectedProduct.modelName}</Text>
            <Text style={styles.productPrice}>
              {selectedProduct.priceText}
              {selectedProduct.originalPrice && selectedProduct.price ? (
                <Text style={styles.productOriginalPrice}> {formatPrice(selectedProduct.originalPrice)}</Text>
              ) : null}
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
        {activeLayer === 'text' && textLayer.enabled ? (
          <View style={styles.textEditSection}>
            <Text style={styles.textEditTitle}>텍스트 내용</Text>
            <TextInput
              style={styles.textInput}
              value={textLayer.text}
              onChangeText={(value) => setTextLayer({ ...textLayer, text: value })}
              placeholder="텍스트 입력"
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
            <SecondaryButton
              label="텍스트 삭제"
              onPress={() => {
                setTextLayer({ ...textLayer, enabled: false });
                setActiveLayer('image');
              }}
            />
          </View>
        ) : null}
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
        <View style={styles.transformSection}>
          <Text style={styles.transformTitle}>위치 및 변형</Text>
          <Text style={styles.transformHint}>
            슬라이더로 {activeLayer === 'text' ? '텍스트' : '이미지'}의 크기·위치·회전을 조절하세요.
          </Text>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>크기</Text>
            <ScaleSlider
              min={0.2}
              max={1.0}
              value={activeTransform.scale}
              onChange={updateScale}
            />
          </View>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>가로 위치</Text>
            <ScaleSlider
              min={-0.55}
              max={0.55}
              value={activeTransform.offsetX}
              onChange={updateOffsetX}
            />
          </View>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>세로 위치</Text>
            <ScaleSlider
              min={-0.55}
              max={0.55}
              value={activeTransform.offsetY}
              onChange={updateOffsetY}
            />
          </View>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>회전</Text>
            <ScaleSlider
              min={-180}
              max={180}
              value={activeTransform.rotation}
              onChange={updateRotation}
            />
          </View>
          <SecondaryButton
            label="초기화"
            onPress={() =>
              updateActiveTransform({
                offsetX: 0,
                offsetY: 0,
                scale: activeLayer === 'text' ? 0.45 : selectedPrint.designScale,
                rotation: 0,
              })
            }
            style={styles.resetButton}
          />
        </View>
      </Card>

      <Card style={styles.optionCard}>
        <Text style={styles.sectionTitle}>주문 정보</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>색상</Text>
          <Text style={styles.infoValue}>{selectedColor}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>프린트 영역</Text>
          <Text style={styles.infoValue}>{selectedPrint.label} ({selectedPrint.description})</Text>
        </View>
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>사이즈 · 수량</Text>
        {orderLines.map((line) => (
          <View key={line.id} style={styles.lineRow}>
            <Pressable
              style={[
                styles.lineBadge,
                activeLineId === line.id && styles.lineBadgeActive,
              ]}
              onPress={() => setActiveLineId(line.id)}
            >
              <Text
                style={[
                  styles.lineBadgeText,
                  activeLineId === line.id && styles.lineBadgeTextActive,
                ]}
              >
                {line.sizeLabel}
              </Text>
            </Pressable>
            <View style={styles.quantityRow}>
              <SecondaryButton
                label="-"
                onPress={() => setOrderLineQuantity(line.id, line.quantity - 1)}
              />
              <Text style={styles.quantityValue}>{line.quantity}</Text>
              <SecondaryButton
                label="+"
                onPress={() => setOrderLineQuantity(line.id, line.quantity + 1)}
              />
            </View>
            {orderLines.length > 1 ? (
              <Pressable
                onPress={() => removeOrderLine(line.id)}
                accessibilityRole="button"
                accessibilityLabel={`${line.sizeLabel} 삭제`}
              >
                <Text style={styles.removeText}>삭제</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {activeLine ? (
          <>
            <Text style={styles.subTitle}>사이즈 변경</Text>
            <View style={styles.chipRow}>
              {selectedProduct.sizes.map((size) => (
                <Chip
                  key={size.label}
                  label={size.label}
                  selected={activeLine.sizeLabel === size.label}
                  onPress={() => setOrderLineSize(activeLine.id, size.label)}
                  style={styles.chipSpacing}
                />
              ))}
            </View>
            <Text style={styles.sizeHint}>
              신장 기준 • XS: 155-160cm, S: 160-165cm, M: 165-170cm, L: 170-175cm, XL: 175-180cm, 2XL: 180-185cm, 3XL: 185-190cm
            </Text>
          </>
        ) : null}
        <SecondaryButton
          label="다른 사이즈 추가"
          onPress={() => {
            const nextSize = remainingSizes[0]?.label || selectedProduct.sizes[0]?.label;
            if (nextSize) addOrderLine(nextSize);
          }}
          disabled={!remainingSizes.length}
          style={styles.addLineButton}
        />
      </Card>

      <Card style={styles.printingCard}>
        <View style={styles.optionRow}>
          <View>
            <Text style={styles.optionTitle}>뒷면 프린팅 추가</Text>
            {printBackEnabled && (
              <Text style={styles.optionHint}>뒷면 디자인을 추가해요</Text>
            )}
          </View>
          <Switch
            value={printBackEnabled}
            onValueChange={(enabled) => {
              setPrintBackEnabled(enabled);
              if (enabled) {
                setSelectedPlacement('back');
              } else {
                setSelectedPlacement('front');
              }
            }}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>
        {printBackEnabled ? (
          <>
            <View style={styles.backPreviewContainer}>
              <MockupCanvas
                template={buildTemplate(selectedProduct, selectedColor, 'back')}
                width={140}
                height={180}
                showDesign
                designImageUri={designImageUri}
                imageTransform={imageTransform}
                textLayer={textLayer}
                textTransform={textTransform}
              />
            </View>
            {!designImageUri && (
              <View style={styles.imageActionRow}>
                <SecondaryButton
                  label="이미지 업로드"
                  onPress={() => navigation.navigate('/upload')}
                  style={styles.imageActionButton}
                />
                <SecondaryButton
                  label="AI로 생성"
                  onPress={() => navigation.navigate('/generate')}
                  style={styles.imageActionButton}
                />
              </View>
            )}
          </>
        ) : null}
      </Card>

      <Card style={styles.priceCard}>
        <Text style={styles.priceTitle}>예상 결제 금액</Text>
        <Text style={styles.priceValue}>{formatPrice(pricing.total)}</Text>
        <Text style={styles.priceNote}>
          배송비 {pricing.shippingFee === 0 ? '무료' : formatPrice(pricing.shippingFee)} · 총{' '}
          {totalQuantity}개
        </Text>
      </Card>

      <PrimaryButton label="완성 미리보기" onPress={goPreview} />
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
    lineHeight: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  productMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  productPrice: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  productOriginalPrice: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  sizeGuide: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.md,
  },
  sizeGuideTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  sizeGuideText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.xs,
  },
  infoLabel: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionCard: {
    marginBottom: theme.spacing.lg,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  lineBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  lineBadgeActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  lineBadgeText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  lineBadgeTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityValue: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginHorizontal: theme.spacing.lg,
  },
  removeText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.error,
    fontWeight: '600',
  },
  subTitle: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  addLineButton: {
    marginTop: theme.spacing.sm,
  },
  chipSpacing: {
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  imageActionRow: {
    marginTop: theme.spacing.sm,
  },
  imageActionButton: {
    marginBottom: theme.spacing.sm,
  },
  textEditSection: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  textEditTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  sizeHint: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  optionHint: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  backPreviewContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  canvasCard: {
    marginBottom: theme.spacing.lg,
  },
  canvasTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  layerRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  canvas: {
    height: 300,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.md,
  },
  transformSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  transformTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  transformHint: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  sliderRow: {
    marginTop: theme.spacing.sm,
  },
  sliderLabel: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  resetButton: {
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
  printingCard: {
    marginBottom: theme.spacing.lg,
  },
  optionTitle: {
    fontSize: 16,
    lineHeight: 22,
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
    lineHeight: 20,
    fontFamily: 'NotoSansKR-Regular',
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  fontRow: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  fontLabel: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  fontButtons: {
    flexDirection: 'row',
  },
  fontButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
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
    lineHeight: 18,
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
    backgroundColor: theme.colors.infoSoft,
    borderColor: theme.colors.infoBorder,
  },
  priceTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  priceValue: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  priceNote: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
});
