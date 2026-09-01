import { dual, dualGet, dualVoid, type TauriFileEntry } from './shared';

export async function readTextFile(filePath: string, options?: { suppressToast?: boolean }) {
  return await dual<string>(
    'read_text_file',
    { filePath },
    '/api/filesystem/read-text-file',
    { filePath },
    options
  );
}

export async function readTextFileLines(filePath: string) {
  return await dual<string[]>(
    'read_text_file_lines',
    { filePath },
    '/api/filesystem/read-text-file-lines',
    { filePath }
  );
}

export async function getCodexHome() {
  return await dualGet<string>('codex_home', undefined, '/api/filesystem/codex-home');
}

export async function writeFile(filePath: string, content: string) {
  await dualVoid('write_file', { filePath, content }, '/api/filesystem/write-file', {
    filePath,
    content,
  });
}

/** Read a file as raw bytes, base64-encoded (binary formats such as PDF/XLSX). */
export async function readFile(filePath: string) {
  return await dual<string>('read_file', { filePath }, '/api/filesystem/read-file', {
    filePath,
  });
}

export async function readDirectory(path: string, options?: { suppressToast?: boolean }) {
  return await dual<TauriFileEntry[]>(
    'read_directory',
    { path },
    '/api/filesystem/read-directory',
    { path },
    options
  );
}

export async function getHomeDirectory() {
  return await dualGet<string>('get_home_directory', undefined, '/api/filesystem/home-directory');
}

export async function searchFiles(params: {
  root: string;
  query: string;
  excludeFolders: string[];
  maxResults?: number;
}) {
  return await dual<TauriFileEntry[]>('search_files', params, '/api/filesystem/search-files', {
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
  return await dual<TauriFileEntry[]>(
    'search_files_by_name',
    params,
    '/api/filesystem/search-files-by-name',
    {
      root: params.root,
      query: params.query,
      exclude_folders: params.excludeFolders,
      max_results: params.maxResults,
    }
  );
}

export async function canonicalizePath(path: string) {
  return await dual<string>('canonicalize_path', { path }, '/api/filesystem/canonicalize-path', {
    path,
  });
}

export async function deleteFile(filePath: string) {
  await dualVoid('delete_file', { filePath }, '/api/filesystem/delete-file', { filePath });
}

export async function watchDirectory(folderPath: string) {
  await dualVoid('watch_directory', { folderPath }, '/api/filesystem/watch', { path: folderPath });
}

export async function unwatchDirectory(folderPath: string) {
  await dualVoid('unwatch_directory', { folderPath }, '/api/filesystem/unwatch', {
    path: folderPath,
  });
}
