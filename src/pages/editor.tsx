import { fetchAlbumPhotos } from '@apps-in-toss/native-modules';
import { createRoute } from '@granite-js/react-native';
import { TextField } from '@toss/tds-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { DesignStage } from '../components/DesignStage';
import { ScaleSlider } from '../components/ScaleSlider';
import {
  Chevron,
  CloseIcon,
  PrimaryButton,
  SecondaryButton,
  TabBar,
  theme,
} from '../components/ui';
import { useCatalog } from '../context/catalog';
import { resolveColorValue } from '../data/colorMap';
import { buildTemplate } from '../data/mockupTemplates';
import {
  trackClick,
  trackPhotoAddClick,
  trackPhotoRemoveClick,
  trackPhotoRemoveConfirm,
  trackPhotoReplaceClick,
  trackPhotoSelectThumbnail,
  trackScreenView,
} from '../utils/analytics';
import { toImageDataUrl } from '../utils/imageMime';

const ACCENT = '#1B64DA';
const FILL_SOFT = '#F2F4F6';
const PANEL_BG = '#FFFFFF';
const EDITOR_HEADER_RESERVED = 100;
const DEFAULT_STAGE_ZOOM = 1.0;
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



  const [editorTab, setEditorTab] = useState(0);

  // Photo management state
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  // Usable height inside the safe area, once the screen has laid out.
  const [safeHeight, setSafeHeight] = useState(0);
  const [photoError, setPhotoError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePhotoIndex, setDeletePhotoIndex] = useState<number | null>(null);
  const [stageZoom, setStageZoom] = useState(DEFAULT_STAGE_ZOOM);
  const [imageControlFocused, setImageControlFocused] = useState(false);
  // Rests collapsed: the first thing to see after adding a photo is the shirt.
  const [panelExpanded, setPanelExpanded] = useState(false);

  // ── Undo/Redo history ──
  type EditorSnapshot = {
    imageTransform: typeof imageTransform;
    textTransform: typeof textTransform;
    textLayer: typeof textLayer;
  };
  const MAX_HISTORY = 30;
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorSnapshot[]>([]);
  const snapshotRef = useRef<EditorSnapshot>({
    imageTransform,
    textTransform,
    textLayer,
  });

  const pushSnapshot = useCallback(() => {
    setUndoStack((prev) => {
      const next = [...prev, snapshotRef.current];
      return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
    });
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1]!;
      const rest = prev.slice(0, -1);
      // Push current state to redo
      setRedoStack((r) => [...r, snapshotRef.current]);
      // Restore
      setImageTransform(last.imageTransform);
      setTextTransform(last.textTransform);
      setTextLayer(last.textLayer);
      return rest;
    });
  }, [setImageTransform, setTextTransform, setTextLayer]);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1]!;
      const rest = prev.slice(0, -1);
      // Push current state to undo
      setUndoStack((u) => [...u, snapshotRef.current]);
      // Restore
      setImageTransform(last.imageTransform);
      setTextTransform(last.textTransform);
      setTextLayer(last.textLayer);
      return rest;
    });
  }, [setImageTransform, setTextTransform, setTextLayer]);

  // Keep snapshot ref in sync
  useEffect(() => {
    snapshotRef.current = { imageTransform, textTransform, textLayer };
  }, [imageTransform, textTransform, textLayer]);

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  /**
   * Nothing on the garment yet.
   *
   * The editor used to show its whole control surface — zoom, layers,
   * front/back, reset, print area — over an empty shirt, and ask for a photo in
   * three places at once. Until there is something to edit, the screen shows the
   * garment and one way to add a photo.
   */
  const hasArtwork = currentPhotos.length > 0 || Boolean(designImageUri);
  /**
   * The garment keeps the majority of the screen.
   *
   * At 42/65% the controls took more room than the thing being designed, and
   * the shirt shrank to a thumbnail the moment a photo landed on it. The
   * expanded panel now stops at half the screen and the resting panel is just
   * the tab strip plus one row of controls.
   */
  // With no artwork the panel is not rendered, so only the upload CTA below the
  // garment is reserved — the rest goes to the garment.
  const EMPTY_CTA_RESERVED = 132;
  /** Reset button and the print-size caption, both below the canvas. */
  const ARTWORK_CAPTION_RESERVED = 104;
  /** Below this the garment stops reading as the thing being designed. */
  const MIN_CANVAS_HEIGHT = 240;
  const reservedBelowCanvas = hasArtwork
    ? ARTWORK_CAPTION_RESERVED
    : EMPTY_CTA_RESERVED;
  /**
   * Size the canvas against the height the screen actually has.
   *
   * Dimensions reports the whole window, including the status bar and the home
   * indicator that SafeAreaView then takes back — on a notched phone that is
   * ~80pt the layout never had. The shortfall lands on whatever sits last in
   * the column, which with no artwork is the only button on the screen, and it
   * went off the bottom edge. The root reports what it really got instead.
   *
   * This measures the root and not the canvas column: the column is sized by
   * its own content, so feeding its height back in would settle on the content
   * rather than on the space available for it.
   */
  const usableHeight = safeHeight > 0 ? safeHeight : screenHeight;
  /**
   * The panel gets a share of the screen, but never so much that the garment
   * falls below MIN_CANVAS_HEIGHT. Fixed pixel heights tuned on a 844pt phone
   * overflowed a 770pt one by the difference, pushing the panel's own controls
   * off the bottom.
   */
  const panelCeiling = Math.max(
    220,
    usableHeight -
      EDITOR_HEADER_RESERVED -
      ARTWORK_CAPTION_RESERVED -
      MIN_CANVAS_HEIGHT,
  );
  const panelHeightCollapsed = Math.min(
    panelCeiling,
    Math.max(300, Math.round(usableHeight * 0.42)),
  );
  const panelHeightExpanded = Math.min(
    panelCeiling,
    Math.round(usableHeight * 0.55),
  );
  const panelHeight = panelExpanded ? panelHeightExpanded : panelHeightCollapsed;
  const availableCanvasHeight = Math.max(
    MIN_CANVAS_HEIGHT,
    usableHeight -
      EDITOR_HEADER_RESERVED -
      reservedBelowCanvas -
      (hasArtwork ? panelHeight : 0),
  );
  const canvasWidth = Math.max(
    220,
    Math.round(
      screenWidth - CANVAS_AREA_HORIZONTAL_PADDING - CANVAS_FRAME_HORIZONTAL_PADDING,
    ),
  );
  const canvasHeight = Math.max(
    200,
    Math.round(availableCanvasHeight - CANVAS_FRAME_VERTICAL_PADDING),
  );

  const EDITOR_TABS = ['이미지', '텍스트'];

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
    pushSnapshot();
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
      // This is the print source, not a thumbnail. 1024px across a 12-inch
      // print is ~85 DPI; 2048 keeps a full-chest design inside the warning
      // threshold in utils/printResolution.
      const photos = await fetchAlbumPhotos({
        maxCount: 1,
        maxWidth: 2048,
        base64: true,
      });
      const photo = photos[0];
      if (!photo || !photo.dataUri) {
        setPhotoError('사진을 불러오지 못했어요. 다시 시도해 주세요.');
        setLoadingPhoto(false);
        return null;
      }
      const dataUrl = toImageDataUrl(photo.dataUri);
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

  const handleReplacePhoto = async () => {
    trackPhotoReplaceClick(selectedPlacement);
    const dataUrl = await pickPhoto();
    if (dataUrl) {
      replacePhoto(dataUrl);
      setActiveLayer('image');
    }
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
      setActiveLayer('image');
    } else if (nextIndex === 1) {
      setActiveLayer('text');
    }
    setEditorTab(nextIndex);
  };

  const handleResetToInitial = () => {
    pushSnapshot();
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
    <SafeAreaView
      style={styles.safe}
      onLayout={(event) => {
        const { height } = event.nativeEvent.layout;
        setSafeHeight((prev) => (Math.abs(prev - height) > 1 ? height : prev));
      }}
    >
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
          <View style={styles.headerActions}>
            {hasArtwork ? (
            <>
            <Pressable
              style={[styles.headerIconButton, undoStack.length === 0 && styles.headerIconDisabled]}
              onPress={handleUndo}
              disabled={undoStack.length === 0}
            >
              <Text style={[styles.headerIconText, undoStack.length === 0 && styles.headerIconTextDisabled]}>↩</Text>
            </Pressable>
            <Pressable
              style={[styles.headerIconButton, redoStack.length === 0 && styles.headerIconDisabled]}
              onPress={handleRedo}
              disabled={redoStack.length === 0}
            >
              <Text style={[styles.headerIconText, redoStack.length === 0 && styles.headerIconTextDisabled]}>↪</Text>
            </Pressable>
            </>
            ) : null}

          </View>
        </View>
        <View style={styles.compactProduct}>
          <View style={[styles.compactDot, { backgroundColor: resolveColorValue(selectedColor) }]} />
          <Text style={styles.compactName} numberOfLines={1}>
            {selectedProduct.name} · {selectedColor}
          </Text>
          {hasArtwork ? (
            <Pressable onPress={goPreview} style={styles.compactPreview}>
              <Text style={styles.compactPreviewText}>완성 보기</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => navigation.navigate('/products')}
            style={styles.compactChange}
          >
            <Text style={styles.compactChangeText}>상품 변경</Text>
          </Pressable>
        </View>
        {/* 앞/뒤면 세그먼트 — 올릴 것이 있을 때만 */}
        {hasArtwork ? (
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
        ) : null}
      </View>

      {/* ── 캔버스 (최대화) ── */}
      <View style={[styles.canvasArea, imageControlFocused && styles.canvasAreaFocused]}>
        <View style={styles.canvasFrame}>
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
          {/* ── 줌 컨트롤 — 편집할 것이 있을 때만 ── */}
          {hasArtwork ? (
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
          ) : null}
          {hasArtwork ? (
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
          ) : null}
        </View>
        {!hasArtwork ? (
          // Below the garment, not over it — the shirt is what is being sold.
          <View style={styles.emptyActions}>
            <Pressable
              style={[styles.emptyCta, loadingPhoto && styles.emptyCtaDisabled]}
              onPress={() => {
                void handleAddPhoto();
              }}
              disabled={loadingPhoto}
              accessibilityRole="button"
            >
              <Text style={styles.emptyCtaText}>
                {loadingPhoto ? '사진을 불러오는 중...' : '사진 올리기'}
              </Text>
            </Pressable>
            {photoError ? (
              <Text style={styles.emptyError}>{photoError}</Text>
            ) : (
              <Text style={styles.emptyHint}>
                배경이 투명한 PNG를 올리면 원하는 모양만 인쇄돼요
              </Text>
            )}
          </View>
        ) : null}
        {hasArtwork ? (
        <View style={styles.canvasOutsideActions}>
          <Pressable style={styles.stageResetButton} onPress={handleResetToInitial}>
            <Text style={styles.stageResetButtonText}>편집 내용 초기화</Text>
          </Pressable>
          <Pressable
            style={styles.orderCta}
            onPress={goOrder}
            accessibilityRole="button"
          >
            <Text style={styles.orderCtaText}>주문하기</Text>
          </Pressable>
        </View>
        ) : null}
      </View>
      {imageControlFocused ? (
        <Pressable
          style={styles.fullScreenFocusBackdrop}
          onPress={() => setImageControlFocused(false)}
        />
      ) : null}

      {/* ── 하단 탭 패널 — 편집할 것이 있을 때만 ── */}
      {hasArtwork ? (
      <View style={[styles.panel, { height: panelHeight }]}>
        <Pressable
          style={styles.editPanelHeader}
          onPress={() => setPanelExpanded((v) => !v)}
        >
          <Text style={styles.editPanelTitle}>편집하기</Text>
          <Chevron direction={panelExpanded ? 'down' : 'up'} size={9} />
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
          {/* ── 탭 1: 텍스트 ── */}
          {editorTab === 1 && (
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
                  <View style={styles.textActionRow}>
                    <SecondaryButton
                      label="삭제"
                      onPress={() => {
                        pushSnapshot();
                        setTextLayer({ ...textLayer, enabled: false });
                        setActiveLayer('image');
                      }}
                      style={styles.textActionBtn}
                    />
                    <SecondaryButton
                      label="복제"
                      onPress={() => {
                        pushSnapshot();
                        // Duplicate text with slight offset
                        setTextTransform({
                          ...textTransform,
                          offsetX: textTransform.offsetX + 0.05,
                          offsetY: textTransform.offsetY + 0.05,
                        });
                      }}
                      style={styles.textActionBtn}
                    />
                  </View>
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

          {/* ── 탭 0: 이미지 ── */}
          {editorTab === 0 && (
            <View>
              <View style={styles.photoManagementSection}>
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
                              <CloseIcon size={10} color="#FFFFFF" />
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
                        label="삭제"
                        onPress={() => handleDeletePhoto(currentPhotoIndex)}
                        disabled={loadingPhoto || currentPhotos.length === 0}
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

        </ScrollView>
      </View>
      ) : null}

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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    backgroundColor: '#F2F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 16,
    color: '#4E5968',
    fontWeight: '700',
  },
  headerIconDisabled: {
    opacity: 0.35,
  },
  headerIconTextDisabled: {
    color: '#8B95A1',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editorTopTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
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
    // A white swatch on the light page disappears behind a #E5E8EB ring, and
    // white is the default garment colour.
    borderColor: theme.colors.textTertiary,
    marginRight: theme.spacing.sm,
  },
  compactName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#191F28',
  },
  compactChange: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: 999,
    backgroundColor: '#F2F4F6',
    borderWidth: 1,
    borderColor: '#E5E8EB',
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
    borderColor: '#E5E8EB',
  },
  compactPreviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4E5968',
  },

  /* ── Placement Segment ── */
  placementSegment: {
    flexDirection: 'row',
    backgroundColor: FILL_SOFT,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E8EB',
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
    backgroundColor: '#E5E8EB',
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4E5968',
  },
  segmentButtonTextActive: {
    color: '#191F28',
  },

  /* ── Canvas ── */
  canvasArea: {
    // Takes the space between the header and the panel, and may shrink below
    // its content so the row under the garment stays inside the safe area.
    flex: 1,
    minHeight: 0,
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
    borderColor: '#E5E8EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  canvasStateText: {
    fontSize: 11,
    lineHeight: 15,
    color: '#4E5968',
    fontWeight: '700',
  },
  canvasOutsideActions: {
    width: '100%',
    alignItems: 'stretch',
    marginTop: theme.spacing.xs,
    marginBottom: 2,
  },
  /** The one thing to do once the design is placed. */
  orderCta: {
    marginTop: theme.spacing.sm,
    minHeight: 52,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderCtaText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stageResetButton: {
    alignSelf: 'flex-end',
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E8EB',
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
    borderColor: '#F2F4F6',
    backgroundColor: '#F2F4F6',
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  activeLayerBadgeText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#4E5968',
    fontWeight: '700',
  },
  canvasFrame: {
    position: 'relative',
    width: '100%',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#F2F4F6',
    borderWidth: 1,
    borderColor: '#E5E8EB',
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
    borderColor: '#F2F4F6',
    backgroundColor: '#F2F4F6',
  },
  focusButtonActive: {
    borderColor: '#E5E8EB',
    backgroundColor: '#F2F4F6',
  },
  focusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4E5968',
  },
  focusButtonTextActive: {
    color: '#191F28',
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
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#E5E8EB',
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
    color: '#4E5968',
    lineHeight: 20,
  },
  zoomLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B95A1',
    // Unconstrained, this collided with the neighbouring caption; reserve the
    // width the longest value ("300%") needs and centre it.
    minWidth: 34,
    textAlign: 'center',
  },

  /* ── Empty state ── */
  emptyActions: {
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyCta: {
    alignSelf: 'stretch',
    minHeight: 56,
    paddingHorizontal: 32,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaDisabled: {
    backgroundColor: theme.colors.border,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptyError: {
    marginTop: theme.spacing.md,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.error,
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: theme.spacing.md,
    fontSize: 13,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },

  fullScreenFocusBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25, 31, 40, 0.5)',
    zIndex: 60,
  },

  /* ── Bottom Panel ── */
  panel: {
    flexShrink: 0,
    backgroundColor: PANEL_BG,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderTopWidth: 1,
    borderTopColor: '#E5E8EB',
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
    borderBottomColor: '#E5E8EB',
    backgroundColor: '#FFFFFF',
  },
  editPanelTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#4E5968',
  },
  editPanelToggle: {
    fontSize: 12,
    color: '#8B95A1',
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
    backgroundColor: '#E5E8EB',
    marginBottom: theme.spacing.xs,
  },
  dragHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4E5968',
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
    borderBottomColor: '#E5E8EB',
  },
  textActionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  textActionBtn: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  sectionTitle: {
    ...theme.typography.subheading,
    color: '#191F28',
    marginBottom: theme.spacing.sm,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4E5968',
    marginBottom: theme.spacing.md,
  },

  /* ── Adjust tab ── */
  transformHint: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4E5968',
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
    color: '#8B95A1',
  },
  sliderValueText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4E5968',
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

  aiStatusText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4E5968',
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
    color: '#8B95A1',
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
    color: '#191F28',
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
    borderBottomColor: '#E5E8EB',
  },
  confirmText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#191F28',
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
    backgroundColor: '#F2F4F6',
    borderColor: '#E5E8EB',
  },
  priceTitle: {
    ...theme.typography.subheading,
    color: '#191F28',
    marginBottom: theme.spacing.xs,
  },
  priceValue: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
    color: ACCENT,
    marginBottom: theme.spacing.xs,
  },
  priceOption: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4E5968',
  },
  priceNote: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4E5968',
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
    color: '#8B95A1',
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
    borderColor: '#E5E8EB',
    marginRight: theme.spacing.sm,
    backgroundColor: '#F2F4F6',
  },
  fontButtonSelected: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(49, 130, 246, 0.14)',
  },
  fontButtonText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4E5968',
  },
  fontButtonTextSelected: {
    color: '#1B64DA',
  },

  /* ── Photo Management ── */
  photoManagementSection: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E8EB',
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
    color: '#8B95A1',
    marginTop: theme.spacing.xs,
  },
  photoSectionHint: {
    fontSize: 11,
    lineHeight: 18,
    color: '#8B95A1',
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
    color: '#4E5968',
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
});
