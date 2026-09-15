import { type InstanceExpiryHours, InstancePurpose, InstanceStatus } from "@stackbox/contract";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { extendExpiryErrorMessage, releaseErrorMessage, teardownErrorMessage } from "@/api/errors";
import { INSTANCE_STATUS_LABEL, isRunning } from "@/api/mappers/instance";
import { useApplications } from "@/api/use-applications";
import { useInstanceDetail } from "@/api/use-instance-detail";
import { useSpinUp } from "@/api/use-instances";
import { EmptyState, EndpointPills, PageHeader, StatusPill, useConfirm } from "@/components/branded";
import { statusVariant } from "@/components/branded/status-variant";
import { ExtendExpiryMenu } from "@/components/instance-detail/extend-expiry-menu";
import { InstanceDetail } from "@/components/instance-detail/instance-detail";
import { ExpiryText, PurposeChip } from "@/components/instances/instance-cells";
import { SpinUpDrawer } from "@/components/instances/spin-up-drawer";
import { spinUpPurposeOf } from "@/components/instances/spin-up-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { useCurrentUser } from "@/hooks/use-current-user";
import { applicationPath, instancePath } from "@/lib/routes";

export function InstanceDetailPage() {
  const { instanceId = "" } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { organisationId, isOrgAdmin } = useCurrentUser();
  const { setCustomLabel } = useBreadcrumb();
  const { data, loading, refresh, deploy, teardown, extendExpiry } = useInstanceDetail(organisationId, instanceId);
  const { applications } = useApplications(organisationId);
  const spinUp = useSpinUp(organisationId);
  const [deploying, setDeploying] = useState(false);
  const [spinUpOpen, setSpinUpOpen] = useState(false);

  useEffect(() => {
    if (data) setCustomLabel(pathname, data.identifier);
  }, [data, pathname, setCustomLabel]);

  async function startDeploy() {
    setDeploying(true);
    try {
      await deploy();
    } catch (error) {
      toast({ title: releaseErrorMessage(error) });
    } finally {
      setDeploying(false);
    }
  }

  async function pickExpiry(hours: InstanceExpiryHours) {
    try {
      await extendExpiry(hours);
    } catch (error) {
      toast({ title: extendExpiryErrorMessage(error) });
    }
  }

  async function askToTearDown() {
    if (!data) return;
    const confirmed = await confirm({
      title: `Tear down ${data.identifier}?`,
      description: `The ${data.application.name} instance ${data.identifier} stops, and its URL stops answering.`,
      confirmLabel: "Tear down",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      await teardown();
    } catch (error) {
      toast({ title: teardownErrorMessage(error) });
    }
  }

  if (loading) return <Skeleton className="h-64" />;
  if (!data) {
    return (
      <EmptyState
        title="This Application Instance did not load"
        description="Check the connection and try again."
        action={<Button variant="outline" onClick={() => void refresh()}>Try again</Button>}
      />
    );
  }

  const now = Date.now();
  const expired = data.status === InstanceStatus.Expired;
  const canExtend = isOrgAdmin && isRunning(data.status) && data.purpose !== InstancePurpose.Persistent;

  return (
    <>
      <PageHeader
        identity={
          <span className="flex min-w-0 items-center gap-2">
            <Link to={applicationPath(data.application.id)} className="text-meta text-fg-2 underline-offset-2 hover:underline">
              {data.application.name}
            </Link>
            <PurposeChip purpose={data.purpose} />
            {data.url && <EndpointPills urls={[{ resource: data.identifier, url: data.url }]} />}
            <ExpiryText expiresAt={data.expiresAt} now={now} />
          </span>
        }
        status={
          <StatusPill data-slot="instance-status" variant={statusVariant("instance", data.status)} pulse={false}>
            {INSTANCE_STATUS_LABEL[data.status]}
          </StatusPill>
        }
        actions={
          <>
            {canExtend && <ExtendExpiryMenu onPick={(hours) => void pickExpiry(hours)} />}
            {expired && (
              <Button variant="outline" onClick={() => setSpinUpOpen(true)}>
                Spin up again
              </Button>
            )}
            {isOrgAdmin && data.status !== InstanceStatus.TornDown && (
              <Button variant="destructive-ghost" onClick={() => void askToTearDown()}>
                Tear down
              </Button>
            )}
          </>
        }
      />
      <InstanceDetail detail={data} now={now} deploying={deploying} onDeploy={isOrgAdmin ? () => void startDeploy() : undefined} />
      {spinUpOpen && (
        <SpinUpDrawer
          open
          onOpenChange={setSpinUpOpen}
          applications={applications}
          initial={{
            application: { id: data.application.id, name: data.application.name, defaultBranch: data.repository.defaultBranch },
            locked: true,
            purpose: spinUpPurposeOf(data.purpose),
            ref: data.releases[0]?.ref ?? data.repository.defaultBranch,
          }}
          onSubmit={async (draft) => {
            const id = await spinUp(draft);
            setSpinUpOpen(false);
            navigate(instancePath(id));
          }}
        />
      )}
    </>
  );
}
