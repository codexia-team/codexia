/** Avatars and colours a new bot is given, and the picker offers. */
export const BOT_AVATARS = ['🤖', '🐣', '🦊', '🐙', '🦉', '🐝', '🚀', '📮', '🧭', '🧪'];

export const BOT_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2'];

/** A distinct look per bot, so a new one is recognisable before it is renamed. */
export function defaultLook(index: number) {
  return {
    avatar: BOT_AVATARS[index % BOT_AVATARS.length],
    color: BOT_COLORS[index % BOT_COLORS.length],
  };
}

export function newBotId() {
  return `bot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
