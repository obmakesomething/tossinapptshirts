# 프로젝트 핸드오프 가이드 🚀

> **목적**: 누구든 이 프로젝트를 즉시 이어받아 작업할 수 있도록 모든 정보를 제공합니다.

---

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [빠른 시작](#빠른-시작)
3. [현재 진행 상황](#현재-진행-상황)
4. [작업 이어가기](#작업-이어가기)
5. [프로젝트 구조](#프로젝트-구조)
6. [주요 파일 설명](#주요-파일-설명)
7. [개발 워크플로우](#개발-워크플로우)
8. [알려진 이슈](#알려진-이슈)
9. [배포 정보](#배포-정보)
10. [문제 해결](#문제-해결)

---

## 프로젝트 개요

### 🎯 프로젝트명
**머천다이즈 GPT** (이전: 티셔츠 메이커)

### 📱 플랫폼
- Toss Mini-App (Apps-in-Toss Framework)
- React Native 기반
- iOS/Android 지원

### 🛠 기술 스택
```json
{
  "frontend": "React Native 0.72.6",
  "framework": "@apps-in-toss/framework ^1.0.0",
  "router": "@granite-js/react-native 0.1.33",
  "backend": "Express 5.2.1 (Node.js)",
  "database": "PostgreSQL (pg ^8.16.3)",
  "deployment": "Railway",
  "ai": "OpenAI API ^4.104.0"
}
```

### 🎨 주요 기능
1. **이미지 업로드/생성**: 사용자 이미지 업로드 또는 AI 생성
2. **커스터마이징**: 티셔츠/후드/맨투맨에 디자인 적용
3. **에디터**: 이미지 편집 (크기, 회전, 위치, 텍스트 추가)
4. **주문 시스템**: 사이즈 선택, 수량, 배송 정보
5. **결제**: 토스페이 통합

---

## 빠른 시작

### 1️⃣ 저장소 클론 및 설치
```bash
git clone <repository-url>
cd tossminiapp_tshirtsmaker
npm install
```

### 2️⃣ 환경 변수 설정
`.env` 파일 생성 (프로젝트 루트):
```env
# OpenAI API
OPENAI_API_KEY=sk-...

# PostgreSQL
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# AWS S3 (옵션)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-northeast-2
S3_BUCKET_NAME=...

# Server
PORT=3000
NODE_ENV=development
```

### 3️⃣ 개발 서버 실행
```bash
# 터미널 1: 백엔드 서버
npm run server

# 터미널 2: React Native 개발 서버
npm run dev
```

### 4️⃣ 빌드 (배포용)
```bash
npm run build
```

---

## 현재 진행 상황

### ✅ 완료된 작업 (3/20)
**마지막 업데이트**: 2026-01-13 21:59 KST
**브랜치**: `feat/20260113-2124`
**마지막 커밋**: `49413de` - docs: add comprehensive progress tracking document

| 이슈 | 상태 | 파일 | 설명 |
|-----|------|------|------|
| #1 | ✅ | server/index.js | Rate limiter trust proxy 에러 수정 |
| #2 | ✅ | src/data/catalog.ts | Mockup 이미지 경로 수정 (front 이미지로 통일) |
| #3 | ✅ | src/components/InquiryModal.tsx<br>src/pages/index.tsx | 1대1 문의 모달 구현 (라우터 이슈 우회) |

### 🔴 진행 중 작업 (1/20)
| 이슈 | 담당자 | 진행률 | 다음 단계 |
|-----|--------|--------|----------|
| #4 | - | 80% | 문서화 마무리 (이 파일) |

### ⏳ 대기 중 작업 (16/20)
상세 내역은 [PROGRESS.md](./PROGRESS.md) 참고

**우선순위별 그룹**:
- 🔥 **P0 (긴급)**: Issues #5, #6, #8
- 🚀 **P1 (높음)**: Issues #7, #9, #10, #11
- ⚡ **P2 (중간)**: Issues #12, #13, #14, #15, #16, #17
- 📝 **P3 (문서)**: Issues #18, #19, #20

---

## 작업 이어가기

### 🎯 다음 작업 권장사항

#### **Phase 1: UI/UX 개선 (추천 시작점)**
```bash
# Issues #9, #10, #11
# 예상 시간: 2-3시간
```

**작업 목록**:
1. **Issue #9**: FAQ 섹션에 설명 추가
   - 파일: `src/pages/index.tsx`
   - 변경: FAQ 제목 아래 설명 텍스트 추가, margin 조정

2. **Issue #10**: 카테고리 선택 시 mockup 동적 변경
   - 파일: `src/pages/index.tsx`
   - 변경: `selectedCategory` state 변경 시 mockup 이미지 업데이트

3. **Issue #11**: 버튼 spacing 일관성
   - 파일: `src/pages/*.tsx`, `src/components/ui/*.tsx`
   - 변경: theme.spacing 값 체계적 적용

**시작 명령어 (Claude Code 사용 시)**:
```
"PROGRESS.md를 읽고 Phase 1 (Issues #9, #10, #11)부터 시작해줘"
```

### 📝 작업 시작 전 체크리스트
- [ ] `PROGRESS.md` 읽기
- [ ] `git status` 확인 (clean working tree)
- [ ] `git pull origin feat/20260113-2124` (최신 코드 받기)
- [ ] 로컬 개발 서버 실행 테스트
- [ ] 할당받은 이슈 번호 확인

### ✅ 작업 완료 후 체크리스트
- [ ] 코드 변경사항 테스트
- [ ] `PROGRESS.md` 업데이트 (완료 표시, 시도한 방법 기록)
- [ ] `git add -A && git commit -m "이슈 설명"`
- [ ] `git push origin feat/20260113-2124`
- [ ] TODO 리스트 업데이트 (Claude Code 자동 관리)

---

## 프로젝트 구조

```
tossminiapp_tshirtsmaker/
├── src/                          # 프론트엔드 소스
│   ├── pages/                    # 페이지 컴포넌트 (Granite Router)
│   │   ├── index.tsx            # 메인 페이지 ⭐
│   │   ├── upload.tsx           # 이미지 업로드
│   │   ├── generate.tsx         # AI 이미지 생성
│   │   ├── editor.tsx           # 디자인 에디터 ⭐
│   │   ├── preview.tsx          # 미리보기
│   │   ├── order.tsx            # 주문/결제 ⭐
│   │   ├── faq.tsx              # FAQ
│   │   ├── inquiry.tsx          # 1:1 문의 (라우터 미등록)
│   │   └── ...
│   ├── components/              # 재사용 컴포넌트
│   │   ├── ui/                  # UI 기본 요소
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Chip.tsx
│   │   │   └── theme.ts         # 디자인 토큰 ⭐
│   │   ├── MockupCanvas.tsx     # 목업 렌더링
│   │   ├── ImageEditor.tsx      # 이미지 편집기
│   │   ├── InquiryModal.tsx     # 문의 모달 (신규)
│   │   └── DaumPostcodeModal.tsx # 주소 검색
│   ├── context/                 # React Context
│   │   └── catalog.tsx          # 전역 상태 관리 ⭐
│   ├── data/                    # 정적 데이터
│   │   ├── catalog.ts           # 제품 카탈로그 ⭐
│   │   ├── faq.ts               # FAQ 데이터
│   │   └── mockupTemplates.ts   # 목업 템플릿
│   ├── config/                  # 설정 파일
│   │   ├── index.ts             # API_BASE_URL 등
│   │   └── mockups.ts           # 목업 이미지 경로 설정
│   ├── _app.tsx                 # 앱 루트
│   └── router.gen.ts            # 자동 생성된 라우터
│
├── server/                      # 백엔드 서버
│   ├── index.js                 # Express 서버 메인 ⭐
│   ├── cluster.js               # 클러스터 모드
│   └── package.json
│
├── server-public/               # 정적 파일 서빙
│   └── mockups/                 # 목업 이미지들
│       ├── tshirt_white_front.jpg
│       ├── tshirt_black_front.jpg
│       ├── hoodie_grey_front.jpg
│       └── ...
│
├── scripts/                     # 유틸리티 스크립트
│   └── optimize_images.py       # 이미지 최적화
│
├── docs/                        # 문서 (생성 필요)
│   ├── PROGRESS.md             # 진행 상황 추적 ⭐
│   ├── HANDOFF.md              # 이 파일 ⭐
│   └── ARCHITECTURE.md         # 아키텍처 설명 (TODO)
│
├── granite.config.ts            # Granite 설정
├── package.json                 # 프로젝트 의존성
├── tsconfig.json                # TypeScript 설정
└── require.context.ts           # 페이지 컨텍스트

⭐ = 자주 수정되는 핵심 파일
```

---

## 주요 파일 설명

### 🎨 Frontend

#### **src/pages/index.tsx** (메인 페이지)
```typescript
// 주요 기능:
// - 제품 카테고리 선택 (티셔츠/후드/맨투맨)
// - 이미지 업로드/생성 버튼
// - 문의 모달 (InquiryModal)
// - FAQ 링크

// 주요 state:
const [selectedCategory, setSelectedCategory] = useState('티셔츠');
const [inquiryModalVisible, setInquiryModalVisible] = useState(false);

// Issue #9, #10, #11 작업 대상
```

#### **src/pages/editor.tsx** (디자인 에디터)
```typescript
// 주요 기능:
// - 앞면/뒷면 프린팅 선택
// - 이미지/텍스트 레이어 편집
// - 크기, 회전, 위치 조정
// - 사이즈/수량 선택
// - 주문 정보 확인

// Context 사용:
const {
  selectedProduct,
  selectedColor,
  frontPrintEnabled,
  printBackEnabled,
  selectedPlacement,
  // ...
} = useCatalog();

// Issue #5, #6, #14, #15, #17 작업 대상
```

#### **src/pages/upload.tsx** (이미지 업로드)
```typescript
// 주요 기능:
// - 갤러리에서 이미지 선택
// - 배경 제거 (Remove.bg API)
// - 스타일 변환 (OpenAI)
// - 이미지 크롭 (미구현)

// Issue #7, #8, #12 작업 대상
```

#### **src/context/catalog.tsx** (전역 상태)
```typescript
// 전역으로 관리되는 상태:
export type CatalogContextType = {
  products: CatalogProduct[];           // 전체 제품 목록
  selectedProduct: CatalogProduct;      // 선택된 제품
  selectedColor: string;                // 선택된 색상

  // 프린팅 설정
  selectedPlacement: Placement;         // 'front' | 'back'
  frontPrintEnabled: boolean;           // 앞면 활성화 여부
  printBackEnabled: boolean;            // 뒷면 활성화 여부

  // 디자인 데이터
  designImageUri: string | null;        // 업로드/생성된 이미지
  imageTransform: Transform;            // 이미지 변환 (scale, x, y, rotation)
  textLayer: TextLayer | null;          // 텍스트 레이어
  textTransform: Transform;             // 텍스트 변환

  // 주문 정보
  orderLines: OrderLine[];              // 선택된 사이즈/수량들

  // ... 많은 setter 함수들
};

// ⚠️ 중요: 이 파일 수정 시 전체 앱 영향 가능
```

#### **src/data/catalog.ts** (제품 데이터)
```typescript
// 제품 정의:
export const catalogProducts: CatalogProduct[] = [
  {
    id: 'p-001',
    name: '티셔츠',
    category: '티셔츠',
    modelName: 'Printstar 148 Heavy 14oz',
    price: 10000,
    colorImages: {
      블랙: {
        main: resolveMockup('tshirt_black_front.jpg'),
        detail: resolveMockup('tshirt_black_front.jpg'), // ✅ Issue #2에서 수정됨
      },
      화이트: { /* ... */ },
    },
    colors: ['화이트', '블랙'],
    sizes: [
      { label: 'XS', extraPrice: 0 },
      { label: 'S', extraPrice: 0 },
      // ...
    ],
    tags: ['반팔티셔츠', '프린트스타 Printstar'],
  },
  // ... 후드, 맨투맨
];
```

#### **src/components/ui/theme.ts** (디자인 시스템)
```typescript
export const theme = {
  colors: {
    primary: '#3182F6',
    textPrimary: '#191F28',
    textSecondary: '#4E5968',
    textTertiary: '#8B95A1',
    background: '#F2F4F6',
    surface: '#FFFFFF',
    border: '#E5E8EB',
    error: '#F04452',
    // ...
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  // ...
};

// Issue #11 (spacing 일관성) 작업 시 참조
```

### ⚙️ Backend

#### **server/index.js** (Express 서버)
```javascript
// 주요 엔드포인트:

// 이미지 업로드/처리
POST /v1/upload              // 이미지 업로드
POST /v1/remove-background   // 배경 제거 (Remove.bg)
POST /v1/generate-image      // AI 이미지 생성 (OpenAI DALL-E)
POST /v1/style-transfer      // 스타일 변환 (OpenAI) ⚠️ Issue #8

// 주문 관리
POST /v1/orders              // 주문 생성
GET  /v1/orders/:orderId     // 주문 조회

// 결제 (토스페이)
POST /v1/payment/create      // 결제 생성
POST /v1/payment/execute     // 결제 실행

// 문의
POST /v1/inquiries           // 문의 등록
GET  /v1/inquiries           // 문의 목록 (관리자)

// Rate Limiter 설정 (✅ Issue #1에서 수정됨)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  trustProxy: true, // ✅ 추가됨
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  trustProxy: true, // ✅ 추가됨
});
```

---

## 개발 워크플로우

### 🔄 Git 브랜치 전략
```
main (프로덕션)
  └── feat/20260113-2124 (현재 작업 브랜치)
```

**브랜치 네이밍**:
- Feature: `feat/YYYYMMDD-HHMM` (예: `feat/20260113-2124`)
- Bugfix: `fix/issue-number-description`
- Hotfix: `hotfix/critical-issue-name`

### 📝 커밋 메시지 컨벤션
```bash
# 형식
<type>: <subject>

<body>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

# 예시
fix: implement inquiry modal and fix critical issues (issues #1-3)

Changes:
1. Fixed rate limiter trust proxy error
   - Added trustProxy: true to globalLimiter and strictLimiter
2. Fixed mockup images to use front image
3. Implemented inquiry modal workaround

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Type 종류**:
- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드/패키지 설정

### 🧪 테스트 방법
```bash
# 타입 체크
npm run typecheck

# Lint
npm run lint

# 테스트 (Jest)
npm test

# 빌드 테스트
npm run build
```

### 🚀 배포 프로세스
1. **로컬 빌드 테스트**
   ```bash
   npm run build
   # merchandisegpt.ait 파일 생성 확인
   ```

2. **변경사항 커밋**
   ```bash
   git add -A
   git commit -m "커밋 메시지"
   git push origin feat/20260113-2124
   ```

3. **Railway 자동 배포**
   - Push 시 자동으로 Railway에 배포
   - 배포 로그: [Railway Dashboard](https://railway.app)

4. **배포 확인**
   - Health check: `https://your-app.railway.app/health`
   - 테스트: Toss 앱에서 미니앱 실행

---

## 알려진 이슈

### 🐛 Critical Issues

#### **Issue: Granite Router Not Detecting inquiry.tsx**
**상태**: ⚠️ 우회 완료 (Modal 사용)
**원인**: `@granite-js/plugin-router`의 `checkExportRoute` 함수가 파일을 스킵

**시도한 해결 방법**:
1. ❌ 파일명 변경: `inquiry-create.tsx` → `inquiry.tsx`
2. ❌ 강제 재빌드: `rm src/router.gen.ts && npm run build`
3. ❌ 캐시 삭제: `rm -rf .granite node_modules/.cache`

**현재 워크어라운드**:
- `InquiryModal.tsx` 컴포넌트 생성
- 메인 페이지에서 모달로 문의 기능 제공
- `inquiry.tsx` 파일은 향후 라우터 수정 시를 위해 보관

**장기 해결책**:
- Granite 프레임워크 업데이트 대기 또는
- 커스텀 라우터 플러그인 작성 또는
- 수동으로 `router.gen.ts`에 추가 (비권장)

### ⚠️ High Priority Issues

#### **Issue #8: Style Transfer Not Working**
**상태**: 🔴 미해결
**증상**: 스타일 변환 버튼 클릭 시 응답 없음
**파일**: `src/pages/upload.tsx`, `server/index.js` (POST /v1/style-transfer)

**디버깅 필요**:
```javascript
// server/index.js에 로깅 추가
app.post('/v1/style-transfer', strictLimiter, async (req, res) => {
  console.log('[DEBUG] Style transfer request:', req.body);
  try {
    // ... OpenAI API 호출
    console.log('[DEBUG] OpenAI response:', response);
  } catch (error) {
    console.error('[ERROR] Style transfer failed:', error);
  }
});
```

#### **Issue #7: Image Crop Library Missing**
**상태**: 🔴 미해결
**에러**: "library needed"
**해결책**:
```bash
npm install react-native-image-crop-picker
# iOS
cd ios && pod install

# 또는 다른 라이브러리:
npm install @react-native-community/image-editor
```

### 💡 Minor Issues

#### **Issue #15: Front/Back UI Inconsistency**
**상태**: ⚠️ 확인 필요
**노트**: `editor.tsx`가 최근 수정되어 이미 OR 로직으로 변경되었을 수 있음
**TODO**: 현재 코드 확인 후 Issue 상태 업데이트

---

## 배포 정보

### 🌐 환경별 설정

#### **개발 (Local)**
```env
API_BASE_URL=http://localhost:3000
MOCKUP_BASE_URL=http://localhost:3000/mockups
NODE_ENV=development
```

#### **프로덕션 (Railway)**
```env
API_BASE_URL=https://your-app.railway.app
MOCKUP_BASE_URL=https://your-app.railway.app/mockups
NODE_ENV=production
```

### 📊 모니터링
- **서버 로그**: Railway Dashboard
- **에러 추적**: Console logs (Sentry 등 도입 권장)
- **성능**: Railway Metrics

### 🔐 보안 체크리스트
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지
- [ ] API 키가 코드에 하드코딩되지 않았는지
- [ ] Rate limiter가 올바르게 설정되었는지 (✅ Issue #1)
- [ ] CORS 설정이 적절한지
- [ ] SQL Injection 방지 (Prepared Statements 사용)
- [ ] XSS 방지 (입력값 sanitization)

---

## 문제 해결

### ❓ 자주 묻는 질문

#### Q1: `npm run dev` 실행 시 에러가 발생합니다.
```bash
# 해결 방법:
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### Q2: 빌드는 성공하는데 router.gen.ts가 업데이트되지 않습니다.
```bash
# 해결 방법:
rm src/router.gen.ts
rm -rf .granite
npm run build
```

#### Q3: 서버가 실행되지 않습니다.
```bash
# 확인 사항:
# 1. PostgreSQL이 실행 중인지
# 2. .env 파일이 존재하는지
# 3. DATABASE_URL이 올바른지

# 테스트:
node server/index.js
# 에러 메시지 확인
```

#### Q4: 이미지 업로드가 실패합니다.
```bash
# 확인 사항:
# 1. server-public/uploads 디렉토리 권한
mkdir -p server-public/uploads
chmod 755 server-public/uploads

# 2. 파일 크기 제한 (server/index.js)
# express.json({ limit: '50mb' })
```

#### Q5: 토스페이 결제가 400 에러를 반환합니다.
```javascript
// 확인 사항:
// 1. x-toss-user-key 헤더 포함 여부
// 2. getUserInfo() 호출 성공 여부
// 3. 결제 금액이 100원 이상인지

// src/pages/order.tsx:
const userInfo = await getUserInfo();
fetch('/v1/payment/create', {
  headers: {
    'x-toss-user-key': userInfo.userKey, // ✅ 필수
  },
});
```

### 🆘 도움 요청 방법

#### **버그 리포트 템플릿**
```markdown
## 문제 설명
[간단한 설명]

## 재현 방법
1. [단계 1]
2. [단계 2]
3. [에러 발생]

## 예상 동작
[어떻게 동작해야 하는지]

## 실제 동작
[실제로 어떻게 동작하는지]

## 환경
- OS: [macOS/Windows/Linux]
- Node.js: [버전]
- 브랜치: [브랜치명]
- 커밋: [커밋 해시]

## 에러 로그
```
[에러 메시지 전문]
```

## 스크린샷
[가능하면 첨부]
```

#### **연락처**
- GitHub Issues: [Repository Issues 링크]
- 프로젝트 담당자: [이메일/슬랙]

---

## 📚 참고 자료

### 공식 문서
- [Apps-in-Toss Framework](https://developers.tosspayments.com/)
- [Granite React Native](https://github.com/toss/granite)
- [React Native](https://reactnative.dev/)
- [Express.js](https://expressjs.com/)

### 내부 문서
- [PROGRESS.md](./PROGRESS.md) - 진행 상황 추적
- [HANDOFF.md](./HANDOFF.md) - 이 문서
- ~~[ARCHITECTURE.md](./ARCHITECTURE.md)~~ - 아키텍처 설명 (TODO)

### 코드 스타일 가이드
- TypeScript: [TSConfig](./tsconfig.json)
- Linting: Biome (`npm run lint`)
- Formatting: Biome auto-format on save

---

## 🎉 다음 단계

### 즉시 시작 가이드

1. **문서 읽기** (5분)
   - [ ] 이 파일 전체 읽기
   - [ ] [PROGRESS.md](./PROGRESS.md) 확인

2. **환경 설정** (10분)
   - [ ] 저장소 클론
   - [ ] `npm install`
   - [ ] `.env` 파일 생성
   - [ ] 개발 서버 실행 테스트

3. **첫 작업 선택** (5분)
   - [ ] Phase 1 (Issues #9, #10, #11) 추천
   - [ ] 또는 [PROGRESS.md](./PROGRESS.md)에서 선택

4. **작업 시작** (2-3시간)
   - [ ] 브랜치 확인: `git checkout feat/20260113-2124`
   - [ ] TODO 도구 활용 (Claude Code)
   - [ ] 커밋 전 PROGRESS.md 업데이트

### 🚀 화이팅!

질문이 있거나 막히는 부분이 있다면:
1. 이 문서의 [문제 해결](#문제-해결) 섹션 참고
2. [PROGRESS.md](./PROGRESS.md)의 해당 이슈 상세 내용 확인
3. Git history 확인: `git log --oneline`
4. 도움 요청 (Issues/Slack)

---

**마지막 업데이트**: 2026-01-13 22:00 KST
**작성자**: Claude Sonnet 4.5 + Human
**버전**: 1.0.0
