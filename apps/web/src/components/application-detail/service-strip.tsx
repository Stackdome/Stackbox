import type { ServiceView } from "@/api/mappers/application";
import { ServiceKindGlyph } from "@/components/applications/service-kind-glyph";

export function ServiceStrip({ services, stale }: { services: ServiceView[]; stale: boolean }) {
  if (services.length === 0) {
    return <p className="text-body text-fg-muted">No services detected yet</p>;
  }
  return (
    <ul aria-label="Service topology" className="flex flex-wrap gap-3">
      {services.map((service) => (
        <li key={service.id} className="flex min-w-[120px] flex-col items-center gap-1 rounded-lg bg-card px-3 py-3 shadow-sm outline-1 outline-border-subtle">
          <ServiceKindGlyph kind={service.kind} />
          <span className="text-body font-medium">{service.name}</span>
          <span className="max-w-[140px] truncate font-mono text-meta text-fg-muted">{service.shortSource}</span>
          {stale && <span className="text-meta text-warn">Stale</span>}
        </li>
      ))}
    </ul>
  );
}
