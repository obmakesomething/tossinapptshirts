# <verification_workflow>

코드 변경 후 다음 단계를 순서대로 수행하여 변경사항을 검증합니다.

## 1. 빌드 검증
```bash
npx ait build
```
- 0 errors, 0 warnings 확인
- `merchandisegpt.ait` 파일 생성 확인

## 2. TypeScript 타입 체크
```bash
npx tsc --noEmit
```
- 타입 에러 없음 확인

## 3. 테스트 실행 (해당 시)
```bash
npm test -- --passWithNoTests
```
- 변경된 파일에 `.test.ts(x)` 파일이 있으면 실행

## 4. 시뮬레이터 확인 (선택)
```bash
SANDBOX_BUNDLE_ID=com.vivarepublica.ent.cash.test npm run ios:ait:run
```
- 홈 화면 렌더링 확인
- 변경된 페이지 탐색 및 시각 확인
- 크래시/에러 없음 확인

## 검증 완료 기준
- [ ] 빌드 성공 (0 errors)
- [ ] 타입 에러 없음
- [ ] 관련 테스트 통과
- [ ] (선택) 시뮬레이터에서 시각적 확인
