import { CircleStop, Send, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CCPermissionModeSelect } from '@/components/cc/composer';
import { FileMentionPopover } from '@/components/common';
import { Button } from '@/components/ui/button';
import { fileSrc } from '@/hooks/runtime';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { ccInterrupt, ccSendMessage } from '@/services';
import { useAgentCenterStore, useCCInputStore } from '@/stores';
import { useCCStore } from '@/stores/cc';
import { CCAttachmentButton } from './CCAttachmentButton';
import { CCSkillsPopover } from './CCSkillsPopover';
import { CCSlashCommandPopover } from './CCSlashCommandPopover';
import { ModelSelector } from './ModelSelector';

const CC_INPUT_FOCUS_EVENT = 'cc-input-focus-request';

interface ComposerProps {
  /** When provided, overrides the normal send — called instead of creating a session. */
  overrideSend?: (text: string) => void;
  onAfterSend?: (sessionId: string, text: string) => void;
}

export function Composer({ overrideSend, onAfterSend }: ComposerProps = {}) {
  const { activeSessionId, isConnected, isLoading, addMessage, setLoading, setConnected } =
    useCCStore();
  const { inputValue: input, setInputValue: setInput } = useCCInputStore();
  const { setCurrentAgentCardId } = useAgentCenterStore();
  const { handleNewSession } = useCCSessionManager();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isComposing = useRef(false);
  const [images, setImages] = useState<string[]>([]);

  // Callback ref captures the wrapper element as soon as it mounts,
  // avoiding an extra render caused by state+effect.
  const [triggerEl, setTriggerEl] = useState<HTMLElement | null>(null);
  const wrapperRef = useCallback((node: HTMLDivElement | null) => {
    setTriggerEl(node);
  }, []);

  useEffect(() => {
    const handleFocusRequest = () => {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    };
    window.addEventListener(CC_INPUT_FOCUS_EVENT, handleFocusRequest);
    return () => window.removeEventListener(CC_INPUT_FOCUS_EVENT, handleFocusRequest);
  }, []);

  // Auto-resize textarea height to fit content
  // biome-ignore lint/correctness/useExhaustiveDependencies: input is the trigger — the effect measures the textarea after it re-renders with the new value
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [input]);

  const handleSendMessage = useCallback(
    async (messageText?: string) => {
      const text = (messageText ?? input).trim();
      if (!text || isLoading) return;

      if (overrideSend) {
        setInput('');
        overrideSend(text);
        return;
      }

      setInput('');
      const pendingImages = images;
      setImages([]);

      if (!activeSessionId) {
        await handleNewSession(text);
        const newSessionId = useCCStore.getState().activeSessionId;
        if (newSessionId) onAfterSend?.(newSessionId, text);
        return;
      }

      setCurrentAgentCardId(activeSessionId);
      addMessage({ type: 'user', text });
      setLoading(true);
      onAfterSend?.(activeSessionId, text);

      try {
        await ccSendMessage(activeSessionId, text, pendingImages);
        if (!isConnected) setConnected(true);
      } catch (error) {
        console.error('[CCInput] Failed to send message:', error);
        setLoading(false);
        addMessage({
          type: 'assistant',
          message: { content: [{ type: 'text', text: `Error: ${error}` }] },
        });
      }
    },
    [
      input,
      images,
      isLoading,
      activeSessionId,
      isConnected,
      addMessage,
      setInput,
      setLoading,
      setConnected,
      handleNewSession,
      setCurrentAgentCardId,
      onAfterSend,
      overrideSend,
    ]
  );

  const handleInterrupt = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      await ccInterrupt(activeSessionId);
    } catch (error) {
      console.error('[CCInput] Failed to interrupt:', error);
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, setLoading]);

  const handleSend = useCallback(() => {
    if (!isLoading && input.trim()) {
      handleSendMessage();
    }
  }, [isLoading, input, handleSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        if (
          isComposing.current ||
          (e.nativeEvent as KeyboardEvent & { isComposing?: boolean }).isComposing
        ) {
          return;
        }
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <>
      <div className="shrink-0">
        <div className="relative group">
          <div
            ref={wrapperRef}
            className="min-h-16 max-h-48 border border-input rounded-md bg-transparent focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:border-ring transition-[color,box-shadow]"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => {
                isComposing.current = true;
              }}
              onCompositionEnd={() => {
                setTimeout(() => {
                  isComposing.current = false;
                }, 50);
              }}
              placeholder="Ask Claude to do anything..."
              rows={1}
              className="w-full resize-none overflow-y-auto bg-transparent px-3 pt-3 pb-11 text-base md:text-sm outline-none placeholder:text-muted-foreground min-h-16 max-h-48"
            />
          </div>

          {images.length > 0 && (
            <div className="absolute left-10 bottom-11 flex items-center gap-1 px-1">
              {images.map((path, i) => (
                <div key={path} className="relative group/img">
                  <img
                    src={fileSrc(path)}
                    alt=""
                    className="h-10 w-10 object-cover rounded border border-border"
                  />
                  <button
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1 -right-1 hidden group-hover/img:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="absolute left-1 bottom-1 flex items-center gap-0.5">
            <CCAttachmentButton
              onImagesSelected={(paths) => setImages((prev) => [...prev, ...paths])}
            />
            <CCPermissionModeSelect />
          </div>

          <div className="absolute right-1 bottom-1 flex items-center gap-1.5 px-1 bg-background/50 backdrop-blur-sm rounded-md">
            <ModelSelector />
            <Button
              onClick={isLoading ? handleInterrupt : handleSend}
              size="icon"
              className="h-7 w-7"
              variant={isLoading ? 'destructive' : 'default'}
              disabled={!input.trim() && images.length === 0 && !isLoading}
            >
              {isLoading ? (
                <CircleStop className="h-3.5 w-3.5" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <CCSlashCommandPopover
        input={input}
        setInput={setInput}
        editorRef={textareaRef}
        triggerElement={triggerEl}
      />

      <CCSkillsPopover
        input={input}
        setInput={setInput}
        editorRef={textareaRef}
        triggerElement={triggerEl}
      />

      <FileMentionPopover
        input={input}
        setInput={setInput}
        editorRef={textareaRef}
        triggerElement={triggerEl}
      />
    </>
  );
}
