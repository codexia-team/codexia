import type { PluginDetail } from '@/bindings/v2';
import { Badge } from '@/components/ui/badge';
import { fileSrc } from '@/hooks/runtime';

interface SkillsSectionProps {
  skills: PluginDetail['skills'];
}

export function SkillsSection({ skills }: SkillsSectionProps) {
  if (!skills || skills.length === 0) return null;
  return (
    <>
      <h4 className="text-sm font-medium">Skills ({skills.length})</h4>
      <div className="space-y-1">
        {skills.map((skill) => (
          <div
            key={skill.name}
            className="flex items-center justify-between p-2 rounded border bg-muted/30"
          >
            <div className="flex items-center gap-2">
              {skill.interface?.iconSmall && (
                <img
                  src={fileSrc(skill.interface.iconSmall)}
                  alt=""
                  className="h-6 w-6 rounded object-cover"
                />
              )}
              <div>
                <p className="text-sm font-medium">{skill.interface?.displayName ?? skill.name}</p>
                <p className="text-xs text-muted-foreground">
                  {skill.shortDescription ?? skill.description}
                </p>
              </div>
            </div>
            <Badge variant={skill.enabled ? 'default' : 'secondary'} className="text-xs">
              {skill.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        ))}
      </div>
    </>
  );
}
