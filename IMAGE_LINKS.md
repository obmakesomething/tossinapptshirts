# Image Link Resolution Guide

이 문서는 Merchandise GPT 앱에서 이미지 링크가 어떻게 처리되고 해결되는지 설명합니다.

## 목차
1. [개요](#개요)
2. [Mockup 이미지 시스템](#mockup-이미지-시스템)
3. [User Upload 이미지 시스템](#user-upload-이미지-시스템)
4. [환경별 설정](#환경별-설정)
5. [S3 마이그레이션 가이드](#s3-마이그레이션-가이드)
6. [이미지 최적화 가이드](#이미지-최적화-가이드)

---

## 개요

앱에서 사용하는 이미지는 크게 두 가지 유형으로 나뉩니다:

1. **Mockup 이미지**: 제품 목업 (티셔츠, 후드, 맨투맨) - 정적 이미지
2. **User 이미지**: 사용자가 업로드하거나 AI로 생성한 이미지 - 동적 이미지

---

## Mockup 이미지 시스템

### 1. 설정 위치

**파일**: `src/config/mockups.ts`

```typescript
export const MOCKUP_CONFIG = {
  // GCS configuration
  gcsBaseUrl: process.env.GCS_UPLOAD_BUCKET || '',

  // Server static files (Cloud Run)
  serverBaseUrl: 'https://merchandisegpt-api-peaq3gmvyq-du.a.run.app/mockups',

  // Use S3 if available, fallback to server
  get baseUrl() {
    // For now, use server static files (proven to work)
    return this.serverBaseUrl;

    // After S3 upload completes, switch to S3
    // return `${this.s3BaseUrl}/${this.s3Bucket}/mockups`;
  },
};
```

### 2. 해상도 함수

**파일**: `src/data/catalog.ts`

```typescript
const resolveMockup = (filename: string): ImageSourcePropType => {
  const uri = `${MOCKUP_CONFIG.baseUrl}/${filename}`;
  console.log('[DEBUG] Mockup URI:', uri);
  return { uri };
};
```

### 3. 사용 예시

```typescript
// src/data/catalog.ts
export const products: CatalogProduct[] = [
  {
    id: 'tshirt-basic',
    name: '베이직 티셔츠',
    category: '티셔츠',
    mainImage: resolveMockup('tshirt_white_front.jpg'),
    colorImages: {
      블랙: {
        main: resolveMockup('tshirt_black_front.jpg'),
        detail: resolveMockup('tshirt_black_front.jpg'),
      },
      화이트: {
        main: resolveMockup('tshirt_white_front.jpg'),
        detail: resolveMockup('tshirt_white_front.jpg'),
      },
    },
    // ...
  },
];
```

### 4. 현재 URL 구조

**프로덕션 (GCP Cloud Run)**:
```
https://merchandisegpt-api-peaq3gmvyq-du.a.run.app/mockups/tshirt_white_front.jpg
```

**GCS (Cloud Storage)**:
```
https://storage.googleapis.com/<GCS_BUCKET>/mockups/tshirt_white_front.jpg
```

---

## User Upload 이미지 시스템

### 1. 업로드 플로우

```
사용자 업로드 → Base64 인코딩 → 서버 전송 → S3 업로드 → URL 반환
```

### 2. 서버 설정

**파일**: `server/index.js`

```javascript
// S3 Configuration
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || '';
const AWS_REGION = process.env.AWS_REGION || 'ap-northeast-2';
const IMAGE_PREFIX = 'user-uploads';

// Upload to S3
const uploadToS3 = async ({ key, body, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: 'public-read', // Public access
  });

  await s3Client.send(command);

  // Return public URL
  return `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
};
```

### 3. API 엔드포인트

**배경 제거 API**:
```typescript
POST /v1/images/remove-background
Body: { dataUrl: string, returnBase64?: boolean }
Response: { url: string, dataUrl?: string }
```

**AI 생성 API**:
```typescript
POST /v1/images/generate
Body: { prompt: string, returnBase64?: boolean }
Response: { url: string, dataUrl?: string }
```

**스타일 변환 API**:
```typescript
POST /v1/images/style-transfer
Body: { dataUrl: string, style: string, returnBase64?: boolean }
Response: { url: string, dataUrl?: string }
```

### 4. 프론트엔드 사용

```typescript
// src/pages/upload.tsx
const handleRemoveBackground = async () => {
  const response = await fetch(`${API_BASE_URL}/v1/images/remove-background`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataUrl: designImageUri,
      returnBase64: true, // Get base64 for preview
    }),
  });

  const data = await response.json();

  // data.url: S3 public URL (for storage)
  // data.dataUrl: Base64 (for immediate preview)
  setDesignImageUri(data.dataUrl);
};
```

---

## 환경별 설정

### 1. 개발 환경 (로컬)

```bash
# .env.local
API_BASE_URL=http://localhost:3000

# Server static files for mockups
MOCKUP_BASE_URL=http://localhost:3000/mockups
```

### 2. 프로덕션 환경 (GCP Cloud Run)

```bash
# GCP 환경변수
API_BASE_URL=https://merchandisegpt-api-peaq3gmvyq-du.a.run.app

# GCS Configuration
GCS_UPLOAD_BUCKET=<your-gcs-bucket>
SIGNED_URL_TTL_SECONDS=604800
```

### 3. 서버 정적 파일 제공

**파일**: `server/index.js`

```javascript
// Serve mockup images
app.use('/mockups', express.static(path.join(__dirname, '../public/mockups')));
```

**디렉토리 구조**:
```
public/
  mockups/
    tshirt_white_front.jpg
    tshirt_black_front.jpg
    hoodie_grey_front.jpg
    hoodie_black_front.jpg
    sweatshirt_grey_front.jpg
    sweatshirt_black_front.jpg
```

---

## S3 마이그레이션 가이드

### 1. Mockup 이미지 S3 업로드

```bash
# AWS CLI로 mockup 이미지 업로드
cd public/mockups
aws s3 sync . s3://customizable-box-u-iz3yrp/mockups/ \
  --acl public-read \
  --region ap-northeast-2

# 또는 Node.js 스크립트로
node scripts/upload-mockups-to-s3.js
```

### 2. 설정 변경

**파일**: `src/config/mockups.ts`

```typescript
export const MOCKUP_CONFIG = {
  // ...

  get baseUrl() {
    // Switch to S3
    return `${this.s3BaseUrl}/${this.s3Bucket}/mockups`;
  },
};
```

### 3. 검증

```bash
# URL 접근 테스트
curl -I https://merchandisegpt-api-peaq3gmvyq-du.a.run.app/mockups/tshirt_white_front.jpg

# 앱에서 이미지 로드 확인
# Console에서 [DEBUG] Mockup URI 로그 확인
```

### 4. 롤백 계획

문제 발생 시 즉시 서버 정적 파일로 롤백:

```typescript
get baseUrl() {
  return this.serverBaseUrl; // Rollback to server
}
```

---

## 이미지 최적화 가이드

### 1. Mockup 이미지 최적화

**권장 사양**:
- Format: JPEG (PNG if transparency needed)
- Size: 1200x1500px (4:5 ratio)
- Quality: 85%
- File size: < 200KB

**최적화 스크립트**:
```bash
# Python script 사용
python3 scripts/optimize_images.py

# 또는 Sharp 사용
npm run optimize-images
```

**스크립트 내용** (`scripts/optimize_images.py`):
```python
from PIL import Image
import os

def optimize_mockup(input_path, output_path, quality=85):
    img = Image.open(input_path)

    # Resize to target dimensions
    target_width = 1200
    target_height = 1500
    img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)

    # Save with optimization
    img.save(output_path, 'JPEG', quality=quality, optimize=True)

# Usage
optimize_mockup(
    'public/mockups/original/tshirt_white_front.jpg',
    'public/mockups/tshirt_white_front.jpg',
    quality=85
)
```

### 2. User Upload 이미지 최적화

**서버 측 최적화** (`server/index.js`):

```javascript
const sharp = require('sharp');

async function optimizeImage(buffer) {
  return sharp(buffer)
    .resize(2000, 2000, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 90 })
    .toBuffer();
}

// Use in upload endpoint
app.post('/v1/images/upload', async (req, res) => {
  const { dataUrl } = req.body;

  // Convert base64 to buffer
  const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');

  // Optimize
  const optimizedBuffer = await optimizeImage(buffer);

  // Upload to S3
  const url = await uploadToS3({
    key: `user-uploads/${Date.now()}.jpg`,
    body: optimizedBuffer,
    contentType: 'image/jpeg',
  });

  res.json({ url });
});
```

### 3. 프론트엔드 이미지 압축

```typescript
// src/utils/imageCompression.ts
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export async function compressImage(uri: string, quality: number = 0.8) {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: 2000 } }],
    { compress: quality, format: SaveFormat.JPEG }
  );

  return result.uri;
}
```

---

## 문제 해결

### 1. 이미지가 로드되지 않을 때

**체크리스트**:
- [ ] URL이 올바른지 확인 (`console.log` 확인)
- [ ] S3 ACL이 public-read로 설정되었는지 확인
- [ ] CORS 설정이 올바른지 확인
- [ ] 파일이 실제로 존재하는지 확인

**CORS 설정** (S3):
```json
{
  "AllowedOrigins": ["*"],
  "AllowedMethods": ["GET", "HEAD"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3000
}
```

### 2. 이미지 로딩 속도가 느릴 때

**해결 방법**:
1. CloudFront CDN 사용
2. 이미지 크기 최적화
3. Lazy loading 구현
4. Progressive JPEG 사용

### 3. Base64 vs URL 사용 시기

**Base64 사용**:
- ✅ 즉각적인 미리보기 필요
- ✅ 오프라인 저장
- ❌ 큰 이미지 (메모리 부담)

**URL 사용**:
- ✅ 큰 이미지
- ✅ 여러 곳에서 재사용
- ✅ 캐싱 가능
- ❌ 네트워크 필요

---

## 참고 자료

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [React Native Image Component](https://reactnative.dev/docs/image)
- [GCP Cloud Run Docs](https://cloud.google.com/run/docs)

---

**마지막 업데이트**: 2026-01-14
**작성자**: Claude Sonnet 4.5
**버전**: 1.0.0
