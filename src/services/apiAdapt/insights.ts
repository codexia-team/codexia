import { postJson } from './shared';

export interface DayActivity {
  date: string;
  count: number;
  size: number;
}

export interface ToolCallStats {
  tool_name: string;
  count: number;
}

export interface TokenStats {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  reasoning_tokens?: number;
  total_tokens: number;
}

export interface HeatmapData {
  agent: string;
  data: DayActivity[];
  max_count: number;
  total_files: number;
  total_size: number;
  tool_calls: ToolCallStats[];
  token_stats: TokenStats;
  /** Unique model names seen, sorted by frequency */
  models: string[];
}

export interface AgentHeatmaps {
  claude: HeatmapData | null;
  codex: HeatmapData | null;
  gemini: HeatmapData | null;
}

export interface InsightFilters {
  range?: string; // "day" | "week" | "month" | "year" | "all"
  cwd?: string;
  session_id?: string;
  agent?: string; // "Claude" | "Codex" | "Gemini"
}

export interface FilterOptions {
  cwds: string[];
  session_ids: string[];
}

export async function getAgentHeatmaps(filters: InsightFilters): Promise<AgentHeatmaps> {
  return await postJson<AgentHeatmaps>('/api/insights/heatmaps', {
    range: filters.range ?? null,
    cwd: filters.cwd ?? null,
    session_id: filters.session_id ?? null,
    agent: filters.agent ?? null,
  });
}

export async function getInsightFilterOptions(): Promise<FilterOptions> {
  return await postJson<FilterOptions>('/api/insights/filter-options');
}

export interface RankItem {
  key: string;
  sessions: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  agents: string[];
}

export interface Rankings {
  by_cwd: RankItem[];
  by_session: RankItem[];
}

export async function getInsightRankings(filters: InsightFilters): Promise<Rankings> {
  return await postJson<Rankings>('/api/insights/rankings', {
    range: filters.range ?? null,
    cwd: filters.cwd ?? null,
    session_id: filters.session_id ?? null,
    agent: filters.agent ?? null,
  });
}
