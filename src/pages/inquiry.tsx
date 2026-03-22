import { createRoute } from '@granite-js/react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Card, PrimaryButton, Screen, theme } from '../components/ui';
import { API_BASE_URL } from '../config';

const ORANGE_RED = '#2A6ED4';
const WARM_DEEP = '#FFFAF5';
const NAVY_PANEL = '#FFFFFF';
const WARM_MID = '#FFF4E8';

export const Route = createRoute('/inquiry' as never, {
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

      // Success - navigate back
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : '문의를 등록하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>1대1 문의</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>이전</Text>
        </Pressable>
      </View>

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

      <PrimaryButton
        label={submitting ? '등록하고 있어요...' : '문의 등록하기'}
        onPress={handleSubmit}
        disabled={submitting}
        style={styles.submitButton}
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
  screenContent: {
    backgroundColor: WARM_DEEP,
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
    color: '#2E231B',
  },
  headerBack: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(240,223,207,0.92)',
    backgroundColor: 'rgba(255,244,232,0.92)',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerBackText: {
    fontSize: 12,
    color: '#7C6959',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#7C6959',
    marginBottom: theme.spacing.lg,
  },
  formCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: NAVY_PANEL,
    borderColor: 'rgba(240,223,207,0.92)',
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: '#2E231B',
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(240,223,207,0.92)',
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    color: '#2E231B',
    backgroundColor: WARM_MID,
  },
  textArea: {
    height: 120,
    paddingTop: theme.spacing.sm,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7A6B5D',
    marginTop: theme.spacing.md,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#ffb8b8',
    marginBottom: theme.spacing.sm,
  },
  submitButton: {
    backgroundColor: ORANGE_RED,
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
    color: '#7C6959',
    marginLeft: theme.spacing.sm,
  },
});
