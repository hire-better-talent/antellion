import { mainNav } from "@/lib/navigation";
import { NavLink } from "./nav-link";

interface SidebarProps {
  userButton?: React.ReactNode;
}

export function Sidebar({ userButton }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      {/* Brand */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <img
          src="/logo-horizontal.svg"
          alt="Antellion"
          className="h-24"
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* User / workspace */}
      <div className="border-t border-gray-200 px-3 py-3">
        {userButton ?? null}
      </div>
    </aside>
  );
}
