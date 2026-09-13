import { CoarseStatus } from "@stackbox/contract";
import type { Application } from "@/api/mappers/application";
import { COARSE_STATUS_LABEL } from "@/api/mappers/task";
import { SearchField } from "@/components/branded";
import { SegmentedControl, type SegmentedControlOption } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL, type TasksFilter } from "./filter-tasks";

const STATUS_OPTIONS: SegmentedControlOption<TasksFilter["status"]>[] = [
  { value: ALL, label: "All" },
  ...[CoarseStatus.NeedsYou, CoarseStatus.Running, CoarseStatus.ReadyForReview, CoarseStatus.Failed].map((status) => ({
    value: status,
    label: COARSE_STATUS_LABEL[status],
  })),
];

export function TasksToolbar({
  filter,
  onFilterChange,
  applications,
}: {
  filter: TasksFilter;
  onFilterChange: (filter: TasksFilter) => void;
  applications: Application[];
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <SearchField
        value={filter.q}
        onChange={(q) => onFilterChange({ ...filter, q })}
        placeholder="Search tasks"
        label="Search tasks"
        className="w-60"
      />
      <SegmentedControl
        aria-label="Status"
        options={STATUS_OPTIONS}
        value={filter.status}
        onValueChange={(status) => onFilterChange({ ...filter, status })}
      />
      <Select value={filter.applicationId} onValueChange={(applicationId) => onFilterChange({ ...filter, applicationId })}>
        <SelectTrigger aria-label="Application" className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All applications</SelectItem>
          {applications.map((application) => (
            <SelectItem key={application.id} value={application.id}>
              {application.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
