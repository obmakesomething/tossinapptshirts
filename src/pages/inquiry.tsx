import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Card, PrimaryButton, Screen, TopBar, theme } from '../components/ui';
import { API_BASE_URL } from '../config';

export const Route = createRoute('/inquiry', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [userName, setUserName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.');
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
        throw new Error('문의 등록에 실패했어요.');
      }

      // Success - navigate back
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : '문의 등록에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <TopBar title="1대1 문의" onBack={() => navigation.goBack()} />

      <Text style={styles.subtitle}>
        궁금하신 사항을 남겨주시면 빠른 시일 내에 답변드리겠습니다.
      </Text>

      <Card style={styles.formCard}>
        <Text style={styles.label}>이름 (선택)</Text>
        <TextInput
          style={styles.input}
          placeholder="이름을 입력하세요 (비공개)"
          value={userName}
          onChangeText={setUserName}
          placeholderTextColor={theme.colors.textTertiary}
        />

        <Text style={[styles.label, { marginTop: theme.spacing.lg }]}>
          제목 *
        </Text>
        <TextInput
          style={styles.input}
          placeholder="문의 제목을 입력하세요"
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
          placeholder="문의 내용을 상세히 작성해주세요"
          value={content}
          onChangeText={setContent}
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
        />

        <Text style={styles.hint}>
          • 답변은 영업일 기준 1-2일 이내 등록됩니다.{'\n'}• 주문 관련 문의 시
          주문번호를 함께 적어주세요.
        </Text>
      </Card>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <PrimaryButton
        label={submitting ? '등록 중...' : '문의 등록하기'}
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
