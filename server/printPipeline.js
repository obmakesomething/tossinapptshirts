const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const { GoogleAuth } = require('google-auth-library');

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

async function submitImagenUpscale({
  masterPath,
  targetWidth,
  targetHeight,
  projectId,
  location = 'us-central1',
}) {
  // Read and encode image
  const fileBuffer = await fsp.readFile(masterPath);
  const base64Image = fileBuffer.toString('base64');

  // Get authentication
  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  });
  const client = await auth.getClient();

  // Calculate upscale factor based on target size
  const metadata = await sharp(masterPath).metadata();
  const currentWidth = metadata.width || 1;
  const currentHeight = metadata.height || 1;

  // Determine upscale factor (2x or 4x based on target)
  const widthRatio = targetWidth / currentWidth;
  const heightRatio = targetHeight / currentHeight;
  const maxRatio = Math.max(widthRatio, heightRatio);

  let upscaleFactor = 'x2';
  if (maxRatio > 3) {
    upscaleFactor = 'x4';
  }

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-4.0-upscale-preview:predict`;

  const requestBody = {
    instances: [
      {
        prompt: 'Upscale the image while maintaining quality',
        image: {
          bytesBase64Encoded: base64Image,
        },
      },
    ],
    parameters: {
      mode: 'upscale',
      upscaleConfig: {
        upscaleFactor,
      },
      outputOptions: {
        mimeType: 'image/png',
      },
    },
  };

  const response = await client.request({
    url,
    method: 'POST',
    data: requestBody,
  });

  // Extract upscaled image from response
  const predictions = response.data?.predictions || [];
  if (!predictions[0]?.bytesBase64Encoded) {
    throw new Error('imagen_upscale_no_result');
  }

  const buffer = Buffer.from(predictions[0].bytesBase64Encoded, 'base64');
  return { buffer, contentType: 'image/png' };
}

// Removed Clipdrop polling functions - Imagen returns results immediately

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
        '경계 프린지 위험: Defringe/알파 정리 후 다시 업스케일해 주세요'
      );
    }
    if (bandRatio > 0.08) {
      qc.recommendations.push(
        '반투명 경계 밴드가 넓어요. 테두리 정리하거나 스타일을 단순화해 주세요'
      );
    }
    if (qc.reasons.includes('size_too_small')) {
      qc.recommendations.push('목표 픽셀에 못 미쳐요. 업스케일 target을 확인하거나 다시 업스케일해 주세요');
    }
    if (!hasAlpha || transparentRatio === 0) {
      qc.recommendations.push('투명 배경이 없어요. 투명 배경으로 다시 생성해 주세요');
    }
    qc.recommendations = qc.recommendations.slice(0, 3);
  }

  return qc;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function compositeTextLayer(imagePath, textLayer, outputPath) {
  if (!textLayer || !textLayer.text) return imagePath;

  const metadata = await sharp(imagePath).metadata();
  const w = metadata.width;
  const h = metadata.height;

  // Scale font size proportionally to image width
  const baseFontSize = textLayer.fontSize || 24;
  const fontSize = Math.round(baseFontSize * (w / 400));
  const fontWeight = textLayer.fontWeight || 'bold';
  const color = textLayer.color || '#000000';

  // Position text at bottom portion of the design area (85% from top)
  const textY = Math.round(h * 0.85);

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <text x="50%" y="${textY}" text-anchor="middle"
      font-size="${fontSize}" font-weight="${fontWeight}" fill="${escapeXml(color)}"
      font-family="sans-serif">${escapeXml(textLayer.text)}</text>
  </svg>`;

  await sharp(imagePath)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outputPath);

  return outputPath;
}

async function removeBackgroundRembg(sourcePath, outputPath) {
  const { execFile } = require('child_process');
  return new Promise((resolve, reject) => {
    execFile('python3', [
      '-c',
      `
import sys
from rembg import remove
from PIL import Image
import io

with open(sys.argv[1], "rb") as f:
    input_bytes = f.read()
output_bytes = remove(input_bytes)
with open(sys.argv[2], "wb") as f:
    f.write(output_bytes)
img = Image.open(sys.argv[2])
print(f"{img.size[0]}x{img.size[1]} mode={img.mode}")
`,
      sourcePath,
      outputPath,
    ], { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) return reject(new Error(`rembg_failed: ${error.message}`));
      resolve(outputPath);
    });
  });
}

async function runPrintPipeline(input) {
  const {
    master_png_path,
    order_id,
    target_width_px,
    target_height_px,
    gcp_project_id,
    gcp_location,
    output_dir,
    allow_warn_to_pass,
    text_layer,
    remove_background,
  } = input;

  const baseOutput = {
    ok: false,
    status: 'FAILED',
    order_id: order_id || '',
    paths: {
      master_input: master_png_path || '',
      upscaled_raw: null,
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

    const projectId = gcp_project_id || process.env.GCP_PROJECT_ID;
    const location = gcp_location || process.env.GCP_LOCATION || 'us-central1';

    if (!projectId) {
      return {
        ...baseOutput,
        reasons: ['gcp_project_id_missing'],
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

    const resolvedOutputDir =
      output_dir && String(output_dir).trim().length > 0
        ? output_dir
        : path.join('/tmp', 'order-output');
    const workDir = path.join(resolvedOutputDir, order_id || `order-${Date.now()}`);
    await ensureDir(workDir);

    const upscaledRawPath = path.join(workDir, 'upscaled_raw.png');
    const printReadyPath = path.join(workDir, 'print_ready.png');
    const qcPath = path.join(workDir, 'qc_report.json');

    // Call Imagen upscale
    const upscaleResult = await submitImagenUpscale({
      masterPath: master_png_path,
      targetWidth,
      targetHeight,
      projectId,
      location,
    });

    // Save upscaled result
    await fsp.writeFile(upscaledRawPath, upscaleResult.buffer);

    // Remove background on upscaled image for precise cutout at high resolution
    const shouldRemoveBg = remove_background !== false;

    if (shouldRemoveBg) {
      const bgRemovedPath = path.join(workDir, 'bg_removed.png');
      await removeBackgroundRembg(upscaledRawPath, bgRemovedPath);
      await sharp(bgRemovedPath).png().toFile(printReadyPath);
    } else {
      // Convert to PNG (already PNG from Imagen, but ensure format)
      await sharp(upscaledRawPath).png().toFile(printReadyPath);
    }

    // Composite text layer onto upscaled image (if provided)
    if (text_layer && text_layer.text) {
      const compositedPath = path.join(workDir, 'composited.png');
      await compositeTextLayer(printReadyPath, text_layer, compositedPath);
      // Replace print_ready with composited version
      await fsp.copyFile(compositedPath, printReadyPath);
      await fsp.unlink(compositedPath);
    }

    // Run quality checks
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
        upscaled_raw: upscaledRawPath,
        print_ready_png: status === 'FAILED' ? null : printReadyPath,
        qc_report_json: qcPath,
      },
      qc,
      reasons,
      output_path: status === 'FAILED' ? null : printReadyPath,
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
