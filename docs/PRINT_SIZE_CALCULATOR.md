# 프린팅 크기 계산기 가이드

merchandisegpt의 프린팅 크기 계산 시스템에 대한 완전한 가이드입니다.

## 📐 개요

사용자가 슬라이더로 **자유롭게 프린팅 크기를 조절**하면, 주문 시점에 실제 크기(cm 단위)를 자동으로 계산합니다.

## 🎯 사용자 플로우

1. **제품 선택**: 티셔츠, 후드, 맨투맨, 에코백 등
2. **사이즈 선택**: S, M, L, XL 등
3. **디자인 업로드/생성**: 이미지 + 텍스트 합성
4. **크기 조절**: 슬라이더로 자유롭게 조절 (0.0 ~ 1.0 scale)
5. **주문 제출**: 이 시점에 실제 cm 크기 자동 계산
6. **거래처 이메일 발송**: 계산된 크기 포함

**중요**: 사용자는 고정된 옵션(로고, A5, A4, A3)을 선택하는 것이 아니라, **슬라이더로 마음대로 크기를 조절**합니다.

## 📊 티셔츠 사이즈 치수표

### 티셔츠 (T-Shirt)

| 사이즈 | 가슴 너비 | 총 기장 | 프린팅 가능 너비 | 프린팅 가능 높이 |
|--------|-----------|---------|------------------|------------------|
| XS     | 44cm      | 63cm    | 28cm             | 35cm             |
| S      | 47cm      | 66cm    | 30cm             | 37cm             |
| M      | 50cm      | 69cm    | 32cm             | 40cm             |
| L      | 53cm      | 72cm    | 34cm             | 42cm             |
| XL     | 56cm      | 75cm    | 36cm             | 44cm             |
| 2XL    | 59cm      | 78cm    | 38cm             | 46cm             |
| 3XL    | 62cm      | 81cm    | 40cm             | 48cm             |
| 4XL    | 65cm      | 84cm    | 42cm             | 50cm             |

### 후드 / 맨투맨

| 사이즈 | 가슴 너비 | 총 기장 | 프린팅 가능 너비 | 프린팅 가능 높이 |
|--------|-----------|---------|------------------|------------------|
| S      | 52cm      | 68cm    | 32cm             | 38cm             |
| M      | 55cm      | 71cm    | 34cm             | 41cm             |
| L      | 58cm      | 74cm    | 36cm             | 43cm             |
| XL     | 61cm      | 77cm    | 38cm             | 45cm             |
| 2XL    | 64cm      | 80cm    | 40cm             | 47cm             |
| 3XL    | 67cm      | 83cm    | 42cm             | 49cm             |
| 4XL    | 70cm      | 86cm    | 44cm             | 51cm             |

### 에코백

| 사이즈    | 너비  | 높이  | 프린팅 가능 너비 | 프린팅 가능 높이 |
|-----------|-------|-------|------------------|------------------|
| ONE SIZE  | 35cm  | 40cm  | 28cm             | 32cm             |

## 🔧 API 사용법

### 1. 자유로운 Scale 값으로 크기 계산 (권장)

**엔드포인트**: `POST /v1/print/calculate-size`

**요청 Body**:
```json
{
  "productName": "[프린트스타] 148 헤비 14수 라운드 반팔 (남녀공용)",
  "garmentSize": "M",
  "scale": 0.7,
  "placement": "front"
}
```

**파라미터**:
- `productName`: 제품명 (자동으로 카테고리 인식)
- `garmentSize`: 티셔츠 사이즈 (S, M, L 등)
- `scale`: **0.0 ~ 1.0 사이의 자유로운 값** (슬라이더 값)
- `placement`: "front" 또는 "back" (선택사항)

**응답**:
```json
{
  "widthCm": 22.4,
  "heightCm": 28.0,
  "description": "사용자 지정 (70%) 크기로 M 사이즈에 프린팅 시 약 22.4cm × 28cm 크기로 인쇄됩니다.",
  "warnings": [],
  "printableArea": {
    "maxWidthCm": 32,
    "maxHeightCm": 40
  },
  "garmentCategory": "tshirt",
  "garmentSize": "M",
  "scale": 0.7,
  "printOption": {
    "id": "custom",
    "label": "사용자 지정 (70%)",
    "price": 7500
  },
  "requestId": "abc-123"
}
```

### 2. 고정 옵션으로 크기 계산 (하위 호환)

**요청 Body**:
```json
{
  "productName": "프린트스타 148 헤비",
  "garmentSize": "M",
  "printOptionId": "a4",
  "placement": "front"
}
```

**printOptionId 옵션**:
- `logo`: 로고 (35% scale) - ₩2,500
- `a5`: A5 (50% scale) - ₩5,500
- `a4`: A4 (70% scale) - ₩7,500
- `a3`: A3 (90% scale) - ₩9,500

### 3. 사이즈 정보 조회

**엔드포인트**: `GET /v1/print/sizes?productName=[제품명]`

**응답**: 사용 가능한 모든 사이즈와 치수 정보

## 📦 주문 제출 시 자동 크기 계산

주문을 제출할 때, 각 아이템에 `print.scale` 값을 포함시키면 **서버에서 자동으로 실제 cm 크기를 계산**합니다.

**주문 요청 예시**:
```json
{
  "orderId": "ORDER-12345",
  "customer": { "name": "홍길동", "phone": "010-1234-5678" },
  "items": [
    {
      "productName": "프린트스타 148 헤비 14수 라운드 반팔",
      "size": "M",
      "color": "화이트",
      "quantity": 2,
      "designUrl": "https://...",
      "print": {
        "scale": 0.7,
        "placement": "front"
      }
    }
  ]
}
```

**서버 동작**:
1. `item.print.scale` 값 확인 (0.7)
2. 제품 카테고리 자동 인식 (티셔츠)
3. M 사이즈 치수 조회 (32cm × 40cm 프린팅 가능)
4. 실제 크기 계산: 32 × 0.7 = 22.4cm, 40 × 0.7 = 28cm
5. `item.print.sizeCm = "22.4cm × 28cm"` 자동 추가
6. PDF와 이메일에 실제 크기 포함

## 💻 클라이언트 구현

### React Native 슬라이더 사용

```typescript
import { ScaleSlider } from '@/components/ScaleSlider';
import { useState } from 'react';

function DesignEditor() {
  const [scale, setScale] = useState(0.7); // 기본값 70%

  return (
    <View>
      <Text>프린팅 크기 조절</Text>
      <ScaleSlider
        min={0.2}  // 최소 20%
        max={1.0}  // 최대 100%
        value={scale}
        onChange={setScale}
      />
      <Text>현재 크기: {Math.round(scale * 100)}%</Text>
    </View>
  );
}
```

### 주문 제출 시

```typescript
const submitOrder = async () => {
  const orderData = {
    orderId: generateOrderId(),
    customer: customerInfo,
    items: [
      {
        productName: selectedProduct.name,
        size: selectedSize,
        color: selectedColor,
        quantity: 1,
        designUrl: uploadedDesignUrl,
        print: {
          scale: scale,  // 슬라이더에서 조절한 값 (0.0 ~ 1.0)
          placement: 'front',
        },
      },
    ],
  };

  const response = await fetch('https://api.example.com/v1/orders/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });

  // 서버가 자동으로 실제 크기를 계산해서 이메일로 발송
};
```

**중요**: 클라이언트는 실제 cm 크기를 미리 계산할 필요가 없습니다. 단지 `scale` 값만 전달하면 서버에서 자동으로 계산합니다.

## 🧮 계산 로직

### 프린팅 크기 계산 공식

```
실제 프린팅 너비 = 프린팅 가능 너비 × scale
실제 프린팅 높이 = 프린팅 가능 높이 × scale
```

**예시**: M 사이즈 티셔츠 + 70% scale
```
프린팅 가능 영역: 32cm × 40cm
Scale: 0.7 (70%)

실제 프린팅 너비 = 32cm × 0.7 = 22.4cm
실제 프린팅 높이 = 40cm × 0.7 = 28.0cm
```

### 가격 계산 (자동)

Scale 값에 따라 자동으로 가격이 결정됩니다:

| Scale 범위 | 가격 | 설명 |
|------------|------|------|
| 0.0 ~ 0.4  | ₩2,500 | 작은 로고 크기 |
| 0.4 ~ 0.6  | ₩5,500 | 중간 크기 |
| 0.6 ~ 0.8  | ₩7,500 | 일반 크기 |
| 0.8 ~ 1.0  | ₩9,500 | 최대 크기 |

## 📧 이메일 포함 내용

거래처에게 발송되는 이메일에는 **실제 프린팅 크기**가 포함됩니다:

```
🛍️ 주문 상품
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 반팔 티셔츠 - 베이직 / 화이트 / M / 2개
   프린팅 크기: 22.4cm × 28cm (앞면)
```

PDF 주문서에도 동일하게 표시됩니다:
```
- Product: 프린트스타 148 헤비 14수 라운드 반팔
- Size: M
- Print Dimension: 22.4cm × 28cm
- Print Placement: front
```

## 💡 UI/UX 권장사항

### 1. 슬라이더 인터페이스

```
프린팅 크기 조절
┌────────────────────────────────┐
│ ●───────────────────────────── │
└────────────────────────────────┘
작게                          크게

현재 크기: 70%
```

**중요**: 실제 cm 크기는 보여주지 않습니다. 주문 후에만 계산됩니다.

### 2. 미리보기 화면

```
┌────────────────────────────┐
│                            │
│     [티셔츠 목업 이미지]    │
│                            │
│   ┌──────────┐             │
│   │  디자인  │ ← 70% 크기  │
│   │  이미지  │             │
│   └──────────┘             │
│                            │
└────────────────────────────┘
```

### 3. 주문 확인 화면

```
주문 정보
• 티셔츠 사이즈: M
• 프린팅 크기: 70% (조절한 크기)
• 색상: 화이트
• 수량: 2개

※ 실제 프린팅 크기는 주문 접수 후
  거래처 이메일로 안내됩니다.
```

## 🎯 Best Practices

### 1. 슬라이더 범위 설정

```typescript
// 권장 범위
min: 0.2  // 20% (너무 작으면 세부사항 손실)
max: 1.0  // 100% (최대 프린팅 영역)
default: 0.7  // 70% (일반적으로 적당한 크기)
```

### 2. 실시간 cm 표시 안함

사용자에게는 **%만 표시**하고, 실제 cm는 주문 후에만 알려줍니다:

```typescript
// ❌ Bad: 실시간으로 cm 계산해서 표시
<Text>현재 크기: 22.4cm × 28cm</Text>

// ✅ Good: %만 표시
<Text>현재 크기: 70%</Text>
```

### 3. 서버에 scale 값만 전달

```typescript
// ✅ Correct
const orderItem = {
  productName: '...',
  size: 'M',
  print: {
    scale: 0.7,  // 슬라이더 값만 전달
    placement: 'front',
  },
};

// ❌ Incorrect: 클라이언트에서 계산하지 않음
const orderItem = {
  print: {
    sizeCm: '22.4cm × 28cm',  // 서버에서 자동 계산함
  },
};
```

## 🔍 제품 카테고리 자동 인식

제품명에서 자동으로 카테고리를 인식합니다:

```javascript
function getGarmentCategory(productName) {
  const name = productName.toLowerCase();
  if (name.includes('후드') || name.includes('hoodie')) return 'hoodie';
  if (name.includes('맨투맨') || name.includes('sweatshirt')) return 'sweatshirt';
  if (name.includes('에코백') || name.includes('ecobag') || name.includes('bag')) return 'ecobag';
  return 'tshirt'; // 기본값
}
```

## 📈 실제 사용 예시

### 시나리오 1: 작은 로고 (30%)

```
사용자: 슬라이더를 30%로 조절
앱: "현재 크기: 30%" 표시
주문 제출
서버: M 사이즈 기준 9.6cm × 12cm 계산
거래처 이메일: "프린팅 크기: 9.6cm × 12cm"
```

### 시나리오 2: 일반 크기 (70%)

```
사용자: 슬라이더를 70%로 조절
앱: "현재 크기: 70%" 표시
주문 제출
서버: M 사이즈 기준 22.4cm × 28cm 계산
거래처 이메일: "프린팅 크기: 22.4cm × 28cm"
```

### 시나리오 3: 최대 크기 (95%)

```
사용자: 슬라이더를 95%로 조절
앱: "현재 크기: 95%" 표시
주문 제출
서버: M 사이즈 기준 30.4cm × 38cm 계산
거래처 이메일: "프린팅 크기: 30.4cm × 38cm (최대 크기에 가까움)"
```

## 📚 관련 파일

- **서버 API**: `/server/index.js` (라인 1073-1167, 733-760)
- **클라이언트 슬라이더**: `/src/components/ScaleSlider.tsx`
- **클라이언트 데이터**: `/src/data/garmentSizes.ts`
- **클라이언트 유틸**: `/src/utils/printSizeCalculator.ts`

## 🐛 트러블슈팅

### Q: 실제 cm 크기가 계산되지 않습니다
**A**: 주문 데이터에 `item.print.scale` 값이 포함되어 있는지 확인하세요.

```json
{
  "items": [{
    "print": {
      "scale": 0.7  // ← 이 값이 필요합니다
    }
  }]
}
```

### Q: 가격이 이상하게 계산됩니다
**A**: Scale 값에 따라 자동으로 가격이 결정됩니다. 0.0~0.4는 ₩2,500, 0.4~0.6은 ₩5,500 등입니다.

### Q: 슬라이더가 0.0~1.0 범위를 벗어납니다
**A**: 서버에서 자동으로 0.0~1.0 범위로 제한(clamp)합니다. 하지만 클라이언트에서도 제한하는 것이 좋습니다.

---

**문서 버전**: 2.0 (자유 스케일 지원)
**최종 업데이트**: 2026-01-12
