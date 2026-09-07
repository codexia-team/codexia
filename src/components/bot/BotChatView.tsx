import { Settings2 } from 'lucide-react';
import { useState } from 'react';
import { useAcpEvents } from '@/components/acp/useAcpEvents';
import { Button } from '@/components/ui/button';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useTrafficLightConfig } from '@/hooks';
import { useAcpStore } from '@/stores/useAcpStore';
import { useBotUiStore } from '@/stores/useBotUiStore';
import { BotAvatar } from './BotAvatar';
import { BotComposer } from './BotComposer';
import { BotMessageList } from './BotMessageList';
import { BotPermissionGate } from './BotPermissionGate';
import { BotSettingsDialog } from './BotSettingsDialog';
import { TRUST_LEVELS } from './botAgentDef';
import { useBotDragDrop } from './useBotDragDrop';

/** The full-screen conversation with one bot. */
export default function BotChatView() {
  const { bots, selectedBotId, connectionByBot } = useBotUiStore();
  const connectionId = useAcpStore((s) => s.connectionId);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { open: isSidebarOpen, openMobile, isMobile } = useSidebar();
  const showTrigger = isMobile ? !openMobile : !isSidebarOpen;
  const { needsTrafficLightOffset } = useTrafficLightConfig(isSidebarOpen);

  useAcpEvents(connectionId);

  const bot = bots.find((b) => b.id === selectedBotId);
  useBotDragDrop(bot);

  if (!bot) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Pick a bot, or make a new one.
      </div>
    );
  }

  const trust = TRUST_LEVELS.find((level) => level.id === bot.trustLevel);
  const running = Boolean(connectionByBot[bot.id]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header
        className="flex shrink-0 items-center gap-2 border-b py-2 pr-4"
        data-tauri-drag-region
        title="Drop a folder here to set this bot's workspace"
      >
        <div
          className={`flex shrink-0 items-center gap-2 ${
            showTrigger ? (needsTrafficLightOffset ? 'pl-20' : 'pl-2') : 'pl-4'
          }`}
        >
          {showTrigger && <SidebarTrigger />}
        </div>
        <BotAvatar bot={bot} running={running} />
        <div className="min-w-0 flex-1" data-tauri-drag-region>
          <div className="truncate text-sm font-medium" data-tauri-drag-region>
            {bot.name}
          </div>
          <div className="truncate text-xs text-muted-foreground" data-tauri-drag-region>
            {[bot.title, bot.model, trust?.label].filter(Boolean).join(' · ')}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Bot settings"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </header>

      <BotMessageList bot={bot} />
      <BotPermissionGate bot={bot} />
      <BotComposer bot={bot} />

      <BotSettingsDialog bot={bot} open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
