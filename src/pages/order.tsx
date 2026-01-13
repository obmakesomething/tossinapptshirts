import { createRoute } from '@granite-js/react-native';
import { TossPay } from '@apps-in-toss/framework';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Card,
  PrimaryButton,
  Screen,
  SecondaryButton,
  TopBar,
  theme,
} from '../components/ui';
import { DaumPostcodeModal, type AddressData } from '../components/DaumPostcodeModal';
import { API_BASE_URL } from '../config';
import { useCatalog } from '../context/catalog';
import { calcPricing } from '../data/pricing';
import { formatPrice } from '../utils/format';

export const Route = createRoute('/order', {
  component: Page,
});

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
    textLayer,
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
  const [userKey, setUserKey] = useState<string>('');

  // Get user key from Toss mini-app environment
  useEffect(() => {
    // In Toss mini-app, user key should be automatically available via SDK
    // For development/testing, we'll use a fallback key
    // TODO: In production, verify this is properly injected by Toss mini-app environment
    const getTossUserKey = () => {
      try {
        // @ts-ignore - Toss may inject this in their environment
        if (typeof global !== 'undefined' && global.tossUserKey) {
          // @ts-ignore
          return global.tossUserKey;
        }
      } catch (e) {
        // Ignore error
      }

      // Fallback for development/testing
      // In production, the Toss app environment should provide this automatically
      return `toss-user-${Date.now()}`;
    };

    setUserKey(getTossUserKey());
  }, []);

  const handleAddressSelect = (data: AddressData) => {
    setAddress1(data.roadAddress || data.jibunAddress);
    setZip(data.zonecode);
    setCity(data.sido);
    setState(data.sigungu);
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

  const targetSize = useMemo(() => {
    const baseWidth = 3600;
    const baseHeight = 4800;
    const width = Math.round(baseWidth * selectedPrint.designScale);
    const height = Math.round(baseHeight * selectedPrint.designScale);
    return { width, height };
  }, [selectedPrint.designScale]);

  const handleSubmit = async () => {
    setError('');
    if (!name || !phone || !email || !address1) {
      setError('필수 정보를 모두 입력해 주세요.');
      return;
    }
    if (!designImageUri && !textLayer.enabled) {
      setError('디자인 이미지 또는 텍스트가 필요해요.');
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
        const errorData = await createResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '결제 생성에 실패했어요.');
      }

      const { payToken } = await createResponse.json();

      // Step 2: Open TossPay checkout for user authentication
      const { success, reason } = await TossPay.checkoutPayment({ payToken });

      if (!success) {
        throw new Error(reason || '결제 인증이 취소되었어요.');
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
        const errorData = await executeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '결제 실행에 실패했어요.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '결제에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <TopBar title="주문 요청" onBack={() => navigation.goBack()} />

      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{selectedProduct.name}</Text>
        <Text style={styles.summaryMeta}>
          {selectedColor} · {sizeSummary || `${totalQuantity}개`}
          {printBackEnabled ? ' · 뒷면 포함' : ''}
        </Text>
        <Text style={styles.summaryMeta}>
          예상 결제 {formatPrice(pricing.total)} (배송비{' '}
          {pricing.shippingFee === 0
            ? '무료'
            : formatPrice(pricing.shippingFee)}
          )
        </Text>
      </Card>

      <Card style={styles.formCard}>
        <Text style={styles.sectionTitle}>주문자 정보</Text>
        <TextInput
          style={styles.input}
          placeholder="이름"
          placeholderTextColor={theme.colors.muted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="휴대폰 번호"
          placeholderTextColor={theme.colors.muted}
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor={theme.colors.muted}
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.sectionTitle}>배송지</Text>
        <SecondaryButton
          label="주소 검색"
          onPress={() => setPostcodeModalVisible(true)}
          style={styles.addressSearchButton}
        />
        <TextInput
          style={styles.input}
          placeholder="주소"
          placeholderTextColor={theme.colors.muted}
          value={address1}
          onChangeText={setAddress1}
        />
        <TextInput
          style={styles.input}
          placeholder="상세 주소"
          placeholderTextColor={theme.colors.muted}
          value={address2}
          onChangeText={setAddress2}
        />
        <View style={styles.inlineRow}>
          <TextInput
            style={[styles.input, styles.inlineInput]}
            placeholder="도시"
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
          placeholder="요청사항"
          placeholderTextColor={theme.colors.muted}
          value={memo}
          onChangeText={setMemo}
          multiline
        />
      </Card>

      <Text style={styles.noticeText}>
        출력 이미지에 대한 최종 판단은 주문자가 진행합니다. 주문서 메일을 꼭
        확인해 주세요.
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {success ? (
        <Text style={styles.successText}>결제가 완료되었습니다. 주문서 이메일을 확인해 주세요.</Text>
      ) : null}

      <View style={styles.actionRow}>
        <PrimaryButton
          label={submitting ? '결제 중...' : '토스페이로 결제하기'}
          onPress={handleSubmit}
          disabled={submitting}
          style={styles.actionButton}
        />
        <SecondaryButton label="이전으로" onPress={() => navigation.goBack()} />
      </View>

      <DaumPostcodeModal
        visible={postcodeModalVisible}
        onClose={() => setPostcodeModalVisible(false)}
        onSelect={handleAddressSelect}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    marginBottom: theme.spacing.lg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  summaryMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  formCard: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
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
  },
  actionButton: {
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  successText: {
    fontSize: 12,
    color: theme.colors.success,
    marginBottom: theme.spacing.sm,
  },
  noticeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  addressSearchButton: {
    marginBottom: theme.spacing.sm,
  },
});
