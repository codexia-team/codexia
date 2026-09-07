import { readTextFile, writeFile } from './filesystem';
import { isDesktopTauri } from './shared';

export * from './acp';
export * from './automation';
export * from './bots';

export * from './cc';
export * from './codex';
export * from './dictation';
export * from './filesystem';
export * from './git';
export * from './lifecycle';
export * from './openapp';
export type {
  InstalledSkillItem,
  MarketplaceSkillItem,
  SkillAgent,
  SkillScope,
  TauriFileEntry,
  TerminalStartResponse,
  UnifiedMcpClientName,
  UnifiedMcpConfig,
} from './shared';
export * from './terminal';
export * from './threadOps';

const SESSION_META_STORAGE_KEY = 'codexia.session_meta';
const SESSION_META_FILE_PATH = '~/.plux/session_meta.json';

export async function readSessionMetaFile(): Promise<string> {
  if (isDesktopTauri()) {
    return await readTextFile(SESSION_META_FILE_PATH, { suppressToast: true });
  }
  return window.localStorage.getItem(SESSION_META_STORAGE_KEY) ?? '{}';
}

export async function writeSessionMetaFile(content: string): Promise<void> {
  if (isDesktopTauri()) {
    return await writeFile(SESSION_META_FILE_PATH, content);
  }
  window.localStorage.setItem(SESSION_META_STORAGE_KEY, content);
}
export * from './remote';
