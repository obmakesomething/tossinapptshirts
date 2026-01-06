const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const ASYNC_UPSCALE_ENDPOINT =
  'https://clipdrop-api.co/image-upscaling/v1/async-upscale';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureDir = async (dirPath) => {
  await fsp.mkdir(dirPath, { recursive: true });
};

const getExtensionFromType = (contentType) => {
  if (!contentType) return 'bin';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  return 'bin';
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

async function submitClipdropUpscale({
  masterPath,
  targetWidth,
  targetHeight,
  apiKey,
}) {
  const form = new FormData();
  const fileBuffer = await fsp.readFile(masterPath);
  form.append('image_file', new Blob([fileBuffer]), path.basename(masterPath));
  form.append('target_width', String(targetWidth));
  form.append('target_height', String(targetHeight));

  const response = await fetch(ASYNC_UPSCALE_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`clipdrop_submit_failed: ${text}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const buffer = Buffer.from(await response.arrayBuffer());
    return { immediate: true, buffer, contentType };
  }

  const data = await response.json();
  return { immediate: false, data };
}

const resolveStatusUrl = (data) => {
  if (!data || typeof data !== 'object') return null;
  const direct =
    data.status_url ||
    data.url ||
    data.href ||
    data.result_url ||
    data._links?.self?.href;
  if (direct) return direct;
  const jobId = data.id || data.job_id || data.task_id;
  const base = process.env.CLIPDROP_STATUS_URL_BASE;
  if (!jobId || !base) return null;
  return `${base.replace(/\/$/, '')}/${jobId}`;
};

async function pollClipdropResult({ data, apiKey }) {
  const statusUrl = resolveStatusUrl(data);
  if (!statusUrl) {
    throw new Error('clipdrop_submit_failed');
  }

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const response = await fetch(statusUrl, {
      headers: {
        'x-api-key': apiKey,
      },
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.startsWith('image/')) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return { buffer, contentType };
    }

    const payloadText = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      payload = null;
    }

    const status = payload?.status || payload?.state;
    if (status === 'error' || status === 'failed') {
      throw new Error('clipdrop_job_error');
    }
    if (payload?.result_url) {
      const resultResponse = await fetch(payload.result_url, {
        headers: {
          'x-api-key': apiKey,
        },
      });
      if (!resultResponse.ok) {
        throw new Error('clipdrop_job_error');
      }
      const resultType = resultResponse.headers.get('content-type') || '';
      const buffer = Buffer.from(await resultResponse.arrayBuffer());
      return { buffer, contentType: resultType };
    }

    await wait(2000);
  }
  throw new Error('clipdrop_timeout');
}

async function loadPixels(pngPath) {
  const { data, info } = await sharp(pngPath).raw().toBuffer({ resolveWithObject: true });
  return { data, info };
}

function runQc({ data, info, targetWidth, targetHeight }) {
  const totalPixels = info.width * info.height;
  const hasAlpha = info.channels === 4;
  let transparentCount = 0;
  let bandPixelCount = 0;
  let diffSum = 0;

  for (let i = 0; i < totalPixels; i += 1) {
    const idx = i * info.channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = hasAlpha ? data[idx + 3] : 255;

    if (a === 0) transparentCount += 1;
    if (a > 0 && a < 255) {
      bandPixelCount += 1;
      const cbR = (r * a) / 255;
      const cbG = (g * a) / 255;
      const cbB = (b * a) / 255;
      const cwR = (r * a + 255 * (255 - a)) / 255;
      const cwG = (g * a + 255 * (255 - a)) / 255;
      const cwB = (b * a + 255 * (255 - a)) / 255;
      const d = Math.abs(cwR - cbR) + Math.abs(cwG - cbG) + Math.abs(cwB - cbB);
      diffSum += d;
    }
  }

  const transparentRatio = totalPixels ? transparentCount / totalPixels : 0;
  const bandRatio = totalPixels ? bandPixelCount / totalPixels : 0;
  const fringeScore = bandPixelCount ? diffSum / bandPixelCount : 0;

  const qc = {
    status: 'PASS',
    metrics: {
      width: info.width,
      height: info.height,
      has_alpha: hasAlpha,
      transparent_pixel_ratio: transparentRatio,
      semi_transparent_band_ratio: bandRatio,
      band_pixel_count: bandPixelCount,
      fringe_score: fringeScore,
      fringe_score_threshold_warn: 160,
      fringe_score_threshold_fail: 220,
    },
    reasons: [],
    recommendations: [],
  };

  if (!hasAlpha) qc.reasons.push('no_alpha_channel');
  if (transparentRatio === 0) qc.reasons.push('no_transparent_pixels');
  if (info.width < targetWidth || info.height < targetHeight) {
    qc.reasons.push('size_too_small');
  }
  if (bandPixelCount === 0) qc.reasons.push('no_semi_transparent_band');

  const fail =
    !hasAlpha ||
    transparentRatio === 0 ||
    fringeScore >= qc.metrics.fringe_score_threshold_fail;
  const warn =
    fringeScore >= qc.metrics.fringe_score_threshold_warn ||
    bandRatio > 0.08 ||
    qc.reasons.includes('size_too_small');

  if (fail) qc.status = 'FAIL';
  else if (warn) qc.status = 'WARN';

  if (qc.status !== 'PASS') {
    if (fringeScore >= qc.metrics.fringe_score_threshold_warn) {
      qc.recommendations.push(
        '경계 프린지 위험: Defringe/알파 정리 후 재업스케일 권장'
      );
    }
    if (bandRatio > 0.08) {
      qc.recommendations.push(
        '반투명 경계 밴드가 넓음: 테두리 정리 또는 스타일 단순화 권장'
      );
    }
    if (qc.reasons.includes('size_too_small')) {
      qc.recommendations.push('목표 픽셀 미달: 업스케일 target 재확인 또는 재업스케일 권장');
    }
    if (!hasAlpha || transparentRatio === 0) {
      qc.recommendations.push('투명 배경 누락: transparent background로 재생성 후 재처리 권장');
    }
    qc.recommendations = qc.recommendations.slice(0, 3);
  }

  return qc;
}

async function runPrintPipeline(input) {
  const {
    master_png_path,
    order_id,
    target_width_px,
    target_height_px,
    clipdrop_api_key,
    output_dir,
    allow_warn_to_pass,
  } = input;

  const baseOutput = {
    ok: false,
    status: 'FAILED',
    order_id: order_id || '',
    paths: {
      master_input: master_png_path || '',
      clipdrop_raw: null,
      print_ready_png: null,
      qc_report_json: null,
    },
    qc: {
      status: 'FAIL',
      metrics: {
        width: 0,
        height: 0,
        has_alpha: false,
        transparent_pixel_ratio: 0,
        semi_transparent_band_ratio: 0,
        band_pixel_count: 0,
        fringe_score: 0,
        fringe_score_threshold_warn: 160,
        fringe_score_threshold_fail: 220,
      },
      reasons: [],
      recommendations: [],
    },
    reasons: [],
  };

  try {
    if (!master_png_path || !fs.existsSync(master_png_path)) {
      return {
        ...baseOutput,
        reasons: ['master_not_found'],
      };
    }
    if (!clipdrop_api_key) {
      return {
        ...baseOutput,
        reasons: ['clipdrop_api_key_missing'],
      };
    }

    const targetWidth = Number(target_width_px);
    const targetHeight = Number(target_height_px);
    if (!targetWidth || !targetHeight) {
      return {
        ...baseOutput,
        reasons: ['target_size_missing'],
      };
    }

    const workDir = path.join(output_dir, order_id);
    await ensureDir(workDir);

    const clipdropRawPath = path.join(workDir, 'upscaled_raw');
    const printReadyPath = path.join(workDir, 'print_ready.png');
    const qcPath = path.join(workDir, 'qc_report.json');

    const submitResult = await submitClipdropUpscale({
      masterPath: master_png_path,
      targetWidth,
      targetHeight,
      apiKey: clipdrop_api_key,
    });

    let clipdropBuffer = null;
    let clipdropContentType = 'application/octet-stream';

    if (submitResult.immediate) {
      clipdropBuffer = submitResult.buffer;
      clipdropContentType = submitResult.contentType;
    } else {
      const pollResult = await pollClipdropResult({
        data: submitResult.data,
        apiKey: clipdrop_api_key,
      });
      clipdropBuffer = pollResult.buffer;
      clipdropContentType = pollResult.contentType;
    }

    const extension = getExtensionFromType(clipdropContentType);
    const clipdropRawFile = `${clipdropRawPath}.${extension}`;
    await fsp.writeFile(clipdropRawFile, clipdropBuffer);

    await sharp(clipdropRawFile)
      .png()
      .toFile(printReadyPath);

    const { data, info } = await loadPixels(printReadyPath);
    const qc = runQc({ data, info, targetWidth, targetHeight });

    await fsp.writeFile(qcPath, JSON.stringify(qc, null, 2));

    let status = 'SUCCESS';
    let ok = true;
    const reasons = [];

    if (qc.status === 'FAIL') {
      status = 'FAILED';
      ok = false;
    } else if (qc.status === 'WARN') {
      if (allow_warn_to_pass) {
        status = 'SUCCESS';
        ok = true;
        reasons.push('warn_passed');
      } else {
        status = 'NEEDS_REVIEW';
        ok = true;
      }
    }

    return {
      ok,
      status,
      order_id,
      paths: {
        master_input: master_png_path,
        clipdrop_raw: clipdropRawFile,
        print_ready_png: status === 'FAILED' ? null : printReadyPath,
        qc_report_json: qcPath,
      },
      qc,
      reasons,
    };
  } catch (error) {
    return {
      ...baseOutput,
      reasons: [error.message || 'pipeline_failed'],
    };
  }
}

module.exports = {
  runPrintPipeline,
};
