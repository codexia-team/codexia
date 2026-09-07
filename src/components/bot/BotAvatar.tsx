import type { Bot } from '@/services/apiAdapt/bots';

const SIZES = {
  sm: 'h-7 w-7 text-sm',
  md: 'h-9 w-9 text-base',
  lg: 'h-11 w-11 text-xl',
} as const;

interface BotAvatarProps {
  bot: Pick<Bot, 'avatar' | 'color' | 'name'>;
  size?: keyof typeof SIZES;
  /** Draws the ring that marks a bot whose agent process is live. */
  running?: boolean;
  className?: string;
}

export function BotAvatar({ bot, size = 'md', running, className }: BotAvatarProps) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full text-white ${
        SIZES[size]
      } ${running ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-background' : ''} ${
        className ?? ''
      }`}
      style={{ backgroundColor: bot.color }}
      title={bot.name}
      aria-hidden
    >
      {bot.avatar}
    </span>
  );
}
