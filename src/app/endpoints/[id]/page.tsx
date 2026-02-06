"use client";

import { use } from "react";
import { EndpointDetail } from "@/components/endpoints/endpoint-detail";

export default function EndpointDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EndpointDetail id={id} />;
}
