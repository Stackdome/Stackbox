import * as React from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Outlet } from "react-router-dom";
import { BreadcrumbProvider } from "@/contexts/breadcrumb-context";
import { SheetHeader } from "@/components/sheet-header";
import { PEER_SHEET_SLOT_ID } from "@/components/ui/drawer";
import { useShellOpen } from "@/hooks/use-shell-open";
import { TasksProvider } from "@/contexts/tasks-context";

function AppLayoutContent({
  children,
  defaultSidebarOpen,
}: {
  children?: React.ReactNode;
  /** Start expanded or on the 56px rail instead of reading the breakpoint.
   *  Stories pin it; the breakpoint and the user's toggle take over from
   *  there. */
  defaultSidebarOpen?: boolean;
}) {
  const [open, setOpen] = useShellOpen(defaultSidebarOpen);
  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      {/* 8px gutter on every free edge (§12). The sidebar sits flush to the
          window's left edge; the sheet is inset from the other three. The
          frame is a MOUNT, not a margin. */}
      <div className="flex h-screen max-h-screen w-full overflow-hidden bg-background py-2 pr-2">
        <AppSidebar />
        {/* The content plane is a white sheet floating on the paper frame:
            white floats, grey recedes. The sidebar needs no divider, the
            sheet's own edge draws the seam.

            The sheet's hairline is an OUTLINE, not a border: the board draws
            it as an outside stroke, which is not part of the frame's box. A
            `border` would be, and it would push the header's row down by 1px.
            `ml-0.5` is the board's 2px gap between the rail and the sheet, and
            it is load-bearing: an outline paints OUTSIDE the box, so with the
            two columns flush its left edge would land under the `fixed`
            sidebar and be clipped away. */}
        <SidebarInset className="ml-0.5 min-h-0 overflow-hidden rounded-lg bg-card shadow-md outline-1 outline-border-subtle">
          {/* The scroll container is a flex column so the header can be a
              sticky block of ANY height and nothing downstream needs to know
              what that height is. */}
          <div className="flex min-h-0 flex-grow flex-col overflow-auto scrollbar-hide">
            {/* Header, the page's sticky bar and the fade travel together as
                one sticky block pinned to the top of the sheet. No fade: the
                band carries a 1px hairline, and content is cut by the line
                instead. */}
            <div className="sticky top-0 z-40 shrink-0">
              <SheetHeader leading={<SidebarTrigger className="size-8 text-fg-2" />} />
              {/* Forms pin a save bar directly beneath the header. */}
              <div id="page-sticky-bar" />
            </div>

            {/* The sheet's content edge is 16px: the SAME edge the header
                uses (§12a). */}
            <div data-slot="page-content" className="min-h-0 flex-1 px-4 py-4">
              {children ? children : <Outlet />}
            </div>
          </div>
        </SidebarInset>
        {/* The peer sheet (§15). A detached `DrawerRegion` portals itself in
            here, and while it is empty the div is zero-wide with no gap: the
            main sheet keeps the whole plane. It is a SIBLING of the sheet, so
            the node inspector gets its own edge, its own radius and its own
            shadow, with 8px of the paper frame showing between the two cards.
            `empty:hidden` rather than conditional rendering, because the slot
            has to be in the DOM before the region looks for it. */}
        <div id={PEER_SHEET_SLOT_ID} className="peer-sheet min-h-0 [&>*]:ml-2" />
      </div>
    </SidebarProvider>
  );
}

export function AppLayout({
  children,
  defaultSidebarOpen,
}: {
  children?: React.ReactNode;
  defaultSidebarOpen?: boolean;
}) {
  return (
    <BreadcrumbProvider>
      <TasksProvider>
        <AppLayoutContent defaultSidebarOpen={defaultSidebarOpen}>{children}</AppLayoutContent>
      </TasksProvider>
    </BreadcrumbProvider>
  );
}
