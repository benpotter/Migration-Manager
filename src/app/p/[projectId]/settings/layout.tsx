"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProject } from "@/contexts/project-context";
import { cn } from "@/lib/utils";
import { Settings, Users, Database, AlertTriangle } from "lucide-react";

const SETTINGS_NAV = [
  { href: "", label: "General", icon: Settings },
  { href: "/members", label: "Members", icon: Users },
  { href: "/data-mode", label: "Data Mode", icon: Database },
  { href: "/danger", label: "Danger Zone", icon: AlertTriangle },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { projectId } = useProject();
  const pathname = usePathname();
  const basePath = `/p/${projectId}/settings`;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Project Settings</h1>
        <p className="text-muted-foreground">Manage your project configuration</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 space-y-1">
          {SETTINGS_NAV.map((item) => {
            const href = `${basePath}${item.href}`;
            const isActive = item.href === ""
              ? pathname === basePath
              : pathname.startsWith(href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-secondary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
