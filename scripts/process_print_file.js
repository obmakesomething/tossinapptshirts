const path = require('path');
const { runPrintPipeline } = require('../server/printPipeline');

async function main() {
  const input = {
    master_png_path: process.env.MASTER_PNG_PATH,
    order_id: process.env.ORDER_ID,
    target_width_px: process.env.TARGET_W,
    target_height_px: process.env.TARGET_H,
    clipdrop_api_key: process.env.CLIPDROP_API_KEY,
    output_dir: process.env.OUTPUT_DIR || path.join(process.cwd(), 'output'),
    allow_warn_to_pass: String(process.env.ALLOW_WARN_TO_PASS || '').toLowerCase() === 'true',
  };

  const result = await runPrintPipeline(input);
  process.stdout.write(JSON.stringify(result));
}

main().catch((error) => {
  const fallback = {
    ok: false,
    status: 'FAILED',
    order_id: process.env.ORDER_ID || '',
    paths: {
      master_input: process.env.MASTER_PNG_PATH || '',
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
    reasons: [error.message || 'pipeline_failed'],
  };
  process.stdout.write(JSON.stringify(fallback));
});
