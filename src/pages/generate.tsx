import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Card,
  Chip,
  CollapsibleSection,
  DisabledHint,
  FullScreenLoader,
  PrimaryButton,
  Screen,
  SecondaryButton,
  StickyFooter,
  TopBar,
  theme,
} from '../components/ui';
import { API_BASE_URL } from '../config';
import { useCatalog } from '../context/catalog';
import { useJobTracker, type JobStage } from '../context/jobTracker';
import { useToast } from '../context/toastContext';

export const Route = createRoute('/generate', {
  component: Page,
});

const styleOptions = ['미니멀', '라인아트', '그래픽'];
const ratioOptions = ['1:1', '4:3', '3:4'];
const stylePresetMap: Record<string, string> = {
  미니멀: 'minimal',
  라인아트: 'lineart',
  그래픽: 'graphic',
};
const promptExamples = [
  'Minimal line art mountain + sun',
  'Bold typography: WAVE CLUB',
  'Cute bear mascot, flat illustration',
];

// Stage labels for display
const stageLabels: Record<string, string> = {
  validate_input: '업로드 확인',
  run_model: 'AI 모델 실행',
  render_output: '결과 렌더링',
};

function Page() {
  const navigation = Route.useNavigation();
  const { setDesignImageUri, setDesignPrompt } = useCatalog();
  const { activeJob, startJob, cancelJob, clearJob, retryJob, isPolling } = useJobTracker();
  const { showToast } = useToast();

  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<string>(styleOptions[0] ?? '미니멀');
  const [ratio, setRatio] = useState<string>(ratioOptions[0] ?? '1:1');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [removingBg, setRemovingBg] = useState(false);
  const [showExamples, setShowExamples] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Watch for job completion and update UI
  useEffect(() => {
    if (activeJob?.status === 'succeeded' && activeJob.result?.preview_url) {
      setResultUrl(activeJob.result.preview_url);
      setDesignPrompt(prompt.trim() || '');
      showToast({
        type: 'success',
        message: '이미지 생성이 완료됐어요!',
        action: {
          label: '에디터로 이동',
          onPress: () => {
            setDesignImageUri(activeJob.result?.preview_url || null);
            navigation.navigate('/editor');
          },
        },
      });
      clearJob();
    } else if (activeJob?.status === 'failed') {
      setError(activeJob.failReason || '이미지를 만들지 못했어요.');
      showToast({
        type: 'error',
        message: activeJob.failReason || '이미지 생성에 실패했어요.',
        action: {
          label: '재시도',
          onPress: handleRetry,
        },
      });
      clearJob();
    }
  }, [activeJob?.status]);

  const isLoading = isPolling || (activeJob?.status === 'queued' || activeJob?.status === 'running');

  // Loading message progression
  const loadingMessages = [
    '이미지를 생성하고 있어요...',
    'AI가 열심히 그리고 있어요...',
    '거의 다 됐어요!',
  ];
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Change loading message over time
  useEffect(() => {
    if (!isLoading) {
      setLoadingMessageIndex(0);
      return;
    }

    const intervals = [0, 5000, 15000]; // 0s, 5s, 15s
    const timers = intervals.slice(1).map((delay, index) =>
      setTimeout(() => {
        setLoadingMessageIndex(index + 1);
      }, delay),
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isLoading]);

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
      setError('어떤 이미지를 만들지 알려주세요.');
      return;
    }
    setError('');
    setResultUrl(null);
    setDesignPrompt(prompt.trim());

    // Start background job
    const jobId = await startJob({
      prompt: prompt.trim(),
      style_preset: stylePresetMap[style] || 'minimal',
      aspectRatio: ratio,
    });

    if (!jobId) {
      setError('작업을 시작하지 못했어요. 다시 시도해 주세요.');
    }
  };

  const handleRetry = async () => {
    setError('');
    const jobId = await retryJob();
    if (!jobId) {
      setError('재시도에 실패했어요.');
    }
  };

  const handleCancel = async () => {
    await cancelJob();
    setError('');
  };

  const handleRemoveBackground = async () => {
    if (!resultUrl) return;
    setRemovingBg(true);
    setError('');
    setSuccessMessage('');
    await new Promise(requestAnimationFrame);
    try {
      const response = await fetch(
        `${API_BASE_URL}/v1/images/remove-background`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: resultUrl, returnBase64: true }),
        },
      );
      if (!response.ok) {
        throw new Error('배경을 제거하지 못했어요. 다시 시도해 주세요.');
      }
      const data = await response.json();
      if (!data.dataUrl) {
        throw new Error('배경 제거 결과를 확인하지 못했어요. 다시 시도해 주세요.');
      }
      setResultUrl(data.dataUrl);
      setSuccessMessage('✓ 배경을 제거했어요!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '배경을 제거하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setRemovingBg(false);
    }
  };

  // Get current stage progress
  const getStageProgress = () => {
    if (!activeJob?.stage) return null;
    const stages: JobStage[] = ['validate_input', 'run_model', 'render_output'];
    const currentIndex = stages.indexOf(activeJob.stage);
    return { current: currentIndex + 1, total: stages.length, label: stageLabels[activeJob.stage] };
  };

  const stageProgress = getStageProgress();

  return (
    <>
      <Screen>
      <TopBar title="AI 이미지 생성" />

      <Text style={styles.title}>AI로 이미지를 만들어 볼까요?</Text>

      {resultUrl ? (
        <View style={styles.resultSection}>
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
            label={removingBg ? '배경 제거하고 있어요...' : '배경 제거하기'}
            onPress={handleRemoveBackground}
            disabled={removingBg}
            style={styles.bgRemoveButton}
          />
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="예: 파도 일러스트, 깔끔한 벡터 스타일로..."
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
        editable={!isLoading}
      />
      <Text style={styles.helperText}>
        짧고 명확하게 적어 주세요. 영어로 쓰면 결과가 더 좋아요.
      </Text>
      {showExamples ? (
        <View style={styles.exampleSection}>
          <Text style={styles.sectionTitle}>이런 문구는 어때요?</Text>
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

      <CollapsibleSection title={`스타일: ${style} · 비율: ${ratio} 변경`}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>스타일 선택</Text>
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
          {isLoading && (
            <Text style={styles.helperHint}>변경 사항은 다음 생성에 적용돼요.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>비율 선택</Text>
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
      </CollapsibleSection>

      <PrimaryButton
        label={isLoading ? '생성 취소하기' : '이미지 만들기'}
        onPress={isLoading ? handleCancel : handleGenerate}
        disabled={false}
      />

      {isLoading && (
        <View style={styles.loadingSection}>
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              {stageProgress
                ? `${stageProgress.label} (${stageProgress.current}/${stageProgress.total})`
                : '이미지를 만들고 있어요...'}
            </Text>
          </View>
          {activeJob?.etaMs && activeJob.etaMs > 0 && (
            <Text style={styles.etaText}>
              예상 대기 시간: 약 {Math.ceil(activeJob.etaMs / 1000)}초
            </Text>
          )}
          <Text style={styles.backgroundHint}>
            🎯 다른 화면으로 이동해도 계속 생성돼요.
          </Text>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {successMessage ? (
        <Text style={styles.successText}>{successMessage}</Text>
      ) : null}

      <View style={styles.stickyFooterSpacer} />

      <StickyFooter>
        <PrimaryButton
          label="이 이미지로 굿즈 만들기"
          onPress={goNext}
          disabled={!resultUrl}
        />
        <DisabledHint
          text="이미지를 먼저 만들어 주세요"
          visible={!resultUrl}
        />
      </StickyFooter>
      </Screen>
      <FullScreenLoader
        visible={isLoading}
        message={loadingMessages[loadingMessageIndex] || loadingMessages[0]}
      />
    </>
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
  helperHint: {
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  exampleSection: {
    marginBottom: theme.spacing.lg,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  resultSection: {
    marginBottom: theme.spacing.lg,
  },
  nextButton: {
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
  loadingSection: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textPrimary,
    marginLeft: theme.spacing.sm,
    fontWeight: '600',
  },
  etaText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginLeft: 28,
  },
  backgroundHint: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.error,
    marginTop: theme.spacing.sm,
  },
  successText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.success,
    marginTop: theme.spacing.sm,
    fontWeight: '600',
  },
  stickyFooterSpacer: {
    height: 80,
  },
});
