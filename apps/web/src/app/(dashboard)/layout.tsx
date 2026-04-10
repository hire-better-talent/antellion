import { Sidebar } from "@/components/sidebar";

/**
 * Dashboard layout — wraps all authenticated pages with sidebar navigation.
 * When auth is added, this layout should check the session and redirect
 * unauthenticated users to /login.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
