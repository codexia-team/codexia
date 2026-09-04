import type {
  ListMcpServerStatusParams,
  ListMcpServerStatusResponse,
  McpServerOauthLoginParams,
  McpServerOauthLoginResponse,
} from '@/bindings/v2';
import {
  postJson,
  postNoContent,
  type UnifiedMcpClientName,
  type UnifiedMcpConfig,
} from './shared';

export async function unifiedReadMcpConfig(
  clientName: UnifiedMcpClientName,
  path?: string
): Promise<UnifiedMcpConfig> {
  return await postJson<UnifiedMcpConfig>('/api/codex/mcp/read', { client_name: clientName, path });
}

export async function unifiedAddMcpServer(params: {
  clientName: UnifiedMcpClientName;
  path?: string;
  serverName: string;
  serverConfig: unknown;
  scope?: string;
}) {
  await postNoContent('/api/codex/mcp/add', {
    client_name: params.clientName,
    path: params.path,
    server_name: params.serverName,
    server_config: params.serverConfig,
    scope: params.scope,
  });
}

export async function unifiedRemoveMcpServer(params: {
  clientName: UnifiedMcpClientName;
  path?: string;
  serverName: string;
  scope?: string;
}) {
  await postNoContent('/api/codex/mcp/remove', {
    client_name: params.clientName,
    path: params.path,
    server_name: params.serverName,
    scope: params.scope,
  });
}

export async function unifiedEnableMcpServer(params: {
  clientName: UnifiedMcpClientName;
  path?: string;
  serverName: string;
}) {
  await postNoContent('/api/codex/mcp/enable', {
    client_name: params.clientName,
    path: params.path,
    server_name: params.serverName,
  });
}

export async function unifiedDisableMcpServer(params: {
  clientName: UnifiedMcpClientName;
  path?: string;
  serverName: string;
}) {
  await postNoContent('/api/codex/mcp/disable', {
    client_name: params.clientName,
    path: params.path,
    server_name: params.serverName,
  });
}

export async function mcpServerOauthLogin(params: McpServerOauthLoginParams) {
  return await postJson<McpServerOauthLoginResponse>('/api/codex/mcp/oauth/login', params);
}

export async function listMcpServerStatus(params: ListMcpServerStatusParams) {
  return await postJson<ListMcpServerStatusResponse>('/api/codex/mcp/status/list', params);
}
