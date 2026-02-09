"use client";

import { usePathname, useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { cn, statusBgColor } from "@/lib/utils";
import type { EndpointWithStatus } from "@/lib/types";

interface SidebarProps {
  endpoints: EndpointWithStatus[];
  className?: string;
}

export function Sidebar({ endpoints, className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className={cn("w-64 border-r bg-background overflow-y-auto", className)}>
      <div className="p-3">
        <button
          onClick={() => router.push("/")}
          className={cn(
            "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
          )}
        >
          Dashboard
        </button>
      </div>
      <div className="px-3 pb-2">
        <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Endpoints ({endpoints.length})
        </p>
      </div>
      <nav className="px-3 pb-4 space-y-0.5">
        {endpoints.map((ep) => {
          const isActive = pathname === `/endpoints/${ep.id}`;
          return (
            <button
              key={ep.id}
              onClick={() => router.push(`/endpoints/${ep.id}`)}
              className={cn(
                "w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full shrink-0", statusBgColor(ep.status))} />
              <span className="truncate" dir="rtl" style={{ textAlign: "left" }}>{ep.name}</span>
            </button>
          );
        })}
        {endpoints.length === 0 && (
          <p className="px-3 py-4 text-sm text-muted-foreground text-center">
            No endpoints yet
          </p>
        )}
      </nav>
      <div className="mt-auto border-t p-3">
        <button
          onClick={() => router.push("/settings")}
          className={cn(
            "w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
            pathname === "/settings" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </aside>
  );
}
