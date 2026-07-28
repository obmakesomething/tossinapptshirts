import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from 'components/ui';

export default function NotFoundPage() {
  return (
    <View style={styles.container}>
      <View style={styles.mark} />
      <Text style={styles.title}>페이지를 찾을 수 없어요</Text>
      <Text style={styles.description}>
        주소가 바뀌었거나 삭제된 화면이에요.{'\n'}이전 화면으로 돌아가 주세요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
    backgroundColor: theme.colors.background,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
});
