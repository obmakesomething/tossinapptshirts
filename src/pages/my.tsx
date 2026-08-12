import { createRoute } from '@granite-js/react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import {
  BOTTOM_TAB_HEIGHT,
  BottomTabBar,
  type BottomTabKey,
  Badge,
  Card,
  ListRow,
  Screen,
  theme,
} from '../components/ui';
import { useCatalog } from '../context/catalog';
import { API_BASE_URL } from '../config';
import { trackClick, trackScreenView } from '../utils/analytics';

const PAGE_BG = '#F2F4F6';

export const Route = createRoute('/my' as never, {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const { userKey, savedDesigns } = useCatalog();
  const [orderCount, setOrderCount] = useState<number | null>(null);

  useEffect(() => {
    trackScreenView('my', {
      is_logged_in: Boolean(userKey),
      saved_design_count: savedDesigns.length,
    });
  }, [userKey, savedDesigns.length]);

  // Show the order count on the row itself so the customer can tell at a glance
  // whether there is anything to open.
  const fetchOrderCount = useCallback(async () => {
    if (!userKey) {
      setOrderCount(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/v1/orders`, {
        headers: { 'x-toss-user-key': userKey },
      });
      if (!res.ok) return;
      const data = await res.json();
      setOrderCount(Array.isArray(data.orders) ? data.orders.length : 0);
    } catch {
      // Leave the count blank rather than showing a wrong number.
    }
  }, [userKey]);

  useEffect(() => {
    fetchOrderCount();
  }, [fetchOrderCount]);

  const go = (target: string, item: string) => {
    trackClick('my_menu_click', { menu_item: item, target });
    navigation.navigate(target as never);
  };

  const onSelectTab = (key: BottomTabKey) => {
    if (key === 'my') return;
    const target = key === 'home' ? '/' : '/products';
    trackClick('bottom_tab_click', { tab: key, from: 'my' });
    navigation.navigate(target as never);
  };

  return (
    <>
      <Screen contentStyle={styles.screenContent}>
        <Text style={styles.title} accessibilityRole="header">
          마이
        </Text>

        <Card style={styles.statusCard}>
          {userKey ? (
            <>
              <Badge variant="success" label="토스 로그인됨" />
              <Text style={styles.statusDesc}>
                주문 내역을 이 계정으로 안전하게 불러와요.
              </Text>
            </>
          ) : (
            <>
              <Badge variant="neutral" label="로그인 전" />
              <Text style={styles.statusDesc}>
                주문할 때 토스로 로그인하면 주문 내역을 볼 수 있어요.
              </Text>
            </>
          )}
        </Card>

        <Text style={styles.sectionLabel}>주문</Text>
        <Card style={styles.menuCard}>
          <ListRow
            label="주문 내역"
            value={orderCount === null ? undefined : `${orderCount}건`}
            onPress={() => go('/orders', 'orders')}
            last
          />
        </Card>

        <Text style={styles.sectionLabel}>내 디자인</Text>
        <Card style={styles.menuCard}>
          <ListRow
            label="저장한 디자인"
            value={`${savedDesigns.length}개`}
            onPress={() => go('/designs', 'designs')}
            last
          />
        </Card>

        <Text style={styles.sectionLabel}>고객지원</Text>
        <Card style={styles.menuCard}>
          <ListRow label="문의하기" onPress={() => go('/inquiry', 'inquiry')} />
          <ListRow label="자주 묻는 질문" onPress={() => go('/faq', 'faq')} last />
        </Card>

        <Text style={styles.sectionLabel}>약관</Text>
        <Card style={styles.menuCard}>
          <ListRow label="이용약관" onPress={() => go('/terms', 'terms')} />
          <ListRow
            label="개인정보처리방침"
            onPress={() => go('/privacy', 'privacy')}
            last
          />
        </Card>
      </Screen>

      <BottomTabBar active="my" onSelect={onSelectTab} />
    </>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    backgroundColor: PAGE_BG,
    paddingBottom: BOTTOM_TAB_HEIGHT + theme.spacing.xxl,
  },
  title: {
    ...theme.typography.display,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xl,
  },
  statusCard: {
    marginBottom: theme.spacing.xxl,
  },
  statusDesc: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  sectionLabel: {
    ...theme.typography.label,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  menuCard: {
    marginBottom: theme.spacing.xl,
    paddingVertical: theme.spacing.xs,
  },
});
