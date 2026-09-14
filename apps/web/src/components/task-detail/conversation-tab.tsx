import type { MessageView } from "@/api/mappers/task-detail";
import { EmptyState, relativeAge } from "@/components/branded";
import { cn } from "@/lib/utils";

export function ConversationTab({ messages }: { messages: MessageView[] }) {
  if (messages.length === 0) return <EmptyState title="No messages yet" description="The agent writes here when it has something to tell you or ask." />;
  return (
    <ol className="flex flex-col gap-4" aria-label="Conversation">
      {messages.map((message) => (
        <li
          key={message.id}
          data-waiting={message.waiting}
          className={cn("flex flex-col gap-1 rounded-lg px-3 py-2", message.waiting && "shadow-[inset_2px_0_0_var(--warn)]")}
        >
          <div className="flex items-center gap-2">
            <span className="text-body font-medium text-foreground">{message.author}</span>
            <span className="text-column text-fg-muted">{relativeAge(message.at)}</span>
          </div>
          <p className="text-body text-fg-2">{message.body}</p>
        </li>
      ))}
    </ol>
  );
}
