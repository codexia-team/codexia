import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserInput } from '@/bindings/v2';
import { useEventPreferencesStore } from '@/components/codex/stores';
import { AddToTodo, CopyButton } from '@/components/common';
import { Markdown } from '@/components/Markdown';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { fileSrc } from '@/hooks/runtime';
import { useWindowFocus } from '@/hooks/useWindowFocus';
import { codexService } from '@/services/codexService';
import { useInputStore } from '@/stores';
import { getErrorMessage } from '@/utils/errorUtils';
import { EditRollbackConfirmDialog } from './EditRollbackConfirmDialog';

type UserMessageItemProps = {
  content: Array<UserInput>;
  onEdit?: (text: string) => void | Promise<void>;
  editDisabled?: boolean;
};

export const UserMessageItem = ({
  content,
  onEdit,
  editDisabled = false,
}: UserMessageItemProps) => {
  const { t } = useTranslation('thread');
  const isWindowFocused = useWindowFocus();
  const images = content.filter((m) => m.type === 'image').map((m) => m.url);
  const localImages = content.filter((m) => m.type === 'localImage').map((m) => fileSrc(m.path));
  const text = content
    .filter((m) => m.type === 'text')
    .map((m) => m.text)
    .join('');
  const canEdit = !!onEdit && text.length > 0 && !editDisabled;

  const handleEdit = async () => {
    if (!canEdit || !onEdit) return;
    await onEdit(text);
  };

  return (
    <div className="flex justify-end min-w-0">
      <div className="group flex w-full min-w-0 max-w-full flex-col items-end gap-1">
        <div className="box-border flex w-fit min-w-0 max-w-full self-end flex-col gap-2 break-words rounded-md border bg-gray-100 p-2 dark:bg-gray-700">
          {(images.length > 0 || localImages.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {images.map((src, index) => (
                <img
                  // biome-ignore lint/suspicious/noArrayIndexKey: the same image may be attached twice, so src is not unique
                  key={`remote-${index}`}
                  src={src}
                  alt={`Uploaded ${index + 1}`}
                  className="max-w-full max-h-48 rounded object-contain"
                />
              ))}
              {localImages.map((src, index) => (
                <img
                  // biome-ignore lint/suspicious/noArrayIndexKey: the same image may be attached twice, so src is not unique
                  key={`local-${index}`}
                  src={src}
                  alt={`Uploaded ${index + 1}`}
                  className="max-w-full max-h-48 rounded object-contain"
                />
              ))}
            </div>
          )}
          {text.length > 0 && <Markdown className="min-w-0 max-w-full" value={text} />}
        </div>
        <div
          className={`flex min-w-0 items-center gap-1 px-1 ${
            isWindowFocused
              ? 'invisible group-hover:visible group-focus-within:visible'
              : 'invisible'
          }`}
        >
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEdit}
              disabled={!canEdit}
              aria-label={t('userMessage.edit')}
              className="h-6 w-6 text-muted-foreground"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <CopyButton text={text} />
          <AddToTodo text={text} />
        </div>
      </div>
    </div>
  );
};

type EditableUserMessageItemProps = {
  content: Array<UserInput>;
  threadId: string;
  rollbackTurns: number;
};

export const EditableUserMessageItem = ({
  content,
  threadId,
  rollbackTurns,
}: EditableUserMessageItemProps) => {
  const { t } = useTranslation('thread');
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { hasConfirmedEditRollback, setHasConfirmedEditRollback } = useEventPreferencesStore();

  const applyEdit = async (text: string) => {
    if (rollbackTurns > 0) {
      await codexService.threadRollback(threadId, rollbackTurns);
    }
    useInputStore.getState().setInputValue(text);
  };

  const handleEdit = async (text: string) => {
    try {
      if (hasConfirmedEditRollback) {
        await applyEdit(text);
        return;
      }
      setPendingText(text);
    } catch (error) {
      console.error('Failed to edit from user message:', error);
      toast.error(t('userMessage.editFailed'), {
        description: getErrorMessage(error),
      });
    }
  };

  const handleConfirmEdit = async () => {
    if (!pendingText) return;
    try {
      setSubmitting(true);
      await applyEdit(pendingText);
      setHasConfirmedEditRollback(true);
      setPendingText(null);
    } catch (error) {
      console.error('Failed to edit from user message:', error);
      toast.error(t('userMessage.editFailed'), {
        description: getErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <UserMessageItem content={content} editDisabled={false} onEdit={handleEdit} />
      <EditRollbackConfirmDialog
        open={pendingText !== null}
        submitting={submitting}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setPendingText(null);
          }
        }}
        onConfirm={() => {
          void handleConfirmEdit();
        }}
      />
    </>
  );
};
