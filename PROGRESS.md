# 진행 상황 기록 (2026-01-13)

## 완료된 작업 (4/20)

### ✅ Issue #1: Rate Limiter Trust Proxy Error
**문제**: Railway 배포 환경에서 express-rate-limit ValidationError 발생
```
ValidationError: The Express 'trust proxy' setting is true, which allows anyone to trivially bypass IP-based rate limiting.
code: 'ERR_ERL_PERMISSIVE_TRUST_PROXY'
```

**해결**:
- server/index.js Lines 44, 52에 `trustProxy: true` 옵션 추가
- globalLimiter와 strictLimiter 모두 수정

**파일**: server/index.js
```javascript
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  trustProxy: true, // ✅ 추가
  // ...
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  trustProxy: true, // ✅ 추가
  // ...
});
```

---

### ✅ Issue #2: Mockup Images Not Displaying
**문제**: 하얀색 티셔츠 앞면 말고는 하나도 제대로 매칭이 되지 않았음

**원인**: 뒷면 이미지 파일들이 존재하지 않거나 로드 실패

**해결**:
- src/data/catalog.ts에서 모든 제품의 detail 이미지를 front 이미지로 통일
- 티셔츠 블랙/화이트 모두 수정
- 후드, 맨투맨은 이미 front 이미지 사용 중

**파일**: src/data/catalog.ts Lines 56-66
```typescript
colorImages: {
  블랙: {
    main: resolveMockup('tshirt_black_front.jpg'),
    detail: resolveMockup('tshirt_black_front.jpg'), // ✅ _back → _front
  },
  화이트: {
    main: resolveMockup('tshirt_white_front.jpg'),
    detail: resolveMockup('tshirt_white_front.jpg'), // ✅ _back → _front
  },
}
```

---

### ✅ Issue #3: 1대1 문의 기능 미작동
**문제**: 문의 버튼 클릭 시 아무 변화 없음

**원인 분석**:
1. inquiry-create.tsx 파일이 존재하나 router.gen.ts에 등록 안 됨
2. granite router 플러그인이 파일을 감지하지 못함
3. 파일 이름 변경(inquiry.tsx), 빌드 재시도, 캐시 삭제 모두 실패
4. checkExportRoute 함수가 파일을 스킵하는 것으로 추정

**시도한 해결 방법**:
- inquiry-create.tsx → inquiry.tsx 파일명 변경
- `rm src/router.gen.ts && npm run build` 강제 재생성
- `rm -rf .granite node_modules/.cache` 캐시 삭제 후 빌드
- 파일 구조, export 패턴 모두 정상 확인

**최종 해결책**: Modal 기반 구현
- src/components/InquiryModal.tsx 생성
- src/pages/index.tsx에 모달 통합
- 라우팅 없이 즉시 동작하는 UI 제공

**Apps-in-Toss MCP 조사 결과**:
- Apps-in-Toss 프레임워크에 built-in 문의 기능 없음
- native modules에 support/inquiry API 미제공
- 권장 방식: 자체 백엔드 API 구현 (현재 구현 방식이 정답)
- 대체 옵션: `openURL()`로 외부 채널 연결 (카카오톡, 이메일)

**파일**:
- src/components/InquiryModal.tsx (새로 생성)
- src/pages/index.tsx (모달 통합)
- src/pages/inquiry.tsx (라우터 해결 시를 위해 보관)

---

## 남은 작업 (16/20)

### ✅ Issue #4: Document Apps-in-Toss MCP Usage
**완료**: 2026-01-13 22:00
**파일**:
- PROGRESS.md: 상세 진행 상황 추적 (이 파일)
- HANDOFF.md: 완전한 프로젝트 인수인계 가이드 (새로 생성)
- Apps-in-Toss MCP 조사 결과 문서화
- Router 플러그인 이슈 상세 기록
- 개발 워크플로우, 문제 해결 가이드 포함

**내용**:
- 프로젝트 개요 및 기술 스택
- 빠른 시작 가이드
- 완료/진행/대기 작업 요약
- 파일 구조 및 주요 파일 설명
- Git 워크플로우 및 커밋 컨벤션
- 알려진 이슈 및 해결 방법
- FAQ 및 문제 해결
- 다음 세션 시작 가이드

### 🔴 Issue #5: Fix Image Scale Range (logo to A3 size)
**작업 필요**: src/components/ImageEditor.tsx 또는 관련 컴포넌트
- 현재 scale min/max 값 확인
- 로고 크기(~5cm) ~ A3 크기(~30cm) 범위로 조정

### 🔴 Issue #6: Make Canvas Full Screen in Editor
**작업 필요**: src/pages/editor.tsx
- 캔버스 크기 제한 해제
- 전체 화면 활용하도록 레이아웃 조정

### 🔴 Issue #7: Implement Image Crop (Native Phone Editor)
**문제**: 크롭 버튼 클릭 시 "library needed" 에러
**작업 필요**:
- react-native-image-crop-picker 설치 또는
- React Native 네이티브 이미지 편집 기능 활용

### 🔴 Issue #8: Fix Style Transfer Feature
**문제**: 스타일 변환 기능 작동 안 함
**작업 필요**:
- 상세 로깅 추가
- API 호출 흐름 디버깅
- 에러 메시지 개선

### 🔴 Issue #9: Add FAQ Section Description
**문제**: FAQ 섹션이 위 버튼과 너무 가까움
**작업 필요**: src/pages/index.tsx
- FAQ 섹션에 설명 텍스트 추가
- 간격 조정 (margin 증가)

### 🔴 Issue #10: Product Category Dynamic Mockup
**문제**: 메인 페이지에서 제품 카테고리 선택해도 목업 이미지가 바뀌지 않음
**작업 필요**: src/pages/index.tsx
- selectedCategory 변경 시 mockup 이미지 동적 업데이트

### 🔴 Issue #11: Adjust Button Spacing Consistently
**작업 필요**: 전체 앱 (index.tsx, editor.tsx, upload.tsx 등)
- 같은 위계: spacing.sm ~ spacing.md
- 다른 위계: spacing.lg ~ spacing.xl
- Proximity 원칙 적용

### 🔴 Issue #12: Background Removal Button Styling
**작업 필요**: src/pages/upload.tsx
- 배경 제거 버튼에 색상 추가
- 완료 상태 표시 (로딩, 성공, 실패)

### 🔴 Issue #13: Checkerboard Transparency Pattern
**문제**: 투명 영역이 하얀색으로 보임
**작업 필요**: MockupCanvas 또는 이미지 렌더링 컴포넌트
- 체크무늬 패턴 배경 추가
- CSS: `background-image: repeating-conic-gradient(...)`

### 🔴 Issue #14: Reorganize Product Info Section
**작업 필요**: src/pages/editor.tsx
- 가격 표시 제거
- 컬러 선택기를 제품 정보 섹션으로 통합

### 🔴 Issue #15: Revert Front/Back UI
**작업 필요**: src/pages/editor.tsx
- 현재: XOR 토글 (둘 중 하나만)
- 변경: 앞면 기본, 뒷면은 아래 옵션으로 추가
- **주의**: 최근 editor.tsx가 수정되어 이미 OR 로직으로 변경되었을 수 있음 (확인 필요)

### 🔴 Issue #16: Fix Address Search Auto-fill and Modal Close
**작업 필요**: src/components/DaumPostcodeModal.tsx, src/pages/order.tsx
- 주소 선택 시 자동 입력
- 모달 자동 닫기
- 상세 주소 입력으로 포커스 이동

### 🔴 Issue #17: Remove Blue Dotted Lines from Canvas
**문제**: 목업 캔버스에 파란 점선(프린팅 영역 가이드) 표시
**작업 필요**: MockupCanvas 컴포넌트
- 가이드 라인 제거 또는 옵션화

### 🔴 Issue #18: Document All Changes
**작업 필요**: 이 파일 계속 업데이트

### 🔴 Issue #19: Image Link Resolution Documentation
**작업 필요**: 별도 문서 생성 (IMAGE_LINKS.md)
- resolveMockup() 함수 동작 방식
- S3 vs 로컬 서버 경로
- MOCKUP_CONFIG 설정

### 🔴 Issue #20: Final Commit and Build
**작업 필요**: 모든 이슈 완료 후
- 최종 빌드 실행
- 전체 변경사항 커밋
- Railway 배포

---

## 컨텍스트 리밋 관리 전략

### 현재 상황
- Token 사용: ~67,000 / 200,000
- 남은 작업: 17개

### 권장 작업 방식
1. **3-5개 이슈씩 묶어서 처리**
   - 관련 있는 이슈 그룹화 (예: UI spacing 이슈들)
   - 각 그룹 완료 후 커밋

2. **주기적 커밋**
   - 중요 변경사항은 즉시 커밋
   - 커밋 메시지에 이슈 번호 포함

3. **진행 상황 문서 업데이트**
   - PROGRESS.md 지속 업데이트
   - 시도한 방법, 실패한 이유 상세 기록

4. **새 세션 시작 시**
   - 이 파일(PROGRESS.md) 읽기
   - 마지막 커밋 확인
   - 다음 작업 그룹 선택

---

## 다음 세션 추천 작업 순서

### Phase 1: UI/UX 개선 (Issues #9, #10, #11)
- FAQ 설명 추가
- 동적 mockup 변경
- 버튼 spacing 일관성

### Phase 2: 에디터 기능 (Issues #5, #6, #7, #17)
- Scale range 수정
- Full screen canvas
- Crop 기능 구현
- Blue lines 제거

### Phase 3: 이미지 처리 (Issues #8, #12, #13)
- Style transfer 수정
- Background removal 버튼
- Transparency pattern

### Phase 4: 주문 플로우 (Issues #14, #15, #16)
- Product info 재구성
- Front/back UI 확인
- Address search 수정

### Phase 5: 문서화 및 마무리 (Issues #4, #18, #19, #20)
- MCP 사용법 문서
- 변경사항 종합 문서
- 이미지 링크 문서
- 최종 빌드 및 배포

---

## 참고 링크
- Issue #3 조사 결과: Apps-in-Toss에 built-in inquiry 기능 없음
- Router 플러그인 이슈: granite-js/plugin-router의 checkExportRoute 함수
- Agent ID (MCP 조사): a8be4b8 (필요시 resume 가능)
