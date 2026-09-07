import { Loader2, Terminal } from 'lucide-react';
import { useState } from 'react';
import { refreshAcpAgents } from '@/components/acp/useAcpAgents';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { acpInstallAgent } from '@/services/apiAdapt/acp';
import { useBotUiStore } from '@/stores/useBotUiStore';

/**
 * Shown in the composer's place while keke cannot run, so the Bot tab explains
 * itself where the user is already looking instead of through a toast.
 */
export function BotKekeInstall({ botName }: { botName: string }) {
  const setKekeSpawnFailed = useBotUiStore((s) => s.setKekeSpawnFailed);
  const [installing, setInstalling] = useState(false);

  const install = async () => {
    setInstalling(true);
    try {
      const agent = await acpInstallAgent('keke');
      console.log('bot: keke install finished', agent);
      await refreshAcpAgents();
      // A fresh install means a fresh PATH lookup is worth trusting again.
      if (agent.local) setKekeSpawnFailed(false);
      else toast({ title: 'keke installed, but is still not on PATH', variant: 'destructive' });
    } catch (e) {
      toast({ title: 'Could not install keke', description: String(e), variant: 'destructive' });
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="shrink-0 border-t bg-background p-3">
      <div className="flex items-center gap-3 rounded-2xl border border-dashed px-3 py-3 text-sm text-muted-foreground">
        <Terminal className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">
          {botName} runs on the{' '}
          <a
            href="https://github.com/milisp/keke"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline"
          >
            keke
          </a>{' '}
          agent, which isn't installed yet.
        </span>
        <Button size="sm" className="shrink-0" disabled={installing} onClick={() => void install()}>
          {installing && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          {installing ? 'Installing...' : 'Install keke'}
        </Button>
      </div>
    </div>
  );
}
