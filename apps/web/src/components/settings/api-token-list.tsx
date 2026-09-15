import { type ApiTokenView, tokenExpiryText } from "@/api/mappers/api-token";
import { DataListActions, DataListCell, DataListHeader, DataListName, DataListRow, absoluteAge, relativeAge } from "@/components/branded";
import { Button } from "@/components/ui/button";

export const TOKEN_COLUMNS = "grid-cols-[minmax(200px,1fr)_120px_140px_140px_96px]";
const LABELS = ["Name", "Prefix", "Expires", "Last used", ""];

export function ApiTokenList({ tokens, now, onRevoke }: { tokens: ApiTokenView[]; now: number; onRevoke: (token: ApiTokenView) => void }) {
  return (
    <section aria-label="API tokens" data-slot="api-token-list">
      <DataListHeader columns={TOKEN_COLUMNS} labels={LABELS} />
      {tokens.map((token) => (
        <DataListRow key={token.id} columns={TOKEN_COLUMNS}>
          <DataListName name={token.name} />
          <DataListCell mono>{`${token.prefix}…`}</DataListCell>
          <DataListCell>{tokenExpiryText(token.expiresAt, now)}</DataListCell>
          <DataListCell title={token.lastUsedAt ? (absoluteAge(token.lastUsedAt) ?? undefined) : undefined}>
            {token.lastUsedAt ? relativeAge(token.lastUsedAt) : "Never used"}
          </DataListCell>
          <DataListActions>
            <Button variant="destructive-ghost" size="sm" aria-label={`Revoke ${token.name}`} onClick={() => onRevoke(token)}>
              Revoke
            </Button>
          </DataListActions>
        </DataListRow>
      ))}
    </section>
  );
}
