import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Card,
  ListRow,
  PageHeader,
  PrimaryButton,
  Screen,
  SecondaryButton,
  theme,
} from '../components/ui';

const PAGE_BG = '#F2F4F6';

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
        <View style={styles.successMark}>
          <View style={styles.checkShort} />
          <View style={styles.checkLong} />
        </View>
        <Text style={styles.successTitle}>주문이 완료됐어요</Text>
        <Text style={styles.successDesc}>
          디자인 그대로 제작에 들어갑니다. 진행 상황은 주문 상세에서 확인할 수 있어요.
        </Text>
        <View style={styles.orderNumberPill}>
          <Text style={styles.orderNumber}>주문번호 {orderNumber}</Text>
        </View>
      </View>

      <Card>
        <ListRow label="제작 시작" value="영업일 기준 1일 이내" />
        <ListRow label="예상 출고" value="3~5 영업일" />
        <ListRow label="배송" value="출고 후 1~2일" last />
        <View style={styles.divider} />
        <Text style={styles.infoEmail}>
          주문 확인 이메일을 보내드렸어요. 메일이 오지 않았다면 스팸함을 확인해주세요.
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
    backgroundColor: PAGE_BG,
    paddingBottom: theme.spacing.xl,
  },
  successSection: {
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  successMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  /* Two rotated bars form the checkmark — no emoji, scales cleanly. */
  checkShort: {
    position: 'absolute',
    width: 11,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: -8 }, { translateY: 4 }, { rotate: '45deg' }],
  },
  checkLong: {
    position: 'absolute',
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    transform: [{ translateX: 3 }, { translateY: 0 }, { rotate: '-45deg' }],
  },
  successTitle: {
    ...theme.typography.display,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  successDesc: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  orderNumberPill: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
  },
  orderNumber: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
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
