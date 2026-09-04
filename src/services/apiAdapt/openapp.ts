import { postJson, postNoContent } from './shared';

export interface AppStatus {
  installed: boolean;
  path: string | null;
}

export async function checkAppInstalled(appName: string) {
  return await postJson<AppStatus>('/api/openapp/check-app-installed', { appName });
}

export async function openWorkspaceIn(
  path: string,
  options: {
    appName?: string | null;
    command?: string | null;
    args?: string[];
  }
) {
  const payload = {
    app: options.appName ?? null,
    command: options.command ?? null,
    args: options.args ?? [],
  };
  await postNoContent('/api/openapp/open-workspace-in', { path, options: payload });
}
