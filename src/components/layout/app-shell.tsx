"use client";

import { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { BulkActionBar } from "@/components/bulk/bulk-action-bar";
import { AddEndpointDialog } from "@/components/add-endpoint/add-endpoint-dialog";
import { useEndpoints } from "@/hooks/use-endpoints";
import { useSelection } from "@/hooks/use-selection";
import { Skeleton } from "@/components/ui/skeleton";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { endpoints, loading, refetch } = useEndpoints();
  const { selected, clearSelection } = useSelection();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <Header endpoints={endpoints} onAddEndpoint={() => setAddDialogOpen(true)} onDeleteAll={refetch} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar endpoints={endpoints} className="hidden md:block" />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-lg" />
              ))}
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      {selected.size > 0 && (
        <BulkActionBar
          selectedCount={selected.size}
          selectedIds={Array.from(selected)}
          onComplete={() => {
            clearSelection();
            refetch();
          }}
        />
      )}
      <AddEndpointDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
