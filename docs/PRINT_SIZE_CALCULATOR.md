# 프린팅 크기 계산기 가이드

merchandisegpt의 프린팅 크기 계산 시스템에 대한 완전한 가이드입니다.

## 📐 개요

사용자가 티셔츠 사이즈와 프린팅 옵션을 선택하면, 실제 프린팅될 크기(cm 단위)를 자동으로 계산하여 알려줍니다.

## 🎯 주요 기능

1. **티셔츠 사이즈별 치수 데이터베이스**
   - 티셔츠, 후드, 맨투맨, 에코백 카테고리
   - 각 사이즈별 실제 치수 (가슴 너비, 기장, 프린팅 가능 영역)

2. **프린팅 크기 자동 계산**
   - 4가지 프린팅 옵션 (로고, A5, A4, A3)
   - 사이즈별 비율 적용
   - 실제 cm 단위 출력

3. **경고 및 추천 시스템**
   - 너무 큰/작은 프린팅 경고
   - 최적 프린팅 크기 추천

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

## 🎨 프린팅 옵션

| ID    | 이름             | 설명           | 가격   | 디자인 스케일 |
|-------|------------------|----------------|--------|---------------|
| logo  | 로고 (10cm 미만) | 작은 로고·심플 | ₩2,500 | 0.35 (35%)    |
| a5    | A5 (10~15cm)     | 중간 크기      | ₩5,500 | 0.5 (50%)     |
| a4    | A4 (15~28cm)     | 일반 포스터    | ₩7,500 | 0.7 (70%)     |
| a3    | A3 (최대)        | 큰 전면 인쇄   | ₩9,500 | 0.9 (90%)     |

**디자인 스케일**: 프린팅 가능 영역 대비 실제 프린팅 크기 비율

## 🔧 API 사용법

### 1. 프린팅 크기 계산

**엔드포인트**: `POST /v1/print/calculate-size`

**요청 Body**:
```json
{
  "productName": "[프린트스타] 148 헤비 14수 라운드 반팔 (남녀공용)",
  "garmentSize": "M",
  "printOptionId": "a4",
  "placement": "front"
}
```

**응답**:
```json
{
  "widthCm": 22.4,
  "heightCm": 28.0,
  "description": "A4 (15~28cm) 크기로 M 사이즈에 프린팅 시 약 22.4cm × 28cm 크기로 인쇄됩니다.",
  "warnings": [],
  "printableArea": {
    "maxWidthCm": 32,
    "maxHeightCm": 40
  },
  "garmentCategory": "tshirt",
  "garmentSize": "M",
  "printOption": {
    "id": "a4",
    "label": "A4 (15~28cm)",
    "price": 7500
  },
  "garmentMeasurements": {
    "chestWidth": 50,
    "bodyLength": 69
  },
  "requestId": "abc-123"
}
```

**경고 예시**:
```json
{
  "warnings": [
    "프린팅 영역이 최대 크기에 가깝습니다.",
    "뒷면 인쇄는 앞면보다 위치 조정이 제한적일 수 있습니다."
  ]
}
```

### 2. 사이즈 정보 조회

**엔드포인트**: `GET /v1/print/sizes?productName=[제품명]`

**요청**:
```
GET /v1/print/sizes?productName=프린트스타 148 헤비
```

**응답**:
```json
{
  "category": "tshirt",
  "sizes": [
    {
      "size": "XS",
      "chestWidth": 44,
      "bodyLength": 63,
      "printableWidth": 28,
      "printableHeight": 35
    },
    {
      "size": "S",
      "chestWidth": 47,
      "bodyLength": 66,
      "printableWidth": 30,
      "printableHeight": 37
    }
    // ... 더 많은 사이즈
  ],
  "printOptions": [
    {
      "id": "logo",
      "label": "로고 (10cm 미만)",
      "description": "작은 로고·심플",
      "price": 2500
    }
    // ... 더 많은 옵션
  ]
}
```

## 💻 클라이언트 사용법

### TypeScript/React Native에서 사용

클라이언트 코드에는 이미 유틸리티 함수가 준비되어 있습니다:

```typescript
import { getGarmentMeasurements, getGarmentCategory } from '@/data/garmentSizes';
import { calculatePrintSize } from '@/utils/printSizeCalculator';
import { printOptions } from '@/data/printOptions';

// 1. 제품 카테고리 확인
const category = getGarmentCategory('프린트스타 148 헤비 14수');
// => 'tshirt'

// 2. 사이즈 치수 가져오기
const measurements = getGarmentMeasurements(category, 'M');
// => { size: 'M', chestWidth: 50, bodyLength: 69, printableWidth: 32, printableHeight: 40 }

// 3. 프린팅 옵션 선택
const printOption = printOptions.find(opt => opt.id === 'a4');

// 4. 프린팅 크기 계산
const result = calculatePrintSize(measurements, printOption, 'front');
// => {
//   widthCm: 22.4,
//   heightCm: 28.0,
//   description: "...",
//   warnings: []
// }

console.log(`프린팅 크기: ${result.widthCm}cm × ${result.heightCm}cm`);
```

### 서버 API 호출

```typescript
const response = await fetch('https://your-server.railway.app/v1/print/calculate-size', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    productName: '프린트스타 148 헤비',
    garmentSize: 'M',
    printOptionId: 'a4',
    placement: 'front',
  }),
});

const data = await response.json();
console.log(data.description);
// "A4 (15~28cm) 크기로 M 사이즈에 프린팅 시 약 22.4cm × 28cm 크기로 인쇄됩니다."
```

## 📱 UI/UX 권장사항

### 1. 사이즈 선택 화면
```
티셔츠 사이즈를 선택하세요
┌───────────────────────────────┐
│ ○ S   (가슴: 47cm, 기장: 66cm) │
│ ● M   (가슴: 50cm, 기장: 69cm) │ ← 선택됨
│ ○ L   (가슴: 53cm, 기장: 72cm) │
└───────────────────────────────┘
```

### 2. 프린팅 크기 선택 화면
```
프린팅 크기를 선택하세요
┌────────────────────────────────────┐
│ ○ 로고  (10cm 미만)     ₩2,500    │
│   → M 사이즈: 약 11.2cm × 14cm     │
│                                    │
│ ○ A5   (10~15cm)        ₩5,500    │
│   → M 사이즈: 약 16cm × 20cm       │
│                                    │
│ ● A4   (15~28cm)        ₩7,500    │ ← 선택됨
│   → M 사이즈: 약 22.4cm × 28cm     │
│   ✓ 권장 크기                      │
│                                    │
│ ○ A3   (최대)           ₩9,500    │
│   → M 사이즈: 약 28.8cm × 36cm     │
│   ⚠️ 프린팅 영역이 최대 크기에     │
│      가깝습니다                    │
└────────────────────────────────────┘
```

### 3. 미리보기 화면
```
┌────────────────────────────┐
│                            │
│     [티셔츠 목업 이미지]    │
│                            │
│   ┌──────────────┐         │
│   │   디자인     │ 22.4cm  │
│   │   이미지     │         │
│   │             │         │
│   └──────────────┘         │
│        28cm               │
│                            │
└────────────────────────────┘

프린팅 정보
• 티셔츠 사이즈: M (가슴 50cm, 기장 69cm)
• 프린팅 크기: A4 (15~28cm)
• 실제 프린팅: 22.4cm × 28cm
• 가격: ₩7,500
```

## 🧮 계산 로직

### 프린팅 크기 계산 공식

```
실제 프린팅 너비 = 프린팅 가능 너비 × 디자인 스케일
실제 프린팅 높이 = 프린팅 가능 높이 × 디자인 스케일
```

**예시**: M 사이즈 티셔츠 + A4 옵션
```
프린팅 가능 너비: 32cm
프린팅 가능 높이: 40cm
디자인 스케일: 0.7 (70%)

실제 프린팅 너비 = 32cm × 0.7 = 22.4cm
실제 프린팅 높이 = 40cm × 0.7 = 28.0cm
```

### 경고 조건

1. **최대 크기 경고**: `widthCm > printableWidth - 2`
   - 프린팅이 최대 영역에 너무 가까움

2. **최소 크기 경고**: `widthCm < 8`
   - 프린팅이 너무 작아서 세부사항 손실 가능

3. **뒷면 인쇄 경고**: `placement === 'back'`
   - 뒷면 인쇄는 위치 조정이 제한적

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

**인식 예시**:
- "프린트스타 148 헤비 14수" → `tshirt`
- "프린트스타 188 헤비 후드" → `hoodie`
- "프린트스타 183 헤비 맨투맨" → `sweatshirt`
- "캔버스 에코백" → `ecobag`

## 📈 실제 사용 예시

### 시나리오 1: 작은 로고
```
제품: 티셔츠
사이즈: M
옵션: 로고 (10cm 미만)

계산:
- 프린팅 가능: 32cm × 40cm
- 스케일: 0.35 (35%)
- 결과: 11.2cm × 14cm
- 가격: ₩2,500
```

### 시나리오 2: 일반 프린팅
```
제품: 티셔츠
사이즈: L
옵션: A4 (15~28cm)

계산:
- 프린팅 가능: 34cm × 42cm
- 스케일: 0.7 (70%)
- 결과: 23.8cm × 29.4cm
- 가격: ₩7,500
```

### 시나리오 3: 최대 크기 프린팅
```
제품: 후드
사이즈: XL
옵션: A3 (최대)

계산:
- 프린팅 가능: 38cm × 45cm
- 스케일: 0.9 (90%)
- 결과: 34.2cm × 40.5cm
- 가격: ₩9,500
- 경고: 프린팅 영역이 최대 크기에 가깝습니다
```

## 🎯 Best Practices

### 1. 사용자에게 항상 실제 크기 표시
```typescript
// ✅ Good
`프린팅 크기: ${widthCm}cm × ${heightCm}cm`

// ❌ Bad
`프린팅 크기: A4`
```

### 2. 경고 메시지 표시
```typescript
if (result.warnings.length > 0) {
  result.warnings.forEach(warning => {
    showWarning(warning);
  });
}
```

### 3. 비율 시각화
```typescript
const percentage = (widthCm / maxWidthCm) * 100;
// 프로그레스 바로 표시: 70% 사용 중
```

### 4. 추천 크기 표시
```typescript
const recommended = getRecommendedPrintOption(measurements);
if (selectedOption === recommended) {
  showBadge('✓ 권장 크기');
}
```

## 📚 관련 파일

- **서버**: `/server/index.js` (라인 975-1181)
- **클라이언트 데이터**: `/src/data/garmentSizes.ts`
- **클라이언트 유틸**: `/src/utils/printSizeCalculator.ts`
- **프린팅 옵션**: `/src/data/printOptions.ts`

## 🐛 트러블슈팅

### Q: 계산된 크기가 이상합니다
**A**: 제품 카테고리가 올바르게 인식되었는지 확인하세요. `/v1/print/sizes?productName=...` API로 확인 가능합니다.

### Q: 특정 사이즈가 없다고 나옵니다
**A**: 제품 카테고리별로 사용 가능한 사이즈가 다릅니다. 티셔츠는 XS~4XL, 후드는 S~4XL입니다.

### Q: 경고가 너무 많이 표시됩니다
**A**: 경고는 참고사항입니다. 사용자가 원하면 무시하고 진행할 수 있도록 UI를 구성하세요.

## 🔮 향후 개선 사항

1. **실제 측정 데이터 반영**: 제조사로부터 정확한 치수 데이터 입수
2. **디자인 비율 고려**: 세로로 긴 디자인 vs 가로로 긴 디자인 별 최적화
3. **프린팅 방법별 제한**: DTG vs 실크스크린 별 크기 제한 반영
4. **사용자 맞춤 추천**: 과거 주문 기록 기반 추천
5. **AR 미리보기**: 실제 착용 시뮬레이션

---

**문서 버전**: 1.0
**최종 업데이트**: 2026-01-12
