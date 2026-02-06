"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManualEntryForm } from "./manual-entry-form";
import { CurlImportForm } from "./curl-import-form";
import { PostmanImportForm } from "./postman-import-form";

interface AddEndpointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddEndpointDialog({ open, onOpenChange, onSuccess }: AddEndpointDialogProps) {
  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Endpoint</DialogTitle>
          <DialogDescription>
            Add a new API endpoint to monitor. Enter details manually, import from a cURL command, or upload a Postman collection.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="manual" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="curl">cURL Import</TabsTrigger>
            <TabsTrigger value="postman">Postman</TabsTrigger>
          </TabsList>
          <TabsContent value="manual">
            <ManualEntryForm onSuccess={handleSuccess} />
          </TabsContent>
          <TabsContent value="curl">
            <CurlImportForm onSuccess={handleSuccess} />
          </TabsContent>
          <TabsContent value="postman">
            <PostmanImportForm onSuccess={handleSuccess} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
