"use client";

import { Radio, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/use-notifications";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EndpointWithStatus } from "@/lib/types";

interface HeaderProps {
  endpoints: EndpointWithStatus[];
  onAddEndpoint: () => void;
}

export function Header({ endpoints, onAddEndpoint }: HeaderProps) {
  const { permission, requestPermission } = useNotifications();

  const healthy = endpoints.filter((e) => e.status === "healthy").length;
  const failing = endpoints.filter((e) => e.status === "failing").length;
  const unknown = endpoints.filter((e) => e.status === "unknown").length;

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
          <Button onClick={onAddEndpoint} size="sm">
            Add Endpoint
          </Button>
        </div>
      </div>
    </header>
  );
}
