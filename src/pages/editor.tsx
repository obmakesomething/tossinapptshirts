import { fetchAlbumPhotos } from '@apps-in-toss/native-modules';
import { createRoute } from '@granite-js/react-native';
import { TextField } from '@toss/tds-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { DesignStage } from '../components/DesignStage';
import { ScaleSlider } from '../components/ScaleSlider';
import {
  PrimaryButton,
  SecondaryButton,
  TabBar,
  theme,
} from '../components/ui';
import { useCatalog } from '../context/catalog';
import { resolveColorValue } from '../data/colorMap';
import { buildTemplate, printSizeByCategory } from '../data/mockupTemplates';
import {
  trackClick,
  trackPhotoAddClick,
  trackPhotoRemoveClick,
  trackPhotoRemoveConfirm,
  trackPhotoReplaceClick,
  trackPhotoSelectThumbnail,
  trackScreenView,
} from '../utils/analytics';

const ACCENT = '#3182F6';
const WARM_MID = '#FFF4E8';
const PANEL_BG = '#FFFFFF';
const EDITOR_HEADER_RESERVED = 100;
const DEFAULT_STAGE_ZOOM = 1.3;
const MIN_STAGE_ZOOM = 0.6;
const MAX_STAGE_ZOOM = 3.0;
const ZOOM_STEP = 0.2;
const CANVAS_AREA_HORIZONTAL_PADDING = 16 * 2;
const CANVAS_FRAME_HORIZONTAL_PADDING = 8 * 2;
const CANVAS_FRAME_VERTICAL_PADDING = 12 * 2;

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
    setSelectedPlacement,
    setPrintBackEnabled,
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



  const [editorTab, setEditorTab] = useState(1);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showStartModal, setShowStartModal] = useState(false);
  const [startModalDismissed, setStartModalDismissed] = useState(false);

  // Photo management state
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePhotoIndex, setDeletePhotoIndex] = useState<number | null>(null);
  const [stageZoom, setStageZoom] = useState(DEFAULT_STAGE_ZOOM);
  const [imageControlFocused, setImageControlFocused] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(true);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const panelHeightCollapsed = Math.max(320, Math.min(420, Math.round(screenHeight * 0.42)));
  const panelHeightExpanded = Math.round(screenHeight * 0.65);
  const panelHeight = panelExpanded ? panelHeightExpanded : panelHeightCollapsed;
  const availableCanvasHeight = Math.max(
    240,
    screenHeight - panelHeight - EDITOR_HEADER_RESERVED,
  );
  const canvasWidth = Math.max(
    220,
    Math.round(
      screenWidth - CANVAS_AREA_HORIZONTAL_PADDING - CANVAS_FRAME_HORIZONTAL_PADDING,
    ),
  );
  const canvasHeight = Math.max(
    260,
    Math.round(availableCanvasHeight - CANVAS_FRAME_VERTICAL_PADDING),
  );

  const EDITOR_TABS = ['텍스트', '이미지', 'AI'];

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

  const imageTransformRef = useRef(imageTransform);
  const textTransformRef = useRef(textTransform);
  useEffect(() => {
    imageTransformRef.current = imageTransform;
  }, [imageTransform]);
  useEffect(() => {
    textTransformRef.current = textTransform;
  }, [textTransform]);

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

  const handleAddPhoto = async () => {
    trackPhotoAddClick(selectedPlacement, currentPhotos.length);
    if (currentPhotos.length >= 3) {
      setPhotoError('최대 3장까지 추가할 수 있어요.');
      return;
    }
    const dataUrl = await pickPhoto();
    if (dataUrl) {
      addPhoto(dataUrl);
      setActiveLayer('image');
    }
  };

  const handleAddPhotoFromStartModal = async () => {
    // Close first for snappy feedback in the first-time flow only.
    setShowStartModal(false);
    setStartModalDismissed(true);
    await handleAddPhoto();
  };

  const handleReplacePhoto = async () => {
    trackPhotoReplaceClick(selectedPlacement);
    const dataUrl = await pickPhoto();
    if (dataUrl) {
      replacePhoto(dataUrl);
      setActiveLayer('image');
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
    setActiveLayer('image');
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
    if (nextIndex === 0) {
      setActiveLayer('text');
    } else if (nextIndex === 1) {
      setActiveLayer('image');
    }
    setEditorTab(nextIndex);
  };

  const handleResetToInitial = () => {
    setStageZoom(DEFAULT_STAGE_ZOOM);
    setImageTransform({
      offsetX: 0,
      offsetY: 0,
      scale: selectedPrint.designScale,
      rotation: 0,
    });
    setTextTransform({
      ...textTransformRef.current,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      rotation: 0,
    });
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
      <View style={[styles.canvasArea, imageControlFocused && styles.canvasAreaFocused]}>
        <View style={styles.canvasFrame}>
          <View pointerEvents="none" style={styles.canvasWorkspaceGrid}>
            <View style={[styles.canvasWorkspaceGridLineH, { top: '25%' }]} />
            <View style={[styles.canvasWorkspaceGridLineH, { top: '50%' }]} />
            <View style={[styles.canvasWorkspaceGridLineH, { top: '75%' }]} />
            <View style={[styles.canvasWorkspaceGridLineV, { left: '25%' }]} />
            <View style={[styles.canvasWorkspaceGridLineV, { left: '50%' }]} />
            <View style={[styles.canvasWorkspaceGridLineV, { left: '75%' }]} />
          </View>
          <View style={[styles.canvasClip, { width: canvasWidth, height: canvasHeight }]}>
            <DesignStage
              template={buildTemplate(selectedProduct, selectedColor, selectedPlacement)}
              width={canvasWidth}
              height={canvasHeight}
              sizeLabel={orderLines[0]?.sizeLabel ?? selectedProduct.sizes[0]?.label}
              showPrintArea
              showGuides={false}
              interactionMode="free"
              cameraScale={stageZoom}
              imageUri={designImageUri}
              imageTransform={imageTransform}
              textLayer={textLayer}
              textTransform={textTransform}
              activeLayer={activeLayer}
              onImageTransformChange={setImageTransform}
              onTextTransformChange={setTextTransform}
              imageControlFocused={imageControlFocused}
              onImageControlFocusChange={setImageControlFocused}
            />
          </View>
          <View style={styles.canvasTopOverlay} pointerEvents="box-none">
            <View style={styles.canvasStateChip}>
              <Text style={styles.canvasStateText}>
                선택 레이어: {activeLayer === 'text' ? '텍스트' : '이미지'}
              </Text>
            </View>
          </View>
          {/* ── 줌 컨트롤 ── */}
          <View style={styles.zoomControls} pointerEvents="box-none">
            <Pressable
              style={[styles.zoomButton, stageZoom >= MAX_STAGE_ZOOM && styles.zoomButtonDisabled]}
              onPress={() => setStageZoom((z) => Math.min(MAX_STAGE_ZOOM, +(z + ZOOM_STEP).toFixed(1)))}
              disabled={stageZoom >= MAX_STAGE_ZOOM}
            >
              <Text style={styles.zoomButtonText}>＋</Text>
            </Pressable>
            <Text style={styles.zoomLabel}>{Math.round(stageZoom * 100)}%</Text>
            <Pressable
              style={[styles.zoomButton, stageZoom <= MIN_STAGE_ZOOM && styles.zoomButtonDisabled]}
              onPress={() => setStageZoom((z) => Math.max(MIN_STAGE_ZOOM, +(z - ZOOM_STEP).toFixed(1)))}
              disabled={stageZoom <= MIN_STAGE_ZOOM}
            >
              <Text style={styles.zoomButtonText}>－</Text>
            </Pressable>
          </View>
          <Pressable
            style={[
              styles.canvasAddButton,
              (loadingPhoto || currentPhotos.length >= 3) && styles.canvasAddButtonDisabled,
            ]}
            onPress={() => {
              void handleAddPhoto();
            }}
            disabled={loadingPhoto || currentPhotos.length >= 3}
          >
            <Text style={styles.canvasAddButtonPlus}>＋</Text>
          </Pressable>
        </View>
        <View style={styles.canvasOutsideActions}>
          <Pressable style={styles.stageResetButton} onPress={handleResetToInitial}>
            <Text style={styles.stageResetButtonText}>처음으로 되돌아가기</Text>
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
      {imageControlFocused ? (
        <Pressable
          style={styles.fullScreenFocusBackdrop}
          onPress={() => setImageControlFocused(false)}
        />
      ) : null}

      {/* ── 하단 탭 패널 ── */}
      <View style={[styles.panel, { height: panelHeight }]}>
        <Pressable
          style={styles.editPanelHeader}
          onPress={() => setPanelExpanded((v) => !v)}
        >
          <Text style={styles.editPanelTitle}>편집하기</Text>
          <Text style={styles.editPanelToggle}>{panelExpanded ? '▼' : '▲'}</Text>
        </Pressable>
        <TabBar
          tabs={EDITOR_TABS}
          activeIndex={editorTab}
          onChangeIndex={handleTabChange}
        />
        <ScrollView
          style={styles.panelScroll}
          contentContainerStyle={styles.panelContent}
          scrollEnabled
          showsVerticalScrollIndicator
          nestedScrollEnabled
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── 탭 0: 텍스트 ── */}
          {editorTab === 0 && (
            <View>
              <Text style={styles.sectionTitle}>텍스트 편집</Text>

              {!textLayer.enabled && (
                <View style={styles.textEditSection}>
                  <Text style={styles.sectionHint}>문구를 추가하고 위치를 조정해 보세요.</Text>
                  <SecondaryButton label="텍스트 추가하기" onPress={handleAddText} />
                </View>
              )}

              {textLayer.enabled && (
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
                  <View style={styles.sliderRow}>
                    <View style={styles.sliderHeadRow}>
                      <Text style={styles.sliderLabel}>X 위치</Text>
                      <Text style={styles.sliderValueText}>
                        {Math.round(textTransform.offsetX * 100)}
                      </Text>
                    </View>
                    <ScaleSlider
                      min={-0.55}
                      max={0.55}
                      value={textTransform.scale > 0 ? textTransform.offsetX : 0}
                      onChange={(offsetX) =>
                        setTextTransform({ ...textTransformRef.current, offsetX })
                      }
                    />
                  </View>
                  <View style={styles.sliderRow}>
                    <View style={styles.sliderHeadRow}>
                      <Text style={styles.sliderLabel}>Y 위치</Text>
                      <Text style={styles.sliderValueText}>
                        {Math.round(textTransform.offsetY * 100)}
                      </Text>
                    </View>
                    <ScaleSlider
                      min={-0.55}
                      max={0.55}
                      value={textTransform.offsetY}
                      onChange={(offsetY) =>
                        setTextTransform({ ...textTransformRef.current, offsetY })
                      }
                    />
                  </View>
                  <View style={styles.sliderRow}>
                    <View style={styles.sliderHeadRow}>
                      <Text style={styles.sliderLabel}>크기</Text>
                      <Text style={styles.sliderValueText}>
                        {textTransform.scale.toFixed(2)}
                      </Text>
                    </View>
                    <ScaleSlider
                      min={0.2}
                      max={1.8}
                      value={textTransform.scale}
                      onChange={(scale) =>
                        setTextTransform({ ...textTransformRef.current, scale })
                      }
                    />
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── 탭 1: 이미지 ── */}
          {editorTab === 1 && (
            <View>
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
                        label="바꾸기"
                        onPress={handleReplacePhoto}
                        disabled={loadingPhoto}
                        style={styles.photoActionBtn}
                      />
                      <SecondaryButton
                        label="추가"
                        onPress={() => {
                          void handleAddPhoto();
                        }}
                        disabled={loadingPhoto || currentPhotos.length >= 3}
                        style={styles.photoActionBtn}
                      />
                      <SecondaryButton
                        label="배경제거"
                        onPress={handleOpenBgRemoval}
                        disabled={loadingPhoto}
                        style={styles.photoActionBtn}
                      />
                    </View>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.sectionHint}>
                      아직 사진이 없어요. 아래 버튼으로 바로 추가해 주세요.
                    </Text>
                    <SecondaryButton
                      label="사진 추가"
                      onPress={() => {
                        void handleAddPhoto();
                      }}
                      disabled={loadingPhoto}
                    />
                  </View>
                )}
              </View>
              <Text style={styles.sectionHint}>
                위치와 크기 슬라이더는 위 캔버스 카드에서 바로 조정할 수 있어요.
              </Text>
              <View style={styles.sliderRow}>
                <View style={styles.sliderHeadRow}>
                  <Text style={styles.sliderLabel}>회전</Text>
                  <Text style={styles.sliderValueText}>
                    {Math.round(imageTransform.rotation)}°
                  </Text>
                </View>
                <ScaleSlider
                  min={-180}
                  max={180}
                  value={imageTransform.rotation}
                  onChange={(rotation) =>
                    setImageTransform({ ...imageTransformRef.current, rotation })
                  }
                />
              </View>
              <View style={styles.adjustButtons}>
                <SecondaryButton
                  label="중앙 정렬"
                  onPress={() =>
                    setImageTransform({
                      ...imageTransformRef.current,
                      offsetX: 0,
                      offsetY: 0,
                    })
                  }
                  style={styles.resetButton}
                />
                <SecondaryButton
                  label="초기화"
                  onPress={() =>
                    setImageTransform({
                      offsetX: 0,
                      offsetY: 0,
                      scale: selectedPrint.designScale,
                      rotation: 0,
                    })
                  }
                  style={styles.resetButton}
                />
              </View>
            </View>
          )}

          {/* ── 탭 2: AI ── */}
          {editorTab === 2 && (
            <View style={styles.aiPanel}>
              <Text style={styles.sectionTitle}>AI 이미지</Text>
              <TextInput
                style={styles.aiPromptInput}
                placeholder="예) 오렌지 톤 플랫 아이콘 느낌의 볼드 로고"
                placeholderTextColor="#A0907E"
                value={aiPrompt}
                onChangeText={setAiPrompt}
                multiline
              />
              <View style={styles.aiActionRow}>
                <PrimaryButton
                  label="정확히 만들기"
                  onPress={() => {
                    trackClick('editor_ai_open_generate_click', {
                      prompt_length: aiPrompt.trim().length,
                    });
                    navigation.navigate('/generate');
                  }}
                  style={styles.aiActionButton}
                />
                <SecondaryButton
                  label="현재 이미지 적용"
                  onPress={() => {
                    setEditorTab(1);
                    setActiveLayer('image');
                  }}
                  disabled={!designImageUri}
                  style={styles.aiActionButton}
                />
              </View>
              <Text style={styles.aiStatusText}>
                {designImageUri
                  ? '생성/업로드된 이미지가 있어요. 적용 버튼으로 이미지 탭에서 바로 조정하세요.'
                  : '아직 생성된 이미지가 없습니다.'}
              </Text>
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
                void handleAddPhotoFromStartModal();
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
    borderColor: '#ECDAC7',
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
    backgroundColor: ACCENT,
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
    color: '#2E231B',
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
    color: ACCENT,
  },
  compactPreview: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 999,
    marginRight: theme.spacing.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0DFCF',
  },
  compactPreviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C6959',
  },

  /* ── Placement Segment ── */
  placementSegment: {
    flexDirection: 'row',
    backgroundColor: WARM_MID,
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
    color: '#7C6959',
  },
  segmentButtonTextActive: {
    color: '#2E231B',
  },

  /* ── Canvas ── */
  canvasArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginBottom: theme.spacing.xs,
  },
  canvasAreaFocused: {
    zIndex: 80,
    elevation: 20,
  },
  canvasTopOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 56,
    zIndex: 2,
  },
  canvasStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  canvasStateChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(236,220,202,0.95)',
    backgroundColor: 'rgba(255,249,242,0.96)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  canvasStateText: {
    fontSize: 11,
    lineHeight: 15,
    color: '#5F4A3B',
    fontWeight: '700',
  },
  canvasOutsideActions: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: theme.spacing.xs,
    marginBottom: 2,
  },
  stageResetButton: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F0DFCF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  stageResetButtonText: {
    fontSize: 12,
    lineHeight: 17,
    color: ACCENT,
    fontWeight: '700',
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
    color: '#7C6959',
    fontWeight: '700',
  },
  canvasFrame: {
    position: 'relative',
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1DFCD',
    backgroundColor: '#FFF8F0',
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasWorkspaceGrid: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  canvasWorkspaceGridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(95, 50, 14, 0.08)',
  },
  canvasWorkspaceGridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(95, 50, 14, 0.08)',
  },
  canvasClip: {
    overflow: 'visible',
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasAddButton: {
    position: 'absolute',
    right: 14,
    top: 14,
    zIndex: 3,
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
    color: ACCENT,
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
    color: '#7C6959',
  },
  focusButtonTextActive: {
    color: '#2E231B',
  },

  /* ── Zoom Controls ── */
  zoomControls: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    zIndex: 5,
    alignItems: 'center',
    gap: 4,
  },
  zoomButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(240,223,207,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  zoomButtonDisabled: {
    opacity: 0.35,
  },
  zoomButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5A4637',
    lineHeight: 20,
  },
  zoomLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A0907E',
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
    color: '#A0907E',
  },
  canvasInfoWarn: {
    fontSize: 11,
    color: '#ffc06e',
  },
  fullScreenFocusBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(46, 35, 27, 0.62)',
    zIndex: 60,
  },

  /* ── Bottom Panel ── */
  panel: {
    flexShrink: 0,
    backgroundColor: PANEL_BG,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(240,223,207,0.92)',
    marginTop: theme.spacing.sm,
  },
  editPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240,223,207,0.92)',
    backgroundColor: '#FFFDF9',
  },
  editPanelTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#5A4637',
  },
  editPanelToggle: {
    fontSize: 12,
    color: '#A0907E',
    fontWeight: '600',
  },
  panelExpanded: {
    flex: 2.7,
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
    color: '#7C6959',
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
    minHeight: 0,
  },
  panelContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 120,
    flexGrow: 1,
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
    color: '#2E231B',
    marginBottom: theme.spacing.sm,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 20,
    color: '#7C6959',
    marginBottom: theme.spacing.md,
  },

  /* ── Adjust tab ── */
  transformHint: {
    fontSize: 13,
    lineHeight: 20,
    color: '#7C6959',
    marginBottom: theme.spacing.sm,
  },
  sliderRow: {
    marginTop: theme.spacing.sm,
  },
  sliderHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  sliderLabel: {
    fontSize: 12,
    lineHeight: 18,
    color: '#A0907E',
  },
  sliderValueText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#5B4638',
    fontWeight: '700',
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

  aiPanel: {
    gap: theme.spacing.sm,
  },
  aiPromptInput: {
    minHeight: 68,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(240,223,207,0.92)',
    backgroundColor: '#FFF8F0',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 13,
    lineHeight: 19,
    color: '#2E231B',
    textAlignVertical: 'top',
  },
  aiActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  aiActionButton: {
    flex: 1,
  },
  aiStatusText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7C6959',
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
    color: '#A0907E',
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
    color: '#2E231B',
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
    color: '#2E231B',
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
    color: '#2E231B',
    marginBottom: theme.spacing.xs,
  },
  priceValue: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    color: ACCENT,
    marginBottom: theme.spacing.xs,
  },
  priceOption: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7C6959',
  },
  priceNote: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7C6959',
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
    color: '#A0907E',
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
    borderColor: ACCENT,
    backgroundColor: 'rgba(255,80,0,0.14)',
  },
  fontButtonText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7C6959',
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
    borderColor: ACCENT,
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
    backgroundColor: ACCENT,
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
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  photoHint: {
    fontSize: 11,
    lineHeight: 16,
    color: '#A0907E',
    marginTop: theme.spacing.xs,
  },
  photoSectionHint: {
    fontSize: 11,
    lineHeight: 18,
    color: '#A0907E',
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
    color: '#7C6959',
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
    backgroundColor: ACCENT,
  },
  startModalClose: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
  },
  startModalCloseText: {
    fontSize: 12,
    color: '#7C6959',
    fontWeight: '600',
  },
});
