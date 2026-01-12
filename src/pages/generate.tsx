import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Image, ActivityIndicator } from 'react-native';
import { Chip, PrimaryButton, Screen, TopBar, theme, Card, SecondaryButton } from '../components/ui';
import { API_BASE_URL } from '../config';
import { useCatalog } from '../context/catalog';

export const Route = createRoute('/generate', {
  component: Page,
});

const styleOptions = ['미니멀', '라인아트', '그래픽'];
const ratioOptions = ['1:1', '4:3', '3:4'];
const stylePromptMap: Record<string, string> = {
  미니멀: 'minimal',
  라인아트: 'line art',
  그래픽: 'graphic',
};
const promptExamples = [
  'Minimal line art mountain + sun',
  'Bold typography: WAVE CLUB',
  'Cute bear mascot, flat illustration',
];

function Page() {
  const navigation = Route.useNavigation();
  const { setDesignImageUri, setDesignPrompt } = useCatalog();
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<string>(styleOptions[0] ?? '미니멀');
  const [ratio, setRatio] = useState<string>(ratioOptions[0] ?? '1:1');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [showExamples, setShowExamples] = useState(true);
  const [error, setError] = useState('');

  const goNext = () => {
    if (resultUrl) {
      setDesignImageUri(resultUrl);
      navigation.navigate('/editor');
    }
  };

  const handleSelectExample = (value: string) => {
    setPrompt(value);
    setShowExamples(false);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('프롬프트를 입력해 주세요.');
      return;
    }
    setError('');
    setLoading(true);
    setDesignPrompt(prompt.trim());
    try {
      const response = await fetch(`${API_BASE_URL}/v1/images/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${prompt.trim()} (${stylePromptMap[style] || style})`,
          numberOfImages: 1,
          aspectRatio: ratio,
          returnBase64: true,
        }),
      });
      if (!response.ok) {
        throw new Error('이미지 생성에 실패했어요.');
      }
      const data = await response.json();
      const nextUrl = data.images?.[0]?.dataUrl || '';
      if (!nextUrl) {
        throw new Error('이미지 생성 결과가 비어 있어요.');
      }
      setResultUrl(nextUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 생성에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!resultUrl) return;
    setRemovingBg(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/v1/images/remove-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: resultUrl, returnBase64: true }),
      });
      if (!response.ok) {
        throw new Error('배경 제거에 실패했어요.');
      }
      const data = await response.json();
      if (!data.dataUrl) {
        throw new Error('배경 제거 결과가 올바르지 않아요.');
      }
      setResultUrl(data.dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : '배경 제거에 실패했어요.');
    } finally {
      setRemovingBg(false);
    }
  };

  return (
    <Screen>
      <TopBar title="AI 이미지 생성" onBack={() => navigation.goBack()} />

      <Text style={styles.title}>AI로 이미지를 만들어 보세요</Text>
      <TextInput
        style={styles.input}
        placeholder="예: A clean vector-style illustration of a wave..."
        placeholderTextColor={theme.colors.muted}
        value={prompt}
        onChangeText={setPrompt}
        onFocus={() => setShowExamples(false)}
        onBlur={() => {
          if (!prompt.trim()) {
            setShowExamples(true);
          }
        }}
        multiline
      />
      <Text style={styles.helperText}>짧고 명확하게 적어 주세요. 영문이 가장 잘 나와요.</Text>
      {showExamples ? (
        <View style={styles.exampleSection}>
          <Text style={styles.sectionTitle}>프롬프트 예시</Text>
          <View style={styles.chipRow}>
            {promptExamples.map((example) => (
              <Chip
                key={example}
                label={example}
                onPress={() => handleSelectExample(example)}
                style={styles.chipSpacing}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>스타일</Text>
        <View style={styles.chipRow}>
          {styleOptions.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={style === option}
              onPress={() => setStyle(option)}
              style={styles.chipSpacing}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>비율</Text>
        <View style={styles.chipRow}>
          {ratioOptions.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={ratio === option}
              onPress={() => setRatio(option)}
              style={styles.chipSpacing}
            />
          ))}
        </View>
      </View>

      <PrimaryButton label="생성하기" onPress={handleGenerate} disabled={loading} />
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>이미지를 생성 중이에요...</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {resultUrl ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>생성 결과</Text>
          <View style={styles.resultCenter}>
            <Card style={styles.resultCard}>
              <Image
                source={{ uri: resultUrl }}
                style={styles.resultImage}
                resizeMode="contain"
              />
            </Card>
          </View>
          <SecondaryButton
            label={removingBg ? '배경 제거 중...' : '배경 제거'}
            onPress={handleRemoveBackground}
            disabled={removingBg}
            style={styles.bgRemoveButton}
          />
        </View>
      ) : null}

      <PrimaryButton
        label="내 굿즈 만들기"
        onPress={goNext}
        disabled={!resultUrl}
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
    marginBottom: theme.spacing.sm,
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  exampleSection: {
    marginBottom: theme.spacing.lg,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chipSpacing: {
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  resultCenter: {
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  resultCard: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultImage: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radius.md,
  },
  resultPlaceholder: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  bgRemoveButton: {
    marginTop: theme.spacing.md,
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
    color: theme.colors.error,
    marginTop: theme.spacing.sm,
  },
});
