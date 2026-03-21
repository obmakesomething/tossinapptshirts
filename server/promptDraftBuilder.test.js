const { buildPromptDraft } = require('./promptDraftBuilder');

const BUYER_NOTICE = `[필수 안내]
- 본 상품은 운영자 콘텐츠 검수 승인 후 결과물이 제공됩니다.
- 검수 승인 전에는 결과물 제공/다운로드/발급이 불가합니다.
- 정책 위반(불법/혐오/성적/개인정보/권리침해 등) 요청은 반려될 수 있으며, 반려 시 환불 처리됩니다.`;

const baseInput = {
  user_prompt: '미니멀한 산과 해 일러스트',
  template_hint: 'auto',
  allow_people: false,
  aspect_ratio: 'auto',
  target_model: 'imagen-4.0-generate-001',
  language: 'ko',
  output_mime_type: 'image/png',
  product_context: {
    use_case: 'thumbnail',
    tone: 'clean',
    brand_safety_level: 'strict',
  },
};

describe('buildPromptDraft', () => {
  it('builds an ALLOW_DRAFT payload with required fixed fields', () => {
    const result = buildPromptDraft(baseInput);

    expect(result.version).toBe('1.0');
    expect(result.decision).toBe('ALLOW_DRAFT');
    expect(result.reason_code).toBe('OK00');
    expect(result.requires_manual_review).toBe(true);
    expect(result.template_id).toBe('t_product_photo_clean');
    expect(result.imagen_prompt).toContain('Original, generic, non-branded design.');
    expect(result.imagen_prompt).toContain('No text, no letters, no logo, no watermark, no signature.');
    expect(result.imagen_parameters.personGeneration).toBe('dont_allow');
    expect(result.imagen_parameters.safetySetting).toBe('block_low_and_above');
    expect(result.imagen_parameters.addWatermark).toBe(true);
    expect(result.imagen_parameters.includeRaiReason).toBe(true);
    expect(result.imagen_parameters.includeSafetyAttributes).toBe(true);
    expect(result.buyer_notice_ko).toBe(BUYER_NOTICE);
  });

  it('blocks explicit sexual content with SEX01 and empty prompt', () => {
    const result = buildPromptDraft({
      ...baseInput,
      user_prompt: '포르노 장면을 사실적으로 만들어줘',
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.reason_code).toBe('SEX01');
    expect(result.imagen_prompt).toBe('');
    expect(result.imagen_parameters.personGeneration).toBe('dont_allow');
    expect(result.review_lane).toBe('HIGH');
  });

  it('blocks personal data requests with PRIV01', () => {
    const result = buildPromptDraft({
      ...baseInput,
      user_prompt: '010-1234-5678 전화번호와 이메일 test@example.com 이 보이게 포스터 만들어줘',
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.reason_code).toBe('PRIV01');
    expect(result.risk_flags).toContain('pii_suspected');
  });

  it('allows style-reference but rewrites brand/IP studio style to generic style', () => {
    const result = buildPromptDraft({
      ...baseInput,
      user_prompt: '지브리 스타일의 숲 풍경',
      template_hint: 'background_illustration',
      product_context: {
        ...baseInput.product_context,
        use_case: 'background',
      },
    });

    expect(result.decision).toBe('ALLOW_DRAFT');
    expect(result.reason_code).toBe('OK00');
    expect(result.risk_flags).toContain('ip_style_reference');
    expect(result.rewrites.length).toBeGreaterThan(0);
    expect(result.template_id).toBe('t_background_illustration');
    expect(result.admin_notes).toMatch(/스타일 명칭 일반화/);
  });

  it('uses allow_adult only when people are allowed and blocks minor cues', () => {
    const adultResult = buildPromptDraft({
      ...baseInput,
      user_prompt: '프로필 사진 느낌의 성인 인물 포트레이트',
      allow_people: true,
      template_hint: 'adult_portrait',
      product_context: {
        ...baseInput.product_context,
        use_case: 'profile',
      },
    });

    expect(adultResult.decision).toBe('ALLOW_DRAFT');
    expect(adultResult.template_id).toBe('t_fictional_adult_portrait');
    expect(adultResult.imagen_parameters.personGeneration).toBe('allow_adult');
    expect(adultResult.imagen_prompt).toContain('original fictional adult (age 25+)');
    expect(adultResult.imagen_prompt).toContain('must not resemble any real person, celebrity, or public figure');

    const minorResult = buildPromptDraft({
      ...baseInput,
      user_prompt: '교복 입은 학생 인물 사진',
      allow_people: true,
      template_hint: 'adult_portrait',
      product_context: {
        ...baseInput.product_context,
        use_case: 'profile',
      },
    });

    expect(minorResult.decision).toBe('BLOCK');
    expect(minorResult.reason_code).toBe('MIN01');
    expect(minorResult.imagen_parameters.personGeneration).toBe('dont_allow');
  });
});
