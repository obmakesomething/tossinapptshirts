# 프로젝트 핸드오프 가이드

> **최종 업데이트**: 2026-03-22
> **브랜치**: `main`
> **최신 커밋**: `60fa544e` — docs: add service blueprint & UI/UX design document

---

## 프로젝트 개요

**굿즈GPT (MerchandiseGPT)** — 토스 미니앱 기반 AI 커스텀 의류 제작 서비스

| 항목 | 값 |
|------|---|
| 플랫폼 | Toss Mini-App (Apps-in-Toss) |
| 프론트엔드 | React Native 0.72.6 / 0.84.0 (dual build) |
| 라우터 | @granite-js/react-native |
| 백엔드 | Express (Node.js) |
| AI | Google Gemini (이미지 생성), Vertex AI Imagen 4.0 (업스케일) |
| 배경 제거 | rembg (로컬 Python AI, API 아님) |
| 결제 | 토스페이 (docs-pay.toss.im) |
| 인쇄 | PDFKit + NotoSansKR 한글 폰트 |
| 이메일 | Gmail SMTP |
| GCP 프로젝트 | `tshirtsmaker-prod-260214-1878` |

---

## 빠른 시작

```bash
# 1. 설치
npm install

# 2. 환경변수 (.env 필요 — .env.sample 참고)
#    필수: GCP_PROJECT_ID, VERTEX_PROJECT_ID, TOSS_PAY_API_KEY, SMTP_PASS

# 3. 서버 실행
node -r dotenv/config server/index.js

# 4. 앱 빌드
npx ait build          # → merchandisegpt.ait
npx tsc --noEmit       # 타입 체크

# 5. 시뮬레이터 (선택)
SANDBOX_BUNDLE_ID=com.vivarepublica.ent.cash.test npm run ios:ait:run
```

---

## 현재 상태 (2026-03-22)

### 완료된 작업

| 항목 | 상태 | 상세 |
|------|:----:|------|
| Vertex AI 업스케일 | ✅ | 800→3200px, GCP ADC 인증 |
| rembg 배경 제거 | ✅ | 로컬 Python, 인쇄 파이프라인 통합 |
| 한글 PDF 주문서 | ✅ | NotoSansKR Regular/Bold 폰트 등록 |
| Gmail 이메일 발송 | ✅ | 주문서 PDF + 인쇄파일 첨부 |
| 토스페이 결제 연동 | ✅ | TOSS_PAY_API_KEY 설정 완료 |
| 에디터 줌 컨트롤 | ✅ | +/- 버튼, 60%~300%, 기본 130% |
| 에디터 패널 스크롤 | ✅ | overflow hidden 제거, bounce 비활성 |
| 목업 배경 제거 | ✅ | 후드/맨투맨 4개 이미지 투명 처리 |
| 배경 제거 로딩 UI | ✅ | FullScreenLoader 오버레이 (generate, upload) |
| Analytics 스키마 | ⚠️ | 날짜 접미사 `_20260321` → 속성으로 분리 필요 |
| 서비스 블루프린트 | ✅ | `docs/SERVICE_BLUEPRINT.md` (v2.0 UX 리뷰 반영) |

### 남은 과제 / 개선 포인트

> UX 리뷰 결과 반영 (2026-03-22). 상세 내용은 `docs/SERVICE_BLUEPRINT.md` 섹션 15 참조.

#### P0 — 출시 전 필수

| 항목 | 설명 |
|------|------|
| 뒷면 목업 이미지 | hoodie/sweatshirt back 이미지 없음 — 앞/뒷면 UI의 핵심 전제 |
| 주문 완료 페이지 | `/order-complete` — 주문번호, 출고일, 문의 연결 |
| 주문 내역 페이지 | `/orders` — 주문 카드 리스트, 상태 표시 |
| 주문 상세/배송 추적 | `/orders/:id` — 상태 타임라인, 배송 추적, 문의 |
| 편집기 Undo/Redo | 모바일 편집기 필수 기능 |
| 편집기 삭제/복제/선택 상태 | 레이어 선택 표시, 객체 삭제/복제 |
| 상태 구조 재설계 | `imageTransform`(단수) → `layers`(면별 다중 레이어) |
| /preview 신뢰 정보 | 인쇄 품질 배지, 사이즈 가이드, 출고일, 교환환불 정책 |
| /order 자동 입력 | 토스 세션 → 이름/연락처/이메일 프리필 (`/v1/auth/me`) |
| /order 폼 검증 | 실시간 유효성 검사, 비활성 사유 표시 |
| 색상 대비 수정 | WCAG AA 미달 (#3182F6, #9B8A7B 등) |
| Analytics 수정 | 이벤트명 날짜 접미사 제거 → 속성으로 분리 |

#### P1 — 다음 단계

| 항목 | 설명 |
|------|------|
| 생성 화면 통합 | /generate + /upload → /create 1개 화면 |
| 홈 간소화 | 색상/사이즈 제거, 예시 디자인 갤러리 중심 |
| CTA 문구 재작성 | 기술 용어 → 사용자 언어 |
| 실패 상태 상세화 | AI 타임아웃, 결제+주문 불일치 등 복구 설계 |
| 디자인 서버 저장 | 로컬 전용 → 서버 저장 (토스 세션 연동) |
| FAQ/법률문서 스크롤 | 이중 스크롤 → 아코디언/목차+단일 스크롤 |

#### P2 — 있으면 좋은 것

| 항목 | 설명 |
|------|------|
| 디자인 공유 | SNS/링크 공유 |
| 수량 할인 정책 | 대량 주문 할인 |
| 배송 추적 연동 | 택배사 API (CJ대한통운 등) |
| 리뷰/평점 시스템 | 구매 후 리뷰 |
| Sentry 에러 추적 | 프로덕션 모니터링 |

---

## 핵심 파일 맵

### 프론트엔드 (src/)

```
src/
├── pages/                    # 13개 페이지 (Granite Router)
│   ├── index.tsx            # 홈 — 캐러셀, 히어로, FAQ
│   ├── editor.tsx           # 에디터 — 캔버스, 줌, 탭패널
│   ├── generate.tsx         # AI 생성 — Gemini 프롬프트
│   ├── upload.tsx           # 업로드 — 앨범, 배경 제거
│   ├── preview.tsx          # 미리보기 — 목업, 가격, 주문
│   ├── order.tsx            # 주문 — 배송지, 토스페이
│   ├── products.tsx         # 카탈로그 — 상품 목록
│   ├── designs.tsx          # 저장 — 디자인 관리
│   ├── faq.tsx              # FAQ — 카테고리별 Q&A
│   ├── inquiry.tsx          # 문의 — 고객 지원
│   ├── privacy.tsx          # 개인정보처리방침
│   ├── terms.tsx            # 이용약관
│   └── open.tsx             # 딥링크 핸들러
├── components/
│   ├── ui.tsx               # 공통 UI (Button, Screen, TabBar, FullScreenLoader...)
│   ├── DesignStage.tsx      # 2D 디자인 캔버스 (핀치줌/팬)
│   ├── MockupCanvas.tsx     # 의류 목업 렌더링
│   ├── ScaleSlider.tsx      # 슬라이더 컨트롤
│   └── DaumPostcodeModal.tsx # 주소 검색
├── context/
│   ├── catalog.tsx          # 전역 상태 (상품/디자인/주문)
│   ├── jobTracker.tsx       # AI 생성 작업 추적
│   └── toastContext.tsx     # 토스트 알림
├── data/
│   ├── catalog.ts           # 상품 3종 (티셔츠/후드/맨투맨)
│   ├── pricing.ts           # 가격 체계
│   ├── mockupTemplates.ts   # 목업 빌드 함수
│   └── faq.ts               # FAQ 데이터
└── utils/
    └── analytics.ts         # 이벤트 추적 (스키마 날짜 접미사)
```

### 백엔드 (server/)

```
server/
├── index.js                 # Express 메인 (API 엔드포인트 전체)
├── printPipeline.js         # 인쇄 파이프라인 (업스케일→배경제거→QC→PDF)
└── lib/                     # 유틸리티 모듈
```

### 정적 파일

```
public/mockups/              # 목업 이미지 (배경 투명 PNG, 정적 서빙)
assets/fonts/                # NotoSansKR-Regular.ttf, NotoSansKR-Bold.ttf
```

---

## 환경변수 (.env)

```env
# GCP
GCP_PROJECT_ID=tshirtsmaker-prod-260214-1878
VERTEX_PROJECT_ID=tshirtsmaker-prod-260214-1878
VERTEX_LOCATION=us-central1

# 결제 (토스페이 — docs-pay.toss.im)
TOSS_PAY_API_KEY=sk_live_...

# 이메일
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=<gmail>
SMTP_PASS=<app-password>

# 배경 제거
REMOVE_BG_PROVIDER=rembg
```

> `.env`는 git ignore됨. 배포 시 시크릿 매니저 사용.

---

## 인쇄 파이프라인 흐름

```
사용자 이미지 (800×800)
  → Vertex AI Imagen 4.0 업스케일 (3200×3200)
  → rembg 배경 제거 (고해상도 정밀 처리)
  → QC 검증 (alpha 채널, 투명도, 해상도)
  → 인쇄 영역 배치 (cm → px)
  → Print-ready PNG
  → PDFKit 주문서 (한글)
  → Gmail SMTP 발송 (주문서 + 인쇄파일 첨부)
```

---

## 참고 문서

| 문서 | 위치 | 내용 |
|------|------|------|
| 서비스 블루프린트 | `docs/SERVICE_BLUEPRINT.md` | UI/UX, 뷰포트 분석, CTA, 디자인 시스템, API |
| 검증 워크플로우 | `.claude/verification_workflow.md` | 빌드/타입체크/시뮬레이터 |
| 런치 설정 | `.claude/launch.json` | 서버 실행 config |

---

## 다음 대화 시작 프롬프트

```
이 프로젝트를 이어서 작업합니다.
- HANDOFF.md를 읽어서 현재 상태를 파악하세요
- docs/SERVICE_BLUEPRINT.md에 전체 서비스 설계가 정리되어 있습니다
- 브랜치: main, 최신 빌드 완료 (merchandisegpt.ait)
- 주요 완료: 업스케일/배경제거/결제/이메일/한글PDF/에디터줌/패널스크롤
- 남은 과제: [원하는 작업 설명]
```
