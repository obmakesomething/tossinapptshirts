import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Card,
  PageHeader,
  PrimaryButton,
  Screen,
  SecondaryButton,
  theme,
} from '../components/ui';

const WARM_DEEP = '#FFFAF5';

export const Route = createRoute('/order-complete' as never, {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const params = Route.useParams() as { orderNumber?: string };
  const orderNumber = params.orderNumber ?? 'ORD-00000000-000';

  return (
    <Screen contentStyle={styles.screenContent}>
      <PageHeader title="주문 완료" onBack={() => navigation.navigate('/')} />

      <View style={styles.successSection}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>주문이 완료됐어요!</Text>
        <Text style={styles.orderNumber}>주문번호: {orderNumber}</Text>
      </View>

      <Card style={styles.infoCard}>
        <Text style={styles.infoRow}>제작 시작: 영업일 기준 1일 이내</Text>
        <Text style={styles.infoRow}>예상 출고: 3~5 영업일</Text>
        <Text style={styles.infoRow}>배송: 출고 후 1~2일</Text>
        <View style={styles.divider} />
        <Text style={styles.infoEmail}>
          주문 확인 이메일을 보내드렸어요.
        </Text>
      </Card>

      <View style={styles.actions}>
        <PrimaryButton
          label="주문 상세 보기"
          onPress={() =>
            (navigation as any).navigate('/order-detail', { orderId: orderNumber })
          }
        />
        <SecondaryButton
          label="홈으로 돌아가기"
          onPress={() => navigation.navigate('/')}
        />
        <SecondaryButton
          label="문의하기"
          onPress={() => navigation.navigate('/inquiry' as never)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    backgroundColor: WARM_DEEP,
    paddingBottom: theme.spacing.xl,
  },
  successSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  successTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  orderNumber: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: theme.spacing.lg,
  },
  infoRow: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    lineHeight: 26,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  infoEmail: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  actions: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
});
