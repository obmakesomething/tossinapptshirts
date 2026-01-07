# Update Log (tossinapptshirts)

프로젝트: Apps in Toss 미니앱 `merchandisegpt`  
배포: Railway `tossinapptshirts-production.up.railway.app`  
스토리지: Railway S3-compatible

## 오류 요약 (관측된 로그 기반)
1. 컨테이너 시작 실패: `ERR_UNKNOWN_FILE_EXTENSION` (ts 파일 직접 실행).
2. 런타임 문법 오류: `Invalid regular expression flags` (URL replace 정규식 문제).
3. OpenAI 이미지 생성 400: `Unknown parameter: 'response_format'` → `/v1/images/generate` 500.
4. S3 업로드 실패: `ENOTFOUND customizable-box-u-iz3yrp.s3.auto.amazonaws.com` (endpoint 누락/오설정).
5. 배경 제거 실패: `download_failed` (이미지 URL 접근 실패).
6. Railway 재시작/연결 끊김: `SIGTERM`, `connection closed unexpectedly` (배포/리스타트 영향).

## 업데이트/수정 내역
### 서버
- 요청/응답 로깅 추가 (`request_in`, `request_out`, duration 포함).
- 업로드/생성/배경제거 결과 로그 추가:
  - `image_upload_result`, `image_generate_result`, `remove_background_result`.
- OpenAI 요청에서 지원하지 않는 `response_format` 제거.
- Railway Storage 대응:
  - `S3_ENDPOINT` 자동/명시 보정
  - `S3_PUBLIC_BASE_URL` 기반 퍼블릭 URL 계산
- 이미지 생성 결과가 비어 있으면 `image_generate_empty`로 에러 노출.

### UI/UX
- 업로드 화면 단일 + 박스:
  - 로컬 base64 프리뷰 즉시 표시
  - 업로드 완료 시 S3 URL로 교체
  - 버튼은 “배경 제거하기 / 예상 이미지 만들기”만 유지
- AI 생성 화면:
  - 결과 1장만 표시, 중앙 배치
  - 프롬프트 예시 제공, 입력 포커스 시 예시 숨김
  - 배경 제거 버튼 제공
- 편집 화면:
  - 프린팅 영역 상단 배치
  - 꾹 누르면 편집 모드 진입
  - 드래그/핀치/회전 지원
  - 배경 탭 시 편집 해제

### 번들
- `merchandisegpt.ait` 재빌드 및 업데이트 반영

## 시도한 조치(요약)
- OpenAI 이미지 파라미터 정합성 수정
- S3 endpoint 명시/자동화 테스트
- 업로드 이미지 즉시 프리뷰로 전환
- 배경 제거를 URL 대신 dataUrl로 호출
- 로그 추가로 실패 원인 추적

## 체크리스트 (남은 확인 항목)
- Railway ENV 확인:
  - `S3_ENDPOINT=https://storage.railway.app`
  - `S3_PUBLIC_BASE_URL=https://customizable-box-u-iz3yrp.storage.railway.app`
  - `S3_BUCKET=customizable-box-u-iz3yrp`
  - `S3_FORCE_PATH_STYLE=false`
- OpenAI 이미지 모델/퀄리티 정상 동작 확인
- 배경 제거(Clipdrop) 응답 정상 여부 확인
- 앱에서 이미지 결과 표시 확인
