import type { InstanceExpiryHours } from "@stackbox/contract";
import { EXPIRY_PRESETS, EXPIRY_PRESET_LABEL } from "@/api/mappers/instance";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ExtendExpiryMenu({ onPick }: { onPick: (hours: InstanceExpiryHours) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Extend expiry</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {EXPIRY_PRESETS.map((hours) => (
          <DropdownMenuItem key={hours} onSelect={() => onPick(hours)}>
            {EXPIRY_PRESET_LABEL[hours]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
