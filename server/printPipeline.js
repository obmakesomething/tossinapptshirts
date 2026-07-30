/**
 * Print file pipeline.
 *
 * Takes the design the customer approved, composites any text layer, and
 * produces the print-ready PNG plus a QC report.
 *
 * What this deliberately no longer does:
 *   - AI upscale (Vertex Imagen). The artwork is printed at the resolution the
 *     customer supplied; if that is too low for the requested print size, QC
 *     says so instead of silently inventing pixels.
 *   - Background removal (rembg). Transparency now comes from the customer's
 *     own PNG, so the pipeline has no Python dependency and no GCP dependency.
 */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const ensureDir = async (dirPath) => {
  await fsp.mkdir(dirPath, { recursive: true });
};

/** Target pixel dimensions are computed for 300 DPI upstream. */
const REFERENCE_DPI = 300;
/** Below this, print output is visibly soft. */
const DPI_WARN = 200;
/** Below this, print output breaks up. */
const DPI_POOR = 150;

async function loadPixels(pngPath) {
  const { data, info } = await sharp(pngPath).raw().toBuffer({ resolveWithObject: true });
  return { data, info };
}

/**
 * Effective DPI of the supplied artwork at the requested print size.
 *
 * target_width_px was derived from the print area at REFERENCE_DPI, so the
 * ratio of actual to target pixels scales straight back to a DPI figure.
 */
function effectiveDpi({ width, height, targetWidth, targetHeight }) {
  if (!targetWidth || !targetHeight) return null;
  const ratio = Math.min(width / targetWidth, height / targetHeight);
  return Math.round(REFERENCE_DPI * ratio);
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
  const dpi = effectiveDpi({
    width: info.width,
    height: info.height,
    targetWidth,
    targetHeight,
  });

  const qc = {
    status: 'PASS',
    metrics: {
      width: info.width,
      height: info.height,
      target_width: targetWidth || null,
      target_height: targetHeight || null,
      effective_dpi: dpi,
      dpi_threshold_warn: DPI_WARN,
      dpi_threshold_poor: DPI_POOR,
      has_alpha: hasAlpha,
      transparent_pixel_ratio: transparentRatio,
      semi_transparent_band_ratio: bandRatio,
      band_pixel_count: bandPixelCount,
      fringe_score: fringeScore,
      fringe_score_threshold_warn: 160,
    },
    reasons: [],
    recommendations: [],
  };

  // Resolution is a warning, never a failure — the customer decides whether to
  // proceed with soft artwork.
  if (dpi !== null && dpi < DPI_POOR) {
    qc.reasons.push('resolution_poor');
    qc.recommendations.push(
      `해상도가 낮아 인쇄하면 깨져 보일 수 있어요 (약 ${dpi}DPI). 더 큰 이미지를 쓰거나 인쇄 크기를 줄여주세요`,
    );
  } else if (dpi !== null && dpi < DPI_WARN) {
    qc.reasons.push('resolution_low');
    qc.recommendations.push(
      `해상도가 다소 낮아 인쇄 결과가 흐릴 수 있어요 (약 ${dpi}DPI)`,
    );
  }

  // No alpha means the artwork's own background gets printed. That is a valid
  // choice now that background removal is gone, so it only warrants a notice.
  if (!hasAlpha || transparentRatio === 0) {
    qc.reasons.push('no_transparency');
    qc.recommendations.push(
      '배경이 투명하지 않아 이미지의 배경까지 그대로 인쇄돼요. 투명 배경 PNG를 올리면 원하는 모양만 인쇄됩니다',
    );
  }

  if (fringeScore >= qc.metrics.fringe_score_threshold_warn) {
    qc.reasons.push('fringe_risk');
    qc.recommendations.push('경계에 반투명 테두리가 많아요. 테두리를 정리한 PNG를 권장합니다');
  }
  if (bandRatio > 0.08) {
    qc.reasons.push('wide_semi_transparent_band');
  }

  if (qc.reasons.length > 0) qc.status = 'WARN';
  qc.recommendations = qc.recommendations.slice(0, 3);

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

async function runPrintPipeline(input) {
  const {
    master_png_path,
    order_id,
    target_width_px,
    target_height_px,
    output_dir,
    text_layer,
  } = input;

  const baseOutput = {
    ok: false,
    status: 'FAILED',
    order_id: order_id || '',
    paths: {
      master_input: master_png_path || '',
      print_ready_png: null,
      qc_report_json: null,
    },
    qc: {
      status: 'FAIL',
      metrics: {
        width: 0,
        height: 0,
        target_width: null,
        target_height: null,
        effective_dpi: null,
        dpi_threshold_warn: DPI_WARN,
        dpi_threshold_poor: DPI_POOR,
        has_alpha: false,
        transparent_pixel_ratio: 0,
        semi_transparent_band_ratio: 0,
        band_pixel_count: 0,
        fringe_score: 0,
        fringe_score_threshold_warn: 160,
      },
      reasons: [],
      recommendations: [],
    },
    reasons: [],
  };

  try {
    if (!master_png_path || !fs.existsSync(master_png_path)) {
      return { ...baseOutput, reasons: ['master_not_found'] };
    }

    const targetWidth = Number(target_width_px) || null;
    const targetHeight = Number(target_height_px) || null;

    const resolvedOutputDir =
      output_dir && String(output_dir).trim().length > 0
        ? output_dir
        : path.join('/tmp', 'order-output');
    const workDir = path.join(resolvedOutputDir, order_id || `order-${Date.now()}`);
    await ensureDir(workDir);

    const printReadyPath = path.join(workDir, 'print_ready.png');
    const qcPath = path.join(workDir, 'qc_report.json');

    // Normalise to PNG at the supplied resolution, keeping any alpha intact.
    await sharp(master_png_path).png().toFile(printReadyPath);

    if (text_layer && text_layer.text) {
      const compositedPath = path.join(workDir, 'composited.png');
      await compositeTextLayer(printReadyPath, text_layer, compositedPath);
      await fsp.copyFile(compositedPath, printReadyPath);
      await fsp.unlink(compositedPath);
    }

    const { data, info } = await loadPixels(printReadyPath);
    const qc = runQc({ data, info, targetWidth, targetHeight });

    await fsp.writeFile(qcPath, JSON.stringify(qc, null, 2));

    // Nothing here fails an order any more: QC reports, the customer decides.
    return {
      ok: true,
      status: qc.status === 'WARN' ? 'SUCCESS_WITH_WARNINGS' : 'SUCCESS',
      order_id,
      paths: {
        master_input: master_png_path,
        print_ready_png: printReadyPath,
        qc_report_json: qcPath,
      },
      qc,
      reasons: qc.reasons,
      output_path: printReadyPath,
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
  runQc,
  effectiveDpi,
};
