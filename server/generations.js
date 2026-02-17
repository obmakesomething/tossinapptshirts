/**
 * Job-based Image Generation API
 *
 * Cloud Run note:
 * - Job state is persisted to PostgreSQL so status survives instance restart.
 * - If DB is unavailable, local memory fallback is used for development only.
 */

const express = require('express');
const crypto = require('crypto');
const OpenAI = require('openai');
const { getPool } = require('./db');

const router = express.Router();

// Development fallback (used only when DATABASE_URL is not configured)
const jobs = new Map();

// Job statuses
const JobStatus = {
  QUEUED: 'queued',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
};

// Job stages
const JobStage = {
  VALIDATE_INPUT: 'validate_input',
  RUN_MODEL: 'run_model',
  RENDER_OUTPUT: 'render_output',
};

// Average execution time per stage (ms)
const STAGE_ETA_MS = {
  [JobStage.VALIDATE_INPUT]: 2000,
  [JobStage.RUN_MODEL]: 25000,
  [JobStage.RENDER_OUTPUT]: 5000,
};

const STAGE_ORDER = [
  JobStage.VALIDATE_INPUT,
  JobStage.RUN_MODEL,
  JobStage.RENDER_OUTPUT,
];
const ONE_HOUR_MS = 60 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function toExpiresAtIso(now = Date.now()) {
  return new Date(now + ONE_HOUR_MS).toISOString();
}

function normalizeJob(rowOrJob) {
  if (!rowOrJob) return null;
  return {
    job_id: rowOrJob.job_id,
    status: rowOrJob.status,
    stage: rowOrJob.stage || null,
    created_at: rowOrJob.created_at,
    updated_at: rowOrJob.updated_at,
    eta_ms: Number(rowOrJob.eta_ms || 0),
    latency_ms:
      rowOrJob.latency_ms === null || rowOrJob.latency_ms === undefined
        ? null
        : Number(rowOrJob.latency_ms),
    result: rowOrJob.result || { design_id: null, preview_url: null },
    fail_reason: rowOrJob.fail_reason || null,
    params: rowOrJob.params || {},
    expires_at: rowOrJob.expires_at || toExpiresAtIso(),
  };
}

async function upsertJob(job) {
  const pool = getPool();
  if (!pool) {
    jobs.set(job.job_id, { ...job });
    return;
  }

  await pool.query(
    `INSERT INTO generation_jobs (
      job_id, status, stage, created_at, updated_at, eta_ms, latency_ms, result, fail_reason, params, expires_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (job_id) DO UPDATE SET
      status = EXCLUDED.status,
      stage = EXCLUDED.stage,
      updated_at = EXCLUDED.updated_at,
      eta_ms = EXCLUDED.eta_ms,
      latency_ms = EXCLUDED.latency_ms,
      result = EXCLUDED.result,
      fail_reason = EXCLUDED.fail_reason,
      params = EXCLUDED.params,
      expires_at = EXCLUDED.expires_at`,
    [
      job.job_id,
      job.status,
      job.stage,
      job.created_at,
      job.updated_at,
      job.eta_ms,
      job.latency_ms,
      JSON.stringify(job.result || {}),
      job.fail_reason,
      JSON.stringify(job.params || {}),
      job.expires_at,
    ],
  );
}

async function getJob(jobId) {
  const pool = getPool();
  if (!pool) {
    return normalizeJob(jobs.get(jobId));
  }

  const result = await pool.query(
    `SELECT job_id, status, stage, created_at, updated_at, eta_ms, latency_ms, result, fail_reason, params, expires_at
     FROM generation_jobs
     WHERE job_id = $1`,
    [jobId],
  );
  return normalizeJob(result.rows[0] || null);
}

async function deleteExpiredJobs() {
  const pool = getPool();
  if (!pool) {
    const now = Date.now();
    for (const [jobId, job] of jobs.entries()) {
      const createdAt = new Date(job.created_at).getTime();
      if (now - createdAt > ONE_HOUR_MS) {
        jobs.delete(jobId);
      }
    }
    return;
  }

  await pool.query(`DELETE FROM generation_jobs WHERE expires_at < NOW()`);
}

async function markStaleRunningJobsFailed() {
  const pool = getPool();
  if (!pool) return;

  // If an instance died while running jobs, fail them explicitly.
  await pool.query(
    `UPDATE generation_jobs
     SET status = $1,
         fail_reason = COALESCE(fail_reason, 'worker_restarted'),
         stage = NULL,
         updated_at = NOW(),
         eta_ms = 0
     WHERE status IN ($2, $3)`,
    [JobStatus.FAILED, JobStatus.QUEUED, JobStatus.RUNNING],
  );
}

function buildJobResponse(job) {
  return {
    job_id: job.job_id,
    status: job.status,
    stage: job.stage,
    eta_ms: job.eta_ms,
    latency_ms: job.latency_ms,
    result: job.result,
    fail_reason: job.fail_reason,
  };
}

/**
 * Create a new generation job
 * POST /api/generations
 */
router.post('/', async (req, res) => {
  try {
    const {
      prompt,
      style_preset,
      toggles,
      text,
      aspectRatio = '1:1',
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt is required.' });
    }

    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const createdAt = nowIso();

    const job = {
      job_id: jobId,
      status: JobStatus.QUEUED,
      stage: JobStage.VALIDATE_INPUT,
      created_at: createdAt,
      updated_at: createdAt,
      eta_ms: STAGE_ORDER.reduce((sum, stage) => sum + STAGE_ETA_MS[stage], 0),
      latency_ms: null,
      result: {
        design_id: null,
        preview_url: null,
      },
      fail_reason: null,
      params: {
        prompt,
        style_preset: style_preset || 'minimal',
        toggles: toggles || {},
        text: text || null,
        aspectRatio,
      },
      expires_at: toExpiresAtIso(),
    };

    await upsertJob(job);

    // Start async processing.
    processJob(jobId).catch((err) => {
      console.error(`[Generations] Job ${jobId} failed:`, err);
    });

    res.json({
      job_id: jobId,
      status: job.status,
      created_at: job.created_at,
    });
  } catch (error) {
    console.error('[Generations] Create job failed:', error);
    res
      .status(500)
      .json({ error: error.message || 'Failed to create generation job.' });
  }
});

/**
 * Get job status
 * GET /api/generations/:jobId
 */
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }
    res.json(buildJobResponse(job));
  } catch (error) {
    console.error('[Generations] Get job failed:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch job.' });
  }
});

/**
 * Cancel a job
 * DELETE /api/generations/:jobId
 */
router.delete('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    if (job.status === JobStatus.QUEUED || job.status === JobStatus.RUNNING) {
      job.status = JobStatus.FAILED;
      job.stage = null;
      job.fail_reason = 'cancelled_by_user';
      job.eta_ms = 0;
      job.updated_at = nowIso();
      job.expires_at = toExpiresAtIso();
      await upsertJob(job);
    }

    res.json({ job_id: jobId, status: job.status });
  } catch (error) {
    console.error('[Generations] Cancel job failed:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel job.' });
  }
});

async function reloadJobOrNull(job) {
  const latest = await getJob(job.job_id);
  if (!latest) return null;
  Object.assign(job, latest);
  return job;
}

function updateJobStage(job, stage, status) {
  job.stage = stage;
  job.status = status;
  job.updated_at = nowIso();
  job.expires_at = toExpiresAtIso();

  const currentIndex = STAGE_ORDER.indexOf(stage);
  const remaining =
    currentIndex >= 0 ? STAGE_ORDER.slice(currentIndex) : STAGE_ORDER;
  job.eta_ms = remaining.reduce((sum, s) => sum + STAGE_ETA_MS[s], 0);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Async job processor
 */
async function processJob(jobId) {
  const job = await getJob(jobId);
  if (!job) return;

  const startTime = Date.now();

  try {
    // Stage 1: Validate input
    updateJobStage(job, JobStage.VALIDATE_INPUT, JobStatus.RUNNING);
    await upsertJob(job);
    await sleep(500);

    const afterValidation = await reloadJobOrNull(job);
    if (!afterValidation || afterValidation.status === JobStatus.FAILED) return;

    // Stage 2: Run model
    updateJobStage(job, JobStage.RUN_MODEL, JobStatus.RUNNING);
    await upsertJob(job);

    const stylePromptMap = {
      minimal: 'minimal',
      lineart: 'line art',
      graphic: 'graphic',
    };
    const styleText =
      stylePromptMap[job.params.style_preset] || job.params.style_preset;
    const enhancedPrompt = `${job.params.prompt} (${styleText}), on a plain white background, t-shirt print design`;

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for image generation.');
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
    const quality = process.env.OPENAI_IMAGE_QUALITY || 'medium';

    const aspect = String(job.params.aspectRatio || '1:1');
    const size =
      aspect === '3:4'
        ? '1024x1536'
        : aspect === '4:3'
          ? '1536x1024'
          : '1024x1024';

    const response = await openai.images.generate({
      model,
      prompt: enhancedPrompt,
      n: 1,
      size,
      quality,
      background: 'opaque',
      output_format: 'png',
    });

    const afterModel = await reloadJobOrNull(job);
    if (!afterModel || afterModel.status === JobStatus.FAILED) return;

    // Stage 3: Render output
    updateJobStage(job, JobStage.RENDER_OUTPUT, JobStatus.RUNNING);
    await upsertJob(job);

    const b64 = response?.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error('No image generated from model.');
    }

    const buffer = Buffer.from(b64, 'base64');
    const mimeType = 'image/png';
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

    job.status = JobStatus.SUCCEEDED;
    job.stage = null;
    job.eta_ms = 0;
    job.latency_ms = Date.now() - startTime;
    job.result = {
      design_id: `design_${jobId}`,
      preview_url: dataUrl,
    };
    job.updated_at = nowIso();
    job.expires_at = toExpiresAtIso();
    await upsertJob(job);

    console.log(`[Generations] Job ${jobId} completed in ${job.latency_ms}ms`);
  } catch (error) {
    job.status = JobStatus.FAILED;
    job.stage = null;
    job.fail_reason = error.message || 'unknown_error';
    job.latency_ms = Date.now() - startTime;
    job.eta_ms = 0;
    job.updated_at = nowIso();
    job.expires_at = toExpiresAtIso();
    await upsertJob(job);
    console.error(`[Generations] Job ${jobId} failed:`, error.message);
  }
}

// One-time startup recovery for stale queued/running jobs.
void markStaleRunningJobsFailed().catch((err) => {
  console.error('[Generations] Failed to mark stale jobs:', err.message);
});

// Cleanup old jobs (keep for 1 hour)
const cleanupInterval = setInterval(() => {
  void deleteExpiredJobs().catch((err) => {
    console.error('[Generations] Cleanup failed:', err.message);
  });
}, 5 * 60 * 1000);
cleanupInterval.unref();

module.exports = router;

