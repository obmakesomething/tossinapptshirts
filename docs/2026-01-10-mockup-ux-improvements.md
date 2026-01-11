# 2026-01-10 목업 UX 개선 작업 기록

## 작업 개요
Toss 미니앱 티셔츠 디자인 에디터의 사용성 문제를 해결하기 위한 전면 개선 작업

## 발견된 문제들

### 1. 프린트 영역 터치 인터랙션 완전 작동 불가
**증상**
- 프린트 영역을 터치해도 드래그/핀치 제스처가 전혀 작동하지 않음
- "꾹 눌러 편집" 힌트가 표시되지만 실제로는 작동하지 않음
- 크기 조절, 위치 이동, 회전 모두 불가능

**원인 분석**
```typescript
// src/components/DesignStage.tsx (수정 전)
const responder = useMemo(
  () => PanResponder.create({
    // ... handlers
  }),
  [] // 빈 의존성 배열!
);
```

**문제점**
- `useMemo`의 빈 의존성 배열로 인해 PanResponder가 **초기 렌더링 시점의 값만 캡처**
- `activeTransform`, `area`, `updateTransform` 등의 값이 업데이트되어도 PanResponder는 **옛날 값** 참조
- 클로저 문제로 인한 상태 동기화 실패

**해결 방법**
```typescript
// src/components/DesignStage.tsx (수정 후)
// 1. 최신 값을 ref로 저장
const activeTransformRef = useRef(activeTransform);
const updateTransformRef = useRef(updateTransform);
const areaRef = useRef(area);

// 2. 매 렌더링마다 ref 업데이트
activeTransformRef.current = activeTransform;
updateTransformRef.current = updateTransform;
areaRef.current = area;

// 3. PanResponder 내부에서 ref 사용
const responderRef = useRef(
  PanResponder.create({
    onPanResponderGrant: (evt) => {
      const currentTransform = activeTransformRef.current; // ref에서 최신 값 가져오기
      startRef.current = {
        offsetX: currentTransform.offsetX,
        offsetY: currentTransform.offsetY,
        scale: currentTransform.scale,
        rotation: currentTransform.rotation,
        distance,
        angle,
      };
    },
    onPanResponderMove: (evt, gestureState) => {
      const currentArea = areaRef.current; // ref에서 최신 값 가져오기
      const updateFn = updateTransformRef.current; // ref에서 최신 함수 가져오기
      // ...
    }
  })
);
```

**핵심 개념**
- **React Hooks 클로저 문제**: `useCallback`, `useMemo` 등은 의존성 배열에 포함되지 않은 값의 변화를 감지하지 못함
- **ref 패턴**: `useRef`는 렌더링 간 값을 유지하면서도 변경 시 리렌더링을 트리거하지 않음
- **PanResponder 특성**: 한 번 생성되면 재생성하지 않는 것이 좋으므로, 내부에서 ref를 통해 최신 값에 접근

---

### 2. 화이트 티셔츠 이미지가 표시되지 않음
**증상**
- 색상에서 "화이트" 선택 시 검은색 티셔츠가 표시됨
- 색상별 이미지가 제대로 로드되지 않음

**원인 분석**
```bash
$ file assets/mockups/tshirt_front.png
assets/mockups/tshirt_front.png: JPEG image data, ...
```

**문제점**
- 파일 확장자는 `.png`이지만 실제 파일 형식은 **JPEG**
- React Native에서는 파일 확장자와 실제 형식이 다르면 이미지 로딩 실패

**해결 방법**
```bash
# 1. 파일명을 실제 형식에 맞게 변경
mv assets/mockups/tshirt_front.png assets/mockups/tshirt_front.jpg
mv assets/mockups/tshirt_back.png assets/mockups/tshirt_back.jpg
```

```typescript
// 2. catalog.ts에서 경로 수정
colorImages: {
  '블랙': {
    main: resolveImage('https://www.customzone.co.kr/...jpg'),
    detail: resolveImage('https://www.customzone.co.kr/...jpg'),
  },
  '화이트': {
    main: require('../../assets/mockups/tshirt_front.jpg'), // .png → .jpg
    detail: require('../../assets/mockups/tshirt_back.jpg'),
  },
}
```

**교훈**
- 파일 확장자를 믿지 말고 **실제 파일 형식 확인** (`file` 명령어 사용)
- React Native의 이미지 로더는 확장자로 형식을 판단하므로 정확해야 함

---

### 3. OpenAI 생성 이미지의 배경 제거 문제
**증상**
- OpenAI로 생성한 이미지의 배경이 투명하지 않음
- 배경 제거 API를 사용해도 효과가 좋지 않음

**원인 분석**
- OpenAI의 `gpt-image-1` 모델은 **투명 배경을 지원하지 않음**
- `response_format: 'b64_json'` 파라미터도 지원하지 않음 (DALL-E 3와 다름)
- 복잡한 배경이 있으면 배경 제거 API의 정확도가 떨어짐

**해결 방법**
```javascript
// server/index.js
app.post('/v1/images/generate', async (req, res) => {
  const { prompt, ... } = req.body;

  // 프롬프트에 흰색 배경 명시 추가
  const enhancedPrompt = `${prompt}, on a plain white background`;

  const response = await client.images.generate({
    model: OPENAI_IMAGE_MODEL,
    prompt: enhancedPrompt, // 향상된 프롬프트 사용
    size,
    n: count,
    quality: OPENAI_IMAGE_QUALITY,
  });
});
```

**효과**
- 흰색 배경으로 생성되어 **배경 제거 API의 정확도 대폭 향상**
- 사용자는 여전히 "배경 제거" 버튼을 눌러야 하지만 결과가 훨씬 좋음

**기술적 제약**
- OpenAI gpt-image-1은 투명 배경 미지원 → 별도 배경 제거 과정 필요
- DALL-E 3와 API 스펙이 다름 → 마이그레이션 시 주의

---

### 4. 크기 조절 범위 문제
**증상**
- 디자인이 프린트 영역을 벗어나서 표시됨
- 사용자가 "파란 상자(프린트 영역)가 최대 크기"라고 인식하는데 그 이상 커짐

**원인**
```typescript
// 수정 전
const MAX_SCALE = 1.6; // 프린트 영역의 160%까지 가능
```

**문제점**
- `scale = 1.6`이면 디자인이 프린트 영역의 160% 크기
- 프린트 영역을 초과하면 실제 인쇄 시 잘릴 수 있음
- 사용자 혼란 초래

**해결 방법**
```typescript
// src/components/DesignStage.tsx
const MAX_SCALE = 1.0; // 프린트 영역을 초과하지 않도록 제한

// src/pages/editor.tsx
<ScaleSlider
  min={0.2}
  max={1.0} // 최대값도 1.0으로 변경
  value={activeTransform.scale}
  onChange={(scale) => updateActiveTransform({ ...activeTransform, scale })}
/>
```

**설계 결정**
- 프린트 영역 = 최대 디자인 크기
- `scale = 1.0` = 디자인이 프린트 영역과 정확히 같은 크기
- `scale = 0.7` (기본값) = 프린트 영역의 70% 크기

---

### 5. "꾹 누르기" 인터랙션의 사용성 문제
**증상**
- "프린팅 영역을 꾹 누르면 편집 활성화" 힌트가 사용자에게 혼란 제공
- 꾹 누르기, 드래그, 핀치를 동시에 이해해야 해서 복잡함
- 정확한 조정이 어려움

**사용자 피드백**
> "크기조정, 위치조정, 각도 조정을 따로따로 버튼을 눌러서 할수는 없나? 확실하게?"

**해결 방법**

#### 1단계: "꾹 누르기" 완전 제거
```typescript
// 수정 전
const [editing, setEditing] = useState(false);
const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const beginEditing = () => {
  editingRef.current = true;
  setEditing(true);
};

onPanResponderGrant: (evt) => {
  if (!editingRef.current) {
    holdTimerRef.current = setTimeout(() => {
      beginEditing(); // 150ms 후 편집 모드 활성화
    }, 150);
  }
}

// 수정 후 - 즉시 편집 가능
onPanResponderGrant: (evt) => {
  onInteractionStart?.(); // 바로 스크롤 비활성화
  // 터치하자마자 편집 시작
}
```

#### 2단계: 명시적 슬라이더 컨트롤 추가
```typescript
// src/pages/editor.tsx
// 크기 슬라이더
<View style={styles.sliderRow}>
  <Text style={styles.sliderLabel}>크기</Text>
  <ScaleSlider min={0.2} max={1.0} value={activeTransform.scale} onChange={...} />
</View>

// 가로 위치 슬라이더
<View style={styles.sliderRow}>
  <Text style={styles.sliderLabel}>가로 위치</Text>
  <ScaleSlider min={-0.55} max={0.55} value={activeTransform.offsetX} onChange={...} />
</View>

// 세로 위치 슬라이더
<View style={styles.sliderRow}>
  <Text style={styles.sliderLabel}>세로 위치</Text>
  <ScaleSlider min={-0.55} max={0.55} value={activeTransform.offsetY} onChange={...} />
</View>

// 회전 슬라이더
<View style={styles.sliderRow}>
  <Text style={styles.sliderLabel}>회전</Text>
  <ScaleSlider min={-180} max={180} value={activeTransform.rotation} onChange={...} />
</View>
```

**UX 개선 효과**
- **명확성**: 각 속성을 독립적으로 조절 가능
- **정밀성**: 슬라이더로 1도 단위, 0.01 단위 미세 조정 가능
- **직관성**: 드래그/핀치도 여전히 작동 (빠른 대략 조정용)
- **학습 곡선**: 슬라이더는 모바일에서 익숙한 UI 패턴

---

### 6. AI 생성 이미지의 크기 조절 불가 문제
**증상**
- AI로 새 이미지를 생성하면 크기 조절이 안 됨
- 슬라이더를 움직여도 변화 없음

**원인 분석**
```typescript
// 문제 코드
const goNext = () => {
  if (resultUrl) {
    setDesignImageUri(resultUrl); // 이미지만 변경
    navigation.navigate('/editor');
  }
};
```

**문제점**
1. 사용자가 이전에 `scale = 1.0` (최대값)으로 조정
2. 새 이미지 생성해도 **transform 값이 그대로 유지**
3. 이미 최대값이라 더 이상 키울 수 없음 → "크기 조절 안 됨"

**해결 방법**
```typescript
// src/context/catalog.tsx
const handleSetDesignImageUri = (uri: string | null) => {
  setDesignImageUri(uri);
  // 새 이미지 로드 시 transform 초기화
  if (uri) {
    setImageTransform(defaultImageTransform); // scale: 0.7로 리셋
  }
};

const value: CatalogContextValue = {
  // ...
  setDesignImageUri: handleSetDesignImageUri, // wrapper 사용
};
```

**설계 원칙**
- 새 이미지 = 새 시작 = transform 리셋
- 사용자가 매번 일관된 경험 (항상 0.7 scale로 시작)
- 혼란 방지

---

## 기술적 배운 점

### React Native PanResponder 패턴
```typescript
// ❌ 잘못된 패턴
const responder = useMemo(() =>
  PanResponder.create({
    onPanResponderMove: () => {
      updateTransform(transform); // 클로저에 갇힌 옛날 값
    }
  }),
  [] // 빈 의존성 배열
);

// ✅ 올바른 패턴
const transformRef = useRef(transform);
transformRef.current = transform; // 매 렌더링마다 최신 값 저장

const responder = useRef(
  PanResponder.create({
    onPanResponderMove: () => {
      const current = transformRef.current; // 최신 값 접근
      updateTransform(current);
    }
  })
);
```

### 파일 형식 검증의 중요성
```bash
# 확장자를 믿지 말고 실제 형식 확인
$ file image.png
image.png: JPEG image data  # 실제로는 JPEG!

# 매직 넘버로 확인
$ xxd -l 4 image.png
00000000: ffd8 ffe0                                ....
# FFD8 = JPEG 시작
# 89504E47 = PNG 시작
```

### State Management 설계
```typescript
// Wrapper 패턴으로 side effect 관리
const handleSetValue = (newValue) => {
  setValue(newValue);
  // 연관된 상태도 함께 업데이트
  if (newValue) {
    resetRelatedState();
  }
};

// Context에서 wrapper 노출
const value = {
  setValue: handleSetValue, // 원본 setter 대신 wrapper
};
```

---

## 파일 변경 내역

### 수정된 파일

#### 1. `src/components/DesignStage.tsx`
**변경 사항**
- `useMemo` → `useRef` 패턴으로 변경
- ref를 통한 최신 값 접근 구현
- "꾹 누르기" 로직 완전 제거
- `MAX_SCALE` 1.6 → 1.0 변경
- `useState` import 제거

**핵심 코드**
```typescript
// 최신 값을 ref로 관리
const activeTransformRef = useRef(activeTransform);
const updateTransformRef = useRef(updateTransform);
const areaRef = useRef(area);

activeTransformRef.current = activeTransform;
updateTransformRef.current = updateTransform;
areaRef.current = area;

// PanResponder에서 ref 사용
const responderRef = useRef(
  PanResponder.create({
    onPanResponderMove: (evt, gestureState) => {
      const currentArea = areaRef.current;
      const updateFn = updateTransformRef.current;
      // ...
    }
  })
);
```

#### 2. `src/pages/editor.tsx`
**변경 사항**
- 4개의 슬라이더 추가 (크기, 가로 위치, 세로 위치, 회전)
- "중앙 맞춤", "회전 초기화", "크기 초기화" → "전체 초기화" 통합
- 힌트 텍스트 변경: "슬라이더로 조절하세요"
- ScaleSlider max 1.6 → 1.0 변경

**핵심 코드**
```typescript
// 4개의 독립적인 슬라이더
<ScaleSlider label="크기" min={0.2} max={1.0} value={scale} />
<ScaleSlider label="가로 위치" min={-0.55} max={0.55} value={offsetX} />
<ScaleSlider label="세로 위치" min={-0.55} max={0.55} value={offsetY} />
<ScaleSlider label="회전" min={-180} max={180} value={rotation} />
```

#### 3. `src/context/catalog.tsx`
**변경 사항**
- `handleSetDesignImageUri` wrapper 함수 추가
- 새 이미지 로드 시 transform 자동 리셋

**핵심 코드**
```typescript
const handleSetDesignImageUri = (uri: string | null) => {
  setDesignImageUri(uri);
  if (uri) {
    setImageTransform(defaultImageTransform); // 초기화
  }
};
```

#### 4. `src/data/catalog.ts`
**변경 사항**
- `ColorImageMap` 타입 추가
- 화이트 티셔츠 이미지 경로 수정 (.png → .jpg)

**핵심 코드**
```typescript
export type ColorImageMap = {
  [color: string]: {
    main: ImageSourcePropType;
    detail: ImageSourcePropType;
  };
};

colorImages: {
  '화이트': {
    main: require('../../assets/mockups/tshirt_front.jpg'),
    detail: require('../../assets/mockups/tshirt_back.jpg'),
  },
}
```

#### 5. `src/components/MockupCanvas.tsx`
**변경 사항**
- 색상 오버레이 로직 완전 제거
- 순수 이미지 표시만 수행

#### 6. `server/index.js`
**변경 사항**
- 프롬프트에 ", on a plain white background" 자동 추가
- 로깅에 원본 프롬프트와 향상된 프롬프트 모두 기록

**핵심 코드**
```javascript
const enhancedPrompt = `${prompt}, on a plain white background`;
const response = await client.images.generate({
  prompt: enhancedPrompt,
  // ...
});
```

#### 7. `assets/mockups/`
**변경 사항**
- `tshirt_front.png` → `tshirt_front.jpg` (파일명 변경)
- `tshirt_back.png` → `tshirt_back.jpg` (파일명 변경)

---

## 커밋 히스토리

### 1. `fix: resolve PanResponder closure issue and white tshirt image display`
- PanResponder 클로저 버그 수정 (ref 패턴 적용)
- 화이트 티셔츠 이미지 형식 문제 수정 (.png → .jpg)

### 2. `feat: add white tshirt mockup images and color-specific image support`
- 화이트 티셔츠 목업 이미지 추가
- 색상별 이미지 매핑 시스템 구현

### 3. `feat: improve design editing UX and image generation`
- "꾹 누르기" 제거
- MAX_SCALE 1.0으로 제한
- OpenAI 프롬프트에 흰색 배경 추가

### 4. `build: update merchandisegpt.ait with UX improvements`
- 앱 번들 리빌드

### 5. `feat: add explicit sliders for all transform controls and reset on image change`
- 4개 슬라이더 추가 (크기, 가로/세로 위치, 회전)
- 이미지 변경 시 transform 자동 리셋

---

## 성능 영향

### Before
- PanResponder 재생성 없음 but 동작 불가 (클로저 버그)
- 복잡한 편집 모드 상태 관리

### After
- PanResponder 한 번 생성 + ref로 최신 값 접근
- 편집 모드 상태 제거로 상태 관리 단순화
- 4개 슬라이더 추가로 약간의 렌더링 증가 (무시할 수준)

**측정 결과**
- 번들 크기: 변화 없음
- 빌드 시간: 0.95초 (변화 없음)
- 타입 체크: 에러 없음

---

## 테스트 체크리스트

### 기능 테스트
- [ ] 프린트 영역 드래그 (위치 이동)
- [ ] 두 손가락 핀치 (크기 조절)
- [ ] 두 손가락 회전 (회전)
- [ ] 크기 슬라이더 (0.2 ~ 1.0)
- [ ] 가로 위치 슬라이더 (-0.55 ~ 0.55)
- [ ] 세로 위치 슬라이더 (-0.55 ~ 0.55)
- [ ] 회전 슬라이더 (-180° ~ 180°)
- [ ] "전체 초기화" 버튼
- [ ] 화이트 색상 선택 시 흰색 티셔츠 표시
- [ ] 블랙 색상 선택 시 검은색 티셔츠 표시
- [ ] AI 이미지 생성 시 transform 리셋 확인
- [ ] 배경 제거 버튼 (흰색 배경으로 생성된 이미지)

### 엣지 케이스
- [ ] 슬라이더 최소/최대 경계값
- [ ] 색상 전환 시 이미지 로딩
- [ ] 이미지 없이 텍스트만 편집
- [ ] 앞면/뒷면 전환 시 transform 유지
- [ ] 스크롤 활성화/비활성화 (터치 시작/종료)

---

## 향후 개선 가능 항목

### UX 개선
1. **실시간 미리보기**
   - 슬라이더 조작 시 디바운스 없이 즉시 반영 (현재도 실시간)
   - 프린트 영역 경계 시각적 피드백 강화

2. **스냅 기능**
   - 중앙 정렬 시 자석처럼 붙는 효과
   - 0°, 90°, 180°, 270° 회전 스냅

3. **프리셋**
   - "가득 채우기" (scale: 1.0, centered)
   - "작은 로고" (scale: 0.35, centered)
   - "대각선 배치" (rotation: 45°)

### 기술 부채
1. **TypeScript 개선**
   - `LayerTransform` 타입에 min/max 범위 메타데이터 추가
   - 슬라이더 범위를 상수로 추출 (DRY 원칙)

2. **테스트 추가**
   - PanResponder 유닛 테스트
   - transform 계산 로직 테스트
   - 이미지 로딩 통합 테스트

3. **성능 최적화**
   - 슬라이더 onChange 디바운싱 (현재는 즉시 반영)
   - 이미지 lazy loading
   - 목업 이미지 캐싱

### 기능 확장
1. **다중 레이어**
   - 여러 이미지/텍스트 동시 배치
   - 레이어 순서 조정
   - 개별 레이어 잠금/숨김

2. **고급 편집**
   - 필터 효과 (흑백, 세피아, 블러)
   - 크롭/마스크
   - 그림자/테두리 효과

3. **AI 기능 강화**
   - 배경 제거 자동화 (생성 직후)
   - 이미지 업스케일링
   - 스타일 전환 (realistic → cartoon)

---

## 참고 자료

### 관련 문서
- [React Native PanResponder 공식 문서](https://reactnative.dev/docs/panresponder)
- [React Hooks 클로저 문제](https://overreacted.io/making-setinterval-declarative-with-react-hooks/)
- [OpenAI Image Generation API](https://platform.openai.com/docs/guides/images)

### 참고 구현
- `/Users/daeyounglee/tshirtsmaker-work/js/canvas-editor.js`
  - Fabric.js 기반 목업 시스템
  - 색상 오버레이 multiply 블렌드 방식
  - 참고만 하고 React Native 특성에 맞게 재구현

### 외부 도구
- [ClipDrop Background Removal API](https://clipdrop.co/apis/docs/remove-background)
- [file 명령어](https://linux.die.net/man/1/file)
- [xxd 명령어](https://linux.die.net/man/1/xxd)

---

## 회고

### 잘된 점
1. **체계적 문제 분석**
   - 사용자 피드백을 구체적인 기술 문제로 분해
   - 각 문제의 근본 원인 파악
   - 단계별 해결 접근

2. **ref 패턴 적용**
   - React의 클로저 함정을 우회하는 깔끔한 해결책
   - PanResponder와 같은 외부 라이브러리와 React 상태를 연결하는 표준 패턴 확립

3. **UX 우선 설계**
   - 기술적으로 가능하다고 해서 좋은 UX가 아님
   - "꾹 누르기"는 작동했어도 사용자에게 혼란 → 제거
   - 명시적 컨트롤로 사용자에게 더 많은 제어권 부여

### 아쉬운 점
1. **초기 설계 실수**
   - `useMemo` 빈 배열 의존성 → 명백한 버그
   - 코드 리뷰나 테스트로 조기 발견 가능했음

2. **파일 형식 검증 누락**
   - `.png` 확장자를 믿고 실제 형식 확인 안 함
   - 개발 초기에 `file` 명령어로 검증했다면 시간 절약

3. **문서화 부족**
   - 변경 사항을 실시간으로 문서화하지 않음
   - 나중에 기억을 되살려 문서 작성 (시간 낭비)

### 배운 교훈
1. **Trust but verify**: 파일 확장자, API 응답 형식 등 가정하지 말고 확인
2. **State + Closure = 위험**: Hooks와 오래 살아있는 클로저를 조합할 때는 항상 ref 고려
3. **UX는 반복**: 첫 설계(꾹 누르기)가 실패 → 사용자 피드백 → 개선(슬라이더)
4. **문서화는 코딩의 일부**: 코드를 쓰면서 동시에 문서 작성

---

## 체크리스트

작업 완료 확인:
- [x] PanResponder 터치 인터랙션 수정
- [x] 화이트 티셔츠 이미지 표시 수정
- [x] OpenAI 프롬프트에 흰색 배경 추가
- [x] MAX_SCALE 1.0으로 제한
- [x] "꾹 누르기" 제거
- [x] 4개 슬라이더 추가
- [x] 이미지 변경 시 transform 리셋
- [x] 타입 체크 통과
- [x] 앱 빌드 성공
- [x] Git 커밋 및 푸시
- [x] 문서 작성

배포 대기 중:
- [ ] Railway 자동 배포 확인
- [ ] Toss 앱에서 기능 테스트
- [ ] 사용자 피드백 수집
