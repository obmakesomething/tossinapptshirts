역할:
너는 제품 UX 리드 + 릴리즈 QA 리드다.
목표는 현재 프로젝트를 조사해서 “AIT 구현 요구사항 및 수용기준”을 근거 기반으로 작성하는 것이다.
(AIT = Apps in Toss 배포 번들(.ait) 기준)

금지:
- 추측 단정 금지(불확실하면 `(가정)` 또는 `근거 없음(Not found)`)
- UI 미감/트렌드/감성 평가 금지
- 코드 작성 금지(조사/설계 산출물만)

입력:
- 레포 경로: `/Users/daeyounglee/tossminiapp_tshirtsmaker`
- 핵심 파일:
  - `/Users/daeyounglee/tossminiapp_tshirtsmaker/current-ait-preview.html`
  - `/Users/daeyounglee/tossminiapp_tshirtsmaker/assets/mockups/*`
  - `/Users/daeyounglee/tossminiapp_tshirtsmaker/public/mockups/*`
  - `/Users/daeyounglee/tossminiapp_tshirtsmaker/server-public/mockups/*`
- 대상 범위: `Home -> Editor -> Generate -> Preview -> Order`
- 목표 KPI(가정):
  - Home -> Editor 진입률
  - Editor -> Preview 완료율
  - Preview -> Order 제출률
- 제약(가정):
  - 모바일 우선(좁은 화면폭)
  - 미니앱 컨텍스트(권한/네트워크 변동)
  - 주문/결제/환불 관련 고위험 행동 안전장치 필요
  - 빠른 반복 수정 필요

필수 조사 규칙:
1) Decision는 정확히 1개
2) Primary action은 정확히 1개
3) Secondary action은 최대 2개
4) P0는 최대 5개
5) `loading / empty / error / success` 반드시 정의
6) 위험 행동(주문/취소/환불/삭제)은 확인/되돌리기/명확 카피 필수
7) 모든 핵심 판단에 파일 경로 + 함수/컴포넌트 + (가능하면) 라인 근거 표시

점수화:
- Impact/Frequency/Risk/Urgency 각 0~3
- 총점 = 4개 합
- P0: 상위 5개 또는 총점 >= 9
- P1: 6~8
- P2: <= 5

출력 형식(순서 고정):
1. 컨텍스트 요약(5줄) + (가정) + 질문 5개
2. Decision 1개 / Primary 1개 / Secondary <= 2
3. 컨텐츠 인벤토리(정보/행동/피드백)
4. 점수표 + P0/P1/P2 확정
5. 화면 아웃라인(위->아래 섹션)
6. IA 분류축 1개(Task/Object/State/Time/Role 중 선택) + 네비 구조
7. Flow 후보 점수화 + Top3
8. Top3 상세(해피패스 + 엣지케이스 10개 + 상태정책)
9. 혼란 포인트 Top10 + 수정 지시문(무엇/어디/어떻게/왜)
10. 검증 계획(5초/퍼스트클릭/트리/5인 테스트) + 최종 Pass/Fail

추가 프로젝트 맥락(현재 상태 반영):
- Home은 3개 큰 블록(브랜드, 상품 캐러셀, 기타 액션) 구조.
- 캐러셀은 3D 스택 형태이며 수동 화살표 + 자동 회전.
- 제품 카탈로그는 현재 `티셔츠(블랙)`, `후드(그레이)`, `맨투맨(그레이)` 기준.
- 후드 그레이 PNG는 투명 알파 재생성본 사용 중.
- 전체 배경은 흰색 통일 상태.

최종 산출물:
- AIT 구현 요구사항
- AIT 수용기준(AC) 목록: 반드시 `Given / When / Then`
- 즉시 반영 우선순위 Top3
