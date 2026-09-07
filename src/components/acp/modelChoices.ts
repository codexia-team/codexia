import type { AcpModelState } from '@/services/apiAdapt/acp';

export type ChoiceOption = {
  value: string;
  name: string;
  description?: string;
  effort: string | null;
};

/** Model id and reasoning effort share one select value. */
export const EFFORT_SEPARATOR = '::';
export const effortKey = (modelId: string, effort: string | null) =>
  effort ? `${modelId}${EFFORT_SEPARATOR}${effort}` : modelId;

/**
 * Effort belongs to a model, so expand each model that offers levels into one
 * entry per level rather than pairing the picker with a second menu. Only the
 * legacy `models` mechanism (Grok/Gemini) needs this — `configOptions` keeps
 * model and effort as separate options already.
 */
export function modelChoicesFor(models: AcpModelState | null): ChoiceOption[] {
  return (models?.availableModels ?? []).flatMap<ChoiceOption>((m) => {
    const efforts = m._meta?.reasoningEfforts ?? [];
    if (!efforts.length) {
      return [{ value: m.modelId, name: m.name, description: m.description, effort: null }];
    }
    return efforts.map((e) => ({
      value: effortKey(m.modelId, e.id),
      name: `${m.name} · ${(e.label ?? e.id).replace(/\s*effort$/i, '')}`,
      description: e.description ?? m.description,
      effort: e.id,
    }));
  });
}
