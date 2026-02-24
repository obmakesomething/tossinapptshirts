import { fetchAlbumPhotos } from '@apps-in-toss/native-modules';
import { createRoute } from '@granite-js/react-native';
import { TextField } from '@toss/tds-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DesignStage } from '../components/DesignStage';
import { ScaleSlider } from '../components/ScaleSlider';
import {
  Card,
  Chip,
  CollapsibleSection,
  ColorSwatch,
  PrimaryButton,
  SecondaryButton,
  TabBar,
  theme,
} from '../components/ui';
import { useCatalog } from '../context/catalog';
import { resolveColorValue } from '../data/colorMap';
import { buildTemplate, printSizeByCategory } from '../data/mockupTemplates';
import { calcPricing } from '../data/pricing';
import { formatPrice } from '../utils/format';
import {
  trackClick,
  trackPhotoAddClick,
  trackPhotoRemoveClick,
  trackPhotoRemoveConfirm,
  trackPhotoReplaceClick,
  trackPhotoSelectThumbnail,
  trackScreenView,
} from '../utils/analytics';

const ORANGE_RED = '#3182F6';
const NAVY_MID = '#EEF3FF';
const NAVY_PANEL = '#FFFFFF';

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
    frontPhotos,
    backPhotos,
    frontPhotoIndex,
    backPhotoIndex,
    setSelectedColor,
    setSelectedPlacement,
    setPrintBackEnabled,
    addOrderLine,
    removeOrderLine,
    setImageTransform,
    setTextTransform,
    setActiveLayer,
    setTextLayer,
    addPhoto,
    replacePhoto,
    deletePhoto,
    selectPhoto,
  } = useCatalog();

  const currentPhotos = selectedPlacement === 'front' ? frontPhotos : backPhotos;
  const currentPhotoIndex = selectedPlacement === 'front' ? frontPhotoIndex : backPhotoIndex;



  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [editorTab, setEditorTab] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [shrinkView, setShrinkView] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [startModalDismissed, setStartModalDismissed] = useState(false);

  // Photo management state
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePhotoIndex, setDeletePhotoIndex] = useState<number | null>(null);

  // Draft state for current size/quantity selection (not yet confirmed)
  const [draftSize, setDraftSize] = useState<string>(
    selectedProduct.sizes[0]?.label ?? '',
  );
  const [draftQuantity, setDraftQuantity] = useState<number>(1);

  // Image-first canvas layout (preview parity)
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const canvasWidth = Math.min(screenWidth - 24, 420);
  const canvasHeight = Math.min(
    canvasWidth * 1.28,
    screenHeight * (expandedPanel ? 0.4 : 0.54),
  );

  // Zoom to print area camera transform
  const printAreaFrac = { x: 0.32, y: 0.22, w: 0.36, h: 0.46 };
  const cameraScale = focusMode
    ? Math.min(canvasWidth / (canvasWidth * printAreaFrac.w), canvasHeight / (canvasHeight * printAreaFrac.h))
    : (shrinkView ? 0.74 : 1);
  const cameraTranslateX = focusMode
    ? -(printAreaFrac.x + printAreaFrac.w / 2 - 0.5) * canvasWidth * cameraScale
    : 0;
  const cameraTranslateY = focusMode
    ? -(printAreaFrac.y + printAreaFrac.h / 2 - 0.5) * canvasHeight * cameraScale
    : 0;

  const EDITOR_TABS = ['이미지 편집', '조정', '주문'];

  const goPreview = () => {
    trackClick('editor_preview_click', {
      product_id: selectedProduct.id,
      placement: selectedPlacement,
    });
    navigation.navigate('/preview');
  };

  const goOrder = () => {
    trackClick('editor_order_click', {
      product_id: selectedProduct.id,
      order_line_count: orderLines.length,
      total_quantity: totalQuantity,
    });
    navigation.navigate('/order');
  };

  const pricing = calcPricing({
    product: selectedProduct,
    orderLines,
    printOption: selectedPrint,
    printBackEnabled,
  });

  useEffect(() => {
    trackScreenView('editor', {
      product_id: selectedProduct.id,
      product_category: selectedProduct.category,
      selected_color: selectedColor,
      placement: selectedPlacement,
    });
  }, []);

  useEffect(() => {
    if (currentPhotos.length > 0) {
      setShowStartModal(false);
      setStartModalDismissed(false);
      return;
    }
    if (!startModalDismissed) {
      setShowStartModal(true);
    }
  }, [currentPhotos.length, startModalDismissed]);

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

  const imageTransformRef = useRef(imageTransform);
  const textTransformRef = useRef(textTransform);
  useEffect(() => {
    imageTransformRef.current = imageTransform;
  }, [imageTransform]);
  useEffect(() => {
    textTransformRef.current = textTransform;
  }, [textTransform]);

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
      setTextTransform({ ...textTransformRef.current, scale });
    } else {
      setImageTransform({ ...imageTransformRef.current, scale });
    }
  };

  const updateOffsetX = (offsetX: number) => {
    if (activeLayer === 'text') {
      setTextTransform({ ...textTransformRef.current, offsetX });
    } else {
      setImageTransform({ ...imageTransformRef.current, offsetX });
    }
  };

  const updateOffsetY = (offsetY: number) => {
    if (activeLayer === 'text') {
      setTextTransform({ ...textTransformRef.current, offsetY });
    } else {
      setImageTransform({ ...imageTransformRef.current, offsetY });
    }
  };

  const updateRotation = (rotation: number) => {
    if (activeLayer === 'text') {
      setTextTransform({ ...textTransformRef.current, rotation });
    } else {
      setImageTransform({ ...imageTransformRef.current, rotation });
    }
  };

  const handleAddText = () => {
    trackClick('editor_add_text_click', {
      placement: selectedPlacement,
    });
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

  const pickPhoto = async () => {
    setPhotoError('');
    setLoadingPhoto(true);
    try {
      const permission = await fetchAlbumPhotos.getPermission();
      if (permission !== 'allowed') {
        const next = await fetchAlbumPhotos.openPermissionDialog();
        if (next !== 'allowed') {
          setPhotoError('사진 앨범에 접근하려면 권한이 필요해요.');
          setLoadingPhoto(false);
          return null;
        }
      }
      const photos = await fetchAlbumPhotos({
        maxCount: 1,
        maxWidth: 1024,
        base64: true,
      });
      const photo = photos[0];
      if (!photo || !photo.dataUri) {
        setPhotoError('사진을 불러오지 못했어요. 다시 시도해 주세요.');
        setLoadingPhoto(false);
        return null;
      }
      const dataUrl = photo.dataUri.startsWith('data:')
        ? photo.dataUri
        : `data:image/jpeg;base64,${photo.dataUri}`;
      setLoadingPhoto(false);
      return dataUrl;
    } catch (err) {
      setPhotoError('앨범을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      setLoadingPhoto(false);
      return null;
    }
  };

  const handleAddPhoto = async (closeAfterSuccess = false) => {
    trackPhotoAddClick(selectedPlacement, currentPhotos.length);
    if (currentPhotos.length >= 3) {
      setPhotoError('최대 3장까지 추가할 수 있어요.');
      return;
    }
    if (closeAfterSuccess) {
      // Give immediate UI feedback when pressed from start modal.
      setShowStartModal(false);
      setStartModalDismissed(true);
    }
    const dataUrl = await pickPhoto();
    if (dataUrl) {
      addPhoto(dataUrl);
    }
  };

  const handleReplacePhoto = async () => {
    trackPhotoReplaceClick(selectedPlacement);
    const dataUrl = await pickPhoto();
    if (dataUrl) {
      replacePhoto(dataUrl);
    }
  };

  const handleOpenBgRemoval = () => {
    if (!designImageUri) {
      setPhotoError('배경 제거할 사진을 먼저 추가해 주세요.');
      return;
    }
    trackClick('editor_open_background_removal_click', {
      placement: selectedPlacement,
      has_selection: Boolean(currentPhotos.length > 0),
    });
    navigation.navigate('/upload');
  };

  const handleDeletePhoto = (index: number) => {
    trackPhotoRemoveClick(selectedPlacement, index);
    setDeletePhotoIndex(index);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePhoto = () => {
    if (deletePhotoIndex !== null) {
      trackPhotoRemoveConfirm(selectedPlacement, deletePhotoIndex);
      deletePhoto(deletePhotoIndex);
    }
    setShowDeleteConfirm(false);
    setDeletePhotoIndex(null);
  };

  const handleSelectPhoto = (index: number) => {
    trackPhotoSelectThumbnail(selectedPlacement, index);
    selectPhoto(index);
  };

  const handleStartModalClose = () => {
    trackClick('editor_start_modal_dismiss_click');
    setShowStartModal(false);
    setStartModalDismissed(true);
  };

  const handlePlacementChange = (placement: 'front' | 'back') => {
    if (placement !== selectedPlacement) {
      trackClick('editor_placement_switch_click', {
        from: selectedPlacement,
        to: placement,
      });
    }
    setSelectedPlacement(placement);
    if (placement === 'back' && !printBackEnabled) {
      setPrintBackEnabled(true);
    }
  };

  const handleTabChange = (nextIndex: number) => {
    trackClick('editor_tab_change_click', {
      tab: EDITOR_TABS[nextIndex] ?? String(nextIndex),
      tab_index: nextIndex,
    });
    setEditorTab(nextIndex);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── 컴팩트 상단 ── */}
      <View style={styles.compactHeader}>
        <View style={styles.editorTopRow}>
          <Pressable
            style={styles.headerIconButton}
            onPress={() => navigation.navigate('/')}
          >
            <Text style={styles.headerIconText}>←</Text>
          </Pressable>
          <Text style={styles.editorTopTitle}>이미지 편집</Text>
          <Pressable
            style={styles.orderMiniButton}
            onPress={goOrder}
          >
            <Text style={styles.orderMiniButtonText}>🛒 주문</Text>
          </Pressable>
        </View>
        <View style={styles.compactProduct}>
          <View style={[styles.compactDot, { backgroundColor: resolveColorValue(selectedColor) }]} />
          <Text style={styles.compactName} numberOfLines={1}>
            {selectedProduct.name} · {selectedColor}
          </Text>
          <Pressable
            onPress={goPreview}
            style={styles.compactPreview}
          >
            <Text style={styles.compactPreviewText}>미리보기</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('/products')}
            style={styles.compactChange}
          >
            <Text style={styles.compactChangeText}>상품 변경</Text>
          </Pressable>
        </View>
        {/* 앞/뒤면 세그먼트 */}
        <View style={styles.placementSegment}>
          <Pressable
            style={[styles.segmentButton, selectedPlacement === 'front' && styles.segmentButtonActive]}
            onPress={() => handlePlacementChange('front')}
          >
            <Text style={[styles.segmentButtonText, selectedPlacement === 'front' && styles.segmentButtonTextActive]}>
              앞면
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentButton, selectedPlacement === 'back' && styles.segmentButtonActive]}
            onPress={() => handlePlacementChange('back')}
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
          <View style={styles.activeLayerBadge}>
            <Text style={styles.activeLayerBadgeText}>
              선택: {activeLayer === 'text' ? '텍스트' : '이미지'}
            </Text>
          </View>
          <View style={styles.toolbarButtons}>
            <Pressable
              style={[styles.focusButton, shrinkView && styles.focusButtonActive]}
              onPress={() => {
                setShrinkView(!shrinkView);
                if (!shrinkView) setFocusMode(false);
              }}
            >
              <Text style={[styles.focusButtonText, shrinkView && styles.focusButtonTextActive]}>
                {shrinkView ? '일반 보기' : '전체 축소'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.focusButton, focusMode && styles.focusButtonActive]}
              onPress={() => {
                setFocusMode(!focusMode);
                if (!focusMode) setShrinkView(false);
              }}
            >
              <Text style={[styles.focusButtonText, focusMode && styles.focusButtonTextActive]}>
                {focusMode ? '전체 보기' : '확대 편집'}
              </Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.canvasFrame}>
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
                sizeLabel={orderLines[0]?.sizeLabel ?? draftSize ?? selectedProduct.sizes[0]?.label}
                showPrintArea
                showGuides={false}
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
          <Pressable
            style={[
              styles.canvasAddButton,
              (loadingPhoto || currentPhotos.length >= 3) && styles.canvasAddButtonDisabled,
            ]}
            onPress={() => handleAddPhoto(false)}
            disabled={loadingPhoto || currentPhotos.length >= 3}
          >
            <Text style={styles.canvasAddButtonPlus}>＋</Text>
          </Pressable>
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
          onChangeIndex={handleTabChange}
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
              {/* Photo Management Section */}
              <View style={styles.photoManagementSection}>
                <Text style={styles.sectionTitle}>이미지 편집</Text>
                {photoError ? (
                  <Text style={styles.photoError}>{photoError}</Text>
                ) : null}
                {currentPhotos.length > 0 ? (
                  <View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                      {currentPhotos.map((photoUri, index) => (
                        <Pressable
                          key={index}
                          onPress={() => handleSelectPhoto(index)}
                          style={[
                            styles.photoThumbnail,
                            index === currentPhotoIndex && styles.photoThumbnailActive,
                          ]}
                        >
                          <Image source={{ uri: photoUri }} style={styles.photoThumbnailImage} />
                          {currentPhotos.length > 1 && (
                            <Pressable
                              style={styles.photoDeleteBtn}
                              onPress={() => handleDeletePhoto(index)}
                            >
                              <Text style={styles.photoDeleteText}>✕</Text>
                            </Pressable>
                          )}
                          {index === currentPhotoIndex && (
                            <View style={styles.photoActiveIndicator}>
                              <Text style={styles.photoActiveText}>선택됨</Text>
                            </View>
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                    <View style={styles.photoActions}>
                      <SecondaryButton
                        label="사진 바꾸기"
                        onPress={handleReplacePhoto}
                        disabled={loadingPhoto}
                        style={styles.photoActionBtn}
                      />
                      <SecondaryButton
                        label="사진 추가"
                        onPress={handleAddPhoto}
                        disabled={loadingPhoto || currentPhotos.length >= 3}
                        style={styles.photoActionBtn}
                      />
                      <SecondaryButton
                        label="배경 제거"
                        onPress={handleOpenBgRemoval}
                        disabled={loadingPhoto}
                        style={styles.photoActionBtn}
                      />
                    </View>
                    {selectedProduct.colors.length > 1 ? (
                      <View>
                        <Text style={styles.photoSectionHint}>옷 색상</Text>
                        <View style={styles.photoColorRow}>
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
                    ) : null}
                    {currentPhotos.length >= 3 && (
                      <Text style={styles.photoHint}>최대 3장까지 추가할 수 있어요.</Text>
                    )}
                    {loadingPhoto && (
                      <View style={styles.photoLoadingRow}>
                        <ActivityIndicator color={theme.colors.primary} />
                        <Text style={styles.photoLoadingText}>사진을 불러오고 있어요...</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View>
                    <Text style={styles.sectionHint}>
                      아직 사진이 없어요. 아래 버튼으로 바로 추가해 주세요.
                    </Text>
                    <SecondaryButton
                      label="사진 추가하기"
                      onPress={() => handleAddPhoto(false)}
                      disabled={loadingPhoto}
                    />
                    {loadingPhoto && (
                      <View style={styles.photoLoadingRow}>
                        <ActivityIndicator color={theme.colors.primary} />
                        <Text style={styles.photoLoadingText}>사진을 불러오고 있어요...</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

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
                  min={0.1}
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

      {/* Delete Photo Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDeleteConfirm(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>사진을 삭제할까요?</Text>
            <Text style={styles.modalSubtitle}>
              삭제한 사진은 복구할 수 없어요. 정말 삭제하시겠어요?
            </Text>
            <View style={styles.modalButtons}>
              <SecondaryButton
                label="취소"
                onPress={() => setShowDeleteConfirm(false)}
                style={styles.modalCancelButton}
              />
              <PrimaryButton
                label="삭제하기"
                onPress={confirmDeletePhoto}
                style={styles.modalDeleteButton}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showStartModal}
        transparent
        animationType="fade"
        onRequestClose={handleStartModalClose}
      >
        <Pressable style={styles.modalOverlay} onPress={handleStartModalClose}>
          <Pressable
            style={styles.startModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>사진 편집 시작</Text>
            <Text style={styles.modalSubtitle}>
              사진을 올려 바로 배경 제거/위치 조정을 시작하거나, AI 이미지 생성으로 시작할 수 있어요.
            </Text>
            <PrimaryButton
              label="사진 추가하기"
              onPress={() => {
                trackClick('editor_start_modal_upload_click');
                void handleAddPhoto(true);
              }}
              style={styles.startModalPrimary}
            />
            <SecondaryButton
              label="AI로 만들기"
              onPress={() => {
                trackClick('editor_start_modal_ai_click');
                setShowStartModal(false);
                navigation.navigate('/generate');
              }}
            />
            <Pressable onPress={handleStartModalClose} style={styles.startModalClose}>
              <Text style={styles.startModalCloseText}>나중에 할게요</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingBottom: theme.spacing.sm,
  },
  editorTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  headerIconButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#DCE5F2',
    backgroundColor: '#FFF9F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 16,
    color: '#5A4637',
    fontWeight: '700',
  },
  editorTopTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  orderMiniButton: {
    borderRadius: 11,
    height: 34,
    paddingHorizontal: 11,
    backgroundColor: ORANGE_RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderMiniButtonText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#FFFFFF',
    fontWeight: '700',
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
    color: '#1A1F2E',
  },
  compactChange: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 999,
    backgroundColor: 'rgba(255,244,232,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(240,223,207,0.92)',
  },
  compactChangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: ORANGE_RED,
  },
  compactPreview: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 999,
    marginRight: theme.spacing.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5F2',
  },
  compactPreviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E667A',
  },

  /* ── Placement Segment ── */
  placementSegment: {
    flexDirection: 'row',
    backgroundColor: NAVY_MID,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(240,223,207,0.92)',
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
    backgroundColor: 'rgba(240,223,207,0.92)',
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5E667A',
  },
  segmentButtonTextActive: {
    color: '#1A1F2E',
  },

  /* ── Canvas ── */
  canvasArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: theme.spacing.xs,
  },
  canvasToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: theme.spacing.xs,
  },
  toolbarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  activeLayerBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,244,232,0.92)',
    backgroundColor: 'rgba(255,244,232,0.92)',
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  activeLayerBadgeText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#5E667A',
    fontWeight: '700',
  },
  canvasFrame: {
    position: 'relative',
  },
  canvasClip: {
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(240,223,207,0.92)',
    backgroundColor: NAVY_MID,
  },
  canvasAddButton: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,244,232,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(240,223,207,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasAddButtonDisabled: {
    opacity: 0.45,
  },
  canvasAddButtonPlus: {
    color: ORANGE_RED,
    fontSize: 19,
    lineHeight: 19,
    fontWeight: '500',
    marginTop: -1,
  },
  focusButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,244,232,0.92)',
    backgroundColor: 'rgba(255,244,232,0.92)',
  },
  focusButtonActive: {
    borderColor: 'rgba(240,223,207,0.92)',
    backgroundColor: 'rgba(255,244,232,0.92)',
  },
  focusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E667A',
  },
  focusButtonTextActive: {
    color: '#1A1F2E',
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
    color: '#8A93A8',
  },
  canvasInfoWarn: {
    fontSize: 11,
    color: '#ffc06e',
  },

  /* ── Bottom Panel ── */
  panel: {
    flex: 0.92,
    backgroundColor: NAVY_PANEL,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(240,223,207,0.92)',
    marginTop: theme.spacing.sm,
  },
  panelExpanded: {
    flex: 1.75,
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
    backgroundColor: 'rgba(240,223,207,0.92)',
    marginBottom: theme.spacing.xs,
  },
  dragHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E667A',
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
    paddingBottom: theme.spacing.xl,
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
    borderBottomColor: 'rgba(240,223,207,0.92)',
  },
  sectionTitle: {
    ...theme.typography.subheading,
    color: '#1A1F2E',
    marginBottom: theme.spacing.sm,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 20,
    color: '#5E667A',
    marginBottom: theme.spacing.md,
  },

  /* ── Adjust tab ── */
  transformHint: {
    fontSize: 13,
    lineHeight: 20,
    color: '#5E667A',
    marginBottom: theme.spacing.sm,
  },
  sliderRow: {
    marginTop: theme.spacing.sm,
  },
  sliderLabel: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8A93A8',
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
    ...theme.typography.caption,
    color: '#8A93A8',
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
    color: '#1A1F2E',
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
    borderBottomColor: 'rgba(240,223,207,0.92)',
  },
  confirmText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1A1F2E',
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
    backgroundColor: 'rgba(255,244,232,0.92)',
    borderColor: 'rgba(240,223,207,0.92)',
  },
  priceTitle: {
    ...theme.typography.subheading,
    color: '#1A1F2E',
    marginBottom: theme.spacing.xs,
  },
  priceValue: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    color: ORANGE_RED,
    marginBottom: theme.spacing.xs,
  },
  priceOption: {
    fontSize: 12,
    lineHeight: 18,
    color: '#5E667A',
  },
  priceNote: {
    fontSize: 12,
    lineHeight: 18,
    color: '#5E667A',
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
    color: '#8A93A8',
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
    borderColor: 'rgba(240,223,207,0.92)',
    marginRight: theme.spacing.sm,
    backgroundColor: 'rgba(255,244,232,0.92)',
  },
  fontButtonSelected: {
    borderColor: ORANGE_RED,
    backgroundColor: 'rgba(255,80,0,0.14)',
  },
  fontButtonText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#5E667A',
  },
  fontButtonTextSelected: {
    color: '#3182F6',
  },

  /* ── Photo Management ── */
  photoManagementSection: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240,223,207,0.92)',
  },
  photoError: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  photoScroll: {
    marginBottom: theme.spacing.sm,
  },
  photoThumbnail: {
    width: 96,
    height: 96,
    borderRadius: theme.radius.md,
    marginRight: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumbnailActive: {
    borderColor: ORANGE_RED,
    borderWidth: 3,
  },
  photoThumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
      photoDeleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  photoActiveIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: ORANGE_RED,
    paddingVertical: 2,
  },
  photoActiveText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  photoActionBtn: {
    flex: 1,
  },
  photoHint: {
    fontSize: 11,
    lineHeight: 16,
    color: '#8A93A8',
    marginTop: theme.spacing.xs,
  },
  photoSectionHint: {
    fontSize: 11,
    lineHeight: 18,
    color: '#8A93A8',
    marginBottom: theme.spacing.xs,
  },
  photoColorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  photoLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  photoLoadingText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#5E667A',
    marginLeft: theme.spacing.sm,
  },

  /* ── Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
  },
  modalDeleteButton: {
    flex: 1,
    backgroundColor: theme.colors.error,
  },
  startModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  startModalPrimary: {
    marginBottom: theme.spacing.sm,
    backgroundColor: ORANGE_RED,
  },
  startModalClose: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  startModalCloseText: {
    fontSize: 12,
    color: '#5E667A',
    fontWeight: '600',
  },
});
