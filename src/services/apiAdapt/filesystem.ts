import {
  getJson,
  postJson,
  postJsonWithOptions,
  postNoContent,
  type TauriFileEntry,
} from './shared';

export async function readTextFile(filePath: string, options?: { suppressToast?: boolean }) {
  return await postJsonWithOptions<string>('/api/filesystem/read-text-file', { filePath }, options);
}

export async function readTextFileLines(filePath: string) {
  return await postJson<string[]>('/api/filesystem/read-text-file-lines', { filePath });
}

export async function getCodexHome() {
  return await getJson<string>('/api/filesystem/codex-home');
}

export async function writeFile(filePath: string, content: string) {
  await postNoContent('/api/filesystem/write-file', { filePath, content });
}

/** Read a file as raw bytes, base64-encoded (binary formats such as PDF/XLSX). */
export async function readFile(filePath: string) {
  return await postJson<string>('/api/filesystem/read-file', { filePath });
}

export async function readDirectory(path: string, options?: { suppressToast?: boolean }) {
  return await postJsonWithOptions<TauriFileEntry[]>(
    '/api/filesystem/read-directory',
    { path },
    options
  );
}

export async function getHomeDirectory() {
  return await getJson<string>('/api/filesystem/home-directory');
}

export async function searchFiles(params: {
  root: string;
  query: string;
  excludeFolders: string[];
  maxResults?: number;
}) {
  return await postJson<TauriFileEntry[]>('/api/filesystem/search-files', {
    root: params.root,
    query: params.query,
    exclude_folders: params.excludeFolders,
    max_results: params.maxResults,
  });
}

export async function searchFilesByName(params: {
  root: string;
  query: string;
  excludeFolders: string[];
  maxResults?: number;
}) {
  return await postJson<TauriFileEntry[]>('/api/filesystem/search-files-by-name', {
    root: params.root,
    query: params.query,
    exclude_folders: params.excludeFolders,
    max_results: params.maxResults,
  });
}

export async function canonicalizePath(path: string) {
  return await postJson<string>('/api/filesystem/canonicalize-path', { path });
}

export async function deleteFile(filePath: string) {
  await postNoContent('/api/filesystem/delete-file', { filePath });
}

export async function watchDirectory(folderPath: string) {
  await postNoContent('/api/filesystem/watch', { path: folderPath });
}

export async function unwatchDirectory(folderPath: string) {
  await postNoContent('/api/filesystem/unwatch', { path: folderPath });
}
