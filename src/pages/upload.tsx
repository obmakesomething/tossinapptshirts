import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, ActivityIndicator, Pressable } from 'react-native';
import {
  Card,
  PrimaryButton,
  Screen,
  SecondaryButton,
  TopBar,
  theme,
} from '../components/ui';
import { API_BASE_URL } from '../config';
import { useCatalog } from '../context/catalog';
import { fetchAlbumPhotos } from '@apps-in-toss/native-modules';

export const Route = createRoute('/upload', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const { designImageUri, setDesignImageUri } = useCatalog();
  const [uploading, setUploading] = useState(false);
  const [loadingAlbum, setLoadingAlbum] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [lastDataUrl, setLastDataUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  const previewUri = designImageUri ?? lastDataUrl;

  const goNext = () => {
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
        throw new Error('업로드에 실패했어요.');
      }
      const data = await response.json();
      if (!data.dataUrl) {
        throw new Error('업로드 결과가 올바르지 않아요.');
      }
      setDesignImageUri(data.dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했어요.');
    } finally {
      setUploading(false);
    }
  };

  const handlePick = async () => {
    setError('');
    setLoadingAlbum(true);
    try {
      const permission = await fetchAlbumPhotos.getPermission();
      if (permission !== 'allowed') {
        const next = await fetchAlbumPhotos.openPermissionDialog();
        if (next !== 'allowed') {
          setError('사진 접근 권한이 필요해요.');
          return;
        }
      }
      const photos = await fetchAlbumPhotos({ maxCount: 1, maxWidth: 1024, base64: true });
      const photo = photos[0];
      if (!photo) {
        setError('앨범에서 사진을 찾지 못했어요.');
        return;
      }
      const dataUrl = photo.dataUri.startsWith('data:')
        ? photo.dataUri
        : `data:image/jpeg;base64,${photo.dataUri}`;
      setDesignImageUri(null);
      setLastDataUrl(dataUrl);
      await uploadDataUrl(dataUrl, `album-${photo.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '앨범을 불러오지 못했어요.');
    } finally {
      setLoadingAlbum(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!designImageUri && !lastDataUrl) return;
    setRemovingBg(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/v1/images/remove-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          lastDataUrl
            ? { dataUrl: lastDataUrl, filename: 'upload', returnBase64: true }
            : { dataUrl: designImageUri, filename: 'upload', returnBase64: true }
        ),
      });
      if (!response.ok) {
        throw new Error('배경 제거에 실패했어요.');
      }
      const data = await response.json();
      if (!data.dataUrl) {
        throw new Error('배경 제거 결과가 올바르지 않아요.');
      }
      setDesignImageUri(data.dataUrl);
      setLastDataUrl(null);
      setError('✓ 배경 제거가 완료되었습니다.');
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '배경 제거에 실패했어요.');
    } finally {
      setRemovingBg(false);
    }
  };

  return (
    <Screen>
      <TopBar title="이미지 업로드" onBack={() => navigation.goBack()} />

      <Text style={styles.title}>사진을 먼저 가져와 주세요</Text>
      <Text style={styles.subtitle}>아래 + 박스를 눌러 앨범에서 선택하세요.</Text>

      <Card style={styles.uploadCard}>
        <Pressable style={styles.uploadPreview} onPress={handlePick}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text style={styles.plusText}>+</Text>
              <Text style={styles.previewText}>사진 가져오기</Text>
            </View>
          )}
        </Pressable>
        {loadingAlbum ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>앨범 불러오는 중...</Text>
          </View>
        ) : null}
        {uploading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>이미지 업로드 중...</Text>
          </View>
        ) : null}
        {previewUri && (
          <SecondaryButton
            label={removingBg ? '배경 제거 중...' : '배경 제거하기'}
            onPress={handleRemoveBackground}
            disabled={removingBg}
            style={styles.bgRemoveButton}
          />
        )}
      </Card>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <PrimaryButton
        label="다음: 디자인 편집하기"
        onPress={goNext}
        disabled={!designImageUri}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  uploadCard: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  uploadPreview: {
    width: '100%',
    height: 160,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: theme.colors.primary,
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
    color: theme.colors.textSecondary,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  loadingText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#DC2626',
    marginBottom: theme.spacing.sm,
  },
  bgRemoveButton: {
    marginTop: theme.spacing.md,
  },
});
