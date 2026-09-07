import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BOT_AVATARS, BOT_COLORS } from './botDefaults';

interface BotIdentityFieldsProps {
  name: string;
  onNameChange: (value: string) => void;
  title: string;
  onTitleChange: (value: string) => void;
  avatar: string;
  onAvatarChange: (value: string) => void;
  color: string;
  onColorChange: (value: string) => void;
  cwd: string;
  onCwdChange: (value: string) => void;
}

/** Who the bot is and where it works: name, role, look and workspace. */
export function BotIdentityFields({
  name,
  onNameChange,
  title,
  onTitleChange,
  avatar,
  onAvatarChange,
  color,
  onColorChange,
  cwd,
  onCwdChange,
}: BotIdentityFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="bot-name">Name</Label>
          <Input id="bot-name" value={name} onChange={(e) => onNameChange(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bot-title">Role</Label>
          <Input
            id="bot-title"
            value={title}
            placeholder="What it does"
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Avatar</Label>
        <div className="flex flex-wrap gap-1">
          {BOT_AVATARS.map((emoji) => (
            <button
              type="button"
              key={emoji}
              onClick={() => onAvatarChange(emoji)}
              className={`flex h-8 w-8 items-center justify-center rounded-md border text-base ${
                avatar === emoji ? 'border-primary bg-accent' : 'border-transparent'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 pt-1">
          {BOT_COLORS.map((hex) => (
            <button
              type="button"
              key={hex}
              aria-label={`Colour ${hex}`}
              onClick={() => onColorChange(hex)}
              style={{ backgroundColor: hex }}
              className={`h-6 w-6 rounded-full ${
                color === hex ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
              }`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="bot-cwd">Workspace</Label>
        <Input
          id="bot-cwd"
          value={cwd}
          placeholder="/path/to/project"
          onChange={(e) => onCwdChange(e.target.value)}
        />
      </div>
    </>
  );
}
