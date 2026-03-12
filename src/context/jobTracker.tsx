/**
 * Job Tracker Context
 *
 * Global state management for background AI generation jobs.
 * Persists job ID to localStorage for recovery after navigation/refresh.
 */

import { Storage } from '@apps-in-toss/framework';
import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { API_BASE_URL } from '../config';

const ACTIVE_JOB_KEY = 'active_generation_job';
const POLL_INTERVAL_MS = 1500;

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'idle';
export type JobStage = 'validate_input' | 'run_model' | 'render_output' | null;

export interface JobResult {
  design_id: string | null;
  preview_url: string | null;
}

export interface GenerationJob {
  jobId: string;
  status: JobStatus;
  stage: JobStage;
  etaMs: number | null;
  latencyMs: number | null;
  result: JobResult | null;
  failReason: string | null;
  createdAt: string;
}

export interface JobParams {
  prompt: string;
  style_preset?: string;
  toggles?: {
    remove_background?: boolean;
    simplify?: boolean;
    enhance?: boolean;
  };
  text?: string | null;
  aspectRatio?: string;
}

interface JobTrackerContextValue {
  activeJob: GenerationJob | null;
  isPolling: boolean;
  startJob: (params: JobParams) => Promise<string | null>;
  cancelJob: () => Promise<void>;
  clearJob: () => void;
  retryJob: () => Promise<string | null>;
  lastJobParams: JobParams | null;
}

type JobApiResponse = {
  status?: JobStatus;
  stage?: JobStage;
  eta_ms?: number | null;
  latency_ms?: number | null;
  result?: JobResult | null;
  fail_reason?: string | null;
  created_at?: string;
};

type StartJobResponse = {
  job_id?: string;
  created_at?: string;
  error?: string;
};

const JobTrackerContext = createContext<JobTrackerContextValue | null>(null);

export function JobTrackerProvider({
  children,
}: { children: React.ReactNode }) {
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [lastJobParams, setLastJobParams] = useState<JobParams | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted job on mount
  useEffect(() => {
    const loadPersistedJob = async () => {
      try {
        const stored = await Storage.getItem(ACTIVE_JOB_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as {
            jobId: string;
            params?: JobParams;
          };
          if (parsed.jobId) {
            setLastJobParams(parsed.params || null);
            // Fetch current status
            const response = await fetch(
              `${API_BASE_URL}/api/generations/${parsed.jobId}`,
            );
            if (response.ok) {
              const data = (await response.json()) as JobApiResponse;
              const job = mapApiToJob(parsed.jobId, data);
              setActiveJob(job);

              // Resume polling if not terminal
              if (job.status === 'queued' || job.status === 'running') {
                startPolling(parsed.jobId);
              }
            } else {
              // Job not found, clear storage
              await Storage.removeItem(ACTIVE_JOB_KEY);
            }
          }
        }
      } catch (error) {
        console.error('[JobTracker] Failed to load persisted job:', error);
      }
    };

    loadPersistedJob();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const mapApiToJob = useCallback(
    (jobId: string, data: JobApiResponse): GenerationJob => ({
      jobId,
      status: data.status || 'idle',
      stage: data.stage || null,
      etaMs: typeof data.eta_ms === 'number' ? data.eta_ms : null,
      latencyMs: typeof data.latency_ms === 'number' ? data.latency_ms : null,
      result: data.result || null,
      failReason:
        typeof data.fail_reason === 'string' ? data.fail_reason : null,
      createdAt:
        typeof data.created_at === 'string'
          ? data.created_at
          : new Date().toISOString(),
    }),
    [],
  );

  const startPolling = useCallback(
    (jobId: string) => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      setIsPolling(true);

      const poll = async () => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/generations/${jobId}`,
          );
          if (!response.ok) {
            console.error('[JobTracker] Poll failed:', response.status);
            return;
          }

          const data = (await response.json()) as JobApiResponse;
          const job = mapApiToJob(jobId, data);
          setActiveJob(job);

          // Stop polling if terminal state
          if (job.status === 'succeeded' || job.status === 'failed') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setIsPolling(false);

            // Clear storage on completion
            await Storage.removeItem(ACTIVE_JOB_KEY);
          }
        } catch (error) {
          console.error('[JobTracker] Poll error:', error);
        }
      };

      // Initial poll
      poll();

      // Set up interval
      pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    },
    [mapApiToJob],
  );

  const startJob = useCallback(
    async (params: JobParams): Promise<string | null> => {
      try {
        // Clear any existing job
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        setLastJobParams(params);

        const response = await fetch(`${API_BASE_URL}/api/generations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        if (!response.ok) {
          const error = (await response
            .json()
            .catch(() => ({}) as StartJobResponse)) as StartJobResponse;
          throw new Error(error.error || 'Failed to start job');
        }

        const data = (await response.json()) as StartJobResponse;
        const jobId = data.job_id;
        if (typeof jobId !== 'string' || !jobId) {
          throw new Error('Failed to start job');
        }

        // Persist job ID
        await Storage.setItem(
          ACTIVE_JOB_KEY,
          JSON.stringify({ jobId, params }),
        );

        // Set initial state
        setActiveJob({
          jobId,
          status: 'queued',
          stage: 'validate_input',
          etaMs: null,
          latencyMs: null,
          result: null,
          failReason: null,
          createdAt: data.created_at || new Date().toISOString(),
        });

        // Start polling
        startPolling(jobId);

        return jobId;
      } catch (error) {
        console.error('[JobTracker] Start job failed:', error);
        setActiveJob({
          jobId: '',
          status: 'failed',
          stage: null,
          etaMs: null,
          latencyMs: null,
          result: null,
          failReason: error instanceof Error ? error.message : 'unknown_error',
          createdAt: new Date().toISOString(),
        });
        return null;
      }
    },
    [startPolling],
  );

  const cancelJob = useCallback(async () => {
    if (!activeJob?.jobId) return;

    try {
      await fetch(`${API_BASE_URL}/api/generations/${activeJob.jobId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('[JobTracker] Cancel failed:', error);
    }

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setIsPolling(false);
    setActiveJob(null);
    await Storage.removeItem(ACTIVE_JOB_KEY);
  }, [activeJob]);

  const clearJob = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
    setActiveJob(null);
    Storage.removeItem(ACTIVE_JOB_KEY);
  }, []);

  const retryJob = useCallback(async (): Promise<string | null> => {
    if (!lastJobParams) return null;
    return startJob(lastJobParams);
  }, [lastJobParams, startJob]);

  const value: JobTrackerContextValue = {
    activeJob,
    isPolling,
    startJob,
    cancelJob,
    clearJob,
    retryJob,
    lastJobParams,
  };

  return (
    <JobTrackerContext.Provider value={value}>
      {children}
    </JobTrackerContext.Provider>
  );
}

export function useJobTracker() {
  const context = useContext(JobTrackerContext);
  if (!context) {
    throw new Error('useJobTracker must be used within JobTrackerProvider');
  }
  return context;
}
