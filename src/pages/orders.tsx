import { createRoute } from '@granite-js/react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Badge,
  Card,
  PageHeader,
  Screen,
  theme,
} from '../components/ui';
import { API_BASE_URL } from '../config';
import { formatPrice } from '../utils/format';

const PAGE_BG = '#F2F4F6';

export const Route = createRoute('/orders' as never, {
  component: Page,
});

type OrderStatus = 'received' | 'producing' | 'shipped' | 'delivered';

type OrderSummary = {
  id: string;
  orderNumber: string;
  productName: string;
  color: string;
  lines: string;
  total: number;
  status: OrderStatus;
  statusLabel: string;
  expectedDate?: string;
};

const statusBadgeVariant: Record<OrderStatus, 'success' | 'warning' | 'error'> = {
  received: 'warning',
  producing: 'warning',
  shipped: 'success',
  delivered: 'success',
};

function Page() {
  const navigation = Route.useNavigation();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/orders`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders ?? []);
      }
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <Screen contentStyle={styles.screenContent}>
      <PageHeader title="주문 내역" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>불러오는 중...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>아직 주문이 없어요</Text>
        </View>
      ) : (
        orders.map((order) => (
          <Pressable
            key={order.id}
            onPress={() =>
              (navigation as any).navigate('/order-detail', {
                orderId: order.orderNumber,
              })
            }
          >
            <Card style={styles.orderCard}>
              <Text style={styles.orderNumber}>{order.orderNumber}</Text>
              <Text style={styles.orderDesc}>
                {order.productName} {order.color} {order.lines}
              </Text>
              <Text style={styles.orderTotal}>
                {formatPrice(order.total)}
              </Text>
              <View style={styles.statusRow}>
                <Badge
                  label={order.statusLabel}
                  variant={statusBadgeVariant[order.status]}
                />
                {order.expectedDate && (
                  <Text style={styles.expectedDate}>
                    {order.expectedDate}
                  </Text>
                )}
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    backgroundColor: PAGE_BG,
    paddingBottom: theme.spacing.xl,
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  orderCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  orderNumber: {
    ...theme.typography.label,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  orderDesc: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  orderTotal: {
    ...theme.typography.subheading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  expectedDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});
