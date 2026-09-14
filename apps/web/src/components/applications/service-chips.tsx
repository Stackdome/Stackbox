import type { ServiceChipSet } from "@/api/mappers/application";
import { Badge } from "@/components/ui/badge";

export function ServiceChips({ chips }: { chips: ServiceChipSet }) {
  if (chips.shown.length === 0) {
    return <span className="text-meta text-fg-muted">No services yet</span>;
  }
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {chips.shown.map((name) => (
        <Badge key={name} variant="secondary">
          {name}
        </Badge>
      ))}
      {chips.more > 0 && <Badge variant="outline">+{chips.more}</Badge>}
    </div>
  );
}
