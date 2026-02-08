import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { EndpointStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function computeStatus(
  lastResult: { isSuccess: boolean } | null | undefined,
  isEnabled: boolean
): EndpointStatus {
  if (!isEnabled) return "unknown";
  if (!lastResult) return "unknown";
  return lastResult.isSuccess ? "healthy" : "failing";
}

export function statusColor(status: EndpointStatus): string {
  switch (status) {
    case "healthy":
      return "text-green-500";
    case "failing":
      return "text-red-500";
    case "expired":
      return "text-amber-500";
    case "checking":
      return "text-orange-500";
    case "unknown":
    default:
      return "text-gray-400";
  }
}

export function statusBgColor(status: EndpointStatus): string {
  switch (status) {
    case "healthy":
      return "bg-green-500";
    case "failing":
      return "bg-red-500";
    case "expired":
      return "bg-amber-500";
    case "checking":
      return "bg-orange-500";
    case "unknown":
    default:
      return "bg-gray-400";
  }
}

export function statusBorderColor(status: EndpointStatus): string {
  switch (status) {
    case "healthy":
      return "border-green-500";
    case "failing":
      return "border-red-500";
    case "expired":
      return "border-amber-500";
    case "checking":
      return "border-orange-500";
    case "unknown":
    default:
      return "border-gray-300 dark:border-gray-600";
  }
}

export function statusLabel(status: EndpointStatus): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "failing":
      return "Failing";
    case "expired":
      return "Expired";
    case "checking":
      return "Checking";
    case "unknown":
    default:
      return "Unknown";
  }
}

export function formatResponseTime(ms: number | null | undefined): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "Never";
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatPollingInterval(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case "POST":
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    case "PUT":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    case "PATCH":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
    case "DELETE":
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
  }
}
