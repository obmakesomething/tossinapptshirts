import { createRoute } from '@granite-js/react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Card,
  PageHeader,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Timeline,
  theme,
} from '../components/ui';
import { API_BASE_URL } from '../config';
import { formatPrice } from '../utils/format';

const PAGE_BG = '#F2F4F6';

export const Route = createRoute('/order-detail' as never, {
  component: Page,
});

type TimelineStep = {
  label: string;
  date?: string;
  completed: boolean;
};

type OrderDetail = {
  orderNumber: string;
  orderDate: string;
  productName: string;
  color: string;
  lines: string;
  printSides: string;
  total: number;
  recipient: string;
  address: string;
  phone: string;
  memo?: string;
  trackingCarrier?: string;
  trackingNumber?: string;
  timeline: TimelineStep[];
};

function Page() {
  const navigation = Route.useNavigation();
  const params = Route.useParams() as { orderId?: string };
  const orderId = params.orderId ?? '';

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/v1/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  if (loading) {
    return (
      <Screen contentStyle={styles.screenContent}>
        <PageHeader title="주문 상세" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      </Screen>
    );
  }

  if (!order) {
    return (
      <Screen contentStyle={styles.screenContent}>
        <PageHeader title="주문 상세" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.loadingText}>주문 정보를 찾을 수 없어요</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.screenContent}>
      <PageHeader title="주문 상세" onBack={() => navigation.goBack()} />

      <Text style={styles.orderNumber}>{order.orderNumber}</Text>
      <Text style={styles.orderDate}>{order.orderDate} 주문</Text>

      {/* 제작 상태 타임라인 */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>제작 상태</Text>
        <Timeline
          steps={order.timeline.map((step) => ({
            label: step.label,
            description: step.date,
            completed: step.completed,
          }))}
        />
      </Card>

      {/* 주문 정보 */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>주문 정보</Text>
        <Text style={styles.infoText}>
          {order.productName} {order.color}
        </Text>
        <Text style={styles.infoText}>{order.lines}</Text>
        <Text style={styles.infoText}>{order.printSides}</Text>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>총 결제금액</Text>
          <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
        </View>
      </Card>

      {/* 배송 정보 */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>배송 정보</Text>
        <Text style={styles.infoText}>수령인: {order.recipient}</Text>
        <Text style={styles.infoText}>주소: {order.address}</Text>
        <Text style={styles.infoText}>연락처: {order.phone}</Text>
        {order.memo && (
          <Text style={styles.infoText}>배송메모: {order.memo}</Text>
        )}
        {order.trackingNumber && (
          <>
            <View style={styles.divider} />
            <Text style={styles.trackingText}>
              운송장: {order.trackingCarrier} {order.trackingNumber}
            </Text>
            <PrimaryButton
              label="배송 추적하기"
              onPress={() => {
                // tracking link handling
              }}
              style={styles.trackingButton}
            />
          </>
        )}
      </Card>

      <View style={styles.bottomAction}>
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
  center: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  orderNumber: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.md,
  },
  orderDate: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  infoText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  trackingText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  trackingButton: {
    marginTop: theme.spacing.sm,
  },
  bottomAction: {
    marginTop: theme.spacing.md,
  },
});
