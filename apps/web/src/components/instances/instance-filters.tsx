import { InstancePurpose, InstanceStatus } from "@stackbox/contract";
import { INSTANCE_STATUS_LABEL, PURPOSE_LABEL } from "@/api/mappers/instance";
import { SearchField } from "@/components/branded";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ALL, type InstanceFilter, statusPicked } from "./filter-instances";

const PURPOSE_FILTER_OPTIONS: { value: InstanceFilter["purpose"]; label: string }[] = [
  { value: ALL, label: "All" },
  ...[InstancePurpose.Task, InstancePurpose.Preview, InstancePurpose.Scratch, InstancePurpose.Persistent, InstancePurpose.LoadTest].map((purpose) => ({
    value: purpose,
    label: PURPOSE_LABEL[purpose],
  })),
];

const STATUS_FILTER_OPTIONS: { value: InstanceFilter["status"]; label: string }[] = [
  { value: ALL, label: "All statuses" },
  ...Object.values(InstanceStatus).map((status) => ({ value: status, label: INSTANCE_STATUS_LABEL[status] })),
];

export function InstanceFilters({
  filter,
  onChange,
  applications,
}: {
  filter: InstanceFilter;
  onChange: (next: InstanceFilter) => void;
  applications: { id: string; name: string }[] | null;
}) {
  const set = (patch: Partial<InstanceFilter>) => onChange({ ...filter, ...patch });
  return (
    <div data-slot="instance-filters" className="flex min-w-0 flex-wrap items-center gap-2">
      <SearchField value={filter.q} onChange={(q) => set({ q })} placeholder="Search instances" label="Search instances" className="w-60" />
      {applications && (
        <Select value={filter.applicationId} onValueChange={(applicationId) => set({ applicationId })}>
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
      )}
      <SegmentedControl aria-label="Purpose" size="sm" options={PURPOSE_FILTER_OPTIONS} value={filter.purpose} onValueChange={(purpose) => set({ purpose })} />
      <Select
        value={filter.status}
        onValueChange={(status) => onChange(statusPicked(filter, STATUS_FILTER_OPTIONS.find((option) => option.value === status)?.value ?? ALL))}
      >
        <SelectTrigger aria-label="Status" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label className="flex items-center gap-2 text-body text-fg-2">
        <Switch checked={filter.showTornDown} onCheckedChange={(showTornDown) => set({ showTornDown })} />
        Show torn down
      </label>
    </div>
  );
}
