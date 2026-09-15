import type { ReactNode } from "react";
import { StackboxMark } from "@/components/branded";
import { Card } from "@/components/ui/card";

/** Sign in and Join stand outside the shell: the paper frame, one 400 wide card, the brand band on top. */
export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main data-slot="auth-frame" className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-[400px] max-w-full gap-0 py-0">
        <div data-slot="auth-brand" className="flex h-16 items-center border-b border-border-subtle px-6">
          <StackboxMark />
        </div>
        <div className="flex flex-col gap-5 p-6">
          <h1 className="text-title font-medium text-foreground">{title}</h1>
          {children}
        </div>
      </Card>
    </main>
  );
}
