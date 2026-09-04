import { Loader2, MessageCircleCode, Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import type { PluginDetail } from '@/bindings/v2';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { fileSrc } from '@/hooks/runtime';
import { useExternalUrl } from '../hooks/useExternalUrl';
import { hideBrokenImage } from './imageFallback';
import {
  AppsSection,
  AppTemplatesSection,
  ExternalLinkRow,
  InfoRow,
  SkillsSection,
} from './plugin-detail';
import { pluginIconSrc } from './pluginIcon';

interface PluginDetailViewProps {
  plugin: PluginDetail;
  isInstalling?: boolean;
  isUninstalling?: boolean;
  canInstall?: boolean;
  onInstall?: () => void;
  onUninstall?: () => void;
  onUse?: () => void;
  onBack?: () => void;
}

function getPluginScreenshots(plugin: PluginDetail): string[] {
  const summary = plugin.summary;
  const iface = summary.interface;
  if (!iface) return [];

  // Prefer local screenshots, fallback to remote URLs
  if (iface.screenshots && iface.screenshots.length > 0) {
    return iface.screenshots.map((path) => fileSrc(path));
  }
  if (iface.screenshotUrls && iface.screenshotUrls.length > 0) {
    return iface.screenshotUrls;
  }
  return [];
}

export function PluginDetailView({
  plugin,
  isInstalling,
  canInstall,
  onInstall,
  onUninstall,
  onUse,
}: PluginDetailViewProps) {
  const { openExternalUrl } = useExternalUrl();

  const {
    summary: { name, installed: isInstalled, localVersion = '', interface: iface },
    skills = [],
    hooks = [],
    apps = [],
    appTemplates = [],
    mcpServers = [],
  } = plugin;

  const displayName = iface?.displayName ?? name;
  const description = iface?.shortDescription ?? name;
  const capabilities = iface?.capabilities ?? [];

  const iconSrc = useMemo(() => pluginIconSrc(plugin.summary), [plugin]);

  const screenshots = useMemo(() => getPluginScreenshots(plugin), [plugin]);

  const handleExternalLink = async (url: string) => {
    try {
      await openExternalUrl(url);
    } catch (error) {
      toast({
        title: 'Failed to open link',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="py-8">
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {iconSrc && (
            <img
              src={iconSrc}
              alt={`${displayName} icon`}
              className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
              onError={hideBrokenImage}
            />
          )}
          <div className="space-y-1 flex-1 min-w-0">
            <h2 className="text-lg font-semibold leading-none">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isInstalled ? (
            <>
              <Button size="sm" variant="destructive" onClick={onUninstall}>
                <Trash2 className="h-4 w-4" />
                Uninstall
              </Button>
              <Button size="sm" variant="default" onClick={onUse}>
                <MessageCircleCode className="h-4 w-4 mr-2" />
                Try now
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="default"
              disabled={!canInstall || isInstalling}
              onClick={onInstall}
            >
              {isInstalling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Install
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {iface?.longDescription && (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {iface.longDescription}
            </p>
          </div>
        )}

        {screenshots.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Screenshots</h4>
            <div className="grid gap-2 grid-cols-2 md:grid-cols-3">
              {screenshots.map((screenshot, index) => (
                <img
                  key={screenshot}
                  src={screenshot}
                  alt={`${displayName} screenshot ${index + 1}`}
                  className="rounded-lg object-cover aspect-video w-full"
                  loading="lazy"
                  onError={hideBrokenImage}
                />
              ))}
            </div>
          </div>
        )}

        <AppsSection apps={apps} />

        {mcpServers.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium">MCP Servers ({mcpServers.length})</h4>
            <div className="flex flex-wrap gap-1">
              {mcpServers.map((server) => (
                <div key={server} className="flex">
                  {iconSrc && (
                    <img
                      src={iconSrc}
                      alt={`${displayName} icon`}
                      className="h-6 w-6 rounded-lg object-cover flex-shrink-0"
                      onError={hideBrokenImage}
                    />
                  )}
                  {server}
                </div>
              ))}
            </div>
          </div>
        )}

        <SkillsSection skills={skills} />

        {hooks.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Hooks ({hooks.length})</h4>
            <div className="flex flex-wrap gap-1">
              {hooks.map((hook) => (
                <Badge key={hook.key} variant="outline" className="text-xs">
                  {hook.eventName}: {hook.key}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <AppTemplatesSection appTemplates={appTemplates} />

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Information</h4>

          <div className="grid grid-cols-[160px_1fr] items-center gap-y-2 text-sm border-t ">
            {localVersion && <InfoRow label="Version">v{localVersion}</InfoRow>}

            {capabilities.length > 0 && (
              <InfoRow label="Capabilities">{capabilities.join(', ')}</InfoRow>
            )}

            {iface?.websiteUrl && (
              <ExternalLinkRow
                label="Website"
                url={iface.websiteUrl}
                onClick={handleExternalLink}
              />
            )}

            {iface?.privacyPolicyUrl && (
              <ExternalLinkRow
                label="Privacy Policy"
                url={iface.privacyPolicyUrl}
                onClick={handleExternalLink}
              />
            )}

            {iface?.termsOfServiceUrl && (
              <ExternalLinkRow
                label="Terms of Service"
                url={iface.termsOfServiceUrl}
                onClick={handleExternalLink}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
