import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import {
  type AcpConfigOption,
  acpPrompt,
  acpSetConfigOption,
  acpSetMode,
} from '@/services/apiAdapt/acp';
import { useAcpStore } from '@/stores/useAcpStore';

type ControlOption = { value: string; name: string; description?: string };

function ControlSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: ControlOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className="h-7 w-auto min-w-20 border-0 bg-transparent text-xs shadow-none gap-1"
        title={label}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {/* Name the control here rather than in the trigger — the toolbar is
            tight, and the label only matters while choosing. */}
        <SelectGroup>
          <SelectLabel>{label}</SelectLabel>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} title={o.description}>
              {o.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

/**
 * Approval mode for Grok, which implements neither `session/set_mode` nor
 * `modes` on `session/new` — its only session-scoped switch is the
 * `always-approve` slash command, sent as prompt text. There is no way to read
 * the current value back, so the selection is tracked locally — keyed on the
 * session so a new one starts back on ask.
 */
function GrokApprovalSelect({
  connectionId,
  sessionId,
}: {
  connectionId: string;
  sessionId: string;
}) {
  const running = useAcpStore((s) => s.running);
  const [value, setValue] = useState('ask');

  return (
    <ControlSelect
      label="Approval"
      value={value}
      disabled={running}
      options={[
        { value: 'ask', name: 'Ask', description: 'Prompt before each tool call' },
        { value: 'yolo', name: 'Always approve', description: 'Skip all permission prompts' },
      ]}
      onChange={async (next) => {
        const previous = value;
        setValue(next);
        try {
          await acpPrompt(
            connectionId,
            sessionId,
            `/always-approve ${next === 'yolo' ? 'on' : 'off'}`
          );
        } catch (e) {
          setValue(previous);
          toast({
            title: 'Agent rejected the change',
            description: String(e),
            variant: 'destructive',
          });
        }
      }}
    />
  );
}

/**
 * Approval-mode control for the live session, on the left of the composer
 * toolbar. Model / effort / account now live together in {@link AcpModelMenu}
 * on the right.
 *
 * Agents expose mode two ways: `configOptions` with category `'mode'` (the
 * generic mechanism, Codex adapter), or the older `modes` field (Gemini).
 * Grok reports neither, so its approval switch falls back to
 * {@link GrokApprovalSelect}.
 */
export function AcpSessionControls() {
  const {
    agentId,
    connectionId,
    sessionId,
    modes,
    configOptions,
    setCurrentMode,
    setConfigOptionValue,
  } = useAcpStore();

  if (!connectionId || !sessionId) return null;

  // Update optimistically, then roll back if the agent rejects the change
  // (e.g. Gemini refuses privileged modes in an untrusted folder).
  const apply = async (revert: () => void, request: () => Promise<void>) => {
    try {
      await request();
    } catch (e) {
      revert();
      toast({ title: 'Agent rejected the change', description: String(e), variant: 'destructive' });
    }
  };

  const changeConfigOption = (option: AcpConfigOption, value: string | boolean) => {
    const previous = option.currentValue;
    setConfigOptionValue(option.id, value);
    return apply(
      () => setConfigOptionValue(option.id, previous),
      () => acpSetConfigOption(connectionId, sessionId, option.id, value)
    );
  };

  if (configOptions.length) {
    const modeOptions = configOptions.filter((o) => o.category === 'mode');
    if (!modeOptions.length) return null;
    return (
      <div className="flex items-center gap-1">
        {modeOptions.map((option) =>
          option.type === 'boolean' ? (
            <label
              key={option.id}
              className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground"
              title={option.description}
            >
              <span>{option.name}</span>
              <Switch
                checked={option.currentValue === true}
                onCheckedChange={(checked) => changeConfigOption(option, checked)}
              />
            </label>
          ) : (
            <ControlSelect
              key={option.id}
              label={option.name}
              value={String(option.currentValue)}
              options={option.options ?? []}
              onChange={(value) => changeConfigOption(option, value)}
            />
          )
        )}
      </div>
    );
  }

  if (!modes?.availableModes.length) {
    return agentId === 'grok' ? (
      <GrokApprovalSelect key={sessionId} connectionId={connectionId} sessionId={sessionId} />
    ) : null;
  }
  return (
    <ControlSelect
      label="Mode"
      value={modes.currentModeId}
      options={modes.availableModes.map((m) => ({
        value: m.id,
        name: m.name,
        description: m.description,
      }))}
      onChange={(modeId) => {
        const previous = modes.currentModeId;
        setCurrentMode(modeId);
        return apply(
          () => setCurrentMode(previous),
          () => acpSetMode(connectionId, sessionId, modeId)
        );
      }}
    />
  );
}
