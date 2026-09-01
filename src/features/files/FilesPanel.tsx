import { Folders, X } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEditorStore, useWorkspaceStore } from '@/stores';
import { getFilename } from '@/utils/getFilename';
import { FileTree, FileViewer } from './explorer';

export default function FilesPanel() {
  const { openFiles, activeFile, openFile, closeFile, setActiveFile } = useEditorStore();
  const { cwd } = useWorkspaceStore();
  const isMobile = useIsMobile();
  const [isFileTreeVisible, setIsFileTreeVisible] = useState(!isMobile);

  // Collapse tree on mobile when cwd changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: cwd is the trigger for reloading the panel
  // biome-ignore lint/correctness/useExhaustiveDependencies: cwd is the trigger for reloading the panel
  useEffect(() => {
    setIsFileTreeVisible(!isMobile);
  }, [cwd, isMobile]);

  // Close tree overlay when a file is selected on mobile
  const handleFileSelect = (path: string) => {
    openFile(path);
    if (isMobile) setIsFileTreeVisible(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0 w-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex h-9 shrink-0 items-center border-b border-border bg-sidebar/30 backdrop-blur-sm overflow-hidden">
        {/* Scrollable tabs */}
        <div className="flex min-w-0 flex-1 overflow-x-auto scrollbar-none">
          {openFiles.map((path) => {
            const isActive = path === activeFile;
            return (
              <button
                key={path}
                type="button"
                onClick={() => setActiveFile(path)}
                className={`group flex h-9 min-w-0 shrink-0 items-center gap-1.5 border-r border-border px-3 text-xs transition-colors ${
                  isActive
                    ? 'bg-background text-foreground'
                    : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                }`}
                title={path}
              >
                <span className="max-w-[120px] truncate font-mono">{getFilename(path)}</span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Close ${getFilename(path)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFile(path);
                  }}
                  className="shrink-0 rounded p-0.5 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 rounded-none border-r border-border text-muted-foreground hover:text-foreground hover:bg-accent/60"
          onClick={() => setIsFileTreeVisible((v) => !v)}
          title={isFileTreeVisible ? 'Hide file tree' : 'Show file tree'}
          aria-label={isFileTreeVisible ? 'Hide file tree' : 'Show file tree'}
        >
          <Folders className="h-4 w-4" />
        </Button>
      </div>

      {/* Content area */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden w-full">
        {/* FileViewer */}
        {activeFile ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <Suspense fallback={null}>
              <FileViewer filePath={activeFile} />
            </Suspense>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a file to view
          </div>
        )}

        {/* FileTree — desktop inline, right side */}
        {isFileTreeVisible && !isMobile && cwd && (
          <div
            className={`h-full shrink-0 border-l border-border bg-sidebar/20 overflow-hidden ${
              activeFile ? 'w-60 min-w-60' : 'flex-1'
            }`}
          >
            <FileTree folder={cwd} onFileSelect={handleFileSelect} />
          </div>
        )}

        {/* FileTree — mobile overlay from right */}
        {isFileTreeVisible && isMobile && cwd && (
          <>
            <button
              type="button"
              className="absolute inset-0 z-10 bg-black/20"
              aria-label="Hide file tree"
              onClick={() => setIsFileTreeVisible(false)}
            />
            <div className="absolute inset-y-0 right-0 z-20 w-[min(78vw,280px)] border-l border-border bg-sidebar/90 overflow-hidden backdrop-blur">
              <FileTree folder={cwd} onFileSelect={handleFileSelect} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
