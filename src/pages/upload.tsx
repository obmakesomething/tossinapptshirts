import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, ActivityIndicator } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
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

export const Route = createRoute('/upload', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const { designImageUri, setDesignImageUri } = useCatalog();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const goNext = () => {
    navigation.navigate('/editor');
  };

  const goGenerate = () => {
    navigation.navigate('/generate');
  };

  const handlePick = async () => {
    setError('');
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      includeBase64: true,
      quality: 0.92,
    });
    if (result.didCancel) return;
    const asset = result.assets?.[0];
    if (!asset?.base64) {
      setError('이미지 선택에 실패했어요.');
      return;
    }
    setUploading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/images/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: asset.fileName || 'upload',
          base64: asset.base64,
          contentType: asset.type || 'image/jpeg',
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

  return (
    <Screen>
      <TopBar title="이미지 업로드" onBack={() => navigation.goBack()} />

      <Text style={styles.title}>파일을 선택해 바로 목업을 만들어요</Text>
      <Text style={styles.subtitle}>
        PNG/JPG 최대 10MB, 가로 4096px 이하 권장
      </Text>

      <Card style={styles.uploadCard}>
        <View style={styles.uploadPreview}>
          {designImageUri ? (
            <Image source={{ uri: designImageUri }} style={styles.previewImage} />
          ) : (
            <Text style={styles.previewText}>이미지를 선택해 주세요</Text>
          )}
        </View>
        <SecondaryButton
          label={uploading ? '업로드 중...' : '파일 선택'}
          onPress={handlePick}
          disabled={uploading}
          style={styles.urlButton}
        />
        {uploading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>이미지 업로드 중...</Text>
          </View>
        ) : null}
        <Text style={styles.helperText}>
          투명 배경 PNG면 자동 유지돼요. 배경 제거는 주문 단계에서 적용됩니다.
        </Text>
      </Card>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.actionRow}>
        <PrimaryButton label="편집으로 이동" onPress={goNext} style={styles.actionButton} />
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
  actionRow: {
    marginTop: theme.spacing.sm,
  },
  actionButton: {
    marginBottom: theme.spacing.sm,
  },
});
