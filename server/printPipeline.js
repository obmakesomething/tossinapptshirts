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
const { clipToCanvas, layoutLayer, normalizeTransform } = require('./printLayout');

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

/**
 * How many source pixels land on each printed pixel of the artwork.
 *
 * The output raster is now always the full print area at REFERENCE_DPI, so
 * measuring it tells us nothing. What matters is the artwork the customer
 * supplied against the size they scaled it to: enlarging a small photo to fill
 * the chest is exactly the case this has to catch.
 */
function artworkDpi({ sourceWidth, sourceHeight, targetWidth, targetHeight, imageTransform }) {
  if (!sourceWidth || !sourceHeight || !targetWidth || !targetHeight) return null;
  const rect = layoutLayer({
    canvasWidth: targetWidth,
    canvasHeight: targetHeight,
    layerAspect: sourceWidth / sourceHeight,
    transform: imageTransform,
  });
  if (!(rect.width > 0) || !(rect.height > 0)) return null;
  const ratio = Math.min(sourceWidth / rect.width, sourceHeight / rect.height);
  return Math.round(REFERENCE_DPI * ratio);
}

function runQc({
  data,
  info,
  targetWidth,
  targetHeight,
  sourceWidth,
  sourceHeight,
  imageTransform,
}) {
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
  const dpi =
    sourceWidth && sourceHeight
      ? artworkDpi({
          sourceWidth,
          sourceHeight,
          targetWidth,
          targetHeight,
          imageTransform,
        })
      : effectiveDpi({
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

/**
 * Render the artwork onto the print canvas exactly where the customer put it.
 *
 * The canvas is the printable region itself, so the transform the editor
 * produced maps onto it one to one. Rotation happens first, about the layer's
 * own centre, and the rotated result is re-centred on the same point sharp
 * would otherwise shift away from.
 */
async function renderArtworkLayer({
  masterPath,
  canvasWidth,
  canvasHeight,
  transform,
}) {
  const metadata = await sharp(masterPath).metadata();
  const aspect =
    metadata.width && metadata.height ? metadata.width / metadata.height : null;

  const rect = layoutLayer({
    canvasWidth,
    canvasHeight,
    layerAspect: aspect,
    transform,
  });

  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  let layer = sharp(masterPath).ensureAlpha().resize(width, height, {
    fit: 'fill',
  });

  const rotation = ((rect.rotation % 360) + 360) % 360;
  if (rotation !== 0) {
    layer = layer.rotate(rotation, {
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  }

  const buffer = await layer.png().toBuffer();
  const rotated = await sharp(buffer).metadata();

  // Rotating grows the bounding box; keep the centre where the editor had it.
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const placed = {
    left: centerX - rotated.width / 2,
    top: centerY - rotated.height / 2,
    width: rotated.width,
    height: rotated.height,
  };

  const clip = clipToCanvas({ rect: placed, canvasWidth, canvasHeight });
  if (!clip) return null;

  const visible =
    clip.width === rotated.width && clip.height === rotated.height
      ? buffer
      : await sharp(buffer)
          .extract({
            left: clip.sourceLeft,
            top: clip.sourceTop,
            width: clip.width,
            height: clip.height,
          })
          .png()
          .toBuffer();

  return {
    input: visible,
    left: clip.canvasLeft,
    top: clip.canvasTop,
    clipped:
      clip.width !== rotated.width || clip.height !== rotated.height,
  };
}

/**
 * Render the text layer at the position and size the customer chose.
 *
 * Font size is expressed the same way the editor draws it: the text box is
 * scale × the print area, and the glyphs are sized to that box rather than to
 * a fixed fraction of the output, which used to pin every order's text to 85%
 * down the page at whatever size the raster happened to be.
 */
function buildTextLayerSvg({ canvasWidth, canvasHeight, textLayer, transform }) {
  if (!textLayer || !textLayer.text || !String(textLayer.text).trim()) {
    return null;
  }
  const t = normalizeTransform(transform);
  const color = textLayer.color || '#000000';
  const fontWeight = textLayer.fontWeight === 'regular' ? 'normal' : 'bold';

  // The editor lays the text box over the full print area and scales it, so a
  // scale of 1 means glyphs about a sixth of the print height.
  const fontSize = Math.max(1, Math.round(canvasHeight * 0.16 * t.scale));
  const centerX = canvasWidth / 2 + t.offsetX * canvasWidth;
  const centerY = canvasHeight / 2 + t.offsetY * canvasHeight;
  const rotation = t.rotation;

  return Buffer.from(
    `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(${rotation} ${centerX} ${centerY})">
        <text x="${centerX}" y="${centerY}" text-anchor="middle"
          dominant-baseline="central"
          font-size="${fontSize}" font-weight="${fontWeight}"
          fill="${escapeXml(color)}"
          font-family="sans-serif">${escapeXml(textLayer.text)}</text>
      </g>
    </svg>`,
  );
}

async function runPrintPipeline(input) {
  const {
    master_png_path,
    order_id,
    target_width_px,
    target_height_px,
    output_dir,
    text_layer,
    image_transform,
    text_transform,
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

    const composition = [];
    let artworkClipped = false;
    let artworkMissed = false;

    if (targetWidth && targetHeight) {
      // Compose onto the printable region so the file the press receives is
      // the layout the customer approved, not the raw upload.
      const artwork = await renderArtworkLayer({
        masterPath: master_png_path,
        canvasWidth: targetWidth,
        canvasHeight: targetHeight,
        transform: image_transform,
      });
      if (artwork) {
        composition.push({ input: artwork.input, left: artwork.left, top: artwork.top });
        artworkClipped = artwork.clipped;
      } else {
        artworkMissed = true;
      }

      const textSvg = buildTextLayerSvg({
        canvasWidth: targetWidth,
        canvasHeight: targetHeight,
        textLayer: text_layer,
        transform: text_transform,
      });
      if (textSvg) {
        composition.push({ input: textSvg, left: 0, top: 0 });
      }

      await sharp({
        create: {
          width: targetWidth,
          height: targetHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite(composition)
        .png()
        .toFile(printReadyPath);
    } else {
      // No print size supplied: fall back to passing the artwork through, so a
      // caller that has not been updated still gets a file rather than nothing.
      await sharp(master_png_path).png().toFile(printReadyPath);
    }

    const { data, info } = await loadPixels(printReadyPath);
    const master = await sharp(master_png_path).metadata();
    const qc = runQc({
      data,
      info,
      targetWidth,
      targetHeight,
      // DPI is a property of the artwork the customer supplied, not of the
      // canvas we just rendered it onto — that canvas is always at 300 DPI.
      sourceWidth: master.width,
      sourceHeight: master.height,
      imageTransform: image_transform,
    });
    if (artworkClipped) {
      qc.reasons.push('artwork_clipped');
      qc.recommendations.push(
        '디자인 일부가 인쇄 영역 밖으로 나가 잘렸어요. 에디터에서 위치를 확인해 주세요',
      );
      qc.status = 'WARN';
    }
    if (artworkMissed) {
      qc.reasons.push('artwork_outside_print_area');
      qc.recommendations.push(
        '디자인이 인쇄 영역 밖에 있어요. 에디터에서 인쇄 영역 안으로 옮겨 주세요',
      );
      qc.status = 'WARN';
    }
    qc.recommendations = qc.recommendations.slice(0, 3);

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
  artworkDpi,
};
