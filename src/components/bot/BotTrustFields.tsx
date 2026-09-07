import { X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import type { BotTrustLevel } from '@/services/apiAdapt/bots';
import { TRUST_LEVELS } from './botAgentDef';

interface BotTrustFieldsProps {
  trustLevel: BotTrustLevel;
  onTrustLevelChange: (level: BotTrustLevel) => void;
  approvedTools: string[];
  onApprovedToolsChange: (tools: string[]) => void;
}

/** How much the bot may do on its own, and the tools it never asks about. */
export function BotTrustFields({
  trustLevel,
  onTrustLevelChange,
  approvedTools,
  onApprovedToolsChange,
}: BotTrustFieldsProps) {
  return (
    <>
      <div className="space-y-1">
        <Label>Trust</Label>
        <div className="space-y-1">
          {TRUST_LEVELS.map((level) => (
            <button
              type="button"
              key={level.id}
              onClick={() => onTrustLevelChange(level.id)}
              className={`flex w-full flex-col items-start rounded-md border px-3 py-2 text-left ${
                trustLevel === level.id ? 'border-primary bg-accent/60' : 'border-border'
              }`}
            >
              <span className="text-sm font-medium">{level.label}</span>
              <span className="text-xs text-muted-foreground">{level.description}</span>
            </button>
          ))}
        </div>
      </div>

      {approvedTools.length > 0 && (
        <div className="space-y-1">
          <Label>Always allowed</Label>
          <div className="flex flex-wrap gap-1">
            {approvedTools.map((tool) => (
              <span
                key={tool}
                className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
              >
                {tool}
                <button
                  type="button"
                  aria-label={`Stop always allowing ${tool}`}
                  onClick={() => onApprovedToolsChange(approvedTools.filter((t) => t !== tool))}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
