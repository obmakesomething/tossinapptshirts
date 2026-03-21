const {
  mapGenerationRequestToDraftInput,
  buildGenerationModelPrompt,
  buildBlockedGenerationError,
} = require('./generationPolicyBridge');

describe('generationPolicyBridge', () => {
  it('maps generation request to prompt draft input defaults', () => {
    const draftInput = mapGenerationRequestToDraftInput({
      prompt: '미니멀한 산 일러스트',
      style_preset: 'minimal',
      aspectRatio: '4:3',
    });

    expect(draftInput).toEqual(
      expect.objectContaining({
        user_prompt: '미니멀한 산 일러스트',
        template_hint: 'auto',
        allow_people: false,
        aspect_ratio: '4:3',
        target_model: 'unknown',
        language: 'ko',
        output_mime_type: 'image/png',
      }),
    );
    expect(draftInput.product_context).toEqual(
      expect.objectContaining({
        use_case: 'product_image',
        tone: 'minimal',
        brand_safety_level: 'strict',
      }),
    );
  });

  it('builds a model prompt that preserves policy constraints and style/background hints', () => {
    const prompt = buildGenerationModelPrompt({
      policyPrompt: 'A studio product photo of mountain icon.\nOriginal, generic, non-branded design.',
      stylePreset: 'lineart',
    });

    expect(prompt).toContain('Original, generic, non-branded design.');
    expect(prompt).toContain('Visual style preference: line art.');
    expect(prompt).toContain('Background: plain white background');
  });

  it('builds stable blocked error payload for client UX', () => {
    const payload = buildBlockedGenerationError({
      reason_code: 'PRIV01',
      risk_score: 92,
      review_lane: 'HIGH',
      admin_notes: '개인정보 포함 요청 차단.',
      rewrites: [{ from: '전화번호', to: '개인정보 제거' }],
    });

    expect(payload).toEqual(
      expect.objectContaining({
        error: '요청이 정책 기준에 맞지 않아 초안 생성이 차단되었습니다.',
        reason_code: 'PRIV01',
        risk_score: 92,
        review_lane: 'HIGH',
        requires_manual_review: true,
      }),
    );
    expect(payload.admin_notes).toBe('개인정보 포함 요청 차단.');
    expect(payload.rewrites).toHaveLength(1);
  });
});
