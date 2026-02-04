import { createRoute } from '@granite-js/react-native';
import { TextField } from '@toss/tds-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DesignStage } from '../components/DesignStage';
import { MockupCanvas } from '../components/MockupCanvas';
import { ScaleSlider } from '../components/ScaleSlider';
import {
  Card,
  Chip,
  CollapsibleSection,
  ColorSwatch,
  PrimaryButton,
  SecondaryButton,
  TabBar,
  TopBar,
  theme,
} from '../components/ui';
import { useCatalog } from '../context/catalog';
import { resolveColorValue } from '../data/colorMap';
import { buildTemplate, printSizeByCategory } from '../data/mockupTemplates';
import { calcPricing } from '../data/pricing';
import { formatPrice } from '../utils/format';

export const Route = createRoute('/editor', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const {

    selectedProduct,
    selectedColor,
    orderLines,
    totalQuantity,
    printBackEnabled,
    selectedPrint,
    selectedPlacement,
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
    setImageTransform,
    setTextTransform,
    setActiveLayer,
    setTextLayer,
  } = useCatalog();



  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [editorTab, setEditorTab] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState(false);

  // Draft state for current size/quantity selection (not yet confirmed)
  const [draftSize, setDraftSize] = useState<string>(
    selectedProduct.sizes[0]?.label ?? '',
  );
  const [draftQuantity, setDraftQuantity] = useState<number>(1);

  // 패딩 24 통일 (좌우 24 × 2 = 48)
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const canvasWidth = screenWidth - 48;
  const canvasHeight = expandedPanel
    ? Math.min(canvasWidth * 0.8, screenHeight * 0.25)
    : Math.min(canvasWidth * 1.25, screenHeight * 0.42);

  // Zoom to print area camera transform
  const printAreaFrac = { x: 0.32, y: 0.22, w: 0.36, h: 0.46 };
  const cameraScale = focusMode
    ? Math.min(canvasWidth / (canvasWidth * printAreaFrac.w), canvasHeight / (canvasHeight * printAreaFrac.h))
    : 1;
  const cameraTranslateX = focusMode
    ? -(printAreaFrac.x + printAreaFrac.w / 2 - 0.5) * canvasWidth * cameraScale
    : 0;
  const cameraTranslateY = focusMode
    ? -(printAreaFrac.y + printAreaFrac.h / 2 - 0.5) * canvasHeight * cameraScale
    : 0;

  const EDITOR_TABS = ['레이어', '조정', '옵션'];

  const goPreview = () => {
    navigation.navigate('/preview');
  };

  const pricing = calcPricing({
    product: selectedProduct,
    orderLines,
    printOption: selectedPrint,
    printBackEnabled,
  });

  // Reset draft state when product changes
  useEffect(() => {
    setDraftSize(selectedProduct.sizes[0]?.label ?? '');
    setDraftQuantity(1);
  }, [selectedProduct]);

  const usedSizes = useMemo(
    () => new Set(orderLines.map((line) => line.sizeLabel)),
    [orderLines],
  );

  // Check if current draft size is already in confirmed orders
  const isDraftSizeUsed = usedSizes.has(draftSize);

  const activeTransform =
    activeLayer === 'text' ? textTransform : imageTransform;
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
      setTextTransform({ ...textTransform, scale });
    } else {
      setImageTransform({ ...imageTransform, scale });
    }
  };

  const updateOffsetX = (offsetX: number) => {
    if (activeLayer === 'text') {
      setTextTransform({ ...textTransform, offsetX });
    } else {
      setImageTransform({ ...imageTransform, offsetX });
    }
  };

  const updateOffsetY = (offsetY: number) => {
    if (activeLayer === 'text') {
      setTextTransform({ ...textTransform, offsetY });
    } else {
      setImageTransform({ ...imageTransform, offsetY });
    }
  };

  const updateRotation = (rotation: number) => {
    if (activeLayer === 'text') {
      setTextTransform({ ...textTransform, rotation });
    } else {
      setImageTransform({ ...imageTransform, rotation });
    }
  };

  const handleAddText = () => {
    const colorKey = selectedColor.toLowerCase();
    const isDark = ['블랙', '네이비', '차콜', 'black', 'navy', 'charcoal'].some(
      (c) => colorKey.includes(c),
    );
    const autoColor = isDark ? '#FFFFFF' : '#000000';

    setTextLayer({
      ...textLayer,
      enabled: true,
      text: textLayer.text?.trim() ? textLayer.text : '내 텍스트',
      color: autoColor,
    });
    setActiveLayer('text');
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── 컴팩트 상단 ── */}
      <View style={styles.compactHeader}>
        <TopBar title="옷 위에 프린팅하기" />
        <View style={styles.compactProduct}>
          <View style={[styles.compactDot, { backgroundColor: resolveColorValue(selectedColor) }]} />
          <Text style={styles.compactName} numberOfLines={1}>
            {selectedProduct.name} · {selectedColor}
          </Text>
          <Pressable
            onPress={() => navigation.navigate('/products')}
            style={styles.compactChange}
          >
            <Text style={styles.compactChangeText}>변경</Text>
          </Pressable>
        </View>
        {/* 앞/뒤면 세그먼트 */}
        <View style={styles.placementSegment}>
          <Pressable
            style={[styles.segmentButton, selectedPlacement === 'front' && styles.segmentButtonActive]}
            onPress={() => setSelectedPlacement('front')}
          >
            <Text style={[styles.segmentButtonText, selectedPlacement === 'front' && styles.segmentButtonTextActive]}>
              앞면
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentButton, selectedPlacement === 'back' && styles.segmentButtonActive]}
            onPress={() => {
              setSelectedPlacement('back');
              if (!printBackEnabled) setPrintBackEnabled(true);
            }}
          >
            <Text style={[styles.segmentButtonText, selectedPlacement === 'back' && styles.segmentButtonTextActive]}>
              뒷면
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── 캔버스 (최대화) ── */}
      <View style={styles.canvasArea}>
        <View style={styles.canvasToolbar}>
          <Pressable
            style={[styles.focusButton, focusMode && styles.focusButtonActive]}
            onPress={() => setFocusMode(!focusMode)}
          >
            <Text style={[styles.focusButtonText, focusMode && styles.focusButtonTextActive]}>
              {focusMode ? '전체 보기' : '확대 편집'}
            </Text>
          </Pressable>
        </View>
        <View style={[styles.canvasClip, { width: canvasWidth, height: canvasHeight }]}>
          <View
            style={{
              transform: [
                { translateX: cameraTranslateX },
                { translateY: cameraTranslateY },
                { scale: cameraScale },
              ],
            }}
          >
            <DesignStage
              template={buildTemplate(selectedProduct, selectedColor, selectedPlacement)}
              width={canvasWidth}
              height={canvasHeight}
              showPrintArea
              showGuides
              cameraScale={cameraScale}
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
        </View>
        {/* 출력 크기 + 해상도 안내 */}
        <View style={styles.canvasInfo}>
          <Text style={styles.canvasInfoText}>
            출력 영역 약 {printSizeByCategory[selectedProduct.category]?.widthCm ?? 28}×
            {printSizeByCategory[selectedProduct.category]?.heightCm ?? 36}cm
          </Text>
          {designImageUri && (
            <Text style={styles.canvasInfoWarn}>
              해상도에 따라 인쇄 품질이 달라질 수 있어요
            </Text>
          )}
        </View>
      </View>

      {/* ── 하단 탭 패널 ── */}
      <View style={[styles.panel, expandedPanel && styles.panelExpanded]}>
        {/* 드래그 핸들 */}
        <Pressable
          style={styles.dragHandle}
          onPress={() => setExpandedPanel(!expandedPanel)}
        >
          <View style={styles.dragBar} />
          <Text style={styles.dragHint}>
            {expandedPanel ? '▼ 터치해서 패널 축소' : '▲ 터치해서 패널 확장'}
          </Text>
        </Pressable>
        <TabBar
          tabs={EDITOR_TABS}
          activeIndex={editorTab}
          onChangeIndex={setEditorTab}
        />
        <ScrollView
          style={styles.panelScroll}
          contentContainerStyle={styles.panelContent}
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {/* ── 탭 0: 레이어 ── */}
          {editorTab === 0 && (
            <View>
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

              {activeLayer === 'text' && !textLayer.enabled && (
                <View style={styles.textEditSection}>
                  <Text style={styles.sectionTitle}>텍스트를 추가해 볼까요?</Text>
                  <Text style={styles.sectionHint}>
                    나만의 문구를 넣어서 특별한 굿즈를 만들어 보세요.
                  </Text>
                  <SecondaryButton label="텍스트 추가하기" onPress={handleAddText} />
                </View>
              )}

              {activeLayer === 'text' && textLayer.enabled && (
                <View style={styles.textEditSection}>
                  <TextField
                    variant="box"
                    label="텍스트"
                    labelOption="sustain"
                    value={textLayer.text}
                    onChangeText={(value) =>
                      setTextLayer({ ...textLayer, text: value })
                    }
                    placeholder="원하는 문구를 입력해 주세요"
                  />
                  <View style={styles.fontRow}>
                    <Text style={styles.fontLabel}>굵기</Text>
                    <View style={styles.fontButtons}>
                      {['regular', 'bold'].map((weight) => (
                        <Pressable
                          key={weight}
                          onPress={() =>
                            setTextLayer({
                              ...textLayer,
                              fontWeight: weight as 'regular' | 'bold',
                            })
                          }
                          style={[
                            styles.fontButton,
                            textLayer.fontWeight === weight &&
                            styles.fontButtonSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.fontButtonText,
                              textLayer.fontWeight === weight &&
                              styles.fontButtonTextSelected,
                            ]}
                          >
                            {weight === 'regular' ? 'Regular' : 'Bold'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View style={styles.fontRow}>
                    <Text style={styles.fontLabel}>색상</Text>
                    <View style={styles.fontButtons}>
                      {[
                        { label: '블랙', value: '#000000' },
                        { label: '화이트', value: '#FFFFFF' },
                      ].map((colorOption) => (
                        <Pressable
                          key={colorOption.value}
                          onPress={() =>
                            setTextLayer({
                              ...textLayer,
                              color: colorOption.value,
                            })
                          }
                          style={[
                            styles.fontButton,
                            textLayer.color === colorOption.value &&
                            styles.fontButtonSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.fontButtonText,
                              textLayer.color === colorOption.value &&
                              styles.fontButtonTextSelected,
                            ]}
                          >
                            {colorOption.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <SecondaryButton
                    label="텍스트 삭제하기"
                    onPress={() => {
                      setTextLayer({ ...textLayer, enabled: false });
                      setActiveLayer('image');
                    }}
                    style={{ marginTop: theme.spacing.sm }}
                  />
                </View>
              )}

              {/* 뒷면 프린팅 토글 */}
              <View style={styles.backSection}>
                {!printBackEnabled ? (
                  <SecondaryButton
                    label="뒷면 프린팅 추가하기"
                    onPress={() => {
                      setPrintBackEnabled(true);
                      setSelectedPlacement('back');
                    }}
                  />
                ) : (
                  <>
                    <View style={styles.optionRow}>
                      <Text style={styles.sectionTitle}>뒷면 프린팅</Text>
                      <SecondaryButton
                        label="뒷면 빼기"
                        onPress={() => {
                          setPrintBackEnabled(false);
                          setSelectedPlacement('front');
                        }}
                      />
                    </View>
                    <View style={styles.backPreviewContainer}>
                      <MockupCanvas
                        template={buildTemplate(selectedProduct, selectedColor, 'back')}
                        width={160}
                        height={200}
                        showDesign
                        designImageUri={designImageUri}
                        imageTransform={imageTransform}
                        textLayer={textLayer}
                        textTransform={textTransform}
                      />
                    </View>
                  </>
                )}
              </View>
            </View>
          )}

          {/* ── 탭 1: 조정 ── */}
          {editorTab === 1 && (
            <View>
              <Text style={styles.transformHint}>
                {activeLayer === 'text' ? '텍스트' : '이미지'}의 크기와 위치를 조절해 보세요.
              </Text>
              <View style={styles.sliderRow}>
                <Text style={styles.sliderLabel}>크기</Text>
                <ScaleSlider
                  min={0.2}
                  max={2.0}
                  value={activeTransform.scale}
                  onChange={updateScale}
                />
              </View>
              <CollapsibleSection title="정밀 조정 (위치/회전)">
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
              </CollapsibleSection>
              <View style={styles.adjustButtons}>
                <SecondaryButton
                  label="프린트 영역에 맞추기"
                  onPress={() =>
                    updateActiveTransform({
                      offsetX: 0,
                      offsetY: 0,
                      scale: activeLayer === 'text' ? 0.9 : 1.0,
                      rotation: 0,
                    })
                  }
                  style={styles.resetButton}
                />
                <SecondaryButton
                  label="초기화"
                  onPress={() =>
                    updateActiveTransform({
                      offsetX: 0,
                      offsetY: 0,
                      scale:
                        activeLayer === 'text' ? 0.45 : selectedPrint.designScale,
                      rotation: 0,
                    })
                  }
                  style={styles.resetButton}
                />
              </View>
            </View>
          )}

          {/* ── 탭 2: 옵션 ── */}
          {editorTab === 2 && (
            <View>
              {/* 컬러 */}
              <Text style={styles.sectionTitle}>컬러</Text>
              <View style={styles.colorOptions}>
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

              {/* 사이즈 */}
              <Text style={[styles.sectionTitle, { marginTop: theme.spacing.lg }]}>
                사이즈
              </Text>
              <View style={styles.chipRow}>
                {selectedProduct.sizes.map((size) => (
                  <Chip
                    key={size.label}
                    label={size.label}
                    selected={draftSize === size.label}
                    onPress={() => setDraftSize(size.label)}
                    style={styles.chipSpacing}
                  />
                ))}
              </View>
              <Text style={styles.sizeHint}>
                XS: 155-160 · S: 160-165 · M: 165-170 · L: 170-175 · XL: 175-180 · 2XL: 180-185
              </Text>

              {/* 수량 */}
              <Text style={[styles.sectionTitle, { marginTop: theme.spacing.lg }]}>
                수량
              </Text>
              <View style={styles.quantityRow}>
                <SecondaryButton
                  label="-"
                  onPress={() => setDraftQuantity((q) => Math.max(1, q - 1))}
                />
                <Text style={styles.quantityValue}>{draftQuantity}</Text>
                <SecondaryButton
                  label="+"
                  onPress={() => setDraftQuantity((q) => q + 1)}
                />
              </View>

              <SecondaryButton
                label="장바구니에 추가"
                onPress={() => {
                  if (isDraftSizeUsed) return;
                  addOrderLine(draftSize, draftQuantity);
                  const nextSize = selectedProduct.sizes.find(
                    (s) => !usedSizes.has(s.label) && s.label !== draftSize,
                  );
                  setDraftSize(nextSize?.label ?? selectedProduct.sizes[0]?.label ?? '');
                  setDraftQuantity(1);
                }}
                disabled={isDraftSizeUsed}
                style={styles.addLineButton}
              />
              {isDraftSizeUsed && (
                <Text style={styles.sizeHint}>
                  {draftSize} 사이즈는 이미 담겨 있어요.
                </Text>
              )}

              {/* 주문 목록 */}
              {orderLines.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: theme.spacing.lg }]}>
                    주문할 상품
                  </Text>
                  {orderLines.map((line) => (
                    <View key={line.id} style={styles.confirmRow}>
                      <Text style={styles.confirmText}>
                        {line.sizeLabel} × {line.quantity}개
                      </Text>
                      {orderLines.length > 1 && (
                        <Pressable
                          onPress={() => removeOrderLine(line.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`${line.sizeLabel} 삭제`}
                        >
                          <Text style={styles.removeText}>빼기</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                </>
              )}

              {/* 가격 */}
              <Card style={styles.priceCard}>
                <Text style={styles.priceTitle}>예상 결제 금액</Text>
                <Text style={styles.priceValue}>{formatPrice(pricing.total)}</Text>
                {pricing.backPrintingFee > 0 && (
                  <Text style={styles.priceOption}>
                    뒷면 +{formatPrice(pricing.backPrintingFee)}
                  </Text>
                )}
                {pricing.largePrintFee > 0 && (
                  <Text style={styles.priceOption}>
                    대형 +{formatPrice(pricing.largePrintFee)}
                  </Text>
                )}
                <Text style={styles.priceNote}>
                  배송비{' '}
                  {pricing.shippingFee === 0
                    ? '무료'
                    : formatPrice(pricing.shippingFee)}{' '}
                  · 총 {totalQuantity}개
                </Text>
              </Card>
            </View>
          )}
        </ScrollView>
      </View>

      {/* ── 하단 고정 CTA ── */}
      <View style={styles.ctaBar}>
        <PrimaryButton label="완성된 모습 보기" onPress={goPreview} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  /* ── Compact Header ── */
  compactHeader: {
    paddingHorizontal: 24,
  },
  compactProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  compactDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
  },
  compactName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  compactChange: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 999,
    backgroundColor: theme.colors.primarySoft,
  },
  compactChangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  /* ── Placement Segment ── */
  placementSegment: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 2,
    marginBottom: theme.spacing.sm,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderRadius: 999,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  segmentButtonTextActive: {
    color: theme.colors.primary,
  },

  /* ── Canvas ── */
  canvasArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  canvasToolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    marginBottom: theme.spacing.xs,
  },
  canvasClip: {
    overflow: 'hidden',
    borderRadius: 18,
  },
  focusButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  focusButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  focusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  focusButtonTextActive: {
    color: theme.colors.primary,
  },

  /* ── Canvas Info ── */
  canvasInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  canvasInfoText: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  canvasInfoWarn: {
    fontSize: 11,
    color: theme.colors.warning,
  },

  /* ── Bottom Panel ── */
  panel: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: theme.spacing.sm,
  },
  panelExpanded: {
    flex: 2.5,
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.xs,
  },
  dragHint: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  outOfBoundsInfo: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  outOfBoundsInfoText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  panelScroll: {
    flex: 1,
  },
  panelContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },

  /* ── CTA ── */
  ctaBar: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  /* ── Layer tab ── */
  layerRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  chipSpacing: {
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  textEditSection: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  backSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  backPreviewContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
  },

  /* ── Adjust tab ── */
  transformHint: {
    fontSize: 13,
    lineHeight: 20,
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
  outOfBoundsWarning: {
    backgroundColor: theme.colors.errorSoft,
    borderWidth: 1,
    borderColor: theme.colors.errorBorder,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  outOfBoundsText: {
    fontSize: 13,
    color: theme.colors.error,
    fontWeight: '600',
    textAlign: 'center',
  },
  adjustButtons: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  resetButton: {
    marginTop: 0,
  },

  /* ── Options tab ── */
  colorOptions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sizeHint: {
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
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
  addLineButton: {
    marginTop: theme.spacing.sm,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  confirmText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  removeText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.error,
    fontWeight: '600',
  },
  priceCard: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.infoSoft,
    borderColor: theme.colors.infoBorder,
  },
  priceTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  priceValue: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  priceOption: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  priceNote: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  /* ── Text editing ── */
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
});
