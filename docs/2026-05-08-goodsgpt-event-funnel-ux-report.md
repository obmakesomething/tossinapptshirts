# 굿즈GPT 이벤트 퍼널 및 UX/UI 진단 보고서

- 작성일: 2026-05-08
- 기준 화면: Apps in Toss 콘솔 > 굿즈 Gpt > 분석 > 이벤트, 전환 지표
- 데이터 기준: 이벤트 화면 최근 14일 발생 수, 전환 지표 화면 2026.05.01-2026.05.08
- 콘솔 상태: 조회 시점 기준 1분 내외 업데이트

## 1. 요약

굿즈GPT는 홈 진입, CTA 클릭, 에디터 진입, 생성 제출까지의 상단 퍼널은 살아 있다. 특히 `home_primary_cta_click / home_screen_view`는 89 / 288 = 30.9%로, 첫 화면의 기본 관심도는 낮지 않다.

반면 주문 하단 퍼널은 명확하게 막혀 있다. 최근 14일 기준 `editor_order_click` 11건, `/order::screen` 14건까지는 발생하지만 `order_submit_click`, `order_checkout_screen_view`, `order_checkout_failed`, 결제 관련 이벤트는 모두 0건이다. 현재 문제는 단순 유입 부족보다 "주문 제출 또는 체크아웃 단계까지 사용자가 진행하지 못하거나, 해당 단계 이벤트가 현재 플로우에서 정상 기록되지 않는 상태"로 보는 것이 타당하다.

## 2. 주요 이벤트 수치

| 구간 | 이벤트명 | 최근 14일 발생 수 | 최초 발생일 | 해석 |
| --- | ---: | ---: | ---: | --- |
| 미분류/플랫폼 | 이벤트명 없는 row | 894 | 2026.04.16 | 이름 없는 이벤트 bucket. 분석 기준 이벤트로 쓰기 어려움 |
| 방문/홈 | `/::screen` | 389 | - | 루트 화면 진입 |
| 홈 | `home_screen_view` | 288 | - | 홈 화면 view |
| 홈 | `home_hero_impression` | 288 | - | hero 노출 |
| 홈 CTA | `home_primary_cta_click` | 89 | - | 홈 CTA 반응. 홈 대비 30.9% |
| 에디터 | `/editor::screen` | 161 | - | 에디터 route 진입 |
| 에디터 | `editor_screen_view` | 100 | - | 에디터 화면 view |
| 생성 | `generate_submit_click` | 73 | 2026.04.04 | 생성 제출 의도 |
| 생성 | `/generate::screen` | 33 | - | generate route 진입 |
| 생성 | `generate_screen_view` | 30 | - | generate 화면 view |
| 시작 | `create_start_click` | 5 | 2026.04.27 | 신규 시작 CTA 추정. 기존 CTA와 괴리가 큼 |
| 미리보기 | `/preview::screen` | 10 | 2026.01.06 | 미리보기 route 진입 |
| 미리보기 | `editor_preview_click` | 8 | 2026.04.09 | 에디터에서 미리보기 클릭 |
| 미리보기 | `preview_module_impression` | 3 | 2026.05.08 | 신규 미리보기 모듈 노출 |
| 미리보기 | `preview_view_screen_view` | 1 | 2026.05.08 | 신규 미리보기 화면 view |
| 주문 | `/order::screen` | 14 | 2026.01.06 | 주문 route 진입 |
| 주문 | `editor_order_click` | 11 | 2026.03.29 | 에디터에서 주문 진입 |
| 로그인/주문 | `order_login_screen_view` | 12 | 2026.03.29 | 주문 로그인 화면 노출 |
| 로그인/주문 | `order_login_click` | 7 | 2026.03.29 | 로그인 클릭 |
| 주문 옵션 | `order_option_edit_toggle_click` | 2 | 2026.04.17 | 주문 옵션 수정 토글 |
| 주문 제출 | `order_submit_click` | 0 | 2026.04.17 | 주문 제출 액션 없음 |
| 체크아웃 | `order_checkout_screen_view` | 0 | 2026.04.17 | 체크아웃 화면 진입 없음 |
| 체크아웃 | `order_checkout_failed` | 0 | 2026.04.17 | 체크아웃 실패 기록 없음 |
| 결제/완료 | `payment`, `paid`, `complete` 검색 결과 | 0 | - | 결제/완료 이벤트 발견 안 됨 |

## 3. 전환 지표 상태

전환 지표의 핵심 지표는 `결제`로 설정되어 있다. 상세 문구는 다음과 같다.

- 지표명: 토스페이 결제한 유저
- 설명: 토스페이로 결제를 완료한 유저 수
- 기간: 2026.05.01-2026.05.08
- 관찰 결과: 그래프가 0 baseline에 붙어 있으며 결제 전환 발생을 확인할 수 없음

이 지표는 Apps in Toss 추천/노출 최적화에 직접 연결되는 핵심 전환이므로, UX/UI 수정의 1차 목표는 결제 자체를 늘리는 것보다 먼저 "주문 제출 및 체크아웃 진입이 실제로 발생하고 기록되는 상태"를 만드는 것이다.

## 4. 퍼널 해석

### 4.1 상단 퍼널은 작동 중

홈 화면은 노출 288건, CTA 클릭 89건으로 첫 액션 전환이 30.9%다. 이 수치는 현재 홈 화면 메시지나 CTA 자체가 완전히 실패하고 있다고 보기는 어렵다는 근거다.

에디터 진입도 `editor_screen_view` 100건, `/editor::screen` 161건으로 잡히고 있다. 생성 제출 `generate_submit_click`도 73건이므로, 사용자는 만들기나 편집을 시도하고 있다.

### 4.2 중단 지점은 미리보기/주문 확신 구간

에디터에서 주문으로 이어지는 `editor_order_click`은 11건, `/order::screen`은 14건이다. 다만 미리보기 관련 이벤트는 `/preview::screen` 10건, `preview_view_screen_view` 1건으로 낮다.

이 구간에서는 다음 UX 문제가 의심된다.

- 사용자가 주문 전 품질, 가격, 배송/제작 기간을 충분히 확인하지 못함
- 미리보기 화면이 "결제해도 괜찮다"는 확신을 만들지 못함
- 주문 버튼이 보이더라도 결제 전 정보 부족으로 이탈함
- 에디터에서 바로 주문으로 가는 경우 주문 화면에서 맥락이 끊김

### 4.3 주문 제출 이후는 비어 있음

`order_login_screen_view` 12건, `order_login_click` 7건은 있으나 `order_submit_click`은 0건이다. 즉 사용자는 주문 관련 화면에 도달하지만 제출 버튼까지는 가지 못한다.

가능성이 높은 UX/UI 원인은 다음과 같다.

- 주문 화면의 필수 입력/비활성 사유가 명확하지 않음
- 토스 로그인/주문 정보 입력/결제 CTA의 관계가 복잡하게 보임
- 고정 하단 CTA가 현재 상태와 다음 행동을 충분히 설명하지 못함
- 실패 전 복구 메시지보다 제출 전 막힘이 먼저 발생함

## 5. 이벤트 택소노미 이슈

이번 조회에서 이벤트명 drift가 확인된다.

- `home_primary_cta_click`은 89건이지만 `create_start_click`은 5건이다.
- `generate_submit_click` 73건이 `generate_screen_view` 30건보다 많다.
- `preview_module_impression`, `preview_view_screen_view`는 2026.05.08 최초 발생으로 아직 장기 추세를 보기 어렵다.
- Apps in Toss platform visit 계열 이벤트가 2026.05.05 이후 새로 보인다.

따라서 다음 UX/UI 작업에서는 화면 개선과 함께 이벤트명을 현재 실제 화면 흐름에 맞게 정리해야 한다. 단, 이번 보고서의 결론인 "주문 제출/체크아웃/결제 전환 0"은 이벤트명 drift를 감안해도 바뀌지 않는다.

## 6. UX/UI 개선 목표

### Objective

미리보기에서 주문 제출까지의 하단 퍼널에서 사용자가 결제 전 필요한 확신을 얻고, 주문 제출 단계까지 막힘 없이 진행하도록 UX/UI를 개선한다.

### Scope

- `src/pages/preview.tsx`
- `src/pages/order.tsx`
- `src/pages/editor.tsx`의 주문/미리보기 진입 CTA 영역
- 관련 카피, 상태 표시, validation feedback
- 필요한 경우 `src/utils/analytics.ts`의 하단 퍼널 이벤트명 정리

### Success criteria

1. 미리보기 화면에서 가격, 제작 기간, 인쇄 품질, 정책/환불 제한, 다음 행동이 한 화면 흐름 안에서 명확해진다.
2. 주문 화면에서 비활성 CTA의 사유와 다음 입력 액션이 명확해진다.
3. 다음 검증 시 `order_submit_click` 또는 checkout 진입 이벤트가 0이 아닌 값으로 관찰될 수 있는 상태가 된다.

### Non-goals

- 홈 전체 리디자인은 이번 범위에서 제외한다.
- 상품 카탈로그/가격 정책 자체 변경은 제외한다.
- 결제 서버, mTLS, TossPay API 수정은 UX/UI 이후 별도 검증으로 분리한다.
- 이벤트명 전체 재설계는 제외하고 하단 퍼널 측정에 필요한 최소 정리만 수행한다.

## 7. 권장 개선안

### 7.1 Preview: 결제 전 확신 화면으로 재정의

미리보기는 단순 이미지 확인이 아니라 구매 확신을 만드는 화면이어야 한다.

권장 구성:

- 상단: 완성 mockup과 상품명, 색상, 사이즈, 수량 요약
- 중단: 인쇄 품질 상태, 이미지 해상도/배경 제거 상태, 예상 제작/배송 기간
- 하단: 총 결제 금액, 주문제작 환불 제한 안내, `주문 정보 입력하기` CTA
- 보조 액션: `디자인 다시 수정`, `색상/사이즈 바꾸기`

### 7.2 Order: 제출 전 막힘을 보이는 UX로 전환

주문 화면은 사용자가 "왜 결제 버튼이 안 눌리는지"를 즉시 이해해야 한다.

권장 구성:

- 배송지, 연락처, 옵션, 디자인 파일 준비 상태를 checklist로 표시
- 필수 입력이 빠진 경우 하단 CTA 위에 다음 액션 1개만 표시
- 비활성 CTA는 숨기지 말고 비활성 사유를 짧게 노출
- 주소 검색 실패/취소 시 입력 내용 유지
- 토스 로그인 필요 상태와 주문 정보 입력 상태를 분리해서 표시

### 7.3 Editor CTA: 미리보기 우선 흐름 강화

현재 수치상 에디터에서 주문으로 직접 가는 이벤트가 존재한다. 주문 전 확신이 약하면 바로 주문 진입은 오히려 이탈을 만든다.

권장 방향:

- 에디터 기본 CTA는 `미리보기에서 확인하기`로 둔다.
- 바로 주문 CTA가 있다면 보조 액션으로 낮춘다.
- 디자인 품질이나 선택 옵션이 부족하면 미리보기로 보내기 전에 구체적 사유를 보여준다.

### 7.4 Analytics: 하단 퍼널 이벤트 최소 정리

UX 개선 효과를 확인하려면 다음 이벤트가 연속적으로 찍혀야 한다.

- `preview_screen_view`
- `preview_order_click`
- `order_screen_view`
- `order_required_field_missing`
- `order_submit_click`
- `order_checkout_screen_view`
- `order_checkout_failed`
- `order_payment_complete`

현재 콘솔에서는 `payment`, `paid`, `complete` 검색 결과가 비어 있으므로 결제 완료 이벤트명은 실제 TossPay 연동 방식과 맞춰 별도 확인이 필요하다.

## 8. 검증 계획

### 로컬 검증

- `npm run typecheck`
- `npm run test`
- 주요 화면 수동 smoke: `/editor`, `/preview`, `/order`

### 콘솔 검증

배포 후 24-72시간 내 Apps in Toss 이벤트 콘솔에서 다음을 확인한다.

- `preview_order_click` 또는 대응 이벤트가 발생하는지
- `order_submit_click`이 0에서 벗어나는지
- `order_checkout_screen_view`가 발생하는지
- `order_checkout_failed`가 발생한다면 실패 사유가 UX에서 복구 가능한지
- 전환 지표 `결제`가 계속 0인지

### 판단 기준

1차 성공은 결제 발생이 아니라 하단 퍼널 이벤트가 관찰 가능한 상태가 되는 것이다. 결제가 계속 0이어도 `order_submit_click`과 `order_checkout_screen_view`가 발생하면 UX/UI 막힘과 결제 연동 문제를 분리해서 볼 수 있다.

## 9. 다음 작업 제안

추천 브랜치:

- `codex/fix/order-funnel-ux`

추천 PR 제목:

- `fix(order): improve preview to checkout funnel clarity`

권장 작업 순서:

1. `preview.tsx`를 구매 확신 화면으로 정리한다.
2. `order.tsx`의 필수 입력/비활성 CTA/오류 회복 UI를 정리한다.
3. `editor.tsx`에서 바로 주문보다 미리보기 확인 흐름을 우선한다.
4. 하단 퍼널 이벤트가 빠짐없이 찍히는지 최소 테스트를 추가한다.

[PARKING LOT]
- title: TossPay 결제 완료 이벤트명과 전환 지표 연결 확인
- why deferred: 이번 보고서는 UX/UI 진단이며 결제 서버/mTLS/TossPay API 검증은 별도 기술 검증이 필요함
- suspected files: `server/index.js`, `server/orderStore.js`, `src/pages/order.tsx`, Apps in Toss 전환 지표 설정
- severity: high
- recommended next branch: codex/fix/tosspay-conversion-event

[PARKING LOT]
- title: 이벤트명 taxonomy drift 정리
- why deferred: 하단 퍼널 UX 개선 전에 전체 이벤트명을 바꾸면 지표 비교가 어려움
- suspected files: `src/utils/analytics.ts`, `src/pages/index.tsx`, `src/pages/create.tsx`, `src/pages/generate.tsx`, `src/pages/preview.tsx`, `src/pages/order.tsx`
- severity: medium
- recommended next branch: codex/chore/analytics-taxonomy-alignment
