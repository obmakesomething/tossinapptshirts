'use strict';

const BUYER_NOTICE_KO = `[필수 안내]
- 본 상품은 운영자 콘텐츠 검수 승인 후 결과물이 제공됩니다.
- 검수 승인 전에는 결과물 제공/다운로드/발급이 불가합니다.
- 정책 위반(불법/혐오/성적/개인정보/권리침해 등) 요청은 반려될 수 있으며, 반려 시 환불 처리됩니다.`;

const ALLOWED_TEMPLATE_HINTS = new Set([
  'auto',
  'product_photo',
  'background_illustration',
  'icon_illustration',
  'adult_portrait',
]);
const ALLOWED_ASPECT_INPUTS = new Set(['auto', '1:1', '3:4', '4:3', '9:16', '16:9']);
const ALLOWED_LANGUAGE = new Set(['ko', 'en', 'auto']);
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg']);
const ALLOWED_TARGET_MODELS = new Set([
  'imagen-4.0-generate-001',
  'imagen-4.0-fast-generate-001',
  'imagen-4.0-ultra-generate-001',
  'imagen-3.0-generate-002',
  'imagen-3.0-generate-001',
  'imagen-3.0-fast-generate-001',
  'imagen-3.0-capability-001',
  'unknown',
]);
const NEGATIVE_PROMPT_SUPPORTED_MODELS = new Set([
  'imagen-3.0-generate-001',
  'imagen-3.0-fast-generate-001',
  'imagen-3.0-capability-001',
]);

const BLOCK_REASON_BASE_SCORE = {
  SEX01: 98,
  MIN01: 100,
  VIOL01: 94,
  HATE01: 96,
  SELF01: 97,
  ILLEGAL01: 95,
  WEAP01: 94,
  PRIV01: 92,
  IMP01: 94,
  IP01: 90,
  HRM01: 93,
  ETC99: 90,
};

const BRAND_TERMS = [
  'iphone',
  'samsung',
  'galaxy',
  'apple',
  'nike',
  'adidas',
  'starbucks',
  'tesla',
  'coca-cola',
  '아이폰',
  '갤럭시',
  '애플',
  '나이키',
  '아디다스',
  '스타벅스',
  '테슬라',
];

const IP_CHARACTER_TERMS = [
  '포켓몬',
  '피카츄',
  '디즈니',
  '미키마우스',
  '마블',
  'dc코믹스',
  '짱구',
  '헬로키티',
  'ghibli',
  'pixar',
  'disney',
  'pokemon',
  'pikachu',
  'mickey',
  'marvel',
];

const STUDIO_STYLE_TERMS = [
  '지브리 스타일',
  'ghibli style',
  'ghibli',
  '픽사 스타일',
  'pixar style',
  'pixar',
  '디즈니 스타일',
  'disney style',
];

const KNOWN_PUBLIC_FIGURE_HINTS = [
  'celebrity',
  'public figure',
  'deepfake',
  '딥페이크',
  '연예인',
  '정치인',
  '공인',
  '실존 인물',
  '유명인',
];

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'for',
  'with',
  'into',
  'this',
  'that',
  '이미지',
  '그림',
  '일러스트',
  '사진',
  '만들어줘',
  '만들기',
  '스타일',
  'like',
]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeEnum(value, allowed, fallback) {
  const normalized = String(value || '').trim();
  return allowed.has(normalized) ? normalized : fallback;
}

function normalizeInput(rawInput) {
  const raw = rawInput && typeof rawInput === 'object' ? rawInput : {};
  const productContext =
    raw.product_context && typeof raw.product_context === 'object'
      ? raw.product_context
      : {};

  return {
    user_prompt: String(raw.user_prompt || '').trim(),
    template_hint: normalizeEnum(raw.template_hint, ALLOWED_TEMPLATE_HINTS, 'auto'),
    allow_people: Boolean(raw.allow_people),
    aspect_ratio: normalizeEnum(raw.aspect_ratio, ALLOWED_ASPECT_INPUTS, 'auto'),
    target_model: normalizeEnum(raw.target_model, ALLOWED_TARGET_MODELS, 'unknown'),
    language: normalizeEnum(raw.language, ALLOWED_LANGUAGE, 'ko'),
    output_mime_type: normalizeEnum(raw.output_mime_type, ALLOWED_MIME, 'image/png'),
    product_context: {
      use_case: String(productContext.use_case || 'other').trim() || 'other',
      tone: String(productContext.tone || 'clean').trim() || 'clean',
      brand_safety_level:
        String(productContext.brand_safety_level || 'strict').trim() || 'strict',
    },
  };
}

function containsAny(text, patterns) {
  return patterns.some((pattern) => text.includes(pattern));
}

function containsRegex(text, regexList) {
  return regexList.some((regex) => regex.test(text));
}

function extractKeywords(text) {
  const cleaned = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));

  return cleaned.slice(0, 8);
}

function deriveSubject(normalized, rewrittenText) {
  const keywords = extractKeywords(rewrittenText);
  if (keywords.length > 0) {
    return keywords.join(' ');
  }
  if (normalized.product_context.use_case === 'product_image') {
    return 'a clean product-focused visual';
  }
  if (normalized.product_context.use_case === 'background') {
    return 'an atmospheric background scene';
  }
  if (normalized.product_context.use_case === 'profile') {
    return normalized.allow_people
      ? 'a fictional adult portrait concept'
      : 'a profile-friendly abstract motif';
  }
  return 'a commercially safe visual concept';
}

function getToneStyle(tone) {
  const normalizedTone = String(tone || '').toLowerCase();
  if (normalizedTone === 'minimal') return 'minimal, refined';
  if (normalizedTone === 'cute') return 'playful, charming';
  if (normalizedTone === 'luxury') return 'premium, elegant';
  if (normalizedTone === 'cinematic') return 'cinematic, dramatic depth';
  return 'clean, professional';
}

function getUseCaseContext(useCase) {
  const uc = String(useCase || '').toLowerCase();
  if (uc === 'thumbnail') return 'optimized for thumbnail readability and clean silhouette';
  if (uc === 'product_image') return 'suited for e-commerce product presentation';
  if (uc === 'background') return 'usable as a flexible background visual';
  if (uc === 'poster') return 'balanced for poster composition and visual hierarchy';
  if (uc === 'profile') return 'framed for profile usage and clear focal point';
  return 'designed for general-purpose visual communication';
}

function chooseTemplate(normalized) {
  const hint = normalized.template_hint;
  const useCase = String(normalized.product_context.use_case || '').toLowerCase();

  if (hint === 'product_photo' || useCase === 'product_image' || useCase === 'thumbnail') {
    return 't_product_photo_clean';
  }
  if (hint === 'background_illustration' || useCase === 'background') {
    return 't_background_illustration';
  }
  if (hint === 'icon_illustration' || useCase === 'icon') {
    return 't_icon_illustration';
  }
  if (
    normalized.allow_people &&
    (hint === 'adult_portrait' || useCase === 'profile')
  ) {
    return 't_fictional_adult_portrait';
  }
  return 't_generic';
}

function resolveAspectRatio(aspectRatioInput, templateId) {
  if (aspectRatioInput && aspectRatioInput !== 'auto') {
    return aspectRatioInput;
  }
  if (templateId === 't_background_illustration') return '16:9';
  if (templateId === 't_fictional_adult_portrait') return '3:4';
  return '1:1';
}

function defaultImagenParameters({
  aspectRatio,
  mimeType,
  language,
  personGeneration,
}) {
  return {
    sampleCount: 1,
    addWatermark: true,
    aspectRatio,
    enhancePrompt: false,
    includeRaiReason: true,
    includeSafetyAttributes: true,
    outputOptions: {
      mimeType,
    },
    personGeneration,
    safetySetting: 'block_low_and_above',
    language,
  };
}

function decideLane(riskScore) {
  if (riskScore <= 20) return 'FAST';
  if (riskScore <= 60) return 'NORMAL';
  return 'HIGH';
}

function buildNegativePrompt(targetModel, personGeneration) {
  if (!NEGATIVE_PROMPT_SUPPORTED_MODELS.has(targetModel)) {
    return null;
  }
  const base =
    'text, letters, logos, watermarks, signatures, brand marks, real-person likeness, copyrighted characters, explicit sexual content, gore';
  if (personGeneration === 'dont_allow') {
    return `${base}, people, human face, human body`;
  }
  return base;
}

function addRewrite(rewrites, from, to) {
  rewrites.push({ from, to });
}

function buildBlockResult({
  reasonCode,
  riskFlags,
  rewrites,
  templateId,
  normalized,
  aspectRatio,
  sanitizedUserPrompt,
}) {
  const riskScore = BLOCK_REASON_BASE_SCORE[reasonCode] || 90;
  return {
    version: '1.0',
    decision: 'BLOCK',
    reason_code: reasonCode,
    risk_score: riskScore,
    risk_flags: Array.from(new Set(riskFlags)),
    requires_manual_review: true,
    review_lane: decideLane(riskScore),
    sanitized_user_prompt: sanitizedUserPrompt,
    rewrites,
    template_id: templateId,
    imagen_prompt: '',
    imagen_negative_prompt: null,
    imagen_parameters: defaultImagenParameters({
      aspectRatio,
      mimeType: normalized.output_mime_type,
      language: normalized.language,
      personGeneration: 'dont_allow',
    }),
    buyer_notice_ko: BUYER_NOTICE_KO,
    admin_notes: `금지 항목(${reasonCode}) 감지로 초안 생성 차단됨. 운영자는 원문의 정책 위반 요소와 오탐 여부를 확인해야 합니다.`,
  };
}

function classifyForBlock(normalized, lowerPrompt, hasPersonIntent) {
  const hasSexual = containsRegex(lowerPrompt, [
    /porn|sexual|explicit|erotic|nude|naked|nsfw|sex/i,
    /포르노|성행위|노골적|과도한 노출|야동|19금|섹스|자위/i,
  ]);
  const hasMinorCue = containsRegex(lowerPrompt, [
    /minor|underage|child|kid|teen|schoolgirl|schoolboy/i,
    /미성년|아동|어린이|청소년|학생|교복|중학생|고등학생|초등학생/i,
  ]);
  const hasViolence = containsRegex(lowerPrompt, [
    /gore|gory|dismember|decapitat|blood splatter|graphic violence/i,
    /잔혹|고어|유혈|신체 훼손|절단|피범벅/i,
  ]);
  const hasHate = containsRegex(lowerPrompt, [
    /hate speech|racial slur|supremac|ethnic cleansing|genocide/i,
    /혐오|차별|비하|증오|인종청소/i,
  ]);
  const hasSelfHarm = containsRegex(lowerPrompt, [
    /suicide|self-harm|kill myself|how to die/i,
    /자살|자해|죽는 법|목숨 끊/i,
  ]);
  const hasIllegal = containsRegex(lowerPrompt, [
    /phishing|hack|ransomware|counterfeit|forgery|scam guide|drug manufacturing/i,
    /해킹|피싱|랜섬웨어|사기 방법|위조|불법 약물 제조|침입/i,
  ]);
  const hasWeapon = containsRegex(lowerPrompt, [
    /build a bomb|explosive recipe|weapon blueprint|gun making/i,
    /폭탄 제조|폭발물 제작|총기 제작|무기 만드는/i,
  ]);
  const hasPii =
    containsRegex(lowerPrompt, [
      /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
      /\+?\d[\d -]{7,}\d/,
      /주민등록|주민번호|계좌번호|신용카드|여권번호|집주소|전화번호|이메일/i,
      /social security|ssn|bank account|credit card number|passport number/i,
    ]);
  const hasImpersonation =
    containsAny(lowerPrompt, KNOWN_PUBLIC_FIGURE_HINTS) ||
    containsRegex(lowerPrompt, [
      /닮게|똑같은 얼굴|실존 인물처럼|사칭/i,
      /look like .*celebrity|public figure likeness|impersonate|deepfake/i,
    ]);

  const hasLogoTerm = containsRegex(lowerPrompt, [
    /logo|wordmark|trademark|brand mark|emblem/i,
    /로고|상표|워드마크|엠블럼/i,
  ]);
  const hasReproduceTerm = containsRegex(lowerPrompt, [
    /exact|identical|1:1|replica|same as|recreate exactly/i,
    /그대로|똑같|동일|복제|재현/i,
  ]);
  const hasBrandTerm = BRAND_TERMS.some((term) => lowerPrompt.includes(term));
  const hasIpCharacter = IP_CHARACTER_TERMS.some((term) => lowerPrompt.includes(term));
  const hasCharacterWord = containsRegex(lowerPrompt, [/character/i, /캐릭터/i]);

  const hasHarassment = containsRegex(lowerPrompt, [
    /defame|harass|humiliate|threaten|doxx/i,
    /명예훼손|협박|조롱|모욕|괴롭/i,
  ]);

  if (!normalized.user_prompt) {
    return { reasonCode: 'ETC99', riskFlags: ['invalid_input'] };
  }
  if (hasMinorCue && (hasSexual || normalized.allow_people || hasPersonIntent)) {
    return { reasonCode: 'MIN01', riskFlags: ['adult_theme'] };
  }
  if (hasSexual) {
    return { reasonCode: 'SEX01', riskFlags: ['adult_theme'] };
  }
  if (hasHate) {
    return { reasonCode: 'HATE01', riskFlags: ['hate'] };
  }
  if (hasSelfHarm) {
    return { reasonCode: 'SELF01', riskFlags: ['self_harm'] };
  }
  if (hasIllegal) {
    return { reasonCode: 'ILLEGAL01', riskFlags: ['illegal'] };
  }
  if (hasWeapon) {
    return { reasonCode: 'WEAP01', riskFlags: ['weapon'] };
  }
  if (hasPii) {
    return { reasonCode: 'PRIV01', riskFlags: ['pii_suspected'] };
  }
  if (hasImpersonation) {
    return { reasonCode: 'IMP01', riskFlags: ['celebrity_name'] };
  }
  if ((hasLogoTerm && (hasReproduceTerm || hasBrandTerm)) || (hasIpCharacter && (hasReproduceTerm || hasCharacterWord || hasLogoTerm))) {
    return { reasonCode: 'IP01', riskFlags: ['ip_reproduction'] };
  }
  if (hasHarassment) {
    return { reasonCode: 'HRM01', riskFlags: ['harassment'] };
  }
  if (hasViolence) {
    return { reasonCode: 'VIOL01', riskFlags: ['violence'] };
  }
  return null;
}

function buildImagenPrompt({
  templateId,
  subject,
  context,
  tone,
  personGeneration,
  allowPeople,
}) {
  const style = getToneStyle(tone);
  const lines = [];

  if (templateId === 't_product_photo_clean') {
    lines.push(`A studio product photo of ${subject}.`);
    lines.push(`Context: ${context}.`);
    lines.push(`Style: photorealistic, clean, professional, ${style}.`);
    lines.push('Composition: centered, sharp focus.');
    lines.push('Lighting & color: soft studio lighting, neutral tones.');
  } else if (templateId === 't_background_illustration') {
    lines.push(`A high-quality illustration of ${subject}.`);
    lines.push(`Context: ${context}.`);
    lines.push(`Style: ${style}.`);
    lines.push('Composition: wide, lots of negative space.');
    lines.push('Lighting & color: soft ambient light, balanced color palette.');
  } else if (templateId === 't_icon_illustration') {
    lines.push(`A simple flat vector icon of ${subject}.`);
    lines.push('Style: minimal, clean edges, high contrast, app icon style.');
    lines.push('Composition: centered with generous padding and clear silhouette.');
    lines.push('Lighting & color: solid fills, crisp contrast, uncluttered background.');
  } else if (templateId === 't_fictional_adult_portrait' && allowPeople) {
    lines.push(`A portrait photo of an original fictional adult (age 25+), ${subject}.`);
    lines.push(`Context: ${context}.`);
    lines.push(`Style: photorealistic, clean, professional, ${style}.`);
    lines.push('Composition: clean portrait framing, clear eye-line, sharp facial details.');
    lines.push('Lighting & color: soft key light, natural skin tones, balanced contrast.');
    lines.push('must not resemble any real person, celebrity, or public figure.');
  } else {
    lines.push(`An original visual concept of ${subject}.`);
    lines.push(`Context: ${context}.`);
    lines.push(`Style: ${style}.`);
    lines.push('Composition: clear focal hierarchy and balanced spacing.');
    lines.push('Lighting & color: commercially usable palette with clean contrast.');
  }

  if (personGeneration === 'dont_allow') {
    lines.push('No people, no human faces, no human bodies.');
  }

  lines.push('Original, generic, non-branded design.');
  lines.push('No text, no letters, no logo, no watermark, no signature.');
  return lines.slice(0, 10).join('\n');
}

function buildPromptDraft(rawInput) {
  const normalized = normalizeInput(rawInput);
  const rewrites = [];
  const riskFlags = [];
  const lowerPrompt = normalized.user_prompt.toLowerCase();

  const hasPersonIntent = containsRegex(lowerPrompt, [
    /portrait|headshot|profile photo|human face|person/i,
    /인물|프로필|사람|얼굴|초상/i,
  ]);

  let rewrittenPrompt = normalized.user_prompt;

  const studioTerm = STUDIO_STYLE_TERMS.find((term) =>
    lowerPrompt.includes(term),
  );
  if (studioTerm) {
    rewrittenPrompt = rewrittenPrompt.replace(
      new RegExp(studioTerm, 'ig'),
      'storybook animation style',
    );
    addRewrite(
      rewrites,
      '특정 스튜디오/프랜차이즈 스타일 지칭',
      '일반화된 서사적 애니메이션 스타일로 대체',
    );
    riskFlags.push('ip_style_reference');
  }

  const brandMentions = BRAND_TERMS.filter((term) =>
    lowerPrompt.includes(term),
  );
  if (brandMentions.length > 0) {
    rewrittenPrompt = brandMentions.reduce(
      (acc, term) => acc.replace(new RegExp(term, 'ig'), 'generic product'),
      rewrittenPrompt,
    );
    addRewrite(
      rewrites,
      '브랜드/상표 명칭 언급',
      '비브랜드 일반 표현으로 일반화',
    );
    riskFlags.push('brand_reference');
  }

  const block = classifyForBlock(normalized, lowerPrompt, hasPersonIntent);
  const templateId = chooseTemplate(normalized);
  const aspectRatio = resolveAspectRatio(normalized.aspect_ratio, templateId);

  if (block) {
    const sanitizedUserPrompt = `정책 위반 가능 요소가 포함된 요청으로 요약됨(${block.reasonCode}). 민감/권리 요소는 마스킹되었습니다.`;
    if (rewrites.length === 0) {
      addRewrite(
        rewrites,
        '금지 또는 민감한 요청 요소',
        '정책 준수 가능한 일반 요청으로 재작성 필요',
      );
    }
    return buildBlockResult({
      reasonCode: block.reasonCode,
      riskFlags: [...riskFlags, ...(block.riskFlags || [])],
      rewrites,
      templateId,
      normalized,
      aspectRatio,
      sanitizedUserPrompt,
    });
  }

  const subject = deriveSubject(normalized, rewrittenPrompt);
  const context = getUseCaseContext(normalized.product_context.use_case);
  const personGeneration = normalized.allow_people ? 'allow_adult' : 'dont_allow';
  const imagenPrompt = buildImagenPrompt({
    templateId,
    subject,
    context,
    tone: normalized.product_context.tone,
    personGeneration,
    allowPeople: normalized.allow_people,
  });

  if (normalized.allow_people) {
    riskFlags.push('adult_theme');
  }
  if (
    containsRegex(lowerPrompt, [/election|president|politic/i, /정치|대선|대통령/i])
  ) {
    riskFlags.push('politics');
  }
  if (
    containsRegex(lowerPrompt, [/medical claim|cure|treat disease/i, /치료 효과|의학적 효능|완치/i])
  ) {
    riskFlags.push('medical_claim');
  }

  let riskScore = 12;
  if (riskFlags.includes('brand_reference')) riskScore += 20;
  if (riskFlags.includes('ip_style_reference')) riskScore += 18;
  if (riskFlags.includes('adult_theme')) riskScore += 15;
  if (riskFlags.includes('politics')) riskScore += 22;
  if (riskFlags.includes('medical_claim')) riskScore += 18;
  if (!normalized.allow_people && hasPersonIntent) riskScore += 20;
  riskScore = clamp(riskScore, 0, 100);

  if (!normalized.allow_people && hasPersonIntent) {
    addRewrite(
      rewrites,
      '인물/얼굴 생성 의도 표현',
      '비인물 중심 구성으로 일반화',
    );
  }
  if (rewrites.length === 0) {
    addRewrite(
      rewrites,
      '원문 요청 요지',
      '정책 준수 가능한 비브랜드 일반 표현으로 정규화',
    );
  }

  const sanitizedUserPrompt = `요청 요약: ${subject} 중심의 안전한 비브랜드 이미지 초안 요청으로 일반화됨.`;
  const reviewLane = decideLane(riskScore);
  const highRiskLabel = reviewLane === 'HIGH' ? ' 고위험 검수 필요.' : '';
  const adminNoteParts = [];
  if (riskFlags.includes('brand_reference')) {
    adminNoteParts.push('브랜드 언급 일반화 처리됨(로고/텍스트 제거)');
  }
  if (riskFlags.includes('ip_style_reference')) {
    adminNoteParts.push('스타일 명칭 일반화 처리됨');
  }
  if (normalized.allow_people) {
    adminNoteParts.push('성인 가상 인물 조건 적용됨');
  } else {
    adminNoteParts.push('인물 없음');
  }
  if (adminNoteParts.length === 0) {
    adminNoteParts.push('특이 위험 신호 없음');
  }

  return {
    version: '1.0',
    decision: 'ALLOW_DRAFT',
    reason_code: 'OK00',
    risk_score: riskScore,
    risk_flags: Array.from(new Set(riskFlags)),
    requires_manual_review: true,
    review_lane: reviewLane,
    sanitized_user_prompt: sanitizedUserPrompt,
    rewrites,
    template_id: templateId,
    imagen_prompt: imagenPrompt,
    imagen_negative_prompt: buildNegativePrompt(
      normalized.target_model,
      personGeneration,
    ),
    imagen_parameters: defaultImagenParameters({
      aspectRatio,
      mimeType: normalized.output_mime_type,
      language: normalized.language,
      personGeneration,
    }),
    buyer_notice_ko: BUYER_NOTICE_KO,
    admin_notes: `${adminNoteParts.join('. ')}. 운영자는 로고/권리/인물 유사성 잔존 여부를 확인해야 합니다.${highRiskLabel}`,
  };
}

module.exports = {
  buildPromptDraft,
};
