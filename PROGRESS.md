# 진행 상황 기록 (2026-01-14)

## 완료된 작업 (18/20)

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

### ✅ Issue #5: Fix Image Scale Range (logo to A3 size)
**완료**: 2026-01-14
**파일**: src/pages/editor.tsx, src/components/DesignStage.tsx
**해결**:
- ScaleSlider max 값을 1.0 → 1.5로 변경
- DesignStage MAX_SCALE도 1.5로 업데이트
- 사용자가 로고 크기(0.2)부터 A3 크기(1.5)까지 조절 가능

---

### ✅ Issue #6: Make Canvas Full Screen in Editor
**완료**: 2026-01-14 (업데이트: 최대 너비 제한 제거)
**파일**: src/pages/editor.tsx Line 77-80
**해결**:
- Dimensions API 추가하여 화면 크기 동적 계산
- ~~canvasWidth = min(screenWidth - 32, 400)~~ → **canvasWidth = screenWidth - 32** (최대 너비 제한 제거)
- canvasHeight = canvasWidth * 1.25 (4:5 비율 유지)
- 모든 디바이스에서 화면 너비를 최대한 활용 (16px padding만 적용)

---

### ✅ Issue #9: Add FAQ Section Description
**완료**: 2026-01-14
**파일**: src/pages/index.tsx
**해결**:
- FAQ 섹션에 "궁금하신 사항에 대한 답변을 확인해보세요." 설명 추가
- faqSection 스타일 추가 (marginTop: xxl)
- faqDescription 스타일 추가
- 시각적 구분 개선

---

### ✅ Issue #10: Product Category Dynamic Mockup
**완료**: 2026-01-14
**파일**: src/pages/index.tsx
**해결**:
- handleCategoryChange 함수 추가
- categoryProduct 변수로 선택된 카테고리의 제품 찾기
- MockupCanvas에 categoryProduct 전달
- 카테고리 변경 시 실시간 mockup 이미지 업데이트

---

### ✅ Issue #11: Adjust Button Spacing Consistently
**완료**: 2026-01-14
**파일**: src/pages/editor.tsx, order.tsx
**해결**:
- editor.tsx Line 736: marginBottom: 4 → theme.spacing.xs
- order.tsx Line 357: marginBottom: 4 → theme.spacing.xs
- 모든 spacing이 theme.spacing 사용하도록 통일

---

### ✅ Issue #12: Background Removal Button Styling
**완료**: 2026-01-14
**파일**: src/pages/upload.tsx
**해결**:
- bgRemovalStatus state 추가 (idle/loading/success/error)
- getBgRemovalButtonStyle() 함수로 동적 스타일링
- getBgRemovalButtonText() 함수로 상태별 텍스트
- 성공 시 녹색, 실패 시 빨간색, 처리 중 회색
- 3초 후 자동으로 idle 상태로 리셋

---

### ✅ Issue #14: Reorganize Product Info Section
**완료**: 2026-01-14
**파일**: src/pages/editor.tsx
**해결**:
- 가격 표시 제거 (productPrice, productOriginalPrice)
- 컬러 선택기를 제품 정보 카드 내부로 통합
- colorSection, colorLabel, colorOptions 스타일 추가
- 더 깔끔한 에디터 인터페이스

---

### ✅ Issue #16: Fix Address Search Auto-fill and Modal Close
**완료**: 2026-01-14
**파일**: src/pages/order.tsx
**해결**:
- address2InputRef useRef 추가
- handleAddressSelect에서 주소 선택 후 상세 주소 입력란으로 포커스
- setTimeout으로 100ms 후 포커스 이동
- 더 나은 UX 플로우

---

### ✅ Issue #17: Remove Blue Dotted Lines from Canvas
**완료**: 2026-01-14
**파일**: src/components/MockupCanvas.tsx, DesignStage.tsx
**해결**:
- showGuides prop 추가 (기본값: false)
- MockupCanvas: showGuides로 가이드 라인 제어
- DesignStage: showGuides로 가이드 라인 제어 (기본값: true, 에디터용)
- 미리보기/주문 페이지에서는 가이드 라인 미표시

---

### ✅ Issue #15: Revert Front/Back UI to OR Logic
**완료**: 2026-01-14
**파일**: src/pages/editor.tsx
**해결**:
- OR 로직 확인: 앞면은 항상 활성화, 뒷면은 선택적 추가
- "프린팅 활성화" 레이블을 "현재 편집 중"으로 변경
- 앞면 칩은 항상 표시
- 뒷면 칩은 printBackEnabled가 true일 때만 표시
- frontPrintEnabled와 setFrontPrintEnabled 사용 제거 (앞면 항상 활성화)
- 뒷면 프린팅 추가 스위치는 기존대로 유지 (OR 로직)

**Before**:
```typescript
// XOR 로직 - 둘 중 하나만 선택 (잘못된 구현)
<Chip label="앞면" selected={frontPrintEnabled} onPress={toggleFront} />
<Chip label="뒷면" selected={printBackEnabled} onPress={toggleBack} />
```

**After**:
```typescript
// OR 로직 - 앞면 기본, 뒷면 선택적
<Chip label="앞면" selected={selectedPlacement === 'front'} onPress={() => setSelectedPlacement('front')} />
{printBackEnabled && (
  <Chip label="뒷면" selected={selectedPlacement === 'back'} onPress={() => setSelectedPlacement('back')} />
)}
```

---

### ✅ Issue #8: Add Comprehensive Logging for Style Transfer
**완료**: 2026-01-14
**파일**: src/pages/upload.tsx, server/index.js
**해결**:
- 프론트엔드에 상세 로깅 추가 (handleStyleTransfer)
- 백엔드에 단계별 로깅 추가 (OpenAI 호출, 이미지 다운로드, S3 업로드)
- 에러 발생 시 스택 트레이스 로깅
- 응답 구조 확인을 위한 로깅

**Frontend logging**:
```typescript
console.log('[StyleTransfer] Starting style transfer:', style);
console.log('[StyleTransfer] Image data length:', imageToTransfer?.length || 0);
console.log('[StyleTransfer] Response status:', response.status);
console.log('[StyleTransfer] Response keys:', Object.keys(data));
console.log('[StyleTransfer] Success! Data URL length:', data.dataUrl.length);
```

**Backend logging**:
```javascript
console.log('[StyleTransfer] Request received:', { hasDataUrl, dataUrlLength, style });
console.log('[StyleTransfer] Calling OpenAI with prompt:', enhancedPrompt);
console.log('[StyleTransfer] OpenAI response received');
console.log('[StyleTransfer] Image downloaded, size:', styledBuffer.length, 'bytes');
console.log('[StyleTransfer] Sending response with keys:', Object.keys(result));
```

이제 사용자가 스타일 변환을 시도하면 전체 프로세스를 추적하여 어디서 실패하는지 정확히 파악할 수 있습니다.

---

### ✅ Issue #13: Add Checkerboard Transparency Pattern
**완료**: 2026-01-14
**파일**: src/components/MockupCanvas.tsx, DesignStage.tsx
**해결**:
- CheckerboardPattern 컴포넌트 생성 (8x8px 정사각형, 흰색/#E8E8E8 교차)
- MockupCanvas에 체크무늬 패턴 추가 (디자인 이미지 뒤에)
- DesignStage에 체크무늬 패턴 추가 (에디터 이미지 뒤에)
- 이미지 transform에 맞춰 패턴도 함께 스케일/위치 조정
- 투명 영역과 흰색 배경 구분 가능

**Implementation**:
```typescript
// CheckerboardPattern component
function CheckerboardPattern({ width, height, squareSize = 8 }) {
  const rows = Math.ceil(height / squareSize);
  const cols = Math.ceil(width / squareSize);
  const squares = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const isEven = (row + col) % 2 === 0;
      squares.push(
        <View key={`${row}-${col}`}
          style={{
            position: 'absolute',
            left: col * squareSize,
            top: row * squareSize,
            width: squareSize,
            height: squareSize,
            backgroundColor: isEven ? '#FFFFFF' : '#E8E8E8',
          }}
        />
      );
    }
  }
  return <View style={{ position: 'absolute', width, height }}>{squares}</View>;
}

// Usage in MockupCanvas
{designImageUri && (
  <>
    <View style={{ /* positioned behind image */ }}>
      <CheckerboardPattern width={designWidth} height={designHeight} squareSize={8} />
    </View>
    <Image source={{ uri: designImageUri }} ... />
  </>
)}
```

**Benefits**:
- 사용자가 이미지의 어느 부분이 투명한지 명확하게 확인 가능
- 배경 제거 기능 사용 시 더 나은 시각적 피드백
- Photoshop, Figma 등 표준 이미지 편집 도구와 일관된 UX

---

### ✅ Issue #19: Image Link Resolution Documentation
**완료**: 2026-01-14
**파일**: IMAGE_LINKS.md (새로 생성)
**해결**:
- 이미지 링크 해상도 시스템 완전 문서화
- Mockup 이미지와 User Upload 이미지 시스템 설명
- 환경별 설정 가이드 (로컬, 프로덕션, Railway)
- S3 마이그레이션 단계별 가이드
- 이미지 최적화 베스트 프랙티스
- 문제 해결 섹션

**문서 구조**:
1. **Mockup 이미지 시스템**
   - resolveMockup() 함수 설명
   - MOCKUP_CONFIG 설정
   - Server static files vs S3

2. **User Upload 이미지 시스템**
   - 업로드 플로우 (Base64 → Server → S3)
   - API 엔드포인트 문서
   - 프론트엔드 사용 예시

3. **환경별 설정**
   - 개발 환경 (.env.local)
   - 프로덕션 환경 (Railway)
   - 서버 정적 파일 제공

4. **S3 마이그레이션 가이드**
   - AWS CLI로 업로드
   - 설정 변경 방법
   - 검증 및 롤백 계획

5. **이미지 최적화**
   - Mockup 이미지 최적화 (1200x1500px, 85% quality)
   - Server-side 최적화 (Sharp)
   - Frontend 압축

**Benefits**:
- 새로운 개발자가 이미지 시스템을 빠르게 이해 가능
- S3 마이그레이션 시 명확한 가이드 제공
- 이미지 최적화로 성능 개선 가능
- 문제 발생 시 빠른 트러블슈팅

---

## 남은 작업 (5/20)

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

---

## 이슈별 상세 가이드

### Phase 1: UI/UX 개선 (추천 시작점) ⭐

#### 🔴 Issue #9: Add FAQ Section Description
**예상 시간**: 30분
**난이도**: ⭐☆☆☆☆ (쉬움)
**파일**: src/pages/index.tsx

**문제**: FAQ 섹션이 위 버튼과 너무 가까워서 시각적 구분이 어려움

**작업 내용**:
```typescript
// src/pages/index.tsx (대략 Line 300-350)
// FAQ 섹션 찾기

// ❌ Before:
<View style={styles.faqSection}>
  <Text style={styles.faqTitle}>자주 묻는 질문</Text>
  {/* 바로 FAQ 버튼들 */}
</View>

// ✅ After:
<View style={styles.faqSection}>
  <Text style={styles.faqTitle}>자주 묻는 질문</Text>
  <Text style={styles.faqDescription}>
    궁금하신 사항에 대한 답변을 확인해보세요.
  </Text>
  {/* FAQ 버튼들 */}
</View>

// 스타일 추가:
faqSection: {
  marginTop: theme.spacing.xxl, // ✅ xl → xxl로 증가
  paddingHorizontal: theme.spacing.lg,
},
faqDescription: {
  fontSize: 14,
  color: theme.colors.textSecondary,
  marginTop: theme.spacing.sm,
  marginBottom: theme.spacing.md,
}
```

**테스트 방법**:
1. 메인 페이지 접속
2. 아래로 스크롤하여 FAQ 섹션 확인
3. 설명 텍스트가 표시되는지 확인
4. 위 버튼과의 간격이 적절한지 확인

---

#### 🔴 Issue #10: Product Category Dynamic Mockup
**예상 시간**: 1-1.5시간
**난이도**: ⭐⭐☆☆☆ (보통)
**파일**: src/pages/index.tsx

**문제**: 카테고리 탭을 클릭해도 mockup 이미지가 변경되지 않음

**작업 내용**:
```typescript
// src/pages/index.tsx

// 1. 현재 selectedCategory state 확인
const [selectedCategory, setSelectedCategory] = useState('티셔츠');

// 2. catalog에서 선택된 카테고리의 제품 찾기
const selectedProduct = catalogProducts.find(
  p => p.category === selectedCategory
);

// 3. mockup 이미지 동적으로 변경
const mockupImageUri = selectedProduct?.colorImages[
  selectedProduct.colors[0] // 기본 첫 번째 색상
]?.main;

// 4. Image 컴포넌트에 적용
<Image
  source={{ uri: mockupImageUri }}
  style={styles.mockupImage}
  resizeMode="contain"
/>
```

**상세 구현**:
```typescript
// 카테고리 변경 시 제품도 함께 변경
const handleCategoryChange = (category: string) => {
  setSelectedCategory(category);

  // Context의 제품도 업데이트 (필요한 경우)
  const product = catalogProducts.find(p => p.category === category);
  if (product) {
    setSelectedProduct(product);
    setSelectedColor(product.colors[0]); // 기본 색상으로 리셋
  }
};
```

**테스트 방법**:
1. 메인 페이지 접속
2. 카테고리 탭 클릭 (티셔츠 → 후드 → 맨투맨)
3. 각 카테고리 변경 시 mockup 이미지가 즉시 변경되는지 확인
4. 이미지 로딩 에러가 없는지 확인

---

#### 🔴 Issue #11: Adjust Button Spacing Consistently
**예상 시간**: 2-3시간
**난이도**: ⭐⭐⭐☆☆ (중간)
**파일**: src/pages/index.tsx, editor.tsx, upload.tsx, generate.tsx, order.tsx

**문제**: 버튼 간격이 일관성 없이 설정되어 있음

**작업 원칙**:
```typescript
// theme.ts의 spacing 값 활용
theme.spacing = {
  xs: 4,   // 매우 작은 간격
  sm: 8,   // 작은 간격 (같은 그룹 내)
  md: 12,  // 중간 간격 (같은 그룹 내)
  lg: 16,  // 큰 간격 (다른 그룹 간)
  xl: 24,  // 매우 큰 간격 (섹션 간)
  xxl: 32, // 거대한 간격 (주요 섹션)
}

// Proximity 원칙:
// - 관련 있는 버튼: sm ~ md (8-12px)
// - 다른 기능 그룹: lg ~ xl (16-24px)
// - 섹션 구분: xl ~ xxl (24-32px)
```

**작업 체크리스트**:
- [ ] src/pages/index.tsx
  - [ ] 이미지 업로드/AI 생성 버튼 (같은 그룹 → sm)
  - [ ] 버튼 그룹과 FAQ 섹션 (다른 섹션 → xl)
- [ ] src/pages/editor.tsx
  - [ ] 앞면/뒷면 토글 버튼 (같은 그룹 → sm)
  - [ ] 이미지/텍스트 레이어 버튼 (같은 그룹 → sm)
  - [ ] 편집 도구와 주문 버튼 (다른 기능 → lg)
- [ ] src/pages/upload.tsx
  - [ ] 배경 제거/스타일 변환 버튼 (같은 그룹 → md)
  - [ ] 크롭 버튼 (다른 기능 → lg)
- [ ] src/pages/generate.tsx
  - [ ] 스타일 옵션 버튼들 (같은 그룹 → sm)
- [ ] src/pages/order.tsx
  - [ ] 결제 버튼 (단독 → xl)

**예시 코드**:
```typescript
// ❌ Before: 하드코딩된 값
<View style={{ gap: 10 }}>
  <Button title="버튼1" />
  <Button title="버튼2" />
</View>

// ✅ After: theme spacing 사용
<View style={{ gap: theme.spacing.sm }}>
  <Button title="버튼1" />
  <Button title="버튼2" />
</View>
```

**테스트 방법**:
1. 모든 페이지 순회하며 버튼 간격 확인
2. 같은 기능 그룹의 버튼들이 가까이 있는지 확인
3. 다른 섹션 간 충분한 여백이 있는지 확인

---

### Phase 2: 에디터 기능 개선

#### 🔴 Issue #5: Fix Image Scale Range (logo to A3 size)
**예상 시간**: 1시간
**난이도**: ⭐⭐☆☆☆ (보통)
**파일**: src/components/ImageEditor.tsx, src/pages/editor.tsx

**문제**: 이미지 크기 조절 범위가 부적절함 (너무 작거나 너무 큼)

**작업 내용**:
```typescript
// src/components/ImageEditor.tsx 또는 editor.tsx

// ❌ Before: 임의의 scale 값
const [scale, setScale] = useState(1);
// Slider min=0.1, max=5

// ✅ After: 로고(5cm) ~ A3(30cm) 범위
// 티셔츠 프린팅 영역: 약 25cm x 35cm
// 로고: 5cm x 5cm (scale ≈ 0.2)
// A3: 30cm x 42cm (scale ≈ 1.2)

const MIN_SCALE = 0.2;  // 로고 크기
const MAX_SCALE = 1.5;  // A3 크기
const DEFAULT_SCALE = 0.8; // 적절한 기본값

const [scale, setScale] = useState(DEFAULT_SCALE);

<Slider
  value={scale}
  onValueChange={setScale}
  minimumValue={MIN_SCALE}
  maximumValue={MAX_SCALE}
  step={0.05}
/>
```

**테스트 방법**:
1. 에디터에서 이미지 업로드
2. 크기 조절 슬라이더 조작
3. 최소값에서 로고 크기 정도인지 확인
4. 최대값에서 티셔츠를 거의 채우는지 확인

---

### ✅ Issue #7: Implement Image Crop (User-Guided Approach)
**완료**: 2026-01-14
**파일**: src/pages/upload.tsx
**해결**:
- Apps-in-Toss MCP에 네이티브 크롭 기능 없음 확인
- react-native-image-crop-picker 등 네이티브 라이브러리 설치 대신 사용자 가이드 방식 채택
- 사용자가 사진 앱에서 미리 크롭 후 업로드하도록 안내

**구현 내용**:
```typescript
// src/pages/upload.tsx Line 254-257
<Text style={styles.cropGuide}>
  💡 팁: 이미지를 정사각형으로 자르고 싶다면, 사진 앱에서 미리 크롭한 후
  업로드하세요.
</Text>

// Line 389-397: cropGuide 스타일 추가
cropGuide: {
  fontSize: 12,
  lineHeight: 18,
  color: theme.colors.primary,
  backgroundColor: theme.colors.primarySoft,
  padding: theme.spacing.sm,
  borderRadius: theme.radius.sm,
  marginBottom: theme.spacing.lg,
}
```

**변경사항**:
- handleCropImage 함수 제거 (Lines 246-281)
- "이미지 크롭하기" 버튼 제거
- cropping state 변수 제거
- 크롭 관련 disabled 조건 제거
- 사용자 안내 텍스트 추가

**장점**:
- 네이티브 라이브러리 설치 불필요 (앱 크기 절감)
- iOS pod install 불필요
- 사용자가 익숙한 시스템 사진 앱 활용
- 유지보수 부담 감소

---

### ✅ Issue #17: Remove Blue Dotted Lines from Canvas
**완료**: 2026-01-14 (이미 구현되어 있음)
**파일**: src/components/MockupCanvas.tsx, src/components/DesignStage.tsx
**해결**: showGuides 프롭이 이미 올바르게 구현되어 있음

**현재 구현 상태**:
```typescript
// src/components/MockupCanvas.tsx Line 40, 55
interface MockupCanvasProps {
  showGuides?: boolean;
}

export function MockupCanvas({
  showGuides = false, // ✅ 기본값: false (미표시)
  // ...
}: MockupCanvasProps) {
  // ...
  {showGuides && (
    <View
      style={[
        styles.printArea, // borderStyle: 'dashed', borderColor: primary
        { left, top, width, height }
      ]}
    />
  )}
}

// src/components/DesignStage.tsx Line 40, 65
interface DesignStageProps {
  showGuides?: boolean;
}

export function DesignStage({
  showGuides = true, // ✅ 기본값: true (에디터에서 표시)
  // ...
}: DesignStageProps) {
  // ...
}
```

**사용 현황**:
- **에디터** (src/pages/editor.tsx): `<DesignStage>` 사용 → showGuides=true (기본값)
- **미리보기** (src/pages/preview.tsx): `<MockupCanvas>` 사용 → showGuides=false (기본값)
- **디자인 목록** (src/pages/designs.tsx): `<MockupCanvas>` 사용 → showGuides=false (기본값)
- **홈** (src/pages/index.tsx): `<MockupCanvas>` 사용 → showGuides=false (기본값)

**결과**:
- 에디터: 파란색 점선 가이드 표시 ✅
- 미리보기/주문: 가이드 미표시 ✅

---

### Phase 3: 이미지 처리 개선

#### ✅ Issue #8: Fix Style Transfer Feature (완료 - 2026-01-14)
상단 "완료된 작업" 섹션 참고

---

#### 🔴 Issue #8 (Original Guide - For Reference):
**예상 시간**: 2-3시간
**난이도**: ⭐⭐⭐⭐☆ (어려움)
**파일**: src/pages/upload.tsx, server/index.js

**문제**: 스타일 변환 버튼 클릭 시 응답 없음

**작업 내용**:

**1. 프론트엔드 로깅 추가 (upload.tsx)**:
```typescript
const handleStyleTransfer = async () => {
  console.log('[DEBUG] Style transfer started');

  try {
    setLoading(true);

    const response = await fetch(`${API_BASE_URL}/v1/style-transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUri,
        style: selectedStyle,
      }),
    });

    console.log('[DEBUG] Response status:', response.status);
    const data = await response.json();
    console.log('[DEBUG] Response data:', data);

    if (data.success) {
      setImageUri(data.styledImageUri);
    } else {
      Alert.alert('오류', data.error || '스타일 변환 실패');
    }

  } catch (error) {
    console.error('[ERROR] Style transfer failed:', error);
    Alert.alert('오류', '네트워크 오류가 발생했습니다.');
  } finally {
    setLoading(false);
  }
};
```

**2. 백엔드 로깅 추가 (server/index.js)**:
```javascript
app.post('/v1/style-transfer', strictLimiter, async (req, res) => {
  console.log('[DEBUG] Style transfer request received');
  console.log('[DEBUG] Request body:', req.body);

  try {
    const { imageUri, style } = req.body;

    if (!imageUri) {
      console.error('[ERROR] Missing imageUri');
      return res.status(400).json({ success: false, error: 'Image URI required' });
    }

    // OpenAI API 호출
    console.log('[DEBUG] Calling OpenAI API...');
    const response = await openai.images.edit({
      image: imageUri,
      prompt: `Apply ${style} style to this image`,
      n: 1,
      size: "1024x1024",
    });

    console.log('[DEBUG] OpenAI response:', response);

    const styledImageUri = response.data[0].url;

    res.json({
      success: true,
      styledImageUri,
    });

  } catch (error) {
    console.error('[ERROR] Style transfer error:', error.message);
    console.error('[ERROR] Stack:', error.stack);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
```

**3. API 키 확인**:
```bash
# .env 파일 확인
cat .env | grep OPENAI_API_KEY
```

**테스트 방법**:
1. 콘솔 로그 모니터링
2. 이미지 업로드 → 스타일 변환 클릭
3. 프론트/백엔드 로그 확인
4. 에러 메시지 분석
5. OpenAI API quota 확인

---

#### 🔴 Issue #12: Background Removal Button Styling
**예상 시간**: 1시간
**난이도**: ⭐⭐☆☆☆ (보통)
**파일**: src/pages/upload.tsx

**문제**: 배경 제거 버튼이 눈에 띄지 않고 상태를 알 수 없음

**작업 내용**:
```typescript
// src/pages/upload.tsx

const [bgRemovalStatus, setBgRemovalStatus] = useState<
  'idle' | 'loading' | 'success' | 'error'
>('idle');

const handleRemoveBackground = async () => {
  setBgRemovalStatus('loading');

  try {
    const response = await fetch(`${API_BASE_URL}/v1/remove-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUri }),
    });

    const data = await response.json();

    if (data.success) {
      setImageUri(data.processedImageUri);
      setBgRemovalStatus('success');

      // 3초 후 상태 리셋
      setTimeout(() => setBgRemovalStatus('idle'), 3000);
    } else {
      setBgRemovalStatus('error');
    }

  } catch (error) {
    setBgRemovalStatus('error');
  }
};

// 버튼 스타일
const getButtonStyle = () => {
  switch (bgRemovalStatus) {
    case 'loading':
      return { backgroundColor: theme.colors.textSecondary };
    case 'success':
      return { backgroundColor: '#52C41A' }; // 녹색
    case 'error':
      return { backgroundColor: theme.colors.error };
    default:
      return { backgroundColor: theme.colors.primary };
  }
};

const getButtonText = () => {
  switch (bgRemovalStatus) {
    case 'loading':
      return '처리 중...';
    case 'success':
      return '완료!';
    case 'error':
      return '실패 (재시도)';
    default:
      return '배경 제거';
  }
};

<Button
  title={getButtonText()}
  onPress={handleRemoveBackground}
  disabled={bgRemovalStatus === 'loading'}
  style={[styles.button, getButtonStyle()]}
/>
```

**테스트 방법**:
1. 이미지 업로드
2. 배경 제거 버튼 클릭
3. "처리 중..." 상태 표시 확인
4. 성공 시 녹색 "완료!" 표시 확인
5. 실패 시 빨간색 "실패" 표시 확인

---

#### ✅ Issue #13: Checkerboard Transparency Pattern (완료 - 2026-01-14)
상단 "완료된 작업" 섹션 참고

---

#### 🔴 Issue #13 (Original Guide - For Reference):
**예상 시간**: 1-1.5시간
**난이도**: ⭐⭐⭐☆☆ (중간)
**파일**: src/components/MockupCanvas.tsx

**문제**: 투명 배경 제거 후 투명 영역이 하얀색으로 보여 구분 어려움

**작업 내용**:

**React Native (Canvas 사용)**:
```typescript
// src/components/MockupCanvas.tsx

// Canvas에 체크무늬 패턴 그리기
const drawCheckerboard = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const squareSize = 10; // 체크무늬 크기
  const colors = ['#FFFFFF', '#E0E0E0']; // 밝은 회색/흰색

  for (let y = 0; y < height; y += squareSize) {
    for (let x = 0; x < width; x += squareSize) {
      const colorIndex = ((x / squareSize) + (y / squareSize)) % 2;
      ctx.fillStyle = colors[colorIndex];
      ctx.fillRect(x, y, squareSize, squareSize);
    }
  }
};

// 이미지 렌더링 전에 패턴 그리기
const renderCanvas = () => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');

  // 1. 체크무늬 배경 그리기
  drawCheckerboard(ctx, canvas.width, canvas.height);

  // 2. 목업 이미지 그리기
  ctx.drawImage(mockupImage, 0, 0);

  // 3. 사용자 이미지 그리기 (투명도 포함)
  ctx.drawImage(userImage, x, y, width, height);
};
```

**또는 CSS 스타일로 배경 추가**:
```typescript
<View style={styles.canvasWrapper}>
  <Canvas ref={canvasRef} />
</View>

const styles = StyleSheet.create({
  canvasWrapper: {
    backgroundColor: '#FFFFFF',
    backgroundImage: `
      repeating-conic-gradient(
        #E0E0E0 0% 25%,
        #FFFFFF 0% 50%
      ) 50% / 20px 20px
    `,
  },
});
```

**테스트 방법**:
1. 배경이 투명한 이미지 업로드
2. 에디터/미리보기에서 체크무늬 패턴 표시 확인
3. 투명 영역과 흰색 영역 구분 가능한지 확인

---

### Phase 4: 주문 플로우 개선

#### 🔴 Issue #14: Reorganize Product Info Section
**예상 시간**: 1시간
**난이도**: ⭐⭐☆☆☆ (보통)
**파일**: src/pages/editor.tsx

**문제**: 제품 정보 섹션에 가격이 표시되어 있고, 컬러 선택기가 분리되어 있음

**작업 내용**:
```typescript
// src/pages/editor.tsx

// ❌ Before:
<View style={styles.productInfo}>
  <Text>{selectedProduct.name}</Text>
  <Text>가격: {selectedProduct.price}원</Text>
</View>
<View style={styles.colorPicker}>
  {/* 컬러 선택 */}
</View>

// ✅ After: 가격 제거, 컬러 통합
<View style={styles.productInfo}>
  <Text style={styles.productName}>{selectedProduct.name}</Text>
  <Text style={styles.productModel}>{selectedProduct.modelName}</Text>

  {/* 컬러 선택기 통합 */}
  <View style={styles.colorSection}>
    <Text style={styles.colorLabel}>컬러</Text>
    <View style={styles.colorOptions}>
      {selectedProduct.colors.map(color => (
        <TouchableOpacity
          key={color}
          style={[
            styles.colorChip,
            selectedColor === color && styles.colorChipSelected,
          ]}
          onPress={() => setSelectedColor(color)}
        >
          <Text>{color}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
</View>

const styles = StyleSheet.create({
  productInfo: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
  },
  colorSection: {
    marginTop: theme.spacing.md,
  },
  colorOptions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
});
```

**테스트 방법**:
1. 에디터 페이지 진입
2. 제품 정보 섹션에서 가격이 보이지 않는지 확인
3. 컬러 선택기가 제품 정보 내에 있는지 확인
4. 컬러 변경이 정상 작동하는지 확인

---

#### ✅ Issue #15: Revert Front/Back UI (완료 - 2026-01-14)
상단 "완료된 작업" 섹션 참고

---

#### 🔴 Issue #16: Fix Address Search Auto-fill and Modal Close
**예상 시간**: 1-1.5시간
**난이도**: ⭐⭐⭐☆☆ (중간)
**파일**: src/components/DaumPostcodeModal.tsx, src/pages/order.tsx

**문제**: 주소 선택 후 자동 입력 안 되고 모달이 자동으로 닫히지 않음

**작업 내용**:

**1. DaumPostcodeModal.tsx 수정**:
```typescript
// src/components/DaumPostcodeModal.tsx

interface DaumPostcodeModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (data: AddressData) => void; // ✅ 콜백 추가
}

const DaumPostcodeModal = ({ visible, onClose, onComplete }: Props) => {
  const handleComplete = (data: any) => {
    console.log('[DEBUG] Address selected:', data);

    const addressData = {
      zonecode: data.zonecode,        // 우편번호
      address: data.address,          // 기본 주소
      buildingName: data.buildingName, // 건물명
    };

    // 1. 부모 컴포넌트에 데이터 전달
    onComplete(addressData);

    // 2. 모달 자동 닫기
    onClose();
  };

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <DaumPostcode
        onComplete={handleComplete}
        onClose={onClose}
      />
    </Modal>
  );
};
```

**2. order.tsx 수정**:
```typescript
// src/pages/order.tsx

const [addressModalVisible, setAddressModalVisible] = useState(false);
const [zonecode, setZonecode] = useState('');
const [address, setAddress] = useState('');
const [detailAddress, setDetailAddress] = useState('');
const detailAddressInputRef = useRef(null);

const handleAddressComplete = (data: AddressData) => {
  console.log('[DEBUG] Address data received:', data);

  // 1. 우편번호, 기본 주소 자동 입력
  setZonecode(data.zonecode);
  setAddress(data.address);

  // 2. 상세 주소 입력란으로 포커스 이동
  setTimeout(() => {
    detailAddressInputRef.current?.focus();
  }, 100);
};

<DaumPostcodeModal
  visible={addressModalVisible}
  onClose={() => setAddressModalVisible(false)}
  onComplete={handleAddressComplete}
/>

{/* 주소 입력 필드 */}
<TextInput
  value={zonecode}
  editable={false}
  placeholder="우편번호"
/>
<TextInput
  value={address}
  editable={false}
  placeholder="기본 주소"
/>
<TextInput
  ref={detailAddressInputRef}
  value={detailAddress}
  onChangeText={setDetailAddress}
  placeholder="상세 주소"
/>
```

**테스트 방법**:
1. 주문 페이지에서 주소 검색 버튼 클릭
2. 주소 검색 모달에서 주소 선택
3. 모달이 자동으로 닫히는지 확인
4. 우편번호, 기본 주소가 자동 입력되는지 확인
5. 상세 주소 입력란으로 포커스 이동 확인

---

### Phase 5: 문서화 및 마무리

#### 🔴 Issue #18: Document All Changes
**예상 시간**: 계속
**난이도**: ⭐☆☆☆☆
**파일**: PROGRESS.md

**작업 내용**:
- 각 이슈 완료 시 PROGRESS.md 업데이트
- 완료 표시: 🔴 → ✅
- 시도한 방법, 최종 해결책 기록

---

#### ✅ Issue #19: Image Link Resolution Documentation (완료 - 2026-01-14)
상단 "완료된 작업" 섹션 참고

---

#### 🔴 Issue #20: Final Commit and Build
**예상 시간**: 30분
**난이도**: ⭐☆☆☆☆

**작업 내용**:
```bash
# 1. 최종 빌드
npm run build

# 2. 커밋
git add -A
git commit -m "feat: complete all remaining issues (#5-#17)

- Issue #5: Fixed image scale range
- Issue #6: Made canvas full screen
- Issue #7: Implemented image crop
- Issue #8: Fixed style transfer
- Issue #9: Added FAQ description
- Issue #10: Dynamic mockup images
- Issue #11: Consistent button spacing
- Issue #12: Background removal button styling
- Issue #13: Checkerboard transparency
- Issue #14: Reorganized product info
- Issue #15: Reverted front/back UI
- Issue #16: Fixed address auto-fill
- Issue #17: Removed blue dotted lines

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 3. Push
git push origin feat/20260113-2124

# 4. Railway 배포 확인
```

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
