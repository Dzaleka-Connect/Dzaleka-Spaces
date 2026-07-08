import Link from "next/link";
import {
  Bell,
  Building2,
  ClipboardCheck,
  Home,
  Map,
  MessageSquare,
  Settings,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { canModerate, getSessionUser, isStaff } from "@/lib/auth";

const PUBLIC_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/spaces", label: "Browse", icon: Building2 },
  { href: "/spaces/map", label: "Map", icon: Map },
  { href: "/trades", label: "Trades", icon: Wrench },
  { href: "/help", label: "Help", icon: MessageSquare },
];

export async function SiteSidebar() {
  const user = await getSessionUser();
  const links = [
    ...PUBLIC_LINKS,
    ...(user
      ? [
          { href: "/account", label: "Account", icon: UserRound },
          { href: "/provider", label: "Provider", icon: Building2 },
          { href: "/provider/team", label: "Team", icon: ShieldCheck },
          { href: "/trades/profile", label: "Trade profile", icon: Wrench },
        ]
      : [{ href: "/sign-in", label: "Sign in", icon: UserRound }]),
    ...(user && isStaff(user)
      ? [
          { href: "/verifier/assignments", label: "Verifier", icon: ClipboardCheck },
          { href: "/verifier/offline", label: "Offline queue", icon: Bell },
        ]
      : []),
    ...(user && canModerate(user)
      ? [
          { href: "/admin", label: "Admin", icon: Settings },
          { href: "/admin/cases", label: "Cases", icon: ShieldCheck },
        ]
      : []),
  ];

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-background px-3 py-4 lg:flex lg:flex-col">
      <Link href="/" className="flex items-center gap-2 px-2 py-2 font-semibold">
        <Building2 className="size-5 text-primary" />
        <span>Dzaleka Spaces</span>
      </Link>
      {user ? (
        <div className="mt-3 flex flex-col gap-1 rounded-lg border p-3">
          <span className="truncate text-sm font-medium">
            {user.fullName || user.email || "Signed in"}
          </span>
          <div className="flex flex-wrap gap-1">
            {user.roles.slice(0, 3).map((role) => (
              <Badge key={role} variant="secondary" className="text-xs">
                {role.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
      <nav className="mt-4 flex flex-col gap-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon className="size-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
