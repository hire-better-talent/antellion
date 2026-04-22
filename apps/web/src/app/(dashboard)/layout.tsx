import { UserButton } from "@clerk/nextjs";
import { Sidebar } from "@/components/sidebar";

/**
 * Dashboard layout — wraps all authenticated pages with sidebar navigation.
 * Route protection is handled by middleware; no redirect logic needed here.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full">
      <Sidebar userButton={<UserButton />} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
