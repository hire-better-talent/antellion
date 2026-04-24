export interface NavItem {
  label: string;
  href: string;
  icon: "dashboard" | "clients" | "queries" | "scans" | "snapshots" | "content" | "reports" | "leads" | "diagnostics";
}

export const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "dashboard" },
  { label: "Leads", href: "/leads", icon: "leads" },
  { label: "Clients", href: "/clients", icon: "clients" },
  { label: "Diagnostics", href: "/diagnostic", icon: "diagnostics" },
  { label: "Queries", href: "/queries", icon: "queries" },
  { label: "Scans", href: "/scans", icon: "scans" },
  { label: "Snapshots", href: "/snapshots", icon: "snapshots" },
  { label: "Content", href: "/content", icon: "content" },
  { label: "Reports", href: "/reports", icon: "reports" },
];
