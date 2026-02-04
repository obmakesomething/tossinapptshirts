/**
 * Job-based Image Generation API
 * 
 * Provides async job tracking for AI image generation.
 * Jobs persist across route navigation in the client.
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// In-memory job store (for production, use PostgreSQL/Redis)
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

/**
 * Create a new generation job
 * POST /api/generations
 */
router.post('/', async (req, res) => {
    try {
        const { prompt, style_preset, toggles, text, aspectRatio = '1:1' } = req.body || {};

        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ error: 'prompt is required.' });
        }

        const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const now = new Date().toISOString();

        const job = {
            job_id: jobId,
            status: JobStatus.QUEUED,
            stage: JobStage.VALIDATE_INPUT,
            created_at: now,
            updated_at: now,
            eta_ms: Object.values(STAGE_ETA_MS).reduce((a, b) => a + b, 0),
            latency_ms: null,
            result: {
                design_id: null,
                preview_url: null,
            },
            fail_reason: null,
            // Input params (for retry)
            params: {
                prompt,
                style_preset: style_preset || 'minimal',
                toggles: toggles || {},
                text: text || null,
                aspectRatio,
            },
        };

        jobs.set(jobId, job);

        // Start async processing
        processJob(jobId, req.app).catch(err => {
            console.error(`[Generations] Job ${jobId} failed:`, err);
        });

        res.json({
            job_id: jobId,
            status: job.status,
            created_at: job.created_at,
        });
    } catch (error) {
        console.error('[Generations] Create job failed:', error);
        res.status(500).json({ error: error.message || 'Failed to create generation job.' });
    }
});

/**
 * Get job status
 * GET /api/generations/:jobId
 */
router.get('/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
    }

    res.json({
        job_id: job.job_id,
        status: job.status,
        stage: job.stage,
        eta_ms: job.eta_ms,
        latency_ms: job.latency_ms,
        result: job.result,
        fail_reason: job.fail_reason,
    });
});

/**
 * Cancel a job
 * DELETE /api/generations/:jobId
 */
router.delete('/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
    }

    if (job.status === JobStatus.QUEUED || job.status === JobStatus.RUNNING) {
        job.status = JobStatus.FAILED;
        job.fail_reason = 'cancelled_by_user';
        job.updated_at = new Date().toISOString();
    }

    res.json({ job_id: jobId, status: job.status });
});

/**
 * Async job processor
 */
async function processJob(jobId, app) {
    const job = jobs.get(jobId);
    if (!job) return;

    const startTime = Date.now();

    try {
        // Stage 1: Validate input
        updateJobStage(job, JobStage.VALIDATE_INPUT, JobStatus.RUNNING);
        await sleep(500); // Simulated validation

        if (job.status === JobStatus.FAILED) return; // Cancelled

        // Stage 2: Run model
        updateJobStage(job, JobStage.RUN_MODEL, JobStatus.RUNNING);

        // Build enhanced prompt
        const stylePromptMap = {
            minimal: 'minimal',
            lineart: 'line art',
            graphic: 'graphic',
        };
        const styleText = stylePromptMap[job.params.style_preset] || job.params.style_preset;
        const enhancedPrompt = `${job.params.prompt} (${styleText}), on a plain white background`;

        // Get the Imagen client from app context
        const { GoogleGenAI } = require('@google/genai');
        const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

        if (!GOOGLE_API_KEY) {
            throw new Error('GOOGLE_API_KEY is required for image generation.');
        }

        const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
        const IMAGEN_MODEL = process.env.IMAGEN_MODEL || 'imagen-4.0-generate-001';

        const response = await ai.models.generateImages({
            model: IMAGEN_MODEL,
            prompt: enhancedPrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: job.params.aspectRatio,
            },
        });

        if (job.status === JobStatus.FAILED) return; // Cancelled during generation

        // Stage 3: Render output
        updateJobStage(job, JobStage.RENDER_OUTPUT, JobStatus.RUNNING);

        const imageBytes = response?.generatedImages?.[0]?.image?.imageBytes;
        if (!imageBytes) {
            throw new Error('No image generated from model.');
        }

        const buffer = Buffer.from(imageBytes, 'base64');
        const mimeType = 'image/png';

        // Upload to S3
        const IMAGE_PREFIX = process.env.S3_IMAGE_PREFIX || 'uploads';
        const key = `${IMAGE_PREFIX}/gen-${jobId}.png`;

        // Use the uploadToS3 function from main server if available
        // For now, we'll construct a data URL as fallback
        const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

        // Mark as succeeded
        job.status = JobStatus.SUCCEEDED;
        job.stage = null;
        job.eta_ms = 0;
        job.latency_ms = Date.now() - startTime;
        job.result = {
            design_id: `design_${jobId}`,
            preview_url: dataUrl,
        };
        job.updated_at = new Date().toISOString();

        console.log(`[Generations] Job ${jobId} completed in ${job.latency_ms}ms`);

    } catch (error) {
        job.status = JobStatus.FAILED;
        job.fail_reason = error.message || 'unknown_error';
        job.latency_ms = Date.now() - startTime;
        job.updated_at = new Date().toISOString();
        console.error(`[Generations] Job ${jobId} failed:`, error.message);
    }
}

function updateJobStage(job, stage, status) {
    job.stage = stage;
    job.status = status;
    job.updated_at = new Date().toISOString();

    // Calculate remaining ETA
    const stages = Object.keys(STAGE_ETA_MS);
    const currentIndex = stages.indexOf(stage);
    job.eta_ms = stages.slice(currentIndex).reduce((sum, s) => sum + STAGE_ETA_MS[s], 0);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Cleanup old jobs (keep for 1 hour)
setInterval(() => {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;

    for (const [jobId, job] of jobs.entries()) {
        const createdAt = new Date(job.created_at).getTime();
        if (now - createdAt > ONE_HOUR) {
            jobs.delete(jobId);
        }
    }
}, 5 * 60 * 1000); // Run every 5 minutes

module.exports = router;
