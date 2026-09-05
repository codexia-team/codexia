import { DiffModeEnum, DiffView } from '@git-diff-view/react';
import { createTwoFilesPatch } from 'diff';
import { ChevronDown, ChevronRight, Minus, Plus, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useThemeContext } from '@/contexts/ThemeContext';
import {
  type GitFileDiffMetaResponse,
  type GitFileDiffResponse,
  type GitStatusEntry,
  gitFileDiff,
  gitFileDiffMeta,
  gitReverseFiles,
  gitStageFiles,
  gitUnstageFiles,
} from '@/services/apiAdapt';
import { useEditorStore, useLayoutStore } from '@/stores';
import type { DiffSection, DiffSource } from './types';
import {
  formatBytes,
  LARGE_DIFF_THRESHOLD_BYTES,
  statusColorByText,
  statusTextForSection,
} from './utils';

interface GitDiffFileItemProps {
  cwd: string;
  entry: GitStatusEntry;
  section: DiffSection;
  diffSource: DiffSource;
  wordWrapEnabled: boolean;
  expanded: boolean;
  isSelected: boolean;
  refreshKey: number;
  onExpandedChange: (expanded: boolean) => void;
  onSelect: () => void;
  onRefreshStatus: () => void;
}

export function GitDiffFileItem({
  cwd,
  entry,
  section,
  diffSource,
  wordWrapEnabled,
  expanded,
  isSelected,
  refreshKey,
  onExpandedChange,
  onSelect,
  onRefreshStatus,
}: GitDiffFileItemProps) {
  const { resolvedTheme } = useThemeContext();
  const { hasConfirmedGitRevert, setHasConfirmedGitRevert } = useEditorStore();
  const { diffSplitMode } = useLayoutStore();
  const [diffMeta, setDiffMeta] = useState<GitFileDiffMetaResponse | null>(null);
  const [diffData, setDiffData] = useState<GitFileDiffResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [largeDiffConfirmed, setLargeDiffConfirmed] = useState(false);
  const [stageLoading, setStageLoading] = useState(false);
  const [revertLoading, setRevertLoading] = useState(false);
  const [revertConfirm, setRevertConfirm] = useState(false);

  // Load diff meta + data whenever the item is expanded, including on mount,
  // and reload when the file, section or refresh key changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is a reload signal
  useEffect(() => {
    if (!expanded) return;

    let cancelled = false;
    setLoading(true);
    setDiffMeta(null);
    setDiffData(null);
    setLargeDiffConfirmed(false);

    const run = async () => {
      try {
        const meta = await gitFileDiffMeta(cwd, entry.path, section === 'staged');
        if (cancelled) return;
        setDiffMeta(meta);

        // Binary blobs (images, pptx, ...) have no meaningful text diff and
        // would otherwise be stringified and line-diffed, freezing the panel.
        if (!meta.is_binary && meta.total_bytes <= LARGE_DIFF_THRESHOLD_BYTES) {
          const data = await gitFileDiff(cwd, entry.path, section === 'staged');
          if (cancelled) return;
          setDiffData(data);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [expanded, cwd, entry.path, section, refreshKey]);

  // Load full data once user confirms large diff
  useEffect(() => {
    if (!largeDiffConfirmed || diffMeta?.is_binary) return;

    let cancelled = false;
    setLoading(true);

    gitFileDiff(cwd, entry.path, section === 'staged')
      .then((data) => {
        if (!cancelled) {
          setDiffData(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [largeDiffConfirmed, diffMeta?.is_binary, cwd, entry.path, section]);

  const diffHunks = useMemo(() => {
    if (!diffData || !diffData.has_changes) return [];
    const oldPath = `a/${entry.path}`;
    const newPath = `b/${entry.path}`;
    const raw = createTwoFilesPatch(
      oldPath,
      newPath,
      diffData.old_content ?? '',
      diffData.new_content ?? '',
      '',
      '',
      { context: 3 }
    );
    const body = raw
      .split('\n')
      .filter((l) => !l.startsWith('Index: ') && !l.startsWith('===='))
      .join('\n');
    return [`diff --git ${oldPath} ${newPath}\n${body}`];
  }, [entry.path, diffData]);

  const handleStage = async () => {
    setStageLoading(true);
    try {
      if (section === 'staged') {
        await gitUnstageFiles(cwd, [entry.path]);
      } else {
        await gitStageFiles(cwd, [entry.path]);
      }
      onRefreshStatus();
    } finally {
      setStageLoading(false);
    }
  };

  const doRevert = async () => {
    setRevertLoading(true);
    try {
      await gitReverseFiles(cwd, [entry.path], section === 'staged');
      onRefreshStatus();
    } finally {
      setRevertLoading(false);
      setRevertConfirm(false);
    }
  };

  const handleRevert = () => {
    if (!hasConfirmedGitRevert) {
      setRevertConfirm(true);
      return;
    }
    void doRevert();
  };

  const status = statusTextForSection(entry, section);
  const name = entry.path.split('/').pop() ?? entry.path;
  const dir = entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : null;
  const isBinary = diffMeta?.is_binary ?? false;
  const isLarge = diffMeta ? !isBinary && diffMeta.total_bytes > LARGE_DIFF_THRESHOLD_BYTES : false;

  return (
    <div
      className={`border-b border-white/10 ${isSelected ? 'ring-1 ring-inset ring-primary/40' : ''}`}
    >
      {/* File header */}
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 text-xs ${
          isSelected ? 'bg-accent/20' : 'bg-sidebar/10'
        }`}
      >
        <button
          type="button"
          className="shrink-0 text-muted-foreground"
          onClick={() => onExpandedChange(!expanded)}
          aria-label={expanded ? 'Collapse diff' : 'Expand diff'}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        <button
          type="button"
          className="flex-1 flex items-center gap-2 min-w-0 text-left"
          onClick={() => {
            onSelect();
            onExpandedChange(true);
          }}
        >
          <span className="font-mono truncate text-foreground">{name}</span>
          {dir && (
            <span className="font-mono truncate text-muted-foreground/50 text-[10px] hidden sm:block">
              {dir}
            </span>
          )}
        </button>

        <Badge
          variant="outline"
          className={`font-mono px-1.5 shrink-0 text-[10px] ${statusColorByText(status)}`}
        >
          {status}
        </Badge>

        {diffSource === 'latest-turn' && (
          <span className="text-[10px] text-muted-foreground/50 shrink-0">latest-turn</span>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => void handleStage()}
          disabled={stageLoading}
          title={section === 'staged' ? 'Unstage file' : 'Stage file'}
        >
          {section === 'staged' ? (
            <Minus className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleRevert}
          disabled={revertLoading}
          title="Revert file changes"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Inline revert confirmation */}
      {revertConfirm && (
        <div className="flex items-center gap-2 px-3 py-2 text-xs bg-destructive/10 border-t border-white/10">
          <span className="flex-1 text-destructive">Revert all changes to {name}?</span>
          <Button
            size="sm"
            variant="destructive"
            className="h-6 text-xs px-2"
            onClick={() => {
              setHasConfirmedGitRevert(true);
              void doRevert();
            }}
          >
            Revert
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs px-2"
            onClick={() => setRevertConfirm(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Diff content */}
      {expanded && (
        <div className="overflow-auto">
          {loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Loading diff...</div>
          )}

          {!loading && isLarge && !largeDiffConfirmed && diffMeta && (
            <div className="m-3 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <div className="text-amber-200">
                Large diff ({formatBytes(diffMeta.total_bytes)}) — load manually?
              </div>
              <div className="mt-1 text-xs text-amber-200/70">
                Before: {formatBytes(diffMeta.old_bytes)} · After: {formatBytes(diffMeta.new_bytes)}
              </div>
              <Button size="sm" className="mt-2" onClick={() => setLargeDiffConfirmed(true)}>
                Load diff
              </Button>
            </div>
          )}

          {!loading && isBinary && diffMeta && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Binary file not shown ({formatBytes(diffMeta.total_bytes)})
            </div>
          )}

          {!loading && diffData && !diffData.has_changes && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No changes</div>
          )}

          {!loading && diffData && diffData.has_changes && diffHunks.length > 0 && (
            <div className="git-diff-compact-num">
              <DiffView
                className="git-diff-table"
                data={{
                  oldFile: { fileName: `a/${entry.path}`, content: diffData.old_content ?? '' },
                  newFile: { fileName: `b/${entry.path}`, content: diffData.new_content ?? '' },
                  hunks: diffHunks,
                }}
                diffViewMode={diffSplitMode ? DiffModeEnum.Split : DiffModeEnum.Unified}
                diffViewTheme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                diffViewHighlight={false}
                diffViewWrap={wordWrapEnabled}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
