# 재출시 노트 — UI/UX 전면 개편 (토스 네이티브 뉴트럴)

> 빌드: `merchandisegpt.ait` (3.6MB) · RN 0.84.0 / 0.72.6 듀얼 빌드 · 0 errors, 0 warnings
> 브랜치: `claude/ui-ux-overhaul-e8e583`

---

## 콘솔 "변경사항" 입력용 요약

```
전체 화면 UI/UX 개편

· 디자인 시스템을 토스 앱과 동일한 뉴트럴 그레이스케일 + 블루 포인트로 교체
· 16개 전 화면(홈/에디터/생성/업로드/미리보기/주문/주문완료/주문내역/주문상세/
  카탈로그/저장/FAQ/문의/개인정보/이용약관/404) 리스타일
· 이모지 아이콘(✅⚠️❌▲▼✕)을 벡터 도형 아이콘으로 교체 — 기기·OS별 렌더 편차 제거
· 본문/버튼 텍스트 색상 WCAG AA 대비 확보
· FAQ 이중 스크롤 제거 → 단일 스크롤 + 카테고리 필터
· 터치 타깃 최소 44pt 확보, 접근성 role/state 라벨 보강
```

---

## 상세 변경 내역

### 1. 디자인 토큰 ([src/components/ui.tsx](../src/components/ui.tsx))

| 항목 | 이전 | 이후 |
|------|------|------|
| 페이지 배경 | `#FFFAF5` (웜 크림) | `#F2F4F6` |
| 카드 | `#FFFFFF` + 웜 보더 + 브라운 그림자 | `#FFFFFF` + radius 20 + 4% 그림자 |
| 본문 텍스트 | `#2E231B` / `#7C6959` / `#7A6B5D` | `#191F28` / `#4E5968` / `#8B95A1` |
| 포인트 | `#2A6ED4` | `#1B64DA` (fill·text) / `#3182F6` (장식) |
| 보더 | `#F0DFCF` 계열 | `#E5E8EB` / divider `#F2F4F6` |
| 라디우스 | 6 / 14 / 18 / 24 혼용 | 8 / 12 / 16 / 20 / 24 토큰 |
| 그림자 | 브라운 `#5F320E`, opacity 0.14~0.30 | 뉴트럴 `#191F28`, opacity 0.04~0.08 |

**대비 검증**: 흰 텍스트 / `#1B64DA` = 5.4:1, `#4E5968` / 흰 배경 = 7.4:1 — 모두 AA 통과.
장식 전용 `#3182F6`은 텍스트에 사용하지 않음.

### 2. 공통 컴포넌트

- **버튼**: 높이 56/48/38 3단계, radius 16, 그림자 제거, `loading` 상태 추가, disabled를 opacity 대신 전용 색으로 표현
- **Badge**: 이모지 → 컬러 도트 + 텍스트 pill (`success`/`warning`/`error`/`info`/`neutral`)
- **Chevron / CloseIcon**: 문자(`▲▼✕`) 대신 CSS 보더 기반 벡터 도형 — 폰트 의존성 제거
- **Toast**: 다크 뉴트럴 플로팅 pill + 상태 도트, 로딩은 스피너로 교체
- **신규**: `SectionTitle`, `ListRow`, `EmptyState`, `Skeleton`, `SegmentedControl`, `Chevron`, `CloseIcon`
- **BottomSheet**: radius 24, 핸들 `#D1D6DB`, 최대 높이 78%

### 3. 화면별

| 화면 | 변경 |
|------|------|
| 홈 | 히어로를 카드에서 분리 — 페이지 위 플랫 배치, 뱃지 1개로 축소, FAQ에 `SectionTitle`/`Chevron` 적용 |
| 미리보기 | 인쇄 품질을 `Badge`로, 배송 안내를 `ListRow`로, 장식용 배경 원(orb) 제거 |
| 주문 완료 | 이모지 ✅ → 벡터 체크마크 원형 마크, 주문번호 pill, 안내를 `ListRow`로 |
| FAQ | 이중 스크롤 제거(단일 스크롤 + 카테고리 필터), 카테고리 이모지 제거, `Chip` 공용 컴포넌트 사용 |
| 에디터 | 패널 토글 `▲▼` → `Chevron`, 사진 삭제 `✕` → `CloseIcon` |
| 생성/업로드/주문 | 장식용 배경 원 제거, 카드 중복 보더 제거 |
| 404 | 스타일 없는 기본 화면 → 디자인 시스템 적용 |
| 전 화면 공통 | 웜톤 하드코딩 색상 → 토큰, `fontWeight` 800/900 → 700, 라디우스 스케일 정리 |

### 4. 부수 수정

- `src/utils/analytics.test.ts` — 커밋 `e5c6a127`에서 이벤트명 날짜 접미사를 제거했으나 테스트가 갱신되지 않아 계속 실패하던 것을 현재 스키마에 맞춤

---

## 검증 결과

| 검증 | 결과 |
|------|------|
| `npx tsc --noEmit` | 통과 (에러 0) |
| `npx ait build` | 통과 — 1704 모듈, 0 errors, 0 warnings, 듀얼 런타임 |
| `npm test` | 10 suites / 27 tests 전부 통과 |
| `npx biome check src` | 108건 (개편 전 110건) — 전부 기존 이슈, 신규 추가분 없음 |
| 시뮬레이터 육안 확인 | **미실시** — 아래 참고 |

> **시뮬레이터 확인이 안 된 이유**: 미니앱은 Toss Sandbox 앱 안에서 로그인 →
> 워크스페이스 → 앱 선택 순서로만 실행할 수 있는데, 이 머신의 시뮬레이터 어디에도
> Sandbox 앱(`com.vivarepublica.ent.cash.test`)이 설치돼 있지 않습니다.
> Sandbox 앱을 설치한 뒤 `SANDBOX_BUNDLE_ID=com.vivarepublica.ent.cash.test npm run ios:ait:run`
> 으로 확인이 필요합니다.

---

## 제출 경로

### 콘솔

- 웹 콘솔: **https://apps-in-toss.toss.im/**
- 심사 소요: 번들 검토 최대 영업일 3일 / 앱 정보 검토 1~2일
- 번들 용량 제한: 압축 해제 기준 100MB (현재 `merchandisegpt.ait` 3.6MB)
- 흐름: 번들 업로드 → `검토 요청하기` → 승인 후 `출시하기`

### Console MCP (권장 — 브라우저 없이 처리 가능)

앱인토스가 콘솔용 MCP 서버를 공식 제공합니다. `bundle_upload`,
`bundle_submit_review`, `bundle_set_release_note`, `bundle_rollback` 등을 노출합니다.

```bash
claude mcp add --transport http apps-in-toss-console https://mcp.toss.im/adapters/apps-in-toss-console/mcp --client-id mcp-gateway
```

등록 후 대화형 `claude` 세션에서 `/mcp` → 어댑터 선택 → Toss SSO + Biz Login 인증.
`Connected` 표시되면 업로드·검토 요청을 대화로 진행할 수 있습니다.

> 인증은 OAuth라 비대화형 세션에서는 진행할 수 없습니다.

출처: [콘솔 MCP 가이드](https://developers-apps-in-toss.toss.im/guide/console-mcp.md),
[미니앱 등록하기](https://developers-apps-in-toss.toss.im/guide/operation/console-workspace.md),
[미니앱 출시하기](https://developers-apps-in-toss.toss.im/guide/operation/deploy.md)

## 제출 전 체크리스트

- [ ] Sandbox 시뮬레이터에서 17개 화면 육안 확인 (특히 홈 / 에디터 / 미리보기 / 주문)
- [ ] 에디터 하단 패널 토글·사진 삭제 버튼 동작 확인 (아이콘 교체분)
- [ ] Toast 다크 pill이 밝은 화면·어두운 화면 양쪽에서 읽히는지 확인
- [ ] 콘솔에서 앱 버전 증가 후 `merchandisegpt.ait` 업로드
- [ ] 변경사항 필드에 위 "콘솔 입력용 요약" 붙여넣기
- [ ] 심사 제출

### 시뮬레이터 샌드박스 앱

육안 확인이 필요할 때 (2026-06-05 빌드, 68,205,039 바이트):

```bash
curl -L -o ~/Downloads/ait-sandbox.zip https://static.toss.im/appsintoss/apps-in-toss-sandbox-202606022149.zip
```

압축 해제 후 `.app`을 시뮬레이터 화면에 드래그 앤 드롭 → 샌드박스 앱 실행 →
로그인 → 워크스페이스 → 스킴 입력란에 `intoss://merchandisegpt`.

---

## 알려진 환경 이슈

이 워크트리에서 `npx ait build`가 처음 실패했습니다. 원인과 조치:

1. 워크트리에 `node_modules`가 없어 상위 저장소 것을 참조 → 상위에 `@apps-in-toss/web-framework`,
   `@google-cloud/storage`, `@google/genai`, `google-auth-library`가 없어 패키지 버전 수집 단계에서 실패
2. 워크트리에서 `npm install` 후에는 `granite` 바이너리가 `@apps-in-toss/web-framework/bin.js`로
   연결돼 `--no-cache` 옵션을 못 받아 실패 (RN용은 `@granite-js/react-native/bin/cli.js`)

조치: `ln -sf ../@granite-js/react-native/bin/cli.js node_modules/.bin/granite`

> `@granite-js/react-native`와 `@apps-in-toss/web-framework`가 둘 다 `granite` bin을 제공해
> 설치 순서에 따라 링크 대상이 달라집니다. 상위 저장소에서도 `npm install`을 다시 하면
> 같은 문제가 재현될 수 있습니다.
