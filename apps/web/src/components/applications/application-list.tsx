import type { ApplicationListView } from "@/api/mappers/application";
import { DataListCell, DataListHeader, DataListName, DataListRow } from "@/components/branded";
import { ServiceChips } from "./service-chips";
import { SyncStatus } from "./sync-status";

const APPLICATION_COLUMNS = "grid-cols-[minmax(160px,1fr)_minmax(200px,1.2fr)_minmax(160px,1fr)_minmax(160px,1fr)_72px]";

const LABELS = ["Name", "Services", "Repository", "Stackfile sync", "Tasks"];

export function ApplicationList({ applications, onOpen }: { applications: ApplicationListView[]; onOpen: (application: ApplicationListView) => void }) {
  return (
    <div data-slot="application-list">
      <DataListHeader columns={APPLICATION_COLUMNS} labels={LABELS} />
      {applications.map((application) => (
        <DataListRow key={application.id} columns={APPLICATION_COLUMNS} label={application.name} onActivate={() => onOpen(application)}>
          <DataListName name={application.name} secondary={application.slug} mono={false} />
          <ServiceChips chips={application.chips} />
          <DataListCell mono>{application.repositoryFullName}</DataListCell>
          <SyncStatus sync={application.sync} />
          <DataListCell numeric>{application.taskCount}</DataListCell>
        </DataListRow>
      ))}
    </div>
  );
}
