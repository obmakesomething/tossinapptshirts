# 트래픽 스케일링 가이드

이 문서는 merchandisegpt 서비스의 트래픽 처리 및 스케일링 전략을 설명합니다.

## 🚀 적용된 개선 사항

### 1. Rate Limiting (속도 제한)
- **글로벌 제한**: IP당 15분에 100개 요청
- **엄격한 제한**: 비용이 높은 작업(이미지 생성, 배경 제거 등)은 15분에 20개 요청
- 제한 초과 시 명확한 에러 메시지 반환

### 2. 보안 헤더 (Helmet)
- XSS, Clickjacking 등 일반적인 웹 취약점 방어
- 안전한 HTTP 헤더 자동 설정

### 3. 응답 압축 (Compression)
- Gzip/Deflate 압축으로 네트워크 대역폭 절약
- 응답 속도 향상

### 4. Request Timeout
- 기본 타임아웃: 2분 (120초)
- 환경 변수 `REQUEST_TIMEOUT_MS`로 조정 가능
- 긴 요청이 서버 리소스를 무한정 점유하는 것을 방지

### 5. 프로세스 클러스터링
- CPU 코어 수만큼 워커 프로세스 생성
- 단일 프로세스 대비 처리량 대폭 향상
- 워커 프로세스 장애 시 자동 재시작
- Graceful shutdown 지원

### 6. 개선된 Health Check
- 메모리 사용량 모니터링
- 서비스 상태 확인 (S3, OpenAI, SMTP 등)
- 프로세스 정보 (PID, uptime 등)

## 📊 Railway 배포 설정

### nixpacks.toml
프로젝트 루트에 `nixpacks.toml` 파일이 추가되어 Railway 배포 시 자동으로 적용됩니다:

```toml
[variables]
NODE_ENV = 'production'
REQUEST_TIMEOUT_MS = '120000'
NODE_OPTIONS = '--max-old-space-size=512'
```

### 환경 변수 설정
Railway 대시보드에서 다음 환경 변수를 설정하세요:

#### 필수 설정
- `PORT`: Railway가 자동 설정
- `NODE_ENV`: `production`

#### 서버 설정
- `REQUEST_TIMEOUT_MS`: 요청 타임아웃 (기본: 120000ms = 2분)
- `WEB_CONCURRENCY`: 워커 프로세스 수 (기본: CPU 코어 수)

#### 외부 서비스
- `OPENAI_API_KEY`: OpenAI API 키
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: S3 인증
- `S3_BUCKET`, `S3_PUBLIC_BASE_URL`: S3 버킷 설정
- `SMTP_USER`, `SMTP_PASS`: 이메일 발송
- `CLIPDROP_API_KEY`: 배경 제거 API

## 🔧 클러스터 모드 사용

### 단일 프로세스 모드 (기본)
```bash
npm start
```

### 클러스터 모드
```bash
npm run start:cluster
```

Railway에서 클러스터 모드를 사용하려면:
1. Railway 대시보드 → Settings → Deploy
2. Start Command를 `npm run start:cluster`로 변경

## 📈 스케일링 전략

### 수직 스케일링 (Vertical Scaling)
Railway 플랜을 업그레이드하여 더 많은 CPU와 메모리 확보:
- **Hobby**: 512MB RAM, 1 vCPU
- **Pro**: 8GB RAM, 8 vCPU
- **Team**: 32GB RAM, 32 vCPU

### 수평 스케일링 (Horizontal Scaling)
1. **Railway Replicas 사용**
   - Railway 대시보드에서 Replicas 설정
   - 자동 로드 밸런싱 제공

2. **클러스터 모드 활성화**
   - `npm run start:cluster` 사용
   - `WEB_CONCURRENCY` 환경 변수로 워커 수 조정

## 🎯 성능 모니터링

### Health Check 엔드포인트
```bash
curl https://your-app.railway.app/health
```

응답 예시:
```json
{
  "ok": true,
  "timestamp": "2026-01-12T04:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "used": 128,
    "total": 256,
    "rss": 180
  },
  "environment": {
    "nodeVersion": "v20.x.x",
    "platform": "linux",
    "pid": 1234
  },
  "services": {
    "s3": true,
    "openai": true,
    "smtp": true,
    "clipdrop": true
  }
}
```

### 로그 모니터링
Railway 대시보드에서 실시간 로그 확인:
- 요청/응답 로그 (request_in, request_out)
- 에러 로그
- Rate limit 초과 로그
- 타임아웃 로그

## ⚠️ 주의사항

### Rate Limit 조정
현재 설정:
- 글로벌: 100 req/15min
- 엄격한 제한: 20 req/15min

트래픽 패턴에 따라 `server/index.js`의 rate limit 설정 조정 필요.

### 메모리 관리
- OpenAI 이미지 생성은 메모리를 많이 사용
- 15MB 파일 업로드 제한이 설정되어 있음
- 동시 요청이 많으면 메모리 부족 가능 → Railway 플랜 업그레이드 고려

### S3 연결 풀
현재는 단일 S3 클라이언트 재사용. 대량 트래픽 시 연결 풀 설정 추가 고려.

## 🔮 추가 개선 가능 사항

1. **Redis 캐싱**
   - 자주 요청되는 데이터 캐싱
   - Rate limit 상태를 Redis에 저장 (분산 환경 대응)

2. **CDN 사용**
   - S3 앞단에 CloudFront 등 CDN 배치
   - 이미지 응답 속도 향상

3. **Queue 시스템**
   - Bull, BullMQ 등으로 긴 작업 비동기 처리
   - 이미지 생성, 배경 제거 등을 큐로 처리

4. **메트릭 수집**
   - Prometheus + Grafana
   - Datadog, New Relic 등

5. **Auto-scaling**
   - Railway의 auto-scaling 설정
   - CPU/메모리 사용률 기반 자동 확장

## 📚 참고 자료

- [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)
- [Helmet.js](https://helmetjs.github.io/)
- [Node.js Cluster](https://nodejs.org/api/cluster.html)
- [Railway Docs](https://docs.railway.app/)
