import { useState } from "react";
import { FieldShell } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copyText } from "@/lib/clipboard";

/** A value shown once for the person to take away: an invite link, a token secret. */
export function CopyField({ id, label, value }: { id: string; label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await copyText(value);
    setCopied(true);
  }

  return (
    <FieldShell label={label} htmlFor={id}>
      <div className="flex items-center gap-2">
        <Input id={id} readOnly value={value} className="font-mono" onFocus={(event) => event.currentTarget.select()} />
        <Button variant="outline" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </FieldShell>
  );
}
