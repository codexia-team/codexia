import { invokeTauri, isDesktopTauri } from './shared';

export * from './acp';
export * from './automation';

export * from './cc';
export * from './codex';
export * from './dictation';
export * from './filesystem';
export * from './git';
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
    return await invokeTauri<string>('read_text_file', { filePath: SESSION_META_FILE_PATH });
  }
  return window.localStorage.getItem(SESSION_META_STORAGE_KEY) ?? '{}';
}

export async function writeSessionMetaFile(content: string): Promise<void> {
  if (isDesktopTauri()) {
    return await invokeTauri<void>('write_file', { filePath: SESSION_META_FILE_PATH, content });
  }
  window.localStorage.setItem(SESSION_META_STORAGE_KEY, content);
}
export * from './remote';
