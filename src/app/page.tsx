"use client";

import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { useEndpoints } from "@/hooks/use-endpoints";

export default function DashboardPage() {
  const { endpoints } = useEndpoints();
  return <DashboardGrid endpoints={endpoints} />;
}
