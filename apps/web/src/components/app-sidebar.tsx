import * as React from "react"
import { Link } from "react-router-dom"
import { StackboxMark } from "@/components/branded"

import { navGroups } from "@/components/nav-items"
import { NavItem } from "@/components/nav-item"
import { NavUser } from "@/components/nav-user"
import { ThemeToggle } from "@/components/theme-toggle"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useSignOut } from "@/hooks/use-sign-out"
import { useTasks } from "@/hooks/use-tasks"
import { ROUTES } from "@/lib/routes"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

/**
 * The frame's navigation, built from `navGroups` rather than one component
 * per destination.
 *
 * Measurements come from the app shell board: 240px expanded, 56px collapsed,
 * a 64px brand band with the lockup inset 16px, and a 12px gutter around a
 * 32px item pitched every 34px.
 */
export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { user, isOrgAdmin } = useCurrentUser();
  const signOut = useSignOut();
  const { needsYouCount } = useTasks();

  const userData = {
    name: user?.name ?? "",
    email: user?.email ?? "",
    avatar: "",
    organisation: user?.organizationName,
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Brand band: product identity only, one line. The organisation is
          account context, so it lives in the account block at the foot,
          which is the only place it can be switched.

          The lockup shares a centreline with the page title across the seam.
          Both columns carry the shell's 12px gutter and then 16px of their
          own padding, so both 32px rows centre on 44. The sidebar is `fixed`
          and ignores the wrapper's padding, so its gutter is paid here
          instead: 28px of lead-in (12 gutter + 16 padding), the 32px row,
          then 16px, 76px total, which is where the board puts the first nav
          item.

          If the header padding changes, this number changes with it.
          Verified in the browser, not eyeballed. */}
      <SidebarHeader className="h-[72px] pb-4 pl-4 pr-3 pt-6">
        {/* The lockup is named for the PRODUCT, not its destination, so a
            screen reader does not announce this link and the first nav row
            identically. */}
        <Link
          to={ROUTES.tasks}
          aria-label="Stackbox"
          className="focus-ring-edge flex h-8 items-center rounded-md"
        >
          <span className="rail-logo block overflow-hidden">
            <StackboxMark size={20} className="max-w-none" />
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0.5 px-3">
        {navGroups.map((group, i) => {
          const items = group.items.filter((item) => !item.adminOnly || isOrgAdmin);
          if (items.length === 0) return null;

          // 2px between everything in the nav column: rows AND label blocks.
          return (
            <SidebarGroup key={group.label ?? `group-${i}`} className="gap-0.5 p-0">
              {group.label && (
                /* The label and the hairline occupy the SAME 24px block: two
                   renderings of one thing, the group's name, so only one is
                   ever visible and they cross-fade in place rather than
                   stacking. */
                <div className="relative">
                  {/* A 24px block: 4px, the 16px line, 4px. The label hangs
                      off the group BELOW it, so the air goes under, not over. */}
                  <SidebarGroupLabel className="rail-y h-auto overflow-hidden pb-1 pl-2 pr-0 pt-1 text-label font-medium leading-4 text-fg-muted">
                    {group.label}
                  </SidebarGroupLabel>
                  {/* Collapsed, the label has no room, but the grouping still
                      has to survive, so the board replaces each one with a
                      16px centred hairline.

                      `absolute inset-0 m-auto` centres it on BOTH axes inside
                      the block above, so it needs no height of its own and
                      adds nothing to the expanded layout.

                      Decorative: the groups are already named for assistive
                      tech by the expanded label, so this is aria-hidden. */}
                  <div
                    aria-hidden
                    className="rail-y-in bg-border absolute inset-0 m-auto h-px w-4"
                  />
                </div>
              )}
              <SidebarGroupContent>
                {/* 34px pitch: a 32px row and a 2px gap. */}
                <SidebarMenu className="gap-0.5">
                  {items.map((item) => (
                    <NavItem
                      key={item.path}
                      item={item}
                      badge={item.path === ROUTES.tasks ? needsYouCount : undefined}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      {/* Global helpers live in the frame, never on the content sheet: they
          are about the product, not about the page you are looking at. */}
      <SidebarFooter className="gap-0.5 p-0 pb-3">
        <div className="px-3">
          <ThemeToggle presentation="row" />
        </div>
        {/* The account is inset 8px rather than 12px: its 28px avatar carries
            a hairline, so squaring its optical left edge with the 16px glyphs
            above needs the extra 4px. That inset is the SAME in both states,
            the avatar does not move when the rail collapses; only the right
            inset closes, to the board's 44px collapsed width. */}
        <div className="pl-2 pr-3 group-data-[collapsible=icon]:pr-[5px]">
          <NavUser user={userData} onSignOut={() => void signOut()} />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
