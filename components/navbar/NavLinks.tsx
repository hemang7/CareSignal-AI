"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavLinkItem {
  href: string;
  label: string;
}

export const NAV_LINKS: NavLinkItem[] = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/record", label: "Record Visit" },
  { href: "/insights", label: "Insights" },
];

interface NavLinkProps {
  href: string;
  label: string;
  isActive: boolean;
  variant?: "inline" | "drawer";
  onClick?: () => void;
}

export function NavLink({
  href,
  label,
  isActive,
  variant = "inline",
  onClick,
}: NavLinkProps) {
  const base =
    "font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  const inlineClasses = cn(
    "text-sm whitespace-nowrap px-2 lg:px-3 py-2 shrink-0",
    isActive
      ? "text-primary bg-primary-muted"
      : "text-muted hover:text-foreground hover:bg-muted-bg"
  );

  const drawerClasses = cn(
    "block w-full text-left text-base px-4 py-3 min-h-[44px] flex items-center",
    isActive
      ? "text-primary bg-primary-muted/30"
      : "text-foreground hover:bg-muted-bg"
  );

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(base, variant === "inline" ? inlineClasses : drawerClasses)}
    >
      {label}
    </Link>
  );
}

interface NavLinksProps {
  variant?: "inline" | "drawer";
  onLinkClick?: () => void;
}

export function NavLinks({ variant = "inline", onLinkClick }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <>
      {NAV_LINKS.map((link) => (
        <NavLink
          key={link.href}
          href={link.href}
          label={link.label}
          isActive={pathname === link.href}
          variant={variant}
          onClick={onLinkClick}
        />
      ))}
    </>
  );
}
