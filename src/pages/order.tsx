import { createRoute } from '@granite-js/react-native';
import { TossPay, appLogin } from '@apps-in-toss/framework';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Card,
  Chip,
  ColorSwatch,
  PrimaryButton,
  Screen,
  SecondaryButton,
  theme,
} from '../components/ui';
import { resolveColorValue } from '../data/colorMap';
import { DaumPostcodeModal, type AddressData } from '../components/DaumPostcodeModal';
import { API_BASE_URL } from '../config';
import { useCatalog } from '../context/catalog';
import { faqItems } from '../data/faq';
import { calcPricing } from '../data/pricing';
import { formatPrice } from '../utils/format';
import {
  normalizeAitSessionEnvelope,
} from '../ait/sessionEnvelope';
import {
  trackClick,
  trackEvent,
  trackOrderCreated,
  trackPaymentFailed,
  trackPaymentSuccess,
  trackScreenView,
} from '../utils/analytics';

const ACCENT = '#1B64DA';
const PAGE_BG = '#F2F4F6';
const FILL_SOFT = '#F2F4F6';
const PANEL = '#FFFFFF';

export const Route = createRoute('/order', {
  component: Page,
});

interface PaymentCreateResponse {
  payToken?: string;
  error?: string;
}

interface PaymentErrorResponse {
  error?: string;
  reason_code?: string;
}

function Page() {
  const navigation = Route.useNavigation();
  const {
    selectedProduct,
    selectedColor,
    orderLines,
    totalQuantity,
    printBackEnabled,
    selectedPrint,
    designImageUri,
    imageTransform,
    textLayer,
    setSelectedColor,
    addOrderLine,
    removeOrderLine,
    setOrderLineQuantity,
    userKey,
    setAitSession,
  } = useCatalog();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [postcodeModalVisible, setPostcodeModalVisible] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const address2InputRef = useRef<TextInput>(null);
  const [editingOrder, setEditingOrder] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedCustom, setAgreedCustom] = useState(false);

  useEffect(() => {
    trackScreenView(userKey ? 'order_checkout' : 'order_login', {
      product_id: selectedProduct.id,
      product_category: selectedProduct.category,
      total_quantity: totalQuantity,
      has_design_image: !!designImageUri,
    });
  }, [
    userKey,
    selectedProduct.id,
    selectedProduct.category,
    totalQuantity,
    designImageUri,
  ]);

  // Toss Login to get userKey
  const handleTossLogin = useCallback(async () => {
    if (loginLoading) return;
    trackClick('order_login_click');
    setLoginLoading(true);
    setError('');

    try {
      // Step 1: Call Toss SDK appLogin to get authorizationCode
      console.log('[Order] Starting Toss login...');
      const { authorizationCode, referrer } = await appLogin();
      console.log('[Order] Got authorization code, referrer:', referrer);

      // Step 2: Send to server to exchange for userKey
      const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ authorizationCode, referrer }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(errorData.error || '로그인에 실패했어요.');
      }

      const data = await response.json() as Record<string, unknown>;
      const session = normalizeAitSessionEnvelope(data);
      console.log('[Order] Login successful, userKey:', session.identity?.userKey?.substring(0, 10) + '...');

      setAitSession(session);
    } catch (e) {
      console.error('[Order] Toss login failed:', e);
      setError(e instanceof Error ? e.message : '로그인에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setLoginLoading(false);
    }
  }, [loginLoading]);

  const handleAddressSelect = (data: AddressData) => {
    console.log('[Order] Address selected:', {
      roadAddress: data.roadAddress,
      jibunAddress: data.jibunAddress,
      zonecode: data.zonecode,
      sido: data.sido,
      sigungu: data.sigungu,
    });

    setAddress1(data.roadAddress || data.jibunAddress);
    setZip(data.zonecode);
    setCity(data.sido);
    setState(data.sigungu);

    console.log('[Order] State updated with address:', {
      address1: data.roadAddress || data.jibunAddress,
      zip: data.zonecode,
      city: data.sido,
      state: data.sigungu,
    });

    // Focus on detail address input after address is selected
    setTimeout(() => {
      console.log('[Order] Focusing on address2 input');
      address2InputRef.current?.focus();
    }, 100);
  };

  const pricing = calcPricing({
    product: selectedProduct,
    orderLines,
    printOption: selectedPrint,
    printBackEnabled,
  });
  const sizeSummary = orderLines
    .map((line) => `${line.sizeLabel} ${line.quantity}개`)
    .join(' · ');
  const orderFaqs = useMemo(
    () =>
      ['delivery-1', 'order-1', 'refund-1']
        .map((id) => faqItems.find((item) => item.id === id))
        .filter((item): item is (typeof faqItems)[number] => !!item),
    [],
  );

  const targetSize = useMemo(() => {
    const baseWidth = 3600;
    const baseHeight = 4800;
    const width = Math.round(baseWidth * selectedPrint.designScale);
    const height = Math.round(baseHeight * selectedPrint.designScale);
    return { width, height };
  }, [selectedPrint.designScale]);

  const toggleEditingOrder = () => {
    const nextEditing = !editingOrder;
    trackClick('order_option_edit_toggle_click', {
      next_editing: nextEditing,
      has_user_key: Boolean(userKey),
    });
    setEditingOrder(nextEditing);
  };

  const renderOrderSummaryCard = () => (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>{selectedProduct.name}</Text>
        {editingOrder ? (
          <View style={styles.editingBadge}>
            <Text style={styles.editingBadgeText}>수정 중</Text>
          </View>
        ) : null}
      </View>

      {editingOrder ? (
        <View style={styles.editSection}>
          <Text style={styles.editHint}>
            버튼으로 색상, 사이즈, 수량을 바로 수정할 수 있어요.
          </Text>
          <Text style={styles.editSectionTitle}>색상</Text>
          <View style={styles.colorOptions}>
            {selectedProduct.colors.map((color) => (
              <ColorSwatch
                key={color}
                label={color}
                color={resolveColorValue(color)}
                selected={selectedColor === color}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>

          <Text style={styles.editSectionTitle}>사이즈 & 수량</Text>
          {orderLines.map((line) => (
            <View key={line.id} style={styles.orderLineRow}>
              <Text style={styles.orderLineSize}>{line.sizeLabel}</Text>
              <View style={styles.quantityControl}>
                <Pressable
                  onPress={() => {
                    if (line.quantity > 1) {
                      setOrderLineQuantity(line.id, line.quantity - 1);
                    } else if (orderLines.length > 1) {
                      removeOrderLine(line.id);
                    }
                  }}
                  style={styles.quantityButton}
                >
                  <Text style={styles.quantityButtonText}>−</Text>
                </Pressable>
                <Text style={styles.quantityValue}>{line.quantity}</Text>
                <Pressable
                  onPress={() => setOrderLineQuantity(line.id, line.quantity + 1)}
                  style={styles.quantityButton}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </Pressable>
              </View>
            </View>
          ))}

          <Text style={styles.editSectionTitle}>사이즈 추가</Text>
          <View style={styles.chipRow}>
            {selectedProduct.sizes
              .filter((size) => !orderLines.some((line) => line.sizeLabel === size.label))
              .map((size) => (
                <Chip
                  key={size.label}
                  label={size.label}
                  onPress={() => addOrderLine(size.label, 1)}
                  style={styles.chipSpacing}
                />
              ))}
          </View>

          <PrimaryButton
            label="옵션 수정 완료"
            onPress={toggleEditingOrder}
            style={styles.optionDoneButton}
          />
        </View>
      ) : (
        <>
          <Text style={styles.summaryMeta}>
            {selectedColor} · {sizeSummary || `${totalQuantity}개`}
            {printBackEnabled ? ' · 뒷면도 프린팅' : ''}
          </Text>
          <SecondaryButton
            label="옵션 수정하기"
            onPress={toggleEditingOrder}
            style={styles.optionEditButton}
          />
        </>
      )}

      <Text style={styles.summaryMeta}>
        예상 결제 {formatPrice(pricing.total)} (배송비{' '}
        {pricing.shippingFee === 0
          ? '무료'
          : formatPrice(pricing.shippingFee)}
        )
      </Text>
    </Card>
  );

  const handleSubmit = async () => {
    trackClick('order_submit_click', {
      product_id: selectedProduct.id,
      total_quantity: totalQuantity,
      total_amount: pricing.total,
    });
    setError('');

    if (!name || !phone || !email || !address1) {
      trackEvent('order_validation_failed', {
        missing_name: !name,
        missing_phone: !phone,
        missing_email: !email,
        missing_address1: !address1,
      });
      setError('이름, 연락처, 이메일, 주소를 모두 입력해 주세요.');
      return;
    }
    if (!designImageUri && (!textLayer.enabled || !textLayer.text)) {
      trackEvent('order_validation_failed', {
        missing_design_input: true,
      });
      setError('디자인 이미지나 텍스트를 먼저 추가해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const orderId = `MG-${Date.now()}`;

      // Build order data
      const orderData = {
        orderId,
        channel: 'Toss Miniapp',
        storePdf: true,
        customer: { name, phone, email },
        shipping: {
          name,
          phone,
          address1,
          address2,
          city,
          state,
          zip,
          country: 'KR',
          memo,
        },
        items: [
          ...orderLines.map((line) => ({
            productName: selectedProduct.name,
            modelName: selectedProduct.modelName,
            color: selectedColor,
            size: line.sizeLabel,
            quantity: line.quantity,
            print: {
              method: 'DTF/DTG',
              placement: printBackEnabled ? 'front/back' : 'front',
              sizeLabel: selectedPrint.label,
              sizeCm: selectedPrint.description,
              scale: selectedPrint.designScale,
            },
            designUrl: designImageUri || '',
            text: textLayer.enabled ? textLayer : null,
          })),
        ],
        pricing: {
          subtotal: formatPrice(pricing.subtotal),
          shipping:
            pricing.shippingFee === 0
              ? '무료'
              : formatPrice(pricing.shippingFee),
          total: formatPrice(pricing.total),
          quantity: totalQuantity,
        },
        pipeline: {
          enabled: true,
          masterPngUrl: designImageUri,
          targetWidthPx: targetSize.width,
          targetHeightPx: targetSize.height,
          textLayer: textLayer.enabled ? textLayer : null,
          imageTransform,
        },
      };

      // Build product description for payment
      const productDesc = `${selectedProduct.name} ${selectedColor} ${totalQuantity}개`;

      // Step 1: Create payment on server
      const createResponse = await fetch(`${API_BASE_URL}/v1/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-toss-user-key': userKey,
        },
        body: JSON.stringify({
          orderNo: orderId,
          productDesc,
          amount: pricing.total,
          amountTaxFree: 0,
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({})) as PaymentErrorResponse;
        throw new Error(errorData.error || '결제 준비를 못했어요. 잠시 후 다시 시도해 주세요.');
      }

      const { payToken } = await createResponse.json() as PaymentCreateResponse;
      if (!payToken) {
        throw new Error('결제 준비를 못했어요. 잠시 후 다시 시도해 주세요.');
      }

      // Track order created
      trackOrderCreated(orderId, pricing.total, 'KRW');

      // Step 2: Open TossPay checkout for user authentication
      const { success, reason } = await TossPay.checkoutPayment({ params: { payToken } });

      if (!success) {
        trackPaymentFailed(orderId, pricing.total, reason || '결제 인증 취소', 'KRW');
        throw new Error(reason || '결제 인증을 취소했어요.');
      }

      // Step 3: Execute payment on server
      const executeResponse = await fetch(`${API_BASE_URL}/v1/payment/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-toss-user-key': userKey,
        },
        body: JSON.stringify({
          payToken,
          orderNo: orderId,
          orderData,
        }),
      });

      if (!executeResponse.ok) {
        const errorData = await executeResponse.json().catch(() => ({})) as PaymentErrorResponse;
        trackPaymentFailed(orderId, pricing.total, errorData.error || '결제 실행 실패', 'KRW');
        throw new Error(errorData.error || '결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.');
      }

      // Track payment success
      trackPaymentSuccess(orderId, pricing.total, 'TossPay', 'KRW');
      trackEvent('order_checkout_success', {
        order_id: orderId,
        amount: pricing.total,
      });

      setSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.';
      setError(errorMessage);
      // Track error if not already tracked
      trackEvent('order_checkout_failed', { reason: errorMessage });
      console.error('[Order] Payment error:', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // If not logged in, show simple login screen
  if (!userKey) {
    return (
      <Screen contentStyle={styles.screenContent}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>주문하기</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerBack}>
            <Text style={styles.headerBackText}>이전</Text>
          </Pressable>
        </View>

        {renderOrderSummaryCard()}

        <Card style={styles.loginCard}>
          <Text style={styles.loginTitle}>토스 로그인이 필요해요</Text>
          <Text style={styles.loginDesc}>
            안전한 결제를 위해 토스 계정으로 로그인해 주세요. 로그인하시면 바로 주문을 진행할 수 있어요.
          </Text>
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actionRow}>
          <PrimaryButton
            label={loginLoading ? '로그인 중...' : '🔐 토스 로그인하고 주문하기'}
            onPress={handleTossLogin}
            disabled={loginLoading}
            style={styles.primaryCta}
          />
          <SecondaryButton label="돌아가기" onPress={() => navigation.goBack()} />
        </View>
      </Screen>
    );
  }

  // If logged in, show full order form
  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>주문하기</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>이전</Text>
        </Pressable>
      </View>

      {renderOrderSummaryCard()}

      <Card style={styles.formCard}>
        <Text style={styles.sectionTitle}>주문하시는 분</Text>
        <TextInput
          style={styles.input}
          placeholder="이름을 입력해 주세요"
          placeholderTextColor={theme.colors.muted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="연락받으실 번호"
          placeholderTextColor={theme.colors.muted}
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          style={styles.input}
          placeholder="주문서 받으실 이메일"
          placeholderTextColor={theme.colors.muted}
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.sectionTitle}>어디로 보내드릴까요?</Text>
        <SecondaryButton
          label="주소 검색하기"
          onPress={() => {
            trackClick('order_address_search_click');
            console.log('[Order] Opening address search modal');
            setPostcodeModalVisible(true);
          }}
          style={styles.addressSearchButton}
        />
        <TextInput
          style={styles.input}
          placeholder="기본 주소"
          placeholderTextColor={theme.colors.muted}
          value={address1}
          onChangeText={setAddress1}
        />
        <TextInput
          ref={address2InputRef}
          style={styles.input}
          placeholder="상세 주소 (동/호수 등)"
          placeholderTextColor={theme.colors.muted}
          value={address2}
          onChangeText={setAddress2}
        />
        <View style={styles.inlineRow}>
          <TextInput
            style={[styles.input, styles.inlineInput]}
            placeholder="시/도"
            placeholderTextColor={theme.colors.muted}
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            style={[styles.input, styles.inlineInput]}
            placeholder="구/군"
            placeholderTextColor={theme.colors.muted}
            value={state}
            onChangeText={setState}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="우편번호"
          placeholderTextColor={theme.colors.muted}
          value={zip}
          onChangeText={setZip}
        />
        <TextInput
          style={[styles.input, styles.memoInput]}
          placeholder="배송 시 요청사항이 있으면 알려주세요"
          placeholderTextColor={theme.colors.muted}
          value={memo}
          onChangeText={setMemo}
          multiline
        />
      </Card>

      <Card style={styles.quickFaqCard}>
        <Text style={styles.quickFaqTitle}>주문 전에 확인해 주세요</Text>
        {orderFaqs.map((item) => (
          <View key={item.id} style={styles.quickFaqRow}>
            <Text style={styles.quickFaqQ}>Q.</Text>
            <View style={styles.quickFaqBody}>
              <Text style={styles.quickFaqQuestion}>{item.question}</Text>
              <Text style={styles.quickFaqAnswer}>{item.answer}</Text>
            </View>
          </View>
        ))}
      </Card>

      {/* 동의 체크박스 */}
      <View style={styles.agreementSection}>
        <Pressable style={styles.checkboxRow} onPress={() => setAgreedPrivacy(!agreedPrivacy)}>
          <Text style={styles.checkbox}>{agreedPrivacy ? '☑' : '☐'}</Text>
          <Text style={styles.checkboxLabel}>개인정보 수집·이용 동의 (필수)</Text>
        </Pressable>
        <Pressable style={styles.checkboxRow} onPress={() => setAgreedTerms(!agreedTerms)}>
          <Text style={styles.checkbox}>{agreedTerms ? '☑' : '☐'}</Text>
          <Text style={styles.checkboxLabel}>이용약관 동의 (필수)</Text>
        </Pressable>
        <Pressable style={styles.checkboxRow} onPress={() => setAgreedCustom(!agreedCustom)}>
          <Text style={styles.checkbox}>{agreedCustom ? '☑' : '☐'}</Text>
          <Text style={styles.checkboxLabel}>커스텀 제작 특성 확인 (필수)</Text>
        </Pressable>
        <Text style={styles.customNotice}>
          주문 제작 상품이라 단순 변심 교환·환불이 어렵습니다.
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {success ? (
        <Text style={styles.successText}>결제가 완료됐어요! 주문서 이메일을 확인해 주세요.</Text>
      ) : null}

      <View style={styles.actionRow}>
        <PrimaryButton
          label={
            success
              ? '결제가 완료됐어요'
              : submitting
                ? '결제하고 있어요...'
                : '토스페이로 결제하기'
          }
          onPress={handleSubmit}
          disabled={submitting || success || !agreedPrivacy || !agreedTerms || !agreedCustom || !name || !phone || !email || !address1}
          style={styles.primaryCta}
        />
        {!success && !submitting && (!name || !phone || !email || !address1 || !agreedPrivacy || !agreedTerms || !agreedCustom) && (
          <Text style={styles.disabledReason}>
            {!name ? '※ 이름을 입력해주세요' :
             !phone ? '※ 연락처를 입력해주세요' :
             !email ? '※ 이메일을 입력해주세요' :
             !address1 ? '※ 주소를 입력해주세요' :
             '※ 필수 동의 항목을 확인해주세요'}
          </Text>
        )}
        <SecondaryButton label="돌아가기" onPress={() => navigation.goBack()} />
      </View>

      <DaumPostcodeModal
        visible={postcodeModalVisible}
        onClose={() => {
          console.log('[Order] Closing address search modal');
          setPostcodeModalVisible(false);
        }}
        onSelect={handleAddressSelect}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    backgroundColor: PAGE_BG,
    paddingBottom: theme.spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#191F28',
  },
  headerBack: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    backgroundColor: '#F2F4F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerBackText: {
    fontSize: 12,
    color: '#4E5968',
    fontWeight: '700',
  },
  summaryCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: PANEL,
    shadowColor: '#191F28',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#191F28',
  },
  editingBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(49, 130, 246, 0.26)',
    backgroundColor: 'rgba(49, 130, 246, 0.12)',
  },
  editingBadgeText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    color: ACCENT,
  },
  optionEditButton: {
    marginTop: theme.spacing.sm,
    minHeight: 40,
    borderRadius: 10,
    paddingVertical: 8,
  },
  optionDoneButton: {
    marginTop: theme.spacing.md,
    minHeight: 42,
    borderRadius: 10,
  },
  editHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4E5968',
    marginBottom: theme.spacing.xs,
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
  },
  summaryMeta: {
    fontSize: 12,
    color: '#4E5968',
  },
  editSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E8EB',
  },
  editSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#191F28',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
  },
  orderLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E8EB',
  },
  orderLineSize: {
    fontSize: 14,
    fontWeight: '600',
    color: '#191F28',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(49, 130, 246, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(49, 130, 246, 0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: ACCENT,
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#191F28',
    minWidth: 32,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chipSpacing: {
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  formCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: PANEL,
  },
  quickFaqCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: PANEL,
  },
  quickFaqTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191F28',
    marginBottom: theme.spacing.sm,
  },
  quickFaqRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  quickFaqQ: {
    width: 18,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: ACCENT,
    marginTop: 1,
  },
  quickFaqBody: {
    flex: 1,
  },
  quickFaqQuestion: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4E5968',
    fontWeight: '600',
  },
  quickFaqAnswer: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4E5968',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#191F28',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E8EB',
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 13,
    color: '#191F28',
    backgroundColor: FILL_SOFT,
    marginBottom: theme.spacing.sm,
  },
  memoInput: {
    minHeight: 80,
  },
  inlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inlineInput: {
    width: '48%',
  },
  actionRow: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  primaryCta: {
    backgroundColor: ACCENT,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#F7C6CB',
    marginBottom: theme.spacing.sm,
  },
  successText: {
    fontSize: 12,
    color: '#B5E6D0',
    marginBottom: theme.spacing.sm,
  },
  noticeText: {
    fontSize: 12,
    color: '#4E5968',
    marginBottom: theme.spacing.sm,
  },
  agreementSection: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checkbox: {
    fontSize: 18,
    marginRight: 8,
    color: '#191F28',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#191F28',
  },
  customNotice: {
    fontSize: 12,
    color: '#8B95A1',
    marginLeft: 26,
    marginTop: 2,
  },
  disabledReason: {
    fontSize: 12,
    color: '#E02D3C',
    textAlign: 'center',
    marginTop: 4,
  },
  addressSearchButton: {
    marginBottom: theme.spacing.sm,
  },
  loginCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: PANEL,
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#191F28',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  loginDesc: {
    fontSize: 14,
    color: '#4E5968',
    lineHeight: 20,
    textAlign: 'center',
  },
});
