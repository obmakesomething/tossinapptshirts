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
import type { ImageResponse } from '@apps-in-toss/types';

export const Route = createRoute('/upload', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const { designImageUri, setDesignImageUri } = useCatalog();
  const [uploading, setUploading] = useState(false);
  const [loadingAlbum, setLoadingAlbum] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [albumPhotos, setAlbumPhotos] = useState<ImageResponse[]>([]);
  const [error, setError] = useState('');

  const goNext = () => {
    navigation.navigate('/editor');
  };

  const goGenerate = () => {
    navigation.navigate('/generate');
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
        }),
      });
      if (!response.ok) {
        throw new Error('업로드에 실패했어요.');
      }
      const data = await response.json();
      if (!data.url) {
        throw new Error('업로드 결과가 올바르지 않아요.');
      }
      setDesignImageUri(data.url);
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
      const photos = await fetchAlbumPhotos({ maxCount: 30, maxWidth: 1024, base64: true });
      setAlbumPhotos(photos);
      if (!photos.length) {
        setError('앨범에서 사진을 찾지 못했어요.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '앨범을 불러오지 못했어요.');
    } finally {
      setLoadingAlbum(false);
    }
  };

  const handleSelectPhoto = async (photo: ImageResponse) => {
    const dataUrl = photo.dataUri.startsWith('data:')
      ? photo.dataUri
      : `data:image/jpeg;base64,${photo.dataUri}`;
    await uploadDataUrl(dataUrl, `album-${photo.id}`);
  };

  const handleRemoveBackground = async () => {
    if (!designImageUri) return;
    setRemovingBg(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/v1/images/remove-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: designImageUri }),
      });
      if (!response.ok) {
        throw new Error('배경 제거에 실패했어요.');
      }
      const data = await response.json();
      if (!data.url) {
        throw new Error('배경 제거 결과가 올바르지 않아요.');
      }
      setDesignImageUri(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '배경 제거에 실패했어요.');
    } finally {
      setRemovingBg(false);
    }
  };

  return (
    <Screen>
      <TopBar title="이미지 업로드" onBack={() => navigation.goBack()} />

      <Text style={styles.title}>이미지를 선택해 바로 시작하세요</Text>
      <Text style={styles.subtitle}>앨범에서 이미지를 골라 바로 업로드하세요.</Text>

      <Card style={styles.uploadCard}>
        <View style={styles.uploadPreview}>
          {designImageUri ? (
            <Image source={{ uri: designImageUri }} style={styles.previewImage} />
          ) : (
            <Text style={styles.previewText}>이미지를 선택해 주세요</Text>
          )}
        </View>
        <SecondaryButton
          label={loadingAlbum ? '앨범 불러오는 중...' : '앨범 불러오기'}
          onPress={handlePick}
          disabled={uploading || loadingAlbum}
          style={styles.urlButton}
        />
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
        <Text style={styles.helperText}>
          투명 배경 PNG면 자동 유지돼요. 필요하면 바로 배경 제거를 눌러 주세요.
        </Text>
        <SecondaryButton
          label={removingBg ? '배경 제거 중...' : '배경 제거'}
          onPress={handleRemoveBackground}
          disabled={!designImageUri || removingBg}
          style={styles.urlButton}
        />
      </Card>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {albumPhotos.length ? (
        <View style={styles.albumSection}>
          <Text style={styles.albumTitle}>앨범 사진</Text>
          <View style={styles.albumGrid}>
            {albumPhotos.map((photo) => (
              <Pressable
                key={photo.id}
                style={styles.albumItem}
                onPress={() => handleSelectPhoto(photo)}
              >
                <Image
                  source={{
                    uri: photo.dataUri.startsWith('data:')
                      ? photo.dataUri
                      : `data:image/jpeg;base64,${photo.dataUri}`,
                  }}
                  style={styles.albumImage}
                />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <PrimaryButton
          label="내 티셔츠 만들기"
          onPress={goNext}
          disabled={!designImageUri}
          style={styles.actionButton}
        />
        <SecondaryButton label="AI로 생성" onPress={goGenerate} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 13,
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
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  urlInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  urlButton: {
    alignSelf: 'stretch',
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: theme.spacing.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  loadingText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: theme.spacing.sm,
  },
  albumSection: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  albumTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  albumItem: {
    width: '48%',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  albumImage: {
    width: '100%',
    height: 120,
  },
  actionRow: {
    marginTop: theme.spacing.sm,
  },
  actionButton: {
    marginBottom: theme.spacing.sm,
  },
});
