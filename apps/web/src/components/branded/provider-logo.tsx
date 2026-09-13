import { BrandIcon } from "./brand-icons";
import type { ProviderId } from "./brand-icon-registry";

/** A git host's mark, off the central brand-icon registry. */
export function ProviderLogo({ providerId, className }: { providerId: ProviderId; className?: string }) {
  return <BrandIcon slug={providerId} className={className} />;
}
