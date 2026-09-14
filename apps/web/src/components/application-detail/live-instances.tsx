import { Link } from "react-router-dom";
import type { InstanceView } from "@/api/mappers/instance";
import { StatusText } from "@/components/branded";
import { InstanceUrlLink } from "@/components/instances/instance-cells";
import { instancePath } from "@/lib/routes";

export function LiveInstances({ instances }: { instances: InstanceView[] }) {
  return (
    <section aria-label="Live instances" className="flex flex-col gap-3">
      <h2 className="text-name font-medium">Live instances</h2>
      {instances.length === 0 ? (
        <p className="text-body text-fg-muted">No live instances</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {instances.map((instance) => (
            <li key={instance.id} className="flex min-w-0 items-center gap-2">
              <Link to={instancePath(instance.id)} className="truncate text-body font-medium text-foreground underline-offset-2 hover:underline">
                {instance.identifier}
              </Link>
              <StatusText domain="instance" state={instance.status} />
              {instance.url && <InstanceUrlLink url={instance.url} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
