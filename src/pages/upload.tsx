import { fetchAlbumPhotos } from '@apps-in-toss/native-modules';
import { createRoute } from '@granite-js/react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Card,
  Chip,
  DisabledHint,
  PageHeader,
  PrimaryButton,
  Screen,
  SecondaryButton,
  theme,
} from '../components/ui';
import { API_BASE_URL } from '../config';
import { useCatalog } from '../context/catalog';
import { faqItems } from '../data/faq';
import {
  trackClick,
  trackEvent,
  trackImageUploaded,
  trackScreenView,
} from '../utils/analytics';

const ACCENT = '#1B64DA';
const PAGE_BG = '#F2F4F6';
const FILL_SOFT = '#F2F4F6';
const PANEL = '#FFFFFF';

export const Route = createRoute('/upload', {
  component: Page,
});

/**
 * Sniff the image type from the head of a base64 payload.
 *
 * The album module hands back bare base64 with no mime type. PNG must be
 * detected rather than assumed away, otherwise a transparent design gets
 * re-encoded as JPEG and loses its alpha channel.
 */
function guessImageMimeType(base64: string): string {
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

type ImageMutationResponse = Record<string, unknown> & {
  dataUrl?: string;
};

function Page() {
  const navigation = Route.useNavigation();
  const { designImageUri, setDesignImageUri } = useCatalog();
  const [uploading, setUploading] = useState(false);
  const [loadingAlbum, setLoadingAlbum] = useState(false);
  const [lastDataUrl, setLastDataUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [stylingImage, setStylingImage] = useState(false);
  const [showStyleOptions, setShowStyleOptions] = useState(false);

  const uploadFaqs = useMemo(
    () =>
      [
        'quality-1',
        'quality-2',
        'delivery-1',
      ]
        .map((id) => faqItems.find((item) => item.id === id))
        .filter((item): item is NonNullable<typeof item> => !!item),
    [],
  );

  const previewUri = designImageUri ?? lastDataUrl;

  React.useEffect(() => {
    trackScreenView('upload');
  }, []);

  const goNext = () => {
    trackClick('upload_next_editor_click', {
      has_design_image: !!designImageUri,
    });
    navigation.navigate('/editor');
  };

  const uploadDataUrl = async (dataUrl: string, filename: string) => {
    setUploading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/images/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          dataUrl,
          returnBase64: true,
        }),
      });
      if (!response.ok) {
        throw new Error('업로드하지 못했어요. 다시 시도해 주세요.');
      }
      const data = await response.json() as ImageMutationResponse;
      if (typeof data.dataUrl !== 'string') {
        throw new Error('업로드 결과를 확인하지 못했어요. 다시 시도해 주세요.');
      }
      trackImageUploaded('file_picker');
      setDesignImageUri(data.dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setUploading(false);
    }
  };

  const handlePick = async () => {
    trackClick('upload_pick_photo_click', { source: 'album' });
    setError('');
    setLoadingAlbum(true);
    try {
      const permission = await fetchAlbumPhotos.getPermission();
      if (permission !== 'allowed') {
        const next = await fetchAlbumPhotos.openPermissionDialog();
        if (next !== 'allowed') {
          trackEvent('upload_album_permission_denied', { source: 'album' });
          setError('사진 앨범에 접근하려면 권한이 필요해요. 설정에서 허용해 주세요.');
          return;
        }
      }
      const photos = await fetchAlbumPhotos({
        maxCount: 1,
        maxWidth: 2048,
        base64: true,
      });
      const photo = photos[0];
      if (!photo || !photo.dataUri) {
        trackEvent('upload_photo_pick_failed', { reason: 'empty_photo' });
        setError('앨범에서 사진을 불러오지 못했어요. 다시 선택해 주세요.');
        return;
      }
      // Keep PNG as PNG: transparency is now the only way to get a cut-out
      // design, so defaulting everything to JPEG would silently flatten alpha.
      const dataUrl = photo.dataUri.startsWith('data:')
        ? photo.dataUri
        : `data:${guessImageMimeType(photo.dataUri)};base64,${photo.dataUri}`;
      trackEvent('upload_photo_pick_success', {
        source: 'album',
        has_photo_id: !!photo.id,
      });
      setDesignImageUri(null);
      setLastDataUrl(dataUrl);
      await uploadDataUrl(dataUrl, `album-${photo.id || 'unknown'}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '앨범을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
    } finally {
      setLoadingAlbum(false);
    }
  };

  const handleStyleTransfer = async (style: string) => {
    if (!designImageUri && !lastDataUrl) {
      console.log('[StyleTransfer] No image available');
      return;
    }

    trackClick('upload_style_transfer_click', { style });
    console.log('[StyleTransfer] Starting style transfer:', style);
    setStylingImage(true);
    setError('');
    setSuccessMessage('');
    setShowStyleOptions(false);

    try {
      const imageToTransfer = designImageUri || lastDataUrl;
      console.log('[StyleTransfer] Image data length:', imageToTransfer?.length || 0);

      const response = await fetch(`${API_BASE_URL}/v1/images/style-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl: imageToTransfer,
          style,
          returnBase64: true,
        }),
      });

      console.log('[StyleTransfer] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[StyleTransfer] Error response:', errorText);
        throw new Error('스타일을 변환하지 못했어요. 다시 시도해 주세요.');
      }

      const data = await response.json() as ImageMutationResponse;
      console.log('[StyleTransfer] Response keys:', Object.keys(data));

      if (typeof data.dataUrl !== 'string') {
        console.error('[StyleTransfer] Missing dataUrl in response:', data);
        throw new Error('스타일 변환 결과를 확인하지 못했어요. 다시 시도해 주세요.');
      }

      console.log('[StyleTransfer] Success! Data URL length:', data.dataUrl.length);
      trackImageUploaded('style_transfer');
      trackEvent('upload_style_transfer_success', { style });
      setDesignImageUri(data.dataUrl);
      setLastDataUrl(null);
      setSuccessMessage('✓ 스타일을 변환했어요!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('[StyleTransfer] Error:', err);
      trackEvent('upload_style_transfer_failed', {
        style,
        reason: err instanceof Error ? err.message : 'unknown',
      });
      setError(
        err instanceof Error ? err.message : '스타일을 변환하지 못했어요. 다시 시도해 주세요.',
      );
    } finally {
      setStylingImage(false);
    }
  };


  return (
  <>
    <Screen contentStyle={styles.screenContent}>
      <PageHeader title="사진 편집 시작" onBack={() => navigation.goBack()} />

      <Text style={styles.title}>먼저 사진을 올려주세요</Text>
      <Text style={styles.subtitle}>
        + 버튼으로 사진을 불러오고 AI 스타일 변경까지 한 번에 진행할 수 있어요.
      </Text>
      <Text style={styles.cropGuide}>
        팁 · 배경이 투명한 PNG를 올리면 원하는 모양만 인쇄돼요. 사진은 클수록 또렷해요.
      </Text>

      <Card style={styles.uploadCard}>
        <Pressable style={styles.uploadPreview} onPress={handlePick}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text style={styles.plusText}>+</Text>
              <Text style={styles.previewText}>앨범에서 사진 선택</Text>
            </View>
          )}
        </Pressable>
        {loadingAlbum ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>앨범을 불러오고 있어요...</Text>
          </View>
        ) : null}
        {uploading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>이미지를 업로드하고 있어요...</Text>
          </View>
        ) : null}
        <SecondaryButton
          label={stylingImage ? '스타일을 바꾸고 있어요...' : 'AI 스타일 바꾸기'}
          onPress={() => {
            trackClick('upload_style_modal_open_click');
            setShowStyleOptions(true);
          }}
          disabled={!previewUri || stylingImage}
          style={[
            styles.styleButton,
            !previewUri ? styles.disabledToolButton : undefined,
          ]}
        />
        <DisabledHint
          text="사진 업로드 후 사용할 수 있어요"
          visible={!previewUri}
        />
      </Card>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {successMessage ? (
        <Text style={styles.successText}>{successMessage}</Text>
      ) : null}

      <Card style={styles.quickFaqCard}>
        <Text style={styles.quickFaqTitle}>업로드 전에 많이 묻는 질문</Text>
        {uploadFaqs.map((item) => (
          <View key={item.id} style={styles.quickFaqRow}>
            <Text style={styles.quickFaqQ}>Q.</Text>
            <View style={styles.quickFaqBody}>
              <Text style={styles.quickFaqQuestion}>{item.question}</Text>
              <Text style={styles.quickFaqAnswer}>{item.answer}</Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Style Options Modal */}
      <Modal
        visible={showStyleOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStyleOptions(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowStyleOptions(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>어떤 스타일로 바꿔볼까요?</Text>
            <Text style={styles.modalSubtitle}>
              원본 이미지의 형태는 유지하면서 스타일만 바꿔요
            </Text>
            <View style={styles.styleGrid}>
              <Chip
                label="수채화"
                onPress={() => handleStyleTransfer('watercolor')}
                style={styles.styleChip}
              />
              <Chip
                label="스케치"
                onPress={() => handleStyleTransfer('sketch')}
                style={styles.styleChip}
              />
              <Chip
                label="카툰"
                onPress={() => handleStyleTransfer('cartoon')}
                style={styles.styleChip}
              />
              <Chip
                label="픽셀아트"
                onPress={() => handleStyleTransfer('pixel')}
                style={styles.styleChip}
              />
              <Chip
                label="유화"
                onPress={() => handleStyleTransfer('oil')}
                style={styles.styleChip}
              />
              <Chip
                label="미니멀"
                onPress={() => handleStyleTransfer('minimal')}
                style={styles.styleChip}
              />
            </View>
            <PrimaryButton
              label="다음에 할게요"
              onPress={() => setShowStyleOptions(false)}
              style={styles.modalCancelButton}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.actionRow}>
        <PrimaryButton
          label="디자인 편집하러 가기"
          onPress={goNext}
          disabled={!designImageUri}
          style={styles.nextButton}
        />
        <DisabledHint
          text="사진을 선택하면 다음 단계로 갈 수 있어요"
          visible={!designImageUri}
        />
      </View>
    </Screen>
  </>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    backgroundColor: PAGE_BG,
    paddingBottom: theme.spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#191F28',
  },
  headerBack: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    backgroundColor: '#F2F4F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerBackText: {
    fontSize: 12,
    color: '#4E5968',
    fontWeight: '700',
  },
  title: {
    ...theme.typography.heading,
    color: '#191F28',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: '#4E5968',
    marginBottom: theme.spacing.xs,
  },
  cropGuide: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4E5968',
    backgroundColor: '#F2F4F6',
    borderWidth: 1,
    borderColor: '#E5E8EB',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.lg,
  },
  uploadCard: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    backgroundColor: PANEL,
    shadowColor: '#191F28',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 7,
  },
  uploadPreview: {
    width: '100%',
    height: 280,
    borderRadius: theme.radius.md,
    backgroundColor: FILL_SOFT,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewPlaceholder: {
    alignItems: 'center',
  },
  plusText: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
    color: ACCENT,
    marginBottom: theme.spacing.xs,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  previewText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4E5968',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  loadingText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4E5968',
    marginLeft: theme.spacing.sm,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#F7C6CB',
    marginBottom: theme.spacing.sm,
  },
  successText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#B5E6D0',
    marginBottom: theme.spacing.sm,
    fontWeight: '600',
  },
  bgRemoveButton: {
    marginTop: theme.spacing.md,
    width: '100%',
    backgroundColor: ACCENT,
  },
  styleButton: {
    marginTop: theme.spacing.sm,
    width: '100%',
    backgroundColor: '#E5E8EB',
  },
  undoRow: {
    width: '100%',
    marginTop: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  undoButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    backgroundColor: '#F2F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  undoButtonPressed: {
    opacity: 0.9,
  },
  undoButtonDisabled: {
    opacity: 0.5,
  },
  undoButtonText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: ACCENT,
  },
  disabledToolButton: {
    backgroundColor: '#F2F4F6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
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
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  styleChip: {
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  modalCancelButton: {
    marginTop: theme.spacing.sm,
    backgroundColor: '#F2F4F6',
  },
  actionRow: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  quickFaqCard: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: PANEL,
  },
  quickFaqTitle: {
    ...theme.typography.subheading,
    color: '#191F28',
    marginBottom: theme.spacing.sm,
  },
  quickFaqRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  quickFaqQ: {
    width: 18,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: ACCENT,
    marginTop: 1,
  },
  quickFaqBody: {
    flex: 1,
  },
  quickFaqQuestion: {
    fontSize: 12,
    lineHeight: 18,
    color: '#191F28',
    fontWeight: '600',
  },
  quickFaqAnswer: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4E5968',
    marginTop: 2,
  },
  nextButton: {
    backgroundColor: ACCENT,
  },
});
