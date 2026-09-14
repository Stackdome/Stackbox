import type { ApplicationListView } from "@/api/mappers/application";
import { CardFooterMeta, CardMetaGrid, StatusText } from "@/components/branded";
import { ServiceChips } from "./service-chips";

export function ApplicationCards({ applications, onOpen }: { applications: ApplicationListView[]; onOpen: (application: ApplicationListView) => void }) {
  return (
    <div data-slot="application-cards" className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      {applications.map((application) => (
        <div
          key={application.id}
          role="link"
          tabIndex={0}
          aria-label={application.name}
          onClick={() => onOpen(application)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onOpen(application);
          }}
          className="flex cursor-pointer flex-col gap-4 rounded-xl bg-card p-4 shadow-sm outline-1 outline-border-subtle transition-colors hover:bg-[var(--wash-hover)] focus-ring-edge"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-name font-medium">{application.name}</span>
            <StatusText domain="stackfile_sync" state={application.sync.status} />
          </div>
          <ServiceChips chips={application.chips} />
          <CardMetaGrid
            rows={[
              { label: "REPOSITORY", value: application.repositoryFullName },
              { label: "STACKFILE", value: application.sync.line ?? application.stackfilePath },
            ]}
          />
          <CardFooterMeta tone="neutral" word={application.tasksLabel} />
        </div>
      ))}
    </div>
  );
}
