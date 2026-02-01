# UI 구조도 및 특징 정리

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프레임워크 | React Native (0.72.6) + Granite.js |
| 플랫폼 | 토스 앱인토스 (Toss Mini-App) |
| 언어 | TypeScript |
| JS 엔진 | Hermes |
| 디자인 시스템 | @toss/tds-react-native (TDS) |
| 상태관리 | React Context API |
| 스타일링 | React Native StyleSheet (인라인) |
| 라우팅 | @granite-js/plugin-router (파일 기반) |

---

## 2. 디렉토리 구조

```
src/
├── _app.tsx                    # 앱 진입점 (TDSProvider, CatalogProvider 래핑)
├── router.gen.ts               # 자동생성 라우트 (수정 금지)
├── config.ts                   # API Base URL 설정
│
├── pages/                      # 페이지(화면) 컴포넌트
│   ├── index.tsx               # 홈 화면
│   ├── upload.tsx              # 이미지 업로드
│   ├── generate.tsx            # AI 이미지 생성
│   ├── editor.tsx              # 디자인 편집기 (핵심)
│   ├── preview.tsx             # 미리보기
│   ├── order.tsx               # 주문/결제
│   ├── products.tsx            # 상품 카탈로그
│   ├── designs.tsx             # 저장된 디자인 목록
│   ├── faq.tsx                 # 자주 묻는 질문
│   ├── inquiry.tsx             # 1:1 문의
│   ├── privacy.tsx             # 개인정보처리방침
│   └── terms.tsx               # 이용약관
│
├── components/                 # 재사용 UI 컴포넌트
│   ├── ui.tsx                  # 공용 UI 키트 (Screen, TopBar, Button 등)
│   ├── MockupCanvas.tsx        # 목업 렌더링 캔버스
│   ├── DesignStage.tsx         # 터치 인터랙션 디자인 캔버스
│   ├── ScaleSlider.tsx         # 드래그 스케일 슬라이더
│   ├── InquiryModal.tsx        # 문의 모달
│   └── DaumPostcodeModal.tsx   # 주소 검색 모달 (카카오 API)
│
├── context/
│   └── catalog.tsx             # 전역 상태 (CatalogContext)
│
├── data/                       # 정적 데이터
│   ├── catalog.ts              # 상품 카탈로그 (티셔츠/후드/맨투맨)
│   ├── printOptions.ts         # 프린트 옵션 (표준/대형)
│   ├── colorMap.ts             # 색상 한→영 매핑 (25+색)
│   ├── pricing.ts              # 가격 정책
│   ├── mockupTemplates.ts      # 목업 템플릿 & 프린트 영역
│   ├── garmentSizes.ts         # 의류 사이즈표 (XS~4XL)
│   └── faq.ts                  # FAQ 데이터 (7카테고리, 30+항목)
│
└── utils/
    ├── format.ts               # 가격 포맷 (₩1,000,000)
    └── printSizeCalculator.ts  # 프린트 가능 영역 계산

assets/
├── mockups/                    # 목업 이미지 (흰/검 앞/뒤)
├── fonts/                      # NotoSansKR (Regular, Bold)
├── logo.jpg / logo.png         # 앱 로고
└── test/                       # 샘플 SVG
```

---

## 3. 화면 흐름도 (Navigation Flow)

```
┌─────────────────────────────────────────────────────────┐
│                      홈 (/)                              │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌───────────┐ │
│  │ 카테고리  │  │  CTA     │  │ FAQ    │  │ 최근 디자인│ │
│  │ 선택 칩  │  │ 버튼들   │  │ 미리보기│  │ 쇼케이스  │ │
│  └──────────┘  └────┬─────┘  └────┬───┘  └───────────┘ │
└─────────────────────┼─────────────┼─────────────────────┘
                      │             │
          ┌───────────┴──┐          │
          ▼              ▼          ▼
   ┌────────────┐  ┌──────────┐  ┌──────┐
   │  업로드    │  │ AI 생성   │  │ FAQ  │
   │ /upload    │  │ /generate │  │ /faq │
   │            │  │           │  └──────┘
   │ • 앨범선택 │  │ • 프롬프트│
   │ • 배경제거 │  │ • 스타일  │
   │ • 스타일링 │  │ • 비율    │
   └─────┬──────┘  └─────┬─────┘
         │               │
         └───────┬───────┘
                 ▼
         ┌──────────────┐
         │   편집기      │
         │   /editor     │
         │               │
         │ • 디자인 캔버스│
         │ • 이미지 레이어│
         │ • 텍스트 레이어│
         │ • 크기 조절    │
         │ • 색상 선택    │
         │ • 앞/뒤면 전환 │
         │ • 사이즈/수량  │
         │ • 프린트 옵션  │
         └───────┬───────┘
                 ▼
         ┌──────────────┐
         │  미리보기     │
         │  /preview     │
         │               │
         │ • 앞/뒤 목업  │
         │ • 색상 변경   │
         │ • 저장/공유   │
         └──┬────┬───┬──┘
            │    │   │
            ▼    │   ▼
   ┌────────┐   │  ┌──────────┐
   │ 주문   │   │  │ 저장     │
   │ /order │   │  │ /designs │
   │        │   │  │          │
   │ • 로그인│   │  │ • 목록   │
   │ • 배송지│   │  │ • 편집   │
   │ • 결제 │   │  │ • 공유   │
   └────────┘   │  │ • 삭제   │
                │  └──────────┘
                ▼
         ┌──────────┐
         │  공유    │
         │ (토스앱) │
         └──────────┘

┌──────────────────────────────────┐
│         기타 페이지               │
│                                  │
│  /products  - 상품 카탈로그      │
│  /inquiry   - 1:1 문의           │
│  /privacy   - 개인정보처리방침    │
│  /terms     - 이용약관           │
└──────────────────────────────────┘
```

---

## 4. 공용 UI 컴포넌트 (`src/components/ui.tsx`)

### 테마 시스템

```
색상 팔레트:
  Primary   : #3182F6 (토스 블루)
  Background: #F2F5F9 (밝은 회색)
  Surface   : #FFFFFF (흰색)
  Text      : #0F172A (진한 검정)
  TextSub   : #475569 (보조 텍스트)
  Border    : #E2E8F0 (테두리)
  Success   : #16A34A (녹색)
  Error     : #DC2626 (빨간색)

간격 (Spacing):
  xs: 4px | sm: 8px | md: 12px | lg: 16px | xl: 24px | xxl: 32px

모서리 둥글기 (Border Radius):
  sm: 8px | md: 12px | lg: 16px | xl: 20px
```

### 컴포넌트 목록

| 컴포넌트 | 설명 | 주요 Props |
|----------|------|-----------|
| `Screen` | SafeAreaView + ScrollView 래퍼 | children |
| `TopBar` | 상단 헤더 바 | title, actionLabel, onAction |
| `PrimaryButton` | 파란색 주요 버튼 | label, onPress, disabled |
| `SecondaryButton` | 테두리형 보조 버튼 | label, onPress |
| `DangerButton` | 빨간색 위험 버튼 | label, onPress |
| `Chip` | 토글 가능한 필터 칩 | label, active, onPress |
| `ColorSwatch` | 원형 색상 선택기 | color, label, selected, onPress |
| `Card` | 흰색 라운드 카드 컨테이너 | children |

---

## 5. 핵심 커스텀 컴포넌트

### MockupCanvas (`src/components/MockupCanvas.tsx`)
- 의류 목업 이미지 위에 디자인/텍스트를 오버레이 렌더링
- 프린트 영역 가이드라인 표시
- 이미지 트랜스폼 (위치, 크기, 회전) 반영
- 미리보기 및 디자인 표시에 사용

### DesignStage (`src/components/DesignStage.tsx`)
- **PanResponder 기반 터치 제스처** 처리
- 이미지/텍스트 레이어의 이동(pan), 확대/축소(scale), 회전(rotate)
- 스케일 범위: 0.2 ~ 1.5
- 멀티 레이어 편집 지원

### ScaleSlider (`src/components/ScaleSlider.tsx`)
- 수평 드래그 슬라이더
- PanResponder 기반 인터랙션
- 레이어 크기 조절 전용

### InquiryModal (`src/components/InquiryModal.tsx`)
- 문의 입력 모달 (이름, 제목, 내용)
- `/v1/inquiries` API 엔드포인트로 전송

### DaumPostcodeModal (`src/components/DaumPostcodeModal.tsx`)
- 카카오 주소 검색 API 연동
- TDS의 SearchField, List, ListRow 활용
- 우편번호, 시도, 시군구, 도로명주소 반환

---

## 6. 상태 관리 (CatalogContext)

`src/context/catalog.tsx` — React Context API 기반 전역 상태

```
CatalogContext
├── 상품 선택
│   ├── selectedProductId    # 선택된 상품 ID
│   └── selectedColor        # 선택된 색상
│
├── 디자인 상태 (앞면)
│   ├── frontDesignImageUri  # 앞면 디자인 이미지 URI
│   ├── frontImageTransform  # 앞면 이미지 트랜스폼 (scale, rotation, offset)
│   ├── frontTextLayer       # 앞면 텍스트 내용/스타일
│   └── frontTextTransform   # 앞면 텍스트 트랜스폼
│
├── 디자인 상태 (뒷면)
│   ├── backDesignImageUri   # 뒷면 디자인 이미지 URI
│   ├── backImageTransform   # 뒷면 이미지 트랜스폼
│   ├── backTextLayer        # 뒷면 텍스트 내용/스타일
│   └── backTextTransform    # 뒷면 텍스트 트랜스폼
│
├── 프린트 설정
│   ├── selectedPrint        # 프린트 옵션 (standard/large)
│   ├── frontPrintEnabled    # 앞면 프린트 활성화
│   └── printBackEnabled     # 뒷면 프린트 활성화
│
├── 주문 정보
│   ├── orderLines[]         # 사이즈 + 수량 배열
│   └── totalQuantity        # 총 수량
│
├── 저장된 디자인
│   └── savedDesigns[]       # localStorage 영구 저장
│
└── 레이어 관리
    └── activeLayer          # 'image' | 'text'
```

**영구 저장**: `@apps-in-toss/framework/Storage` 사용 (키: `'saved_designs'`)

---

## 7. 각 페이지 상세

### 7.1 홈 (`/`) — `pages/index.tsx` (424줄)
- 로고 + 히어로 섹션 (브랜드 소개)
- 카테고리 선택 칩: 티셔츠 / 후드 / 맨투맨
- 메인 CTA 버튼 2개:
  - "내 이미지 업로드하기" → `/upload`
  - "AI로 이미지 만들기" → `/generate`
- FAQ 미리보기 (상위 3개)
- 최근 디자인 쇼케이스

### 7.2 업로드 (`/upload`) — `pages/upload.tsx` (498줄)
- `fetchAlbumPhotos()` 네이티브 앨범 접근
- 이미지 미리보기
- "배경 제거해 볼까요?" 버튼 (배경 제거 API)
- 스타일링 옵션 드롭다운
- `/v1/images/upload` 엔드포인트로 업로드
- 완료 시 → `/editor` 이동

### 7.3 AI 생성 (`/generate`) — `pages/generate.tsx` (349줄)
- 프롬프트 입력 필드
- 스타일 선택: 미니멀 / 라인아트 / 그래픽
- 비율 선택: 1:1 / 4:3 / 3:4
- `/v1/images/generate` API 호출
- 배경 제거 토글
- 예시 프롬프트 표시
- 완료 시 → `/editor` 이동

### 7.4 편집기 (`/editor`) — `pages/editor.tsx` (1060줄) ⭐ 핵심 페이지
- **디자인 캔버스**: DesignStage 컴포넌트
- **레이어 탭**: 이미지 / 텍스트 전환
- **이미지 편집**: ScaleSlider로 크기 조절
- **텍스트 편집**: 색상, 폰트 크기, 굵기, 내용
- **앞면/뒷면 전환** 토글
- **색상 선택**: ColorSwatch 그리드
- **사이즈/수량**: 사이즈별 수량 입력 그리드
- **프린트 옵션**: 표준(A4) / 대형(A3) 선택
- **가격 계산**: 실시간 가격 표시
- 완료 시 → `/preview` 이동

### 7.5 미리보기 (`/preview`) — `pages/preview.tsx` (230줄)
- 풀 목업 미리보기 (앞/뒤 모두 표시)
- 색상 변경 가능
- 디자인 저장 모달
- 3개 액션 버튼:
  - 주문하기 → `/order`
  - 저장하기 → localStorage
  - 공유하기 → `getTossShareLink()`

### 7.6 주문 (`/order`) — `pages/order.tsx` (468줄)
- **토스 OAuth 로그인** (appLogin → userKey 획득)
- 주문자 정보: 이름, 이메일, 전화번호
- 배송지: DaumPostcodeModal (카카오 주소 검색)
- 주문 메모
- **토스페이 결제** (TossPay)
- 주문 요약 + 가격 정보

### 7.7 상품 카탈로그 (`/products`) — `pages/products.tsx` (212줄)
- 카테고리별 상품 그룹 (티셔츠/후드/맨투맨/에코백)
- 펼치기 가능한 상품 카드
- 색상 선택 모달
- 확인 버튼으로 선택 완료

### 7.8 저장된 디자인 (`/designs`) — `pages/designs.tsx` (213줄)
- 저장된 디자인 리스트 (Storage에서 로드)
- 카드 형태: 목업, 제목, 색상, 시간
- 편집하기 / 공유하기 / 삭제하기 액션
- 빈 상태(Empty State) UI

### 7.9 FAQ (`/faq`) — `pages/faq.tsx` (283줄)
- 7개 카테고리 (아이콘 포함)
- 수평 카테고리 내비게이션
- 펼치기/접기 가능한 FAQ 항목 (30+개)
- 카테고리별 스크롤 이동

### 7.10 문의 (`/inquiry`) — `pages/inquiry.tsx` (186줄)
- 입력 폼: 이름, 제목, 내용
- TextInput 유효성 검사
- `/v1/inquiries` API 전송
- 로딩 상태 표시

### 7.11 개인정보처리방침 (`/privacy`) — `pages/privacy.tsx` (193줄)
- 11개 섹션 법적 문서
- ScrollView + 타이포그래피 스타일링

### 7.12 이용약관 (`/terms`) — `pages/terms.tsx` (160줄)
- 13개 섹션 서비스 약관
- ScrollView + 타이포그래피 스타일링

---

## 8. 가격 정책 구조 (`src/data/pricing.ts`)

| 항목 | 가격 |
|------|------|
| 티셔츠 기본가 | 상품별 상이 |
| 표준 프린트 (A4) | ₩6,000 |
| 대형 프린트 (A3) | ₩8,000 |
| 뒷면 프린트 추가 | ₩6,000/개 |
| 대형 프린트 추가 | ₩2,000/개 |
| 배송비 | ₩3,000 (₩60,000 이상 무료) |

---

## 9. 외부 연동 (Toss Platform)

| 기능 | 모듈 | 용도 |
|------|------|------|
| 앱 등록 | `AppsInToss.registerApp()` | 토스 미니앱으로 등록 |
| OAuth 로그인 | `appLogin()` | 토스 계정 인증 |
| 결제 | `TossPay` | 토스페이 결제 |
| 공유 | `share()`, `getTossShareLink()` | 토스 앱 내 공유 |
| 저장소 | `Storage` | 로컬 영구 저장 |
| 앨범 | `fetchAlbumPhotos()` | 네이티브 사진첩 접근 |

---

## 10. 인터랙션 패턴 요약

| 패턴 | 사용처 | 구현 방식 |
|------|--------|-----------|
| 멀티터치 제스처 | DesignStage | PanResponder (pinch, pan, rotate) |
| 드래그 슬라이더 | ScaleSlider | PanResponder |
| 모달 다이얼로그 | 문의, 주소검색, 저장 | React Native Modal |
| 펼치기/접기 | FAQ, 상품 카탈로그 | state toggle + 조건부 렌더링 |
| 필터 칩 | 카테고리 선택, 프린트 옵션 | Chip 컴포넌트 (active toggle) |
| 색상 선택기 | 편집기, 미리보기 | ColorSwatch 그리드 |
| 폼 입력 | 주문, 문의 | TextInput + 유효성 검사 |
| 실시간 계산 | 편집기 가격 | computed from state |

---

## 11. 앱 진입 구조 (`src/_app.tsx`)

```
AppsInToss.registerApp()
└── TDSProvider          # 토스 디자인 시스템 프로바이더
    └── CatalogProvider  # 전역 상태 프로바이더
        └── children     # 라우팅된 페이지 컴포넌트
```

---

## 12. 에셋 구성

```
assets/
├── mockups/
│   ├── tshirt_black_front.jpg   (110K)
│   ├── tshirt_black_back.jpg    (110K)
│   ├── tshirt_white_front.jpg   (69K)
│   └── tshirt_white_back.jpg    (110K)
├── fonts/
│   ├── NotoSansKR-Regular.ttf
│   └── NotoSansKR-Bold.ttf
├── logo.jpg
├── logo.png
└── test/
    ├── sample-front.svg
    └── sample-back.svg
```

목업 이미지 소스: Railway 서버 (`tossinapptshirts-production.up.railway.app/mockups`)
