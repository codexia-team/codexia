import type {
  ExternalAgentConfigDetectParams,
  ExternalAgentConfigDetectResponse,
  ExternalAgentConfigImportHistoriesReadResponse,
  ExternalAgentConfigImportHistoryRecordParams,
  ExternalAgentConfigImportHistoryRecordResponse,
  ExternalAgentConfigImportParams,
  ExternalAgentConfigImportResponse,
  HooksListParams,
  HooksListResponse,
  MemoryResetResponse,
  ThreadCompactStartParams,
  ThreadCompactStartResponse,
  ThreadMemoryModeSetParams,
  ThreadMemoryModeSetResponse,
} from '@/bindings/v2';
import { postJson } from './shared';

export async function threadCompactStart(params: ThreadCompactStartParams) {
  return await postJson<ThreadCompactStartResponse>('/api/codex/thread/compact/start', params);
}

export async function threadMemoryModeSet(params: ThreadMemoryModeSetParams) {
  return await postJson<ThreadMemoryModeSetResponse>('/api/codex/thread/memory-mode/set', params);
}

export async function memoryReset() {
  return await postJson<MemoryResetResponse>('/api/codex/memory/reset', {});
}

export async function hooksList(params: HooksListParams) {
  return await postJson<HooksListResponse>('/api/codex/hooks/list', params);
}

export async function externalAgentConfigDetect(params: ExternalAgentConfigDetectParams) {
  return await postJson<ExternalAgentConfigDetectResponse>(
    '/api/codex/external-agent-config/detect',
    params
  );
}

export async function externalAgentConfigImport(params: ExternalAgentConfigImportParams) {
  return await postJson<ExternalAgentConfigImportResponse>(
    '/api/codex/external-agent-config/import',
    params
  );
}

export async function externalAgentConfigImportRecordHistory(
  params: ExternalAgentConfigImportHistoryRecordParams
) {
  return await postJson<ExternalAgentConfigImportHistoryRecordResponse>(
    '/api/codex/external-agent-config/import/record-history',
    params
  );
}

export async function externalAgentConfigImportReadHistories() {
  return await postJson<ExternalAgentConfigImportHistoriesReadResponse>(
    '/api/codex/external-agent-config/import/read-histories',
    {}
  );
}
