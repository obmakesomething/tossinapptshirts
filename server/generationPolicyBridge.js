'use strict';

const STYLE_TO_TONE = {
  minimal: 'minimal',
  lineart: 'clean',
  graphic: 'cinematic',
};

const STYLE_LABEL = {
  minimal: 'minimal clean graphic',
  lineart: 'line art',
  graphic: 'bold graphic illustration',
};

function resolveAspectRatio(aspectRatio) {
  const value = String(aspectRatio || '1:1');
  const allowed = new Set(['1:1', '3:4', '4:3', '9:16', '16:9', 'auto']);
  if (!allowed.has(value)) return '1:1';
  return value;
}

function mapGenerationRequestToDraftInput(params = {}) {
  const stylePreset = String(params.style_preset || 'minimal');
  return {
    user_prompt: String(params.prompt || '').trim(),
    template_hint: String(params.template_hint || 'auto'),
    allow_people: Boolean(params.allow_people),
    aspect_ratio: resolveAspectRatio(params.aspectRatio || '1:1'),
    target_model: String(params.target_model || 'unknown'),
    language: String(params.language || 'ko'),
    output_mime_type: String(params.output_mime_type || 'image/png'),
    product_context: {
      use_case: String(params?.product_context?.use_case || 'product_image'),
      tone: String(
        params?.product_context?.tone || STYLE_TO_TONE[stylePreset] || 'clean',
      ),
      brand_safety_level: String(
        params?.product_context?.brand_safety_level || 'strict',
      ),
    },
  };
}

function buildGenerationModelPrompt({ policyPrompt, stylePreset }) {
  const prompt = String(policyPrompt || '').trim();
  const styleText = STYLE_LABEL[String(stylePreset || 'minimal')] || 'clean visual style';
  return `${prompt}
Visual style preference: ${styleText}.
Background: plain white background, clean print-ready composition for t-shirt design.`;
}

function buildBlockedGenerationError(draft) {
  return {
    error: '요청이 정책 기준에 맞지 않아 초안 생성이 차단되었습니다.',
    reason_code: draft.reason_code || 'ETC99',
    risk_score: Number(draft.risk_score || 90),
    review_lane: draft.review_lane || 'HIGH',
    requires_manual_review: true,
    admin_notes: String(draft.admin_notes || ''),
    rewrites: Array.isArray(draft.rewrites) ? draft.rewrites : [],
  };
}

module.exports = {
  mapGenerationRequestToDraftInput,
  buildGenerationModelPrompt,
  buildBlockedGenerationError,
};
