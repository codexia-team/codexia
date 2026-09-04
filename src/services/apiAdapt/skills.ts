import type { SkillsListResponse } from '@/bindings/v2';

import {
  type InstalledSkillItem,
  type MarketplaceSkillItem,
  postJson,
  type SkillScope,
} from './shared';

export type MarketSkillItem = {
  id: string;
  source: string;
  skillId: string;
  name: string;
  installs: number;
};

export type CentralSkillItem = {
  name: string;
  path: string;
  description?: string | null;
  linkedCodex: boolean;
  linkedCc: boolean;
};

export async function skillList(cwd: string) {
  return await postJson<SkillsListResponse>('/api/codex/skills/list', {
    cwds: [cwd],
  });
}

export async function cloneSkillsRepo(url: string) {
  return await postJson<string>('/api/skills/clone-repo', { url });
}

export async function listMarketplaceSkills() {
  return await postJson<Array<MarketplaceSkillItem>>('/api/skills/list-marketplace', {});
}

export async function listCentralSkills(scope: SkillScope, cwd?: string) {
  return await postJson<Array<CentralSkillItem>>('/api/skills/list-central', { scope, cwd });
}

export async function listInstalledSkills(selectedAgent: string, scope: SkillScope, cwd?: string) {
  return await postJson<Array<InstalledSkillItem>>('/api/skills/list-installed', {
    selected_agent: selectedAgent,
    scope,
    cwd,
  });
}

export async function installMarketplaceSkill(
  skillMdPath: string,
  skillName: string,
  selectedAgent: string,
  scope: SkillScope,
  cwd?: string
) {
  return await postJson<string>('/api/skills/install-marketplace', {
    skill_md_path: skillMdPath,
    skill_name: skillName,
    selected_agent: selectedAgent,
    scope,
    cwd,
  });
}

export async function linkSkillToAgent(
  skillName: string,
  agent: string,
  scope: SkillScope,
  cwd?: string
) {
  return await postJson<void>('/api/skills/link-to-agent', {
    skill_name: skillName,
    agent,
    scope,
    cwd,
  });
}

export async function uninstallInstalledSkill(
  skillName: string,
  selectedAgent: string,
  scope: SkillScope,
  cwd?: string
) {
  return await postJson<string>('/api/skills/uninstall-installed', {
    skill_name: skillName,
    selected_agent: selectedAgent,
    scope,
    cwd,
  });
}

export async function deleteCentralSkill(skillName: string, scope: SkillScope, cwd?: string) {
  return await postJson<void>('/api/skills/delete-central', { skill_name: skillName, scope, cwd });
}

export async function fetchMarketLeaderboard(board: 'alltime' | 'trending' | 'hot') {
  return await postJson<Array<MarketSkillItem>>('/api/skillssh/leaderboard', { board });
}

export async function searchMarketSkills(query: string, limit = 40) {
  return await postJson<Array<MarketSkillItem>>('/api/skillssh/search', { query, limit });
}

export async function installFromMarket(
  source: string,
  skillId: string,
  scope: SkillScope,
  cwd?: string
) {
  return await postJson<string>('/api/skillssh/install', { source, skill_id: skillId, scope, cwd });
}

export type SkillGroup = { id: string; name: string; skillNames: string[] };
export type SkillGroupsConfig = { groups: SkillGroup[] };

export async function readSkillGroups(): Promise<SkillGroupsConfig> {
  return await postJson<SkillGroupsConfig>('/api/skills/groups/read', {});
}

export async function writeSkillGroups(config: SkillGroupsConfig): Promise<void> {
  return await postJson<void>('/api/skills/groups/write', { config });
}

export async function skillsConfigWrite(path: string, enabled: boolean) {
  return await postJson('/api/codex/skills/config/write', {
    path,
    enabled,
  });
}
