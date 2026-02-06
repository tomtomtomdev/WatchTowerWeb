"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

interface PostmanImportFormProps {
  onSuccess: () => void;
}

export function PostmanImportForm({ onSuccess }: PostmanImportFormProps) {
  const [jsonData, setJsonData] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonData(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!jsonData.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/endpoints/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "postman", data: jsonData }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to import");
      }

      const data = await res.json();
      toast({
        title: "Postman collection imported",
        description: `${data.imported} endpoint(s) imported successfully`,
      });
      onSuccess();
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Failed to parse Postman collection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label>Upload Postman Collection</Label>
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Click to upload a Postman collection JSON file</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or paste JSON</span>
        </div>
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Paste Postman collection JSON here..."
          value={jsonData}
          onChange={(e) => setJsonData(e.target.value)}
          rows={8}
          className="font-mono text-sm"
        />
      </div>

      <Button onClick={handleImport} className="w-full" disabled={!jsonData.trim() || loading}>
        {loading ? "Importing..." : "Import Collection"}
      </Button>
    </div>
  );
}
