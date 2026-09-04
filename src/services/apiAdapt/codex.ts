import type { RequestId, ThreadId } from '@/bindings';
import type {
  CommandExecutionApprovalDecision,
  FileChangeApprovalDecision,
  GetAccountParams,
  GetAccountRateLimitsResponse,
  GetAccountResponse,
  GrantedPermissionProfile,
  LoginAccountParams,
  LoginAccountResponse,
  McpServerElicitationAction,
  ModelListParams,
  ModelListResponse,
  PermissionGrantScope,
  PluginInstalledParams,
  PluginInstalledResponse,
  PluginInstallParams,
  PluginInstallResponse,
  PluginListParams,
  PluginListResponse,
  PluginReadParams,
  PluginReadResponse,
  PluginUninstallParams,
  PluginUninstallResponse,
  ReviewStartParams,
  ReviewStartResponse,
  ThreadForkParams,
  ThreadForkResponse,
  ThreadGoalClearParams,
  ThreadGoalClearResponse,
  ThreadGoalGetParams,
  ThreadGoalGetResponse,
  ThreadGoalSetParams,
  ThreadGoalSetResponse,
  ThreadListParams,
  ThreadListResponse,
  ThreadResumeParams,
  ThreadResumeResponse,
  ThreadRollbackParams,
  ThreadRollbackResponse,
  ThreadStartParams,
  ThreadStartResponse,
  TurnInterruptParams,
  TurnStartParams,
  TurnStartResponse,
  TurnSteerParams,
  TurnSteerResponse,
} from '@/bindings/v2';
import type {
  ConfigProvider,
  EnvStatusItem,
  FrontendProviderModels,
  ProviderPreset,
} from '@/components/codex/types';
import { getJson, postJson, postNoContent } from './shared';

export * from './mcp';
export * from './skills';

export async function listModels() {
  const params: ModelListParams = {
    cursor: null,
    limit: 100,
  };
  return await postJson<ModelListResponse>('/api/codex/model/list', params);
}

export async function threadStart(params: ThreadStartParams) {
  return await postJson<ThreadStartResponse>('/api/codex/thread/start', params);
}

export async function threadResume(params: ThreadResumeParams) {
  return await postJson<ThreadResumeResponse>('/api/codex/thread/resume', params);
}

export async function threadFork(params: ThreadForkParams) {
  return await postJson<ThreadForkResponse>('/api/codex/thread/fork', params);
}

export async function threadRollback(params: ThreadRollbackParams) {
  return await postJson<ThreadRollbackResponse>('/api/codex/thread/rollback', params);
}

export async function turnStart(params: TurnStartParams) {
  return await postJson<TurnStartResponse>('/api/codex/turn/start', params);
}

export async function turnSteer(params: TurnSteerParams) {
  return await postJson<TurnSteerResponse>('/api/codex/turn/steer', params);
}

export async function turnInterrupt(params: TurnInterruptParams) {
  return await postJson('/api/codex/turn/interrupt', params);
}

export async function listThreads(params: ThreadListParams) {
  return await postJson<ThreadListResponse>('/api/codex/thread/list', {
    ...params,
  });
}

export async function archiveThread(threadId: ThreadId) {
  return await postJson('/api/codex/thread/archive', { threadId });
}

export async function unarchiveThread(threadId: ThreadId) {
  return await postJson('/api/codex/thread/unarchive', { threadId });
}

export async function deleteThread(threadId: ThreadId) {
  return await postJson('/api/codex/thread/delete', { threadId });
}

export async function renameThread(threadId: ThreadId, name: string) {
  const params = { threadId, name };
  return await postJson('/api/codex/thread/rename', params);
}

export async function getAccount() {
  return await getAccountWithParams({ refreshToken: false });
}

export async function getAccountWithParams(params: GetAccountParams) {
  return await postJson<GetAccountResponse>('/api/codex/account/get', params);
}

export async function loginAccount(params: LoginAccountParams) {
  return await postJson<LoginAccountResponse>('/api/codex/account/login', params);
}

export interface AccountSnapshotSummary {
  label: string;
  email: string | null;
  planType: string | null;
  isCurrent: boolean;
}

export async function saveAccountSnapshot(
  label: string,
  email: string | null,
  planType: string | null
) {
  await postNoContent('/api/codex/account/snapshot/save', { label, email, planType });
}

export async function listAccountSnapshots() {
  return await getJson<AccountSnapshotSummary[]>('/api/codex/account/snapshot/list');
}

export async function removeAccountSnapshot(label: string) {
  await postNoContent('/api/codex/account/snapshot/remove', { label });
}

export async function switchAccountSnapshot(label: string) {
  return await postJson<LoginAccountResponse>('/api/codex/account/snapshot/switch', { label });
}

export async function startReview(params: ReviewStartParams) {
  return await postJson<ReviewStartResponse>('/api/codex/review/start', params);
}

export async function getAccountRateLimits() {
  return await getJson<GetAccountRateLimitsResponse>('/api/codex/account/rate-limits');
}

export async function respondToRequestUserInput(requestId: RequestId, response: unknown) {
  return await postNoContent('/api/codex/approval/user-input', { request_id: requestId, response });
}

export async function respondToCommandExecutionApproval(
  requestId: RequestId,
  decision: CommandExecutionApprovalDecision
) {
  return await postNoContent('/api/codex/approval/command-execution', {
    request_id: requestId,
    decision,
  });
}

export async function respondToFileChangeApproval(
  requestId: RequestId,
  decision: FileChangeApprovalDecision
) {
  return await postNoContent('/api/codex/approval/file-change', {
    request_id: requestId,
    decision,
  });
}

export async function respondToMcpElicitation(
  requestId: RequestId,
  action: McpServerElicitationAction,
  content: unknown = null,
  meta: unknown = null
) {
  return await postNoContent('/api/codex/approval/mcp-elicitation', {
    request_id: requestId,
    action,
    content,
    meta,
  });
}

export async function respondToPermissionsApproval(
  requestId: RequestId,
  permissions: GrantedPermissionProfile,
  scope: PermissionGrantScope,
  strictAutoReview = false
) {
  return await postNoContent('/api/codex/approval/permissions', {
    request_id: requestId,
    permissions,
    scope,
    strict_auto_review: strictAutoReview,
  });
}

export async function preventSleep(conversationId?: string | null) {
  await postNoContent('/api/sleep/prevent', { conversation_id: conversationId ?? null });
}

export async function allowSleep(conversationId?: string | null) {
  await postNoContent('/api/sleep/allow', {
    conversation_id: conversationId ?? null,
  });
}

export async function listOtherModels() {
  return await getJson<FrontendProviderModels[]>('/api/codex/model/list-other');
}

export async function listProviderPresets() {
  return await getJson<ProviderPreset[]>('/api/codex/provider/presets');
}

// Persists the provider into the user's codex config.toml.
export async function addModelProvider(params: {
  provider: string;
  baseUrl: string;
  envKey: string;
}) {
  await postNoContent('/api/codex/provider/add', {
    provider: params.provider,
    base_url: params.baseUrl,
    env_key: params.envKey,
  });
}

// Providers actually present in the user's config.toml.
export async function listConfigProviders() {
  return await getJson<ConfigProvider[]>('/api/codex/provider/list');
}

export async function removeModelProvider(provider: string) {
  await postNoContent('/api/codex/provider/remove', { provider });
}

export async function loadEnvKeys() {
  return await getJson<EnvStatusItem[]>('/api/codex/load_env_keys');
}

export async function setEnv(key: string, value: string) {
  await postNoContent('/api/codex/set_env', { key, value });
}

export async function threadGoalSet(params: ThreadGoalSetParams) {
  return await postJson<ThreadGoalSetResponse>('/api/codex/thread/goal/set', params);
}

export async function threadGoalGet(params: ThreadGoalGetParams) {
  return await postJson<ThreadGoalGetResponse>('/api/codex/thread/goal/get', params);
}

export async function threadGoalClear(params: ThreadGoalClearParams) {
  return await postJson<ThreadGoalClearResponse>('/api/codex/thread/goal/clear', params);
}

export async function pluginList(params: PluginListParams) {
  return await postJson<PluginListResponse>('/api/codex/plugin/list', params);
}

export async function pluginInstalled(params: PluginInstalledParams) {
  return await postJson<PluginInstalledResponse>('/api/codex/plugin/installed', params);
}

export async function pluginRead(params: PluginReadParams) {
  return await postJson<PluginReadResponse>('/api/codex/plugin/read', params);
}

export async function pluginInstall(params: PluginInstallParams) {
  return await postJson<PluginInstallResponse>('/api/codex/plugin/install', params);
}

export async function pluginUninstall(params: PluginUninstallParams) {
  return await postJson<PluginUninstallResponse>('/api/codex/plugin/uninstall', params);
}
