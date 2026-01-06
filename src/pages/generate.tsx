import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, Pressable, Image, ActivityIndicator } from 'react-native';
import { Chip, PrimaryButton, Screen, TopBar, theme, Card } from '../components/ui';
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

function Page() {
  const navigation = Route.useNavigation();
  const { setDesignImageUri, setDesignPrompt } = useCatalog();
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState(styleOptions[0]);
  const [ratio, setRatio] = useState(ratioOptions[0]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goNext = () => {
    const selected = results[selectedIndex];
    if (selected) {
      setDesignImageUri(selected);
      navigation.navigate('/editor');
    }
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
          numberOfImages: 4,
          aspectRatio: ratio,
        }),
      });
      if (!response.ok) {
        throw new Error('이미지 생성에 실패했어요.');
      }
      const data = await response.json();
      const urls = (data.images || []).map((item: { url: string }) => item.url);
      setResults(urls);
      setSelectedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 생성에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <TopBar title="AI 이미지 생성" onBack={() => navigation.goBack()} />

      <Text style={styles.title}>이미지를 생성할 프롬프트를 입력하세요</Text>
      <TextInput
        style={styles.input}
        placeholder="예: A clean vector-style illustration of a wave..."
        placeholderTextColor={theme.colors.muted}
        value={prompt}
        onChangeText={setPrompt}
        multiline
      />
      <Text style={styles.helperText}>영문 프롬프트 기준으로 가장 품질이 좋아요.</Text>

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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>생성 결과</Text>
        <View style={styles.grid}>
          {(results.length ? results : Array.from({ length: 4 })).map((item, index) => (
            <Pressable
              key={`result-${index}`}
              onPress={() => setSelectedIndex(index)}
              style={[
                styles.gridItem,
                selectedIndex === index && styles.gridItemSelected,
              ]}
            >
              <Card style={styles.gridCard}>
                {typeof item === 'string' ? (
                  <Image source={{ uri: item }} style={styles.resultImage} />
                ) : (
                  <Text style={styles.gridLabel}>Result {index + 1}</Text>
                )}
              </Card>
            </Pressable>
          ))}
        </View>
      </View>

      <PrimaryButton label="선택 완료" onPress={goNext} disabled={!results.length} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
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
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
  },
  gridItem: {
    width: '48%',
    marginBottom: theme.spacing.sm,
  },
  gridItemSelected: {
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  gridCard: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultImage: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radius.md,
  },
  gridLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
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
    marginTop: theme.spacing.sm,
  },
});
