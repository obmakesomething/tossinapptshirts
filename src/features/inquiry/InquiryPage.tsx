import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Card, PrimaryButton, Screen, TopBar, theme } from '../../components/ui';
import { API_BASE_URL } from '../../config';

type InquiryPageProps = {
  onClose?: () => void;
  onSubmitted?: () => void;
};

export function InquiryPage({ onClose, onSubmitted }: InquiryPageProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [userName, setUserName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Generate a simple userId (in production, use proper auth)
      const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const response = await fetch(`${API_BASE_URL}/v1/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userName: userName.trim() || '익명',
          title: title.trim(),
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('문의를 등록하지 못했어요. 다시 시도해 주세요.');
      }

      setSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '문의를 등록하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <TopBar title="1대1 문의" rightLabel={onClose ? '닫기' : undefined} onRightPress={onClose} />

      <Text style={styles.subtitle}>
        궁금한 점을 남겨주시면 빠르게 답변드릴게요.
      </Text>

      <Card style={styles.formCard}>
        <Text style={styles.label}>이름 (선택사항)</Text>
        <TextInput
          style={styles.input}
          placeholder="이름을 알려주세요 (비공개)"
          value={userName}
          onChangeText={setUserName}
          placeholderTextColor={theme.colors.textTertiary}
        />

        <Text style={[styles.label, { marginTop: theme.spacing.lg }]}>
          제목 *
        </Text>
        <TextInput
          style={styles.input}
          placeholder="어떤 내용인가요?"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={theme.colors.textTertiary}
          maxLength={200}
        />

        <Text style={[styles.label, { marginTop: theme.spacing.lg }]}>
          내용 *
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="궁금한 점을 자세히 적어주세요"
          value={content}
          onChangeText={setContent}
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
        />

        <Text style={styles.hint}>
          • 답변은 영업일 기준 1-2일 안에 드려요.{'\\n'}• 주문 관련 문의라면
          주문번호를 함께 적어주세요.
        </Text>
      </Card>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {submitted ? <Text style={styles.successText}>문의가 등록됐어요. 확인 후 답변드릴게요.</Text> : null}

      <PrimaryButton
        label={submitting ? '등록하고 있어요...' : '문의 등록하기'}
        onPress={handleSubmit}
        disabled={submitting}
      />

      {submitting && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>문의를 등록하고 있어요...</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  formCard: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  textArea: {
    height: 120,
    paddingTop: theme.spacing.sm,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.md,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  successText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.success,
    marginBottom: theme.spacing.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  loadingText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
});
