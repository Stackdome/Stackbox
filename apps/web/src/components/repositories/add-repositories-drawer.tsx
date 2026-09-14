import { FolderGit2 } from "lucide-react";
import { useEffect, useState } from "react";
import { type AvailableRepositoryView, type GitConnectionView, addRepositoriesLabel } from "@/api/mappers/repository";
import { FieldError, PickerList, PickerRow, PickerRowTick, SearchField } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerActions, DrawerBody, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";

export function AddRepositoriesDrawer({
  connection,
  loadAvailable,
  onAdd,
  onOpenChange,
}: {
  connection: GitConnectionView;
  loadAvailable: (connectionId: string) => Promise<AvailableRepositoryView[]>;
  onAdd: (externalIds: string[]) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [options, setOptions] = useState<AvailableRepositoryView[] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadAvailable(connection.id).then(setOptions, () => {
      setOptions([]);
      setFailure("The provider did not list its repositories. Reconnect it and try again.");
    });
  }, [connection.id, loadAvailable]);

  const needle = q.trim().toLowerCase();
  const visible = (options ?? []).filter((option) => option.fullName.toLowerCase().includes(needle));

  function toggle(externalId: string) {
    setPicked((current) => (current.includes(externalId) ? current.filter((id) => id !== externalId) : [...current, externalId]));
  }

  async function submit() {
    setBusy(true);
    setFailure(null);
    try {
      await onAdd(picked);
      onOpenChange(false);
    } catch {
      setFailure("The repositories were not added. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function list() {
    if (options === null) return <Skeleton className="h-40" />;
    if (options.length === 0) return <p className="text-body text-fg-muted">Every repository this provider lists is already added.</p>;
    if (visible.length === 0) return <p className="text-body text-fg-muted">No repositories match.</p>;
    return (
      <PickerList multiple aria-label="Repositories">
        {visible.map((option) => {
          const selected = picked.includes(option.externalId);
          return (
            <PickerRow
              key={option.externalId}
              icon={<FolderGit2 />}
              name={option.fullName}
              meta={[{ text: option.defaultBranch, mono: true }]}
              selected={selected}
              trailing={selected ? <PickerRowTick /> : undefined}
              onClick={() => toggle(option.externalId)}
            />
          );
        })}
      </PickerList>
    );
  }

  return (
    <Drawer open onOpenChange={onOpenChange}>
      <DrawerContent size="form">
        <DrawerHeader title="Add repositories" description={`From ${connection.title}`} />
        <DrawerBody>
          <SearchField value={q} onChange={setQ} placeholder="Search repositories" label="Search repositories" />
          {list()}
        </DrawerBody>
        <DrawerFooter>
          {failure && <FieldError>{failure}</FieldError>}
          <DrawerActions>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
            <Button onClick={() => void submit()} disabled={picked.length === 0 || busy}>
              {addRepositoriesLabel(picked.length)}
            </Button>
          </DrawerActions>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
