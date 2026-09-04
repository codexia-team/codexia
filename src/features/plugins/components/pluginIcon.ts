import type { PluginSummary } from '@/bindings/v2';
import { fileSrc } from '@/hooks/runtime';

/** Prefer logo over composerIcon, and local files over catalog URLs. */
export function pluginIconSrc(plugin: PluginSummary): string | null {
  const iface = plugin.interface;
  if (!iface) return null;

  if (iface.logo) return fileSrc(iface.logo);
  if (iface.composerIcon) return fileSrc(iface.composerIcon);
  return iface.logoUrl ?? iface.composerIconUrl ?? null;
}
