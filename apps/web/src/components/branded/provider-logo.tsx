import { GitBranch } from "lucide-react";
import { BrandIcon } from "./brand-icons";
import { hasBrandIcon } from "./brand-icon-registry";

/**
 * A git host's mark, off the central brand-icon registry.
 *
 * `providerId` is the registry's slug; a provider with no brand to draw
 * falls back to a generic branch glyph.
 */
export function ProviderLogo({ providerId, className }: { providerId: string; className?: string }) {
  if (!hasBrandIcon(providerId)) {
    return <GitBranch className={className} aria-hidden />;
  }
  return <BrandIcon slug={providerId} className={className} />;
}
