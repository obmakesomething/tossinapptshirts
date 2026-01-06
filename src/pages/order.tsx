import { createRoute } from '@granite-js/react-native';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View, Switch } from 'react-native';
import {
  Card,
  PrimaryButton,
  Screen,
  SecondaryButton,
  TopBar,
  theme,
} from '../components/ui';
import { API_BASE_URL } from '../config';
import { useCatalog } from '../context/catalog';
import { calcPricing, FREE_SHIPPING_THRESHOLD } from '../data/pricing';
import { formatPrice } from '../utils/format';

export const Route = createRoute('/order', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();
  const {
    selectedProduct,
    selectedColor,
    selectedSize,
    selectedPlacement,
    selectedPrint,
    quantity,
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
  const [removeBg, setRemoveBg] = useState(true);
  const [allowWarnToPass, setAllowWarnToPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const itemBase =
    (selectedProduct.price ?? 0) +
    (selectedSize?.extraPrice ?? 0) +
    selectedPrint.price;
  const pricing = calcPricing(itemBase, quantity);

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
      const payload = {
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
          {
            productName: selectedProduct.name,
            modelName: selectedProduct.modelName,
            color: selectedColor,
            size: selectedSize?.label || '',
            quantity,
            print: {
              method: 'DTF/DTG',
              placement: selectedPlacement,
              sizeLabel: selectedPrint.label,
              sizeCm: selectedPrint.description,
            },
            designUrl: designImageUri || '',
            text: textLayer.enabled ? textLayer : null,
          },
        ],
        pricing: {
          productSubtotal: formatPrice((selectedProduct.price ?? 0) * quantity),
          printSubtotal: formatPrice(selectedPrint.price * quantity),
          shipping: pricing.shippingFee === 0 ? '무료' : formatPrice(pricing.shippingFee),
          total: formatPrice(pricing.customerTotal),
          margin: formatPrice(pricing.marginAmount),
        },
        pipeline: {
          enabled: true,
          masterPngUrl: designImageUri,
          targetWidthPx: targetSize.width,
          targetHeightPx: targetSize.height,
          allowWarnToPass,
          removeBackground: removeBg,
        },
      };

      const response = await fetch(`${API_BASE_URL}/v1/orders/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('주문 요청에 실패했어요.');
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 요청에 실패했어요.');
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
          {selectedColor} · {selectedSize?.label} · {selectedPrint.label} · {quantity}개
        </Text>
        <Text style={styles.summaryMeta}>
          예상 결제(수수료 포함) {formatPrice(pricing.customerTotal)} (배송비{' '}
          {pricing.shippingFee === 0 ? '무료' : formatPrice(pricing.shippingFee)})
        </Text>
        <Text style={styles.summaryMeta}>
          {formatPrice(FREE_SHIPPING_THRESHOLD)} 이상 무료배송
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

      <Card style={styles.optionCard}>
        <View style={styles.optionRow}>
          <Text style={styles.optionTitle}>배경 제거</Text>
          <Switch
            value={removeBg}
            onValueChange={setRemoveBg}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Text style={styles.optionDesc}>
          주문 제출 시 고해상도 이미지 기준으로 Clipdrop 누끼가 진행돼요.
        </Text>
        <View style={styles.optionRow}>
          <Text style={styles.optionTitle}>WARN 자동 진행</Text>
          <Switch
            value={allowWarnToPass}
            onValueChange={setAllowWarnToPass}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Text style={styles.optionDesc}>
          품질 경고가 있어도 바로 진행할지 선택합니다.
        </Text>
      </Card>

      <Text style={styles.noticeText}>
        출력 이미지에 대한 최종 판단은 주문자가 진행합니다. 시안 확인 후 승인 부탁드립니다.
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {success ? <Text style={styles.successText}>주문 요청이 접수되었습니다.</Text> : null}

      <View style={styles.actionRow}>
        <PrimaryButton
          label={submitting ? '전송 중...' : '주문 요청 보내기'}
          onPress={handleSubmit}
          disabled={submitting}
          style={styles.actionButton}
        />
        <SecondaryButton label="이전으로" onPress={() => navigation.goBack()} />
      </View>
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
  optionCard: {
    marginBottom: theme.spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  optionDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  actionRow: {
    marginTop: theme.spacing.md,
  },
  actionButton: {
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
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
});
