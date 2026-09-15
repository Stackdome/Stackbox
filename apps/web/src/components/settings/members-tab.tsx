import type { UserRole } from "@stackbox/contract";
import { useState } from "react";
import { REMOVE_MEMBER_ERROR, REVOKE_INVITE_ERROR, ROLE_CHANGE_ERROR, settingsErrorMessage } from "@/api/errors";
import type { InviteView, MemberView } from "@/api/mappers/organization";
import { useMembers } from "@/api/use-settings";
import { EmptyState, PageHeader, useConfirm } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { InviteDrawer } from "./invite-drawer";
import { MemberList, PendingInviteList } from "./member-list";

export function MembersTab() {
  const { organisationId, user } = useCurrentUser();
  const confirm = useConfirm();
  const { members, invites, loading, failed, refresh, changeRole, remove, invite, revokeInvite } = useMembers(organisationId, user?.id ?? null);
  const [inviteOpen, setInviteOpen] = useState(false);

  async function pickRole(member: MemberView, role: UserRole) {
    try {
      await changeRole(member.id, role);
    } catch (error) {
      toast({ title: settingsErrorMessage(error, ROLE_CHANGE_ERROR) });
    }
  }

  async function askToRemove(member: MemberView) {
    const confirmed = await confirm({
      title: `Remove ${member.name}?`,
      description: `${member.name} loses access to this organization and is signed out everywhere. Their API tokens stop working.`,
      confirmLabel: "Remove",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      await remove(member.id);
    } catch (error) {
      toast({ title: settingsErrorMessage(error, REMOVE_MEMBER_ERROR) });
    }
  }

  async function revoke(pending: InviteView) {
    try {
      await revokeInvite(pending.id);
    } catch {
      toast({ title: REVOKE_INVITE_ERROR });
    }
  }

  function body() {
    if (loading) return <Skeleton className="h-64" />;
    if (failed && members.length === 0) {
      return (
        <EmptyState
          title="Members did not load"
          description="Check the connection and try again."
          action={
            <Button variant="outline" onClick={() => void refresh()}>
              Try again
            </Button>
          }
        />
      );
    }
    return (
      <div className="flex flex-col gap-8">
        <MemberList members={members} onRoleChange={(member, role) => void pickRole(member, role)} onRemove={(member) => void askToRemove(member)} />
        <PendingInviteList invites={invites} onRevoke={(pending) => void revoke(pending)} />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        actions={
          <Button variant="outline" onClick={() => setInviteOpen(true)}>
            Invite
          </Button>
        }
      />
      {body()}
      {inviteOpen && <InviteDrawer open onOpenChange={setInviteOpen} onSubmit={invite} />}
    </>
  );
}
