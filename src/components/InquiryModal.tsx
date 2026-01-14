import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Card, PrimaryButton, SecondaryButton, theme } from './ui';
import { API_BASE_URL } from '../config';

type InquiryModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function InquiryModal({ visible, onClose }: InquiryModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [userName, setUserName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

      // Success
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTitle('');
        setContent('');
        setUserName('');
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '문의 등록에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setTitle('');
      setContent('');
      setUserName('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>1대1 문의</Text>
          <Pressable onPress={handleClose} disabled={submitting}>
            <Text style={styles.closeButton}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            궁금하신 사항을 남겨주시면 빠른 시일 내에 답변드리겠습니다.
          </Text>

          {success ? (
            <Card style={styles.successCard}>
              <Text style={styles.successText}>
                ✓ 문의가 성공적으로 등록되었습니다!{'\n'}
                답변은 영업일 기준 1-2일 이내에 처리됩니다.
              </Text>
            </Card>
          ) : (
            <Card style={styles.formCard}>
              <Text style={styles.label}>이름 (선택)</Text>
              <TextInput
                style={styles.input}
                placeholder="이름을 입력하세요 (비공개)"
                value={userName}
                onChangeText={setUserName}
                placeholderTextColor={theme.colors.textTertiary}
                editable={!submitting}
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
                editable={!submitting}
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
                editable={!submitting}
              />

              <Text style={styles.hint}>
                • 답변은 영업일 기준 1-2일 이내 등록됩니다.{'\n'}• 주문 관련
                문의 시 주문번호를 함께 적어주세요.
              </Text>
            </Card>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!success && (
            <View style={styles.buttonRow}>
              <SecondaryButton
                label="취소"
                onPress={handleClose}
                disabled={submitting}
                style={styles.button}
              />
              <PrimaryButton
                label={submitting ? '등록 중...' : '문의 등록하기'}
                onPress={handleSubmit}
                disabled={submitting}
                style={styles.button}
              />
            </View>
          )}

          {submitting && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.loadingText}>문의를 등록하고 있어요...</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  closeButton: {
    fontSize: 24,
    lineHeight: 28,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.sm,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  formCard: {
    marginBottom: theme.spacing.lg,
  },
  successCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  successText: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.success || theme.colors.primary,
    textAlign: 'center',
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
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  button: {
    flex: 1,
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
