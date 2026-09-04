import { ArrowUp, Pause, Play, Square, Target, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ThreadGoal } from '@/bindings/v2';
import { useThreadGoal, useThreadStatus } from '@/components/codex/hooks';
import { useCodexStore } from '@/components/codex/stores';
import { ContextWindowWidget } from '@/components/codex/widget';
import { FileMentionPopover } from '@/components/common';
import { Button } from '@/components/ui/button';
import { fileSrc } from '@/hooks/runtime';
import { codexService } from '@/services/codexService';
import { useAgentCenterStore } from '@/stores';
import { useInputStore } from '@/stores/useInputStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { AccessModePopover } from './AccessModePopover';
import { ComposerMenu } from './ComposerMenu';
import { ComposerToolbarProvider } from './ComposerToolbarContext';
import { DictationButton } from './DictationButton';
import { ComposerEditor, type ComposerEditorHandle } from './editor/ComposerEditor';
import { ModelReasonSelector } from './ModelReasonSelector';
import { SlashCommandDialogs } from './SlashCommandDialogs';
import { SlashCommandPopover } from './SlashCommandsSelector';
import type { SlashDialog } from './slashCommands';

interface ComposerProps {
  overrideSend?: (text: string) => void;
  onAfterSend?: (threadId: string, text: string) => void;
}

// Compact status label per goal status, mirroring
// codex-rs/tui/src/bottom_pane/footer.rs::goal_status_indicator_line.
function goalStatusLabel(status: ThreadGoal['status']): string {
  switch (status) {
    case 'active':
      return 'Pursuing goal';
    case 'paused':
      return 'Goal paused';
    case 'blocked':
      return 'Goal blocked';
    case 'usageLimited':
      return 'Goal hit usage limits';
    case 'budgetLimited':
      return 'Goal unmet';
    case 'complete':
      return 'Goal achieved';
  }
}

export function Composer({ overrideSend, onAfterSend }: ComposerProps) {
  const [images, setImages] = useState<string[]>([]);
  const [slashDialog, setSlashDialog] = useState<SlashDialog | null>(null);
  const { inputValue, setInputValue, appendFileLinks } = useInputStore();
  const { currentThreadId, currentTurnId, inputFocusTrigger, goalEnabled, setGoalEnabled } =
    useCodexStore();
  const { addAgentCard, setCurrentAgentCardId } = useAgentCenterStore();
  const { cwd } = useWorkspaceStore.getState();
  const threadStatus = useThreadStatus();
  // Actual goal state for the current thread, driven by thread/goal/updated
  // (mirrors codex-rs/tui's GoalStatusIndicator, which is derived purely
  // from ThreadGoal.status rather than a local UI toggle).
  const threadGoal = useThreadGoal();

  const editorRef = useRef<ComposerEditorHandle>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refocus the composer whenever the thread switches or a focus request is raised
  useEffect(() => {
    editorRef.current?.focus();
  }, [currentThreadId, inputFocusTrigger]);

  const handleEditorSubmit = useCallback(() => {
    formRef.current?.requestSubmit();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text && images.length === 0) {
      return;
    }

    // If thread is active and we have a turnId, steer the existing turn.
    if (threadStatus?.type === 'active' && currentThreadId && currentTurnId) {
      try {
        await codexService.turnSteer(currentThreadId, currentTurnId, text, images);
        setInputValue('');
        setImages([]);
      } catch (error) {
        console.error(error);
      }
      return;
    }

    if (overrideSend) {
      overrideSend(text);
      setInputValue('');
      return;
    }

    let targetThreadId = currentThreadId;
    let worktreePath: string | undefined;

    if (!targetThreadId) {
      try {
        const thread = await codexService.threadStart();
        targetThreadId = thread.id;
        worktreePath = thread.cwd?.includes('/.codexia/worktrees/') ? thread.cwd : undefined;
      } catch (error) {
        console.error(error);
        return;
      }
    }

    // If goal is enabled, set the goal first before starting the turn
    if (goalEnabled) {
      try {
        await codexService.threadGoalSet({
          threadId: targetThreadId,
          objective: text,
        });
        setGoalEnabled(false);
      } catch (error) {
        console.error('Failed to set goal:', error);
      }
      // Don't proceed with turnStart when setting goal - user will submit again for actual task
      setInputValue('');
      return;
    }

    addAgentCard({ kind: 'codex', id: targetThreadId, preview: text, worktreePath, cwd });
    setCurrentAgentCardId(targetThreadId);
    onAfterSend?.(targetThreadId, text);
    setInputValue('');

    try {
      await codexService.turnStart(targetThreadId, text, images);
      setImages([]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleStop = async () => {
    if (currentThreadId && currentTurnId) {
      await codexService.turnInterrupt(currentThreadId, currentTurnId);
    }
  };

  // Toggle the goal between active and paused, matching the TUI's `/goal pause`
  // and `/goal resume` commands (see codex-rs/tui/src/chatwidget/goal_menu.rs).
  const handleToggleGoalPause = async () => {
    if (!currentThreadId || !threadGoal) {
      return;
    }
    const nextStatus = threadGoal.status === 'active' ? 'paused' : 'active';
    try {
      await codexService.threadGoalSet({ threadId: currentThreadId, status: nextStatus });
    } catch (error) {
      console.error('Failed to update goal status:', error);
    }
  };

  // Append a `$mention` (optionally followed by a starter prompt) from the plus
  // menu. The editor turns the known mention text back into a chip via its
  // external-value sync, so this only has to deal with plain strings.
  const handleInsertMention = (text: string) => {
    const separator = !inputValue || /\s$/.test(inputValue) ? '' : ' ';
    setInputValue(`${inputValue}${separator}${text} `);
    editorRef.current?.focus();
  };

  // Clear the goal server-side. Local goalMap state is updated via the
  // thread/goal/cleared notification once the server confirms, so we don't
  // optimistically mutate the store here (avoids it being resurrected by a
  // late thread/goal/updated event).
  const handleClearGoal = async () => {
    setGoalEnabled(false);
    if (!currentThreadId) {
      return;
    }
    try {
      await codexService.threadGoalClear({ threadId: currentThreadId });
    } catch (error) {
      console.error('Failed to clear goal:', error);
    }
  };

  return (
    <div>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="pb-[env(safe-area-inset-bottom)] bg-background"
      >
        <FileMentionPopover
          input={inputValue}
          setInput={setInputValue}
          editorRef={editorRef}
          triggerElement={wrapperRef.current}
        />
        <SlashCommandPopover
          input={inputValue}
          setInputValue={setInputValue}
          editorRef={editorRef}
          triggerElement={wrapperRef.current}
          onOpenDialog={setSlashDialog}
        />

        <div className="max-w-3xl mx-2 sm:mx-auto border rounded-xl bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring transition-all overflow-hidden">
          {images.length > 0 && (
            <div className="flex gap-2 p-3 pb-0 overflow-x-auto">
              {images.map((path, index) => (
                <div key={path} className="relative group shrink-0">
                  <img
                    src={fileSrc(path)}
                    alt="attachment"
                    className="h-16 w-16 object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div ref={wrapperRef} className="max-h-64 overflow-y-auto px-3 pt-3">
            <ComposerEditor
              ref={editorRef}
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleEditorSubmit}
              placeholder={goalEnabled ? 'Enter goal...' : 'Do anything... / $ @'}
            />
          </div>

          {threadGoal && (
            <div className="flex items-center gap-1.5 px-3 pb-1 text-xs text-muted-foreground">
              <Target className="h-3 w-3 shrink-0" />
              <span className="truncate">{goalStatusLabel(threadGoal.status)}</span>
              {threadGoal.status !== 'complete' && (
                <span className="truncate text-muted-foreground/70">· {threadGoal.objective}</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between px-1 bg-muted/20 border-t">
            <ComposerToolbarProvider className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <ComposerMenu
                  onImagesSelected={(paths) => setImages((prev) => [...prev, ...paths])}
                  onFilesSelected={appendFileLinks}
                  onInsertMention={handleInsertMention}
                />
                <AccessModePopover />
                {/* Draft mode: entering a new goal, not yet set on the thread. */}
                {goalEnabled && !threadGoal && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setGoalEnabled(false)}
                    title="Cancel goal draft"
                    className="group relative ml-1 h-8 w-8 text-blue-600 hover:bg-blue-50"
                  >
                    {/* Target Icon: Visible by default, shrinks/fades on hover */}
                    <Target className="h-4 w-4 transition-all duration-200 group-hover:scale-0 group-hover:opacity-0" />

                    {/* X Icon: Hidden by default, grows/fades in on hover */}
                    <X className="absolute h-4 w-4 scale-0 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100" />
                  </Button>
                )}
                {/* A goal is actually set on the thread: allow pause/resume and clear
                    based on its real status, matching /goal pause|resume|clear in the TUI. */}
                {threadGoal && (
                  <>
                    {(threadGoal.status === 'active' || threadGoal.status === 'paused') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleToggleGoalPause}
                        title={threadGoal.status === 'active' ? 'Pause goal' : 'Resume goal'}
                        className="ml-1 h-8 w-8 text-blue-600 hover:bg-blue-50"
                      >
                        {threadGoal.status === 'active' ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleClearGoal}
                      title="Clear goal"
                      className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ContextWindowWidget />
                <ModelReasonSelector />
                <DictationButton
                  onTranscript={(text) => {
                    setInputValue(inputValue ? `${inputValue} ${text}` : text);
                  }}
                />
                {threadStatus?.type === 'active' ? (
                  <Button
                    onClick={handleStop}
                    variant="destructive"
                    size="icon"
                    className="h-10 w-10 md:h-8 md:w-8 rounded-full"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!inputValue.trim() && images.length === 0}
                    size="icon"
                    className="h-10 w-10 md:h-8 md:w-8 rounded-full"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </ComposerToolbarProvider>
          </div>
        </div>
      </form>
      <SlashCommandDialogs open={slashDialog} onClose={() => setSlashDialog(null)} />
    </div>
  );
}
