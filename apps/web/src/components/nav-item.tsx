import { Link, useLocation } from "react-router-dom";

import { SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { isNavItemActive, type NavItem as NavItemData } from "@/components/nav-items";

/**
 * One sidebar destination, so active state, the collapsed tooltip and the
 * admin gate have one implementation instead of one per destination.
 *
 * The label is ink at rest; the grey is carried by the icon.
 */
export function NavItem({ item, badge = 0 }: { item: NavItemData; badge?: number }) {
  const { pathname } = useLocation();
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.label} isActive={isNavItemActive(pathname, item)}>
        <Link to={item.path}>
          <Icon />
          {/* `rail-x` closes a grid track from `1fr` to `0fr`, so the label
              travels at the rail's own speed instead of being guillotined by
              the button's overflow. The track clips exactly ONE child, hence
              the inner span. */}
          <span className="rail-x">
            <span>{item.label}</span>
          </span>
        </Link>
      </SidebarMenuButton>
      {badge > 0 && (
        <>
          <SidebarMenuBadge className="bg-warn-bg text-warn peer-hover/menu-button:text-warn peer-data-[active=true]/menu-button:text-warn">
            {badge}
          </SidebarMenuBadge>
          {/* The collapsed rail has no room for the count; the dot keeps the colour. */}
          <span
            aria-hidden
            data-slot="nav-item-dot"
            className="pointer-events-none absolute right-1.5 top-1.5 hidden size-1.5 rounded-full bg-warn group-data-[collapsible=icon]:block"
          />
        </>
      )}
    </SidebarMenuItem>
  );
}
