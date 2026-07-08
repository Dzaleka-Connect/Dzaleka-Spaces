export type NavIconName =
  | "badge-check"
  | "bell"
  | "briefcase"
  | "building"
  | "calendar"
  | "clipboard"
  | "file-text"
  | "flag"
  | "folder"
  | "heart"
  | "help"
  | "home"
  | "layout"
  | "map"
  | "map-pin"
  | "message"
  | "search"
  | "settings"
  | "shield"
  | "sliders"
  | "user"
  | "users"
  | "wrench";

export type NavLink = {
  href: string;
  label: string;
  icon: NavIconName;
};

export type NavSection = {
  id: string;
  title: string;
  links: NavLink[];
};

export type AppNavSubItem = {
  title: string;
  url: string;
};

export type AppNavItem = {
  title: string;
  url: string;
  icon: NavIconName;
  items: AppNavSubItem[];
};

/** Public marketplace links shown in the top header for everyone. */
export const PUBLIC_HEADER_LINKS: NavLink[] = [
  { href: "/spaces", label: "Browse", icon: "building" },
  { href: "/spaces/map", label: "Map", icon: "map" },
  { href: "/zones", label: "Zones", icon: "map-pin" },
  { href: "/trades", label: "Trades", icon: "wrench" },
  { href: "/help", label: "Help", icon: "help" },
];
