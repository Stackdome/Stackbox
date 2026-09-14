import { ServiceKind } from "@stackbox/contract";
import { Box, FolderGit2, type LucideIcon } from "lucide-react";
import { SERVICE_KIND_LABEL } from "@/api/mappers/application";

const GLYPH: Record<ServiceKind, LucideIcon> = {
  [ServiceKind.Source]: FolderGit2,
  [ServiceKind.Image]: Box,
};

export function ServiceKindGlyph({ kind }: { kind: ServiceKind }) {
  const Glyph = GLYPH[kind];
  return <Glyph role="img" aria-label={SERVICE_KIND_LABEL[kind]} className="size-4 flex-none text-fg-muted" />;
}
