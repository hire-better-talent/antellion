"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { iconMap } from "./icons";
import type { NavItem } from "@/lib/navigation";

export function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive =
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

  const Icon = iconMap[item.icon];

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-gray-100 text-gray-900"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {item.label}
    </Link>
  );
}
