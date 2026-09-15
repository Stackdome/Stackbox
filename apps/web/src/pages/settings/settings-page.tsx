import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/branded";
import { GeneralTab } from "@/components/settings/general-tab";
import { MembersTab } from "@/components/settings/members-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { useCurrentUser } from "@/hooks/use-current-user";
import { ROUTES } from "@/lib/routes";

export const SettingsTab = { General: "general", Members: "members", Tokens: "tokens" } as const;
export type SettingsTab = (typeof SettingsTab)[keyof typeof SettingsTab];

const TAB_PATH: Record<SettingsTab, string> = {
  [SettingsTab.General]: ROUTES.settings,
  [SettingsTab.Members]: ROUTES.settingsMembers,
  [SettingsTab.Tokens]: ROUTES.settingsTokens,
};

function isSettingsTab(value: string): value is SettingsTab {
  return Object.values<string>(SettingsTab).includes(value);
}

export function SettingsPage({ tab }: { tab: SettingsTab }) {
  const navigate = useNavigate();
  const { isOrgAdmin } = useCurrentUser();
  const { registerSelectionPath } = useBreadcrumb();

  // The tabs are one section, so the header title stays Settings on each of them (§12a).
  useEffect(() => {
    const releases = [registerSelectionPath(ROUTES.settingsMembers), registerSelectionPath(ROUTES.settingsTokens)];
    return () => releases.forEach((release) => release());
  }, [registerSelectionPath]);

  if (!isOrgAdmin) {
    return <EmptyState title="Settings are for admins" description="Ask an admin of your organization to change its name, members or API tokens." />;
  }

  return (
    <Tabs value={tab} onValueChange={(next) => isSettingsTab(next) && navigate(TAB_PATH[next])}>
      <TabsList>
        <TabsTrigger value={SettingsTab.General}>General</TabsTrigger>
        <TabsTrigger value={SettingsTab.Members}>Members</TabsTrigger>
        <TabsTrigger value={SettingsTab.Tokens}>API tokens</TabsTrigger>
      </TabsList>
      <TabsContent value={SettingsTab.General} className="pt-4">
        <GeneralTab />
      </TabsContent>
      <TabsContent value={SettingsTab.Members} className="pt-4">
        <MembersTab />
      </TabsContent>
    </Tabs>
  );
}
