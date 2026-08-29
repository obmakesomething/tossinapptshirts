/**
 * Harness shell.
 *
 * Renders one app screen per URL path so the UI can be reviewed — and audited
 * by a browser-based tool — without the Toss host or a Toss login.
 */
import React from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useHarnessLocation, navigateTo } from './mocks/granite';
import { CatalogProvider } from '../src/context/catalog';
import { ToastProvider } from '../src/context/toastContext';
import { ToastContainer } from '../src/components/toast';

import { Route as Home } from '../src/pages/index';
import { Route as Editor } from '../src/pages/editor';
import { Route as Order } from '../src/pages/order';
import { Route as OrderComplete } from '../src/pages/order-complete';
import { Route as OrderDetail } from '../src/pages/order-detail';
import { Route as Orders } from '../src/pages/orders';
import { Route as My } from '../src/pages/my';
import { Route as Products } from '../src/pages/products';
import { Route as Designs } from '../src/pages/designs';
import { Route as Faq } from '../src/pages/faq';
import { Route as Inquiry } from '../src/pages/inquiry';
import { Route as Terms } from '../src/pages/terms';
import { Route as Privacy } from '../src/pages/privacy';

export const HARNESS_ROUTES: { path: string; label: string; Component: React.ComponentType }[] = [
  { path: '/', label: '홈', Component: Home.component },
  { path: '/products', label: '상품', Component: Products.component },
  { path: '/my', label: '마이', Component: My.component },
  { path: '/editor', label: '에디터', Component: Editor.component },
  { path: '/order', label: '주문', Component: Order.component },
  { path: '/order-complete', label: '주문완료', Component: OrderComplete.component },
  { path: '/orders', label: '주문내역', Component: Orders.component },
  { path: '/order-detail', label: '주문상세', Component: OrderDetail.component },
  { path: '/designs', label: '저장', Component: Designs.component },
  { path: '/faq', label: 'FAQ', Component: Faq.component },
  { path: '/inquiry', label: '문의', Component: Inquiry.component },
  { path: '/terms', label: '약관', Component: Terms.component },
  { path: '/privacy', label: '개인정보', Component: Privacy.component },
];

export default function App() {
  const path = useHarnessLocation();
  const match = HARNESS_ROUTES.find((r) => r.path === path) ?? HARNESS_ROUTES[0];
  const Screen = match.Component;

  // ?bare=1 drops the review chrome and fills the viewport with the screen
  // alone, so an audit measures the app rather than the harness around it.
  //
  // It sticks for the session. An audit crawler navigates by clicking, and the
  // pushState that follows carries no query string — so the second screen and
  // every screen after it came back with the review rail counted as part of the
  // product. That put fourteen rail links into the editor's element list.
  const bare = (() => {
    if (new URLSearchParams(window.location.search).get('bare') === '1') {
      window.sessionStorage?.setItem('harness-bare', '1');
      return true;
    }
    return window.sessionStorage?.getItem('harness-bare') === '1';
  })();

  if (bare) {
    return (
      <View style={styles.bare}>
        <ToastProvider>
          <CatalogProvider>
            <Screen />
            <ToastContainer />
          </CatalogProvider>
        </ToastProvider>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      {/* Outside the device frame so it cannot affect what is being reviewed. */}
      <View style={styles.rail} nativeID="harness-rail">
        {HARNESS_ROUTES.map((r) => (
          <Pressable
            key={r.path}
            onPress={() => navigateTo(r.path)}
            style={[styles.railItem, r.path === match.path && styles.railItemActive]}
          >
            <Text
              style={[styles.railText, r.path === match.path && styles.railTextActive]}
            >
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.deviceWrap}>
        <View style={styles.device} nativeID="harness-device">
          <ToastProvider>
            <CatalogProvider>
              <Screen />
              <ToastContainer />
            </CatalogProvider>
          </ToastProvider>
        </View>
        <Text style={styles.caption}>{match.label} · {match.path} · 390×844</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexDirection: 'row', minHeight: '100%', backgroundColor: '#E5E8EB' },
  // Height-constrained like a phone screen, not free to grow with content —
  // otherwise a screen that measures its own root gets a runaway answer.
  bare: { height: '100%', overflow: 'hidden', backgroundColor: '#F2F4F6' },
  rail: {
    width: 132,
    paddingVertical: 16,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#D1D6DB',
  },
  railItem: { paddingVertical: 9, paddingHorizontal: 10, borderRadius: 8 },
  railItemActive: { backgroundColor: '#E8F3FF' },
  railText: { fontSize: 13, color: '#4E5968', fontWeight: '600' },
  railTextActive: { color: '#1B64DA', fontWeight: '700' },
  deviceWrap: { flex: 1, alignItems: 'center', paddingVertical: 24 },
  device: {
    width: 390,
    height: 844,
    backgroundColor: '#F2F4F6',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D6DB',
  },
  caption: { marginTop: 10, fontSize: 12, color: '#4E5968' },
});
