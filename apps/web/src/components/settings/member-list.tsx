import type { UserRole } from "@stackbox/contract";
import { type InviteView, type MemberView, ROLES, ROLE_LABEL, inviteExpiryText } from "@/api/mappers/organization";
import { BlockedAction, DataListActions, DataListCell, DataListHeader, DataListName, DataListRow, StatusText } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const MEMBER_COLUMNS = "grid-cols-[minmax(240px,1fr)_160px_96px]";
const MEMBER_LABELS = ["Member", "Role", ""];

export const INVITE_COLUMNS = "grid-cols-[minmax(240px,1fr)_120px_160px_96px]";
const INVITE_LABELS = ["Email", "Status", "Expires", ""];

const OWN_ROLE_REASON = "Ask another admin to change your own role";

export function MemberList({
  members,
  onRoleChange,
  onRemove,
}: {
  members: MemberView[];
  onRoleChange: (member: MemberView, role: UserRole) => void;
  onRemove: (member: MemberView) => void;
}) {
  return (
    <section aria-label="Members" data-slot="member-list">
      <DataListHeader columns={MEMBER_COLUMNS} labels={MEMBER_LABELS} />
      {members.map((member) => (
        <DataListRow key={member.id} columns={MEMBER_COLUMNS}>
          <DataListName name={member.name} secondary={member.email} />
          <Select value={member.role} onValueChange={(role) => onRoleChange(member, role as UserRole)}>
            <BlockedAction reason={member.isYou ? OWN_ROLE_REASON : null}>
              <SelectTrigger size="sm" aria-label={`Role of ${member.name}`} className="w-[128px]">
                <SelectValue />
              </SelectTrigger>
            </BlockedAction>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABEL[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DataListActions>
            {!member.isYou && (
              <Button variant="destructive-ghost" size="sm" aria-label={`Remove ${member.name}`} onClick={() => onRemove(member)}>
                Remove
              </Button>
            )}
          </DataListActions>
        </DataListRow>
      ))}
    </section>
  );
}

export function PendingInviteList({ invites, onRevoke }: { invites: InviteView[]; onRevoke: (invite: InviteView) => void }) {
  return (
    <section aria-label="Pending invites" data-slot="invite-list" className="flex flex-col gap-2">
      <h2 className="text-name font-medium text-foreground">Pending invites</h2>
      {invites.length === 0 ? (
        <p className="text-meta text-fg-muted">No pending invites</p>
      ) : (
        <div>
          <DataListHeader columns={INVITE_COLUMNS} labels={INVITE_LABELS} />
          {invites.map((invite) => (
            <DataListRow key={invite.id} columns={INVITE_COLUMNS}>
              <DataListName name={invite.email} secondary={invite.roleLabel} mono={false} />
              <StatusText domain="invite" state={invite.status} icon />
              <DataListCell>{inviteExpiryText(invite.expiresAt)}</DataListCell>
              <DataListActions>
                <Button variant="destructive-ghost" size="sm" aria-label={`Revoke the invite for ${invite.email}`} onClick={() => onRevoke(invite)}>
                  Revoke
                </Button>
              </DataListActions>
            </DataListRow>
          ))}
        </div>
      )}
    </section>
  );
}
