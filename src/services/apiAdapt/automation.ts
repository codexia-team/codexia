import type { Provider } from '@/stores/settings';
import { postJson, postNoContent } from './shared';

export type AutomationScheduleMode = 'daily' | 'interval';
export type AutomationWeekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
/** Where a run works: the project itself, or a per-task linked git worktree. */
export type AutomationCwdMode = 'cwd' | 'worktree';

export type AutomationSchedule = {
  mode: AutomationScheduleMode;
  hour?: number | null;
  minute?: number | null;
  interval_hours?: number | null;
  weekdays: AutomationWeekday[];
};

export type AutomationTask = {
  id: string;
  name: string;
  projects: string[];
  prompt: string;
  agent: 'codex' | 'cc';
  model_provider: Provider;
  model: string;
  schedule: AutomationSchedule;
  cron_expression: string;
  created_at: string;
  paused: boolean;
  cwd_mode: AutomationCwdMode;
};

export type AutomationRun = {
  run_id: string;
  task_id: string;
  task_name: string;
  thread_id: string;
  status: string;
  started_at: string;
  updated_at: string;
  /** Null for runs recorded before the working directory was tracked. */
  cwd: string | null;
};

export async function listAutomations() {
  return await postJson<AutomationTask[]>('/api/automation/list', {});
}

export async function listAutomationRuns(payload?: { task_id?: string; limit?: number }) {
  const params = { task_id: payload?.task_id ?? null, limit: payload?.limit ?? 100 };
  return await postJson<AutomationRun[]>('/api/automation/runs/list', params);
}

export async function createAutomation(payload: {
  name: string;
  projects: string[];
  prompt: string;
  schedule: AutomationSchedule;
  agent?: 'codex' | 'cc';
  model_provider?: string;
  model?: string;
  cwd_mode?: AutomationCwdMode;
}) {
  return await postJson<AutomationTask>('/api/automation/create', payload);
}

export async function updateAutomation(payload: {
  id: string;
  name: string;
  projects: string[];
  prompt: string;
  schedule: AutomationSchedule;
  agent?: 'codex' | 'cc';
  model_provider?: string;
  model?: string;
  cwd_mode?: AutomationCwdMode;
}) {
  return await postJson<AutomationTask>('/api/automation/update', payload);
}

export async function setAutomationPaused(id: string, paused: boolean) {
  return await postJson<AutomationTask>('/api/automation/set-paused', { id, paused });
}

export async function deleteAutomation(id: string) {
  await postNoContent('/api/automation/delete', { id });
}

export async function runAutomationNow(id: string) {
  await postNoContent('/api/automation/run-now', { id });
}
