import { postJson, postJsonWithOptions, postNoContent } from './shared';

export type GitStatusEntry = {
  path: string;
  index_status: string;
  worktree_status: string;
};

export type GitStatusResponse = {
  repo_root: string;
  entries: GitStatusEntry[];
};

export type GitFileDiffResponse = {
  old_content: string;
  new_content: string;
  has_changes: boolean;
};

export type GitFileDiffMetaResponse = {
  old_bytes: number;
  new_bytes: number;
  total_bytes: number;
};

export type GitDiffStatsCounts = {
  additions: number;
  deletions: number;
};

export type GitDiffStatsResponse = {
  staged: GitDiffStatsCounts;
  unstaged: GitDiffStatsCounts;
};

export type GitCreateWorktreeResponse = {
  repo_root: string;
  worktree_path: string;
  existed: boolean;
  copied_env_files: string[];
};

export type GitApplyWorktreeResponse = {
  changed_files: number;
};

export type GitHasWorktreeChangesResponse = {
  has_changes: boolean;
};

export type GitBranchInfoResponse = {
  owner: string;
  repo: string;
  branch: string;
};

export type GitBranchListResponse = {
  current: string;
  branches: string[];
};

export async function gitBranchInfo(cwd: string) {
  return await postJson<GitBranchInfoResponse>('/api/git/branch-info', {
    cwd,
  });
}

// Returns true iff `cwd` is a git working tree. Used by useGitWatch and
// downstream consumers to gate polling — non-git cwds otherwise loop on
// errors. Hits the same backend endpoint as gitBranchInfo but passes
// suppressToast so the shared API helper doesn't render a "Request failed"
// toast on the (expected) non-git case. Result is not cached because cwd
// changes are rare and the call is cheap.
export async function isGitRepo(cwd: string): Promise<boolean> {
  if (!cwd) return false;
  try {
    await postJsonWithOptions<GitBranchInfoResponse>(
      '/api/git/branch-info',
      { cwd },
      {
        suppressToast: true,
      }
    );
    return true;
  } catch {
    return false;
  }
}

export async function gitListBranches(cwd: string) {
  return await postJson<GitBranchListResponse>('/api/git/list-branches', {
    cwd,
  });
}

export async function gitCreateBranch(cwd: string, branch: string) {
  await postNoContent('/api/git/create-branch', { cwd, branch });
}

export async function gitCheckoutBranch(cwd: string, branch: string) {
  await postNoContent('/api/git/checkout-branch', {
    cwd,
    branch,
  });
}

export async function gitStatus(cwd: string) {
  return await postJson<GitStatusResponse>('/api/git/status', { cwd });
}

export async function gitFileDiff(cwd: string, filePath: string, staged: boolean) {
  return await postJson<GitFileDiffResponse>('/api/git/file-diff', { cwd, filePath, staged });
}

export async function gitFileDiffMeta(cwd: string, filePath: string, staged: boolean) {
  return await postJson<GitFileDiffMetaResponse>('/api/git/file-diff-meta', {
    cwd,
    filePath,
    staged,
  });
}

export async function gitDiffStats(cwd: string) {
  return await postJson<GitDiffStatsResponse>('/api/git/diff-stats', {
    cwd,
  });
}

export async function gitStageFiles(cwd: string, filePaths: string[]) {
  await postNoContent('/api/git/stage-files', {
    cwd,
    filePaths,
  });
}

export async function gitUnstageFiles(cwd: string, filePaths: string[]) {
  await postNoContent('/api/git/unstage-files', {
    cwd,
    filePaths,
  });
}

export async function gitReverseFiles(cwd: string, filePaths: string[], staged: boolean) {
  await postNoContent('/api/git/reverse-files', {
    cwd,
    filePaths,
    staged,
  });
}

export async function gitCreateWorktree(cwd: string, worktreeKey: string) {
  return await postJson<GitCreateWorktreeResponse>('/api/git/create-worktree', {
    cwd,
    worktreeKey,
  });
}

export async function gitRemoveWorktree(cwd: string, worktreeKey: string): Promise<void> {
  await postNoContent('/api/git/remove-worktree', {
    cwd,
    worktreeKey,
  });
}

export async function gitApplyWorktreeChanges(cwd: string, worktreeKey: string) {
  return await postJson<GitApplyWorktreeResponse>('/api/git/apply-worktree-changes', {
    cwd,
    worktreeKey,
  });
}

export async function gitHasWorktreeChanges(cwd: string, worktreeKey: string) {
  return await postJson<GitHasWorktreeChangesResponse>('/api/git/has-worktree-changes', {
    cwd,
    worktreeKey,
  });
}

function resolveCwd(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash > 0 ? normalized.slice(0, lastSlash) : '.';
}

export async function getGitFileDiff<T = unknown>(filePath: string) {
  const cwd = resolveCwd(filePath);
  const diff = await postJson<GitFileDiffResponse>('/api/git/file-diff', {
    cwd,
    filePath,
    staged: false,
  });
  return {
    original_content: diff.old_content,
    current_content: diff.new_content,
    has_changes: diff.has_changes,
  } as T;
}

export async function gitCommit(cwd: string, message: string) {
  return await postJson<string>('/api/git/commit', { cwd, message });
}

export async function gitPush(cwd: string, remote?: string, branch?: string) {
  return await postJson<string>('/api/git/push', {
    cwd,
    remote,
    branch,
  });
}
