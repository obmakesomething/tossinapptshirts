import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
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
  PageHeader,
  PrimaryButton,
  Screen,
  SecondaryButton,
  theme,
} from '../components/ui';
import { API_BASE_URL } from '../config';
import { useCatalog } from '../context/catalog';
import { type JobStage, useJobTracker } from '../context/jobTracker';
import { useToast } from '../context/toastContext';
import {
  trackClick,
  trackEvent,
  trackImageGenerated,
  trackScreenView,
} from '../utils/analytics';

const ORANGE_RED = '#FF6A00';

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

type ImageMutationResponse = {
  dataUrl?: string;
  error?: string;
};

// Stage labels for display
const stageLabels: Record<string, string> = {
  validate_input: '업로드 확인',
  run_model: 'AI 모델 실행',
  render_output: '결과 렌더링',
};

function Page() {
  const navigation = Route.useNavigation();
  const { setDesignImageUri, setDesignPrompt } = useCatalog();
  const { activeJob, startJob, cancelJob, clearJob, retryJob, isPolling } =
    useJobTracker();
  const { showToast } = useToast();

  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<string>(styleOptions[0] ?? '미니멀');
  const [ratio, setRatio] = useState<string>(ratioOptions[0] ?? '1:1');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [removingBg, setRemovingBg] = useState(false);
  const [bgRemovalUndoUrl, setBgRemovalUndoUrl] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [startingGeneration, setStartingGeneration] = useState(false);
  const activeJobStatus = activeJob?.status;
  const activeJobPreviewUrl = activeJob?.result?.preview_url ?? null;
  const activeJobFailReason = activeJob?.failReason ?? null;
  const trimmedPrompt = prompt.trim();

  // Watch for job completion and update UI
  useEffect(() => {
    if (activeJobStatus === 'succeeded' && activeJobPreviewUrl) {
      setResultUrl(activeJobPreviewUrl);
      setBgRemovalUndoUrl(null);
      setDesignPrompt(trimmedPrompt || '');
      setError(''); // Clear any previous errors
      trackImageGenerated(trimmedPrompt, style, ratio);
      showToast({
        type: 'success',
        message: '이미지 생성이 완료됐어요!',
        action: {
          label: '에디터로 이동',
          onPress: () => {
            setDesignImageUri(activeJobPreviewUrl);
            navigation.navigate('/editor');
          },
        },
      });
      // Clear job in next tick to avoid race conditions
      setTimeout(() => clearJob(), 100);
    } else if (activeJobStatus === 'failed') {
      setError(activeJobFailReason || '이미지를 만들지 못했어요.');
      showToast({
        type: 'error',
        message: activeJobFailReason || '이미지 생성에 실패했어요.',
        action: {
          label: '재시도',
          onPress: handleRetry,
        },
      });
      // Clear job in next tick to avoid race conditions
      setTimeout(() => clearJob(), 100);
    }
  }, [
    activeJobFailReason,
    activeJobPreviewUrl,
    activeJobStatus,
    clearJob,
    navigation,
    ratio,
    setDesignImageUri,
    setDesignPrompt,
    showToast,
    style,
    trimmedPrompt,
  ]);

  const isLoading =
    isPolling ||
    activeJob?.status === 'queued' ||
    activeJob?.status === 'running';
  const isBlocking = startingGeneration || removingBg;

  // Loading message progression
  const loadingMessages = [
    '이미지를 생성하고 있어요...',
    'AI가 열심히 그리고 있어요...',
    '거의 다 됐어요!',
  ];
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [localEta, setLocalEta] = useState<number | null>(null);

  useEffect(() => {
    trackScreenView('generate');
  }, []);

  // Change loading message over time
  useEffect(() => {
    if (!isLoading) {
      setLoadingMessageIndex(0);
      setLocalEta(null);
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

  // Initialize and countdown ETA
  useEffect(() => {
    if (!isLoading) {
      setLocalEta(null);
      return;
    }

    // Initialize from activeJob ETA
    if (activeJob?.etaMs && localEta === null) {
      setLocalEta(activeJob.etaMs);
    }

    // Countdown every second
    const timer = setInterval(() => {
      setLocalEta((prev) => {
        if (prev === null || prev <= 0) return prev;
        return Math.max(0, prev - 1000);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading, activeJob?.etaMs, localEta]);

  const goNext = () => {
    trackClick('generate_next_editor_click', {
      has_result_image: !!resultUrl,
    });
    if (resultUrl) {
      setDesignImageUri(resultUrl);
      navigation.navigate('/editor');
    }
  };

  const handleSelectExample = (value: string) => {
    trackClick('generate_prompt_example_click', { example: value });
    setPrompt(value);
    setShowExamples(false);
  };

  const handleGenerate = async () => {
    // Prevent double clicks
    if (startingGeneration) {
      return;
    }

    if (!prompt.trim()) {
      setError('어떤 이미지를 만들지 알려주세요.');
      return;
    }
    trackClick('generate_submit_click', {
      style,
      aspect_ratio: ratio,
      prompt_length: prompt.trim().length,
    });

    // Set generating immediately to prevent double clicks
    setStartingGeneration(true);
    setError('');
    setResultUrl(null);
    setBgRemovalUndoUrl(null);
    setDesignPrompt(prompt.trim());

    // Clear any previous completed job before starting new one
    if (activeJob?.status === 'succeeded' || activeJob?.status === 'failed') {
      clearJob();
      // Wait a bit to ensure clearJob completes
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Start background job
    try {
      const jobId = await startJob({
        prompt: prompt.trim(),
        style_preset: stylePresetMap[style] || 'minimal',
        aspectRatio: ratio,
      });

      if (!jobId) {
        setError('작업을 시작하지 못했어요. 다시 시도해 주세요.');
      }
    } finally {
      setStartingGeneration(false);
    }
  };

  const handleRetry = async () => {
    if (startingGeneration) return;

    trackClick('generate_retry_click');
    setStartingGeneration(true);
    setError('');
    try {
      const jobId = await retryJob();
      if (!jobId) {
        setError('재시도에 실패했어요.');
      }
    } finally {
      setStartingGeneration(false);
    }
  };

  const handleCancel = async () => {
    trackClick('generate_cancel_click');
    await cancelJob();
    setError('');
    setStartingGeneration(false);
  };

  const handleRemoveBackground = async () => {
    if (!resultUrl) return;
    trackClick('generate_remove_background_click');
    setBgRemovalUndoUrl(resultUrl);
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
      const data = (await response.json()) as ImageMutationResponse;
      if (!data.dataUrl) {
        throw new Error(
          '배경 제거 결과를 확인하지 못했어요. 다시 시도해 주세요.',
        );
      }
      trackEvent('generate_remove_background_success');
      setResultUrl(data.dataUrl);
      setSuccessMessage('✓ 배경을 제거했어요!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      trackEvent('generate_remove_background_failed', {
        reason: err instanceof Error ? err.message : 'unknown',
      });
      setError(
        err instanceof Error
          ? err.message
          : '배경을 제거하지 못했어요. 다시 시도해 주세요.',
      );
    } finally {
      setRemovingBg(false);
    }
  };

  const handleUndoBackground = () => {
    if (!bgRemovalUndoUrl) return;
    trackClick('generate_remove_background_undo_click');
    setResultUrl(bgRemovalUndoUrl);
    setBgRemovalUndoUrl(null);
    setSuccessMessage('원본으로 되돌렸어요!');
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  // Get current stage progress
  const getStageProgress = () => {
    if (!activeJob?.stage) return null;
    const stages: JobStage[] = ['validate_input', 'run_model', 'render_output'];
    const currentIndex = stages.indexOf(activeJob.stage);
    return {
      current: currentIndex + 1,
      total: stages.length,
      label: stageLabels[activeJob.stage],
    };
  };

  const stageProgress = getStageProgress();

  return (
    <>
      <Screen contentStyle={styles.screenContent}>
        <View style={styles.bgOrbTop} />
        <View style={styles.bgOrbBottom} />
        <PageHeader title="AI 이미지 생성" onBack={() => navigation.goBack()} />

        <Text style={styles.title}>AI로 이미지를 만들어 볼까요?</Text>

        {resultUrl ? (
          <View style={styles.resultSection}>
            <View style={styles.resultCenter}>
              <Card style={styles.resultCard}>
                <View style={styles.checkerboardBg} />
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
            {bgRemovalUndoUrl ? (
              <View style={styles.undoRow}>
                <Pressable
                  onPress={handleUndoBackground}
                  disabled={removingBg}
                  style={({ pressed }) => [
                    styles.undoButton,
                    pressed && styles.undoButtonPressed,
                    removingBg && styles.undoButtonDisabled,
                  ]}
                >
                  <Text style={styles.undoButtonText}>되돌리기</Text>
                </Pressable>
              </View>
            ) : null}
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
          editable={!(isLoading || isBlocking)}
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
              <Text style={styles.helperHint}>
                변경 사항은 다음 생성에 적용돼요.
              </Text>
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
          label={
            isLoading || startingGeneration
              ? '생성 취소하기'
              : resultUrl
                ? '다시 생성하기'
                : '이미지 만들기'
          }
          onPress={
            isLoading || startingGeneration ? handleCancel : handleGenerate
          }
          disabled={false}
          style={styles.generateButton}
        />
        {resultUrl && !(isLoading || startingGeneration) && (
          <Text style={styles.regenerateHint}>
            프롬프트를 수정하거나 그대로 다시 생성해 보세요
          </Text>
        )}

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
            {localEta !== null && localEta > 0 && (
              <Text style={styles.etaText}>
                남은 시간: 약 {Math.ceil(localEta / 1000)}초
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

        <View style={styles.bottomAction}>
          <PrimaryButton
            label="이 이미지로 굿즈 만들기"
            onPress={goNext}
            disabled={!resultUrl}
            style={styles.useImageButton}
          />
          <DisabledHint
            text="이미지를 먼저 만들어 주세요"
            visible={!resultUrl}
          />
        </View>
      </Screen>
      <FullScreenLoader
        visible={isBlocking}
        message={
          removingBg
            ? '배경을 제거하고 있어요...'
            : loadingMessages[loadingMessageIndex] || loadingMessages[0]
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    backgroundColor: theme.colors.background,
    paddingBottom: theme.spacing.xl,
  },
  bgOrbTop: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(255, 170, 120, 0.20)',
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: 20,
    left: -70,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255, 111, 43, 0.12)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#eef5ff',
  },
  headerBack: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerBackText: {
    fontSize: 12,
    color: '#dbeaff',
    fontWeight: '700',
  },
  title: {
    ...theme.typography.heading,
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
    color: ORANGE_RED,
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
    ...theme.typography.subheading,
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
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  checkerboardBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surfaceSecondary,
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
    backgroundColor: ORANGE_RED,
  },
  undoRow: {
    marginTop: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  undoButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceSecondary,
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
    color: ORANGE_RED,
  },
  loadingSection: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    color: ORANGE_RED,
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
  regenerateHint: {
    fontSize: 12,
    lineHeight: 18,
    color: ORANGE_RED,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomAction: {
    marginTop: theme.spacing.lg,
  },
  generateButton: {
    backgroundColor: ORANGE_RED,
  },
  useImageButton: {
    backgroundColor: ORANGE_RED,
  },
});
