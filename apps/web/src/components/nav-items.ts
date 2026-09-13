import { AppWindow, Boxes, FolderGit2, ListChecks, Settings, type LucideIcon } from "lucide-react";
import { ROUTES, type RoutePath } from "@/lib/routes";

export interface NavItem {
  label: string;
  path: RoutePath;
  icon: LucideIcon;
  /** Hidden from members. Mirrors the sidebar's previous `isOrgAdmin &&` gates. */
  adminOnly?: boolean;
  /** Sub-paths that must NOT mark the item active: a full-bleed editor on a
   *  child route is a different screen, not the list. */
  notActiveOn?: string[];
}

export interface NavGroup {
  /** Omitted for the product's own destinations: a label above the first item
   *  is furniture. */
  label?: string;
  items: NavItem[];
}

/**
 * The sidebar, as a list rather than one component per destination.
 *
 * Grouped by who touches it: the first group is every member's own work, and
 * `Organization` holds what an admin configures.
 */
export const navGroups: NavGroup[] = [
  {
    items: [
      { label: 'Tasks', path: ROUTES.tasks, icon: ListChecks },
      { label: 'Applications', path: ROUTES.applications, icon: AppWindow },
      { label: 'Instances', path: ROUTES.instances, icon: Boxes },
    ],
  },
  {
    label: 'Organization',
    items: [
      { label: 'Repositories', path: ROUTES.repositories, icon: FolderGit2 },
      { label: 'Settings', path: ROUTES.settings, icon: Settings },
    ],
  },
];

/** A destination is active on its own path and anything nested under it. */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.notActiveOn?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false;
  }
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}
