import { useState } from "react";
import { REVOKE_TOKEN_ERROR } from "@/api/errors";
import type { ApiTokenView } from "@/api/mappers/api-token";
import { useApiTokens } from "@/api/use-settings";
import { EmptyState, PageHeader, useConfirm } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { ApiTokenList } from "./api-token-list";
import { NewTokenDrawer } from "./new-token-drawer";

export function ApiTokensTab() {
  const confirm = useConfirm();
  const { tokens, loading, failed, refresh, create, revoke } = useApiTokens();
  const [newTokenOpen, setNewTokenOpen] = useState(false);

  async function askToRevoke(token: ApiTokenView) {
    const confirmed = await confirm({
      title: `Revoke ${token.name}?`,
      description: "Every request that sends this token starts failing.",
      confirmLabel: "Revoke",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      await revoke(token.id);
    } catch {
      toast({ title: REVOKE_TOKEN_ERROR });
    }
  }

  function body() {
    if (loading) return <Skeleton className="h-48" />;
    if (failed && tokens.length === 0) {
      return (
        <EmptyState
          title="API tokens did not load"
          description="Check the connection and try again."
          action={
            <Button variant="outline" onClick={() => void refresh()}>
              Try again
            </Button>
          }
        />
      );
    }
    if (tokens.length === 0) {
      return (
        <EmptyState
          title="No API tokens yet"
          description="A token acts as you, with your role. Create one for a script or a pipeline."
          action={
            <Button variant="outline" onClick={() => setNewTokenOpen(true)}>
              New token
            </Button>
          }
        />
      );
    }
    return <ApiTokenList tokens={tokens} now={Date.now()} onRevoke={(token) => void askToRevoke(token)} />;
  }

  return (
    <>
      <PageHeader
        actions={
          <Button variant="outline" onClick={() => setNewTokenOpen(true)}>
            New token
          </Button>
        }
      />
      {body()}
      {newTokenOpen && <NewTokenDrawer open onOpenChange={setNewTokenOpen} onSubmit={create} />}
    </>
  );
}
