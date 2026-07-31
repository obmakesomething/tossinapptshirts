# 앱인토스 재출시 제출 체크리스트

> 브랜치 `claude/ui-ux-overhaul-e8e583` · 최종 커밋 `e0e3ab4a`
> 번들 `merchandisegpt.ait` 3.6MB (제한 100MB)

---

## 제출 전 확인

| | 상태 |
|---|---|
| 백엔드 `/health` 전 항목 정상 | ✅ |
| 번들에 새 API 주소 반영 | ✅ `merchandisegpt-api.vercel.app` (옛 Cloud Run 주소 0건) |
| 타입체크 / 테스트 / 빌드 | ✅ 0 errors, 60/60, 듀얼 런타임 |
| **실기기 화면 확인** | ❌ **미실시 — 아래 2단계에서 반드시** |
| 콘솔 탈퇴 콜백 등록 | ❌ 미등록 (현재 엔드포인트 503) |

---

## 1. 콘솔에 탈퇴 콜백 등록

`유저정보 불러오기 → 콜백 정보`

| 칸 | 값 |
|---|---|
| 콜백 URL | `https://merchandisegpt-api.vercel.app/v1/toss/disconnect` |
| HTTP 메서드 | `POST` |
| Basic Auth 헤더 | 아래에서 생성 |

Basic Auth 값은 직접 정한 아이디/비밀번호로 만듭니다:

```bash
printf '%s' 'USERNAME:PASSWORD' | base64
```

**같은 값을 Vercel에도 넣어야 합니다.** 하나라도 빠지면 엔드포인트가 503으로 닫힙니다(의도된 fail-closed 동작).

```bash
vercel env add TOSS_CALLBACK_USERNAME production
vercel env add TOSS_CALLBACK_PASSWORD production
vercel deploy --prod --yes
```

등록 후 검증 — **401이 나와야 정상**입니다:

```bash
curl -i -X POST https://merchandisegpt-api.vercel.app/v1/toss/disconnect \
  -H 'Content-Type: application/json' -d '{"userId":"probe"}'
```

503이면 환경변수가 아직 반영되지 않은 것이고, 200이면 인증이 뚫린 것이니 즉시 확인이 필요합니다.

---

## 2. 번들 업로드 후 실기기 테스트

**테스트 1회 완료가 검토 요청의 전제조건입니다.**

1. 콘솔에 `merchandisegpt.ait` 업로드
2. `테스트하기` 클릭 → QR 코드 확인
3. 실제 토스 앱으로 스캔 → 미니앱 실행

### 중점 확인 항목

이번 변경 중 빌드로는 검증되지 않는 것들입니다.

| 화면 | 확인할 것 | 왜 |
|---|---|---|
| 홈 | 목업 이미지가 뜨는지 | 정적 서빙 경로가 바뀜 |
| 전 화면 | 색·간격·아이콘 | UI 전면 개편 |
| 에디터 | 패널 토글, 사진 삭제 버튼 | 문자 아이콘 → 벡터 도형 교체 |
| 업로드 | **투명 PNG 올렸을 때 배경이 유지되는지** | 알파 보존 버그 수정분 |
| 미리보기 | 해상도 배지가 실제 값으로 나오는지 | 하드코딩 제거 |
| 주문 | **로그인 → 결제** | 세션을 컨텍스트로 옮김. 가장 위험한 변경 |
| 주문내역 / 상세 | 목록·상세가 뜨는지 | 신규 엔드포인트 |
| FAQ | 스크롤이 한 겹인지 | 이중 스크롤 제거 |

이상이 보이면 스크린샷을 남겨두시면 원인 파악이 빠릅니다.

---

## 3. 검토 요청 → 출시

콘솔 "변경사항" 칸에 붙여넣을 요약:

```
전체 화면 UI/UX 개편 및 백엔드 재구축

· 디자인 시스템을 토스 앱과 동일한 뉴트럴 그레이스케일 + 블루 포인트로 교체
· 17개 전 화면 리스타일, 이모지 아이콘을 벡터 도형으로 교체
· 본문/버튼 텍스트 WCAG AA 대비 확보
· FAQ 이중 스크롤 제거, 터치 타깃 44pt 확보
· SDK 최신화 (@apps-in-toss 2.0.9 → 2.10.8, @granite-js 1.0.8 → 1.0.38)
· 주문 내역/상세 조회 기능 추가
· 배경 제거·AI 업스케일 기능 제거, 저해상도 안내로 대체
· 회원 탈퇴 시 주문·문의 데이터 파기 처리 구현
· 백엔드를 Vercel로 이전, 데이터베이스를 Supabase로 전환
```

---

## 알아둘 것

- **환경변수 변경은 재배포해야 반영됩니다.** `vercel deploy --prod --yes`
- `npm install` 후 dev 서버가 `config.web.commands`로 죽으면 `granite` bin이 web-framework로 재링크된 것입니다:
  ```bash
  ln -sf ../@granite-js/react-native/bin/cli.js node_modules/.bin/granite
  ```
- 시뮬레이터에서 미니앱이 빈 화면이면 dev 번들 서버를 확인하세요:
  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:8081/index.bundle?platform=ios&dev=true"
  ```
- `@apps-in-toss/ait-format`이 `node >=24`를 요구하는데 `.nvmrc`는 v22.12.0입니다. 현재는 빌드가 통과하지만 언젠가 걸립니다.
