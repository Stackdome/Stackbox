import type { ServiceView } from "@/api/mappers/application";
import { ServiceKindGlyph } from "@/components/applications/service-kind-glyph";
import { DataListCell, DataListHeader, DataListName, DataListRow, EmptyState } from "@/components/branded";

const SERVICE_COLUMNS = "grid-cols-[minmax(120px,200px)_minmax(240px,1fr)_96px_120px]";

const LABELS = ["Name", "Source", "Kind", "Default branch"];

export function ServicesTab({ services }: { services: ServiceView[] }) {
  if (services.length === 0) {
    return <EmptyState title="No services detected" description="Re-sync once the Stackfile declares its services." />;
  }
  return (
    <div data-slot="service-list">
      <DataListHeader columns={SERVICE_COLUMNS} labels={LABELS} />
      {services.map((service) => (
        <DataListRow key={service.id} columns={SERVICE_COLUMNS}>
          <DataListName name={service.name} mono={false} />
          <DataListCell mono title={service.source}>
            {service.source}
          </DataListCell>
          <div className="flex items-center gap-2">
            <ServiceKindGlyph kind={service.kind} />
            <span className="text-meta text-fg-2">{service.kindLabel}</span>
          </div>
          <DataListCell mono>{service.defaultBranch ?? ""}</DataListCell>
        </DataListRow>
      ))}
    </div>
  );
}
