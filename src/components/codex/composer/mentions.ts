import { useCallback, useEffect, useState } from 'react';
import type { PluginSummary, SkillMetadata } from '@/bindings/v2';
import { fileSrc } from '@/hooks/runtime';
import { pluginInstalled } from '@/services';
import { codexService } from '@/services/codexService';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

/**
 * A `$` mention entry. Mirrors codex-rs `tui/src/bottom_pane/skill_popup.rs::MentionItem`
 * and is built the same way as `chat_composer.rs::mention_items()`, so the text we
 * send to the model matches what the TUI sends.
 */
export interface MentionItem {
  /** Stable key: `plugin:<name>` or `skill:<path>`. */
  key: string;
  kind: 'plugin' | 'skill';
  /** Label rendered in the popup and inside the composer chip. */
  displayName: string;
  description: string | null;
  /** Exact text handed to codex, e.g. `$spreadsheets`. */
  insertText: string;
  /** Lowercased terms the typeahead filters on. */
  searchTerms: string[];
  /** `[Plugin]` / `[Skill]`, matching the TUI category tags. */
  categoryTag: string;
  /** Plugins sort before skills, as in the TUI. */
  sortRank: number;
  /** Asset URL for the composer icon, when the plugin ships one. */
  iconSrc: string | null;
  brandColor: string | null;
  /** Starter prompts from the plugin manifest (max 3). */
  defaultPrompts: string[];
}

/** Plugin config names are `<name>@<marketplace>`; codex mentions use the left half. */
function pluginConfigName(plugin: PluginSummary): string {
  return plugin.name.split('@')[0] ?? plugin.name;
}

function pluginCapabilityDescription(plugin: PluginSummary): string | null {
  return plugin.interface?.shortDescription ?? plugin.interface?.longDescription ?? null;
}

function pluginIconSrc(plugin: PluginSummary): string | null {
  const local = plugin.interface?.composerIcon;
  if (local) {
    return fileSrc(local);
  }
  return plugin.interface?.composerIconUrl ?? null;
}

function toPluginMention(plugin: PluginSummary): MentionItem {
  const configName = pluginConfigName(plugin);
  const displayName = plugin.interface?.displayName ?? configName;
  const searchTerms = new Set([configName, plugin.name, displayName, ...plugin.keywords]);

  return {
    key: `plugin:${plugin.name}`,
    kind: 'plugin',
    displayName,
    description: pluginCapabilityDescription(plugin),
    insertText: `$${configName}`,
    searchTerms: [...searchTerms].map((term) => term.toLowerCase()),
    categoryTag: '[Plugin]',
    sortRank: 0,
    iconSrc: pluginIconSrc(plugin),
    brandColor: plugin.interface?.brandColor ?? null,
    defaultPrompts: plugin.interface?.defaultPrompt ?? [],
  };
}

function skillDisplayName(skill: SkillMetadata): string {
  return skill.interface?.displayName ?? skill.name;
}

function skillIconSrc(skill: SkillMetadata): string | null {
  const local = skill.interface?.iconSmall;
  if (local) {
    return fileSrc(local);
  }
  return skill.interface?.iconSmallUrl ?? null;
}

function toSkillMention(skill: SkillMetadata): MentionItem {
  const displayName = skillDisplayName(skill);
  const defaultPrompt = skill.interface?.defaultPrompt;

  return {
    key: `skill:${skill.path}`,
    kind: 'skill',
    displayName,
    description: skill.interface?.shortDescription ?? skill.shortDescription ?? skill.description,
    insertText: `$${skill.name}`,
    searchTerms: [skill.name, displayName].map((term) => term.toLowerCase()),
    categoryTag: '[Skill]',
    sortRank: 1,
    iconSrc: skillIconSrc(skill),
    brandColor: skill.interface?.brandColor ?? null,
    defaultPrompts: defaultPrompt ? [defaultPrompt] : [],
  };
}

/** Filter used by the `$` typeahead. An empty query matches everything. */
export function matchesMention(item: MentionItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return item.searchTerms.some((term) => term.includes(needle));
}

/**
 * Installed plugins and skills for the current workspace, merged into one
 * mention list ordered plugins-first like the TUI popup.
 */
export function useMentionItems() {
  const cwd = useWorkspaceStore((state) => state.cwd);
  const [items, setItems] = useState<MentionItem[]>([]);

  const refresh = useCallback(async () => {
    const cwds = cwd ? [cwd] : [];

    const [pluginResult, skillResult] = await Promise.allSettled([
      pluginInstalled({ cwds }),
      codexService.listSkills(cwd),
    ]);

    const mentions: MentionItem[] = [];

    if (pluginResult.status === 'fulfilled') {
      const seen = new Set<string>();
      for (const marketplace of pluginResult.value.marketplaces) {
        for (const plugin of marketplace.plugins) {
          if (!plugin.installed || !plugin.enabled || seen.has(plugin.name)) {
            continue;
          }
          seen.add(plugin.name);
          mentions.push(toPluginMention(plugin));
        }
      }
    } else {
      console.error('Failed to list installed plugins:', pluginResult.reason);
    }

    if (skillResult.status === 'fulfilled') {
      for (const entry of skillResult.value) {
        for (const skill of entry.skills) {
          if (skill.enabled) {
            mentions.push(toSkillMention(skill));
          }
        }
      }
    } else {
      console.error('Failed to list skills:', skillResult.reason);
    }

    mentions.sort((a, b) => a.sortRank - b.sortRank || a.displayName.localeCompare(b.displayName));
    setItems(mentions);
  }, [cwd]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, refresh };
}

/** Entries that ship an icon, for the composer plus menu. */
export function mentionsWithIcon(items: MentionItem[]): MentionItem[] {
  return items.filter((item) => item.iconSrc);
}
