import { useState } from "react";
import type { InstanceView } from "@/api/mappers/instance";
import { EmptyState } from "@/components/branded";
import { DEFAULT_INSTANCE_FILTER, type InstanceFilter, filterInstances } from "@/components/instances/filter-instances";
import { InstanceFilters } from "@/components/instances/instance-filters";
import { InstanceList } from "@/components/instances/instance-list";

export function InstancesTab({ instances, onOpen }: { instances: InstanceView[]; onOpen: (instance: InstanceView) => void }) {
  const [filter, setFilter] = useState<InstanceFilter>(DEFAULT_INSTANCE_FILTER);
  const visible = filterInstances(instances, filter);
  return (
    <div className="flex flex-col gap-4">
      <InstanceFilters filter={filter} onChange={setFilter} applications={null} />
      {visible.length === 0 ? (
        <EmptyState title="No Application Instances here" description="Spin one up, or start a task and it prepares its own." />
      ) : (
        <InstanceList instances={visible} now={Date.now()} onOpen={onOpen} />
      )}
    </div>
  );
}
