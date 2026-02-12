"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Radio, Bell, BellOff, Trash2, Settings, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/use-notifications";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EndpointWithStatus } from "@/lib/types";

interface HeaderProps {
  endpoints: EndpointWithStatus[];
  onAddEndpoint: () => void;
  onDeleteAll?: () => void;
}

export function Header({ endpoints, onAddEndpoint, onDeleteAll }: HeaderProps) {
  const router = useRouter();
  const { permission, requestPermission } = useNotifications();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [countdown, setCountdown] = useState<string | null>(null);

  const enabledEndpoints = useMemo(
    () => endpoints.filter((e) => e.isEnabled && e.lastCheckedAt),
    [endpoints]
  );

  useEffect(() => {
    if (enabledEndpoints.length === 0) {
      setCountdown(null);
      return;
    }

    function computeCountdown() {
      const now = Date.now();
      let nearest = Infinity;
      for (const ep of enabledEndpoints) {
        const due = new Date(ep.lastCheckedAt!).getTime() + ep.pollingInterval * 1000;
        const remaining = due - now;
        if (remaining < nearest) nearest = remaining;
      }
      if (nearest <= 0) return "Due now";
      const totalSec = Math.ceil(nearest / 1000);
      if (totalSec >= 60) {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return s > 0 ? `${m}m ${s}s` : `${m}m`;
      }
      return `${totalSec}s`;
    }

    setCountdown(computeCountdown());
    const id = setInterval(() => setCountdown(computeCountdown()), 1000);
    return () => clearInterval(id);
  }, [enabledEndpoints]);

  const healthy = endpoints.filter((e) => e.status === "healthy").length;
  const failing = endpoints.filter((e) => e.status === "failing").length;
  const unknown = endpoints.filter((e) => e.status === "unknown").length;

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/endpoints", { method: "DELETE" });
      if (res.ok) {
        setShowDeleteDialog(false);
        onDeleteAll?.();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Radio className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold">WatchTower</h1>
          {endpoints.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 ml-4">
              {healthy > 0 && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 hover:bg-green-100">
                  {healthy} healthy
                </Badge>
              )}
              {failing > 0 && (
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 hover:bg-red-100">
                  {failing} failing
                </Badge>
              )}
              {unknown > 0 && (
                <Badge variant="secondary">{unknown} unknown</Badge>
              )}
              {countdown && (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <Timer className="h-3 w-3" />
                  Next: {countdown}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={permission !== "granted" ? requestPermission : undefined}
              >
                {permission === "granted" ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {permission === "granted" ? "Notifications enabled" : "Enable notifications"}
            </TooltipContent>
          </Tooltip>
          {endpoints.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete all endpoints</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/settings")}
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
          <Button onClick={onAddEndpoint} size="sm">
            Add Endpoint
          </Button>
        </div>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete All Endpoints</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete all {endpoints.length} endpoint{endpoints.length !== 1 ? "s" : ""}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteAll} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete All"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
