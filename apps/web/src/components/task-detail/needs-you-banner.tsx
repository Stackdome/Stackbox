import { useState } from "react";
import { AlertBanner, FieldError } from "@/components/branded";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function NeedsYouBanner({ question, onSend }: { question: string; onSend: (body: string) => Promise<void> }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function send() {
    setSending(true);
    setFailed(false);
    try {
      await onSend(body);
      setBody("");
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <AlertBanner tone="blocking" title="The agent needs you">
      <div className="flex w-full flex-col gap-2">
        <p className="text-body text-foreground">{question}</p>
        <Textarea aria-label="Reply to the agent" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Safari 17.4 on macOS 14" />
        {failed && <FieldError>The reply was not sent. Try again.</FieldError>}
        <div className="flex justify-end">
          <Button onClick={() => void send()} disabled={sending || body.trim().length === 0}>
            Send
          </Button>
        </div>
      </div>
    </AlertBanner>
  );
}
