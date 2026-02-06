"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { methodColor } from "@/lib/utils";
import type { ParsedCurlCommand } from "@/lib/types";

interface CurlImportFormProps {
  onSuccess: () => void;
}

export function CurlImportForm({ onSuccess }: CurlImportFormProps) {
  const [curlCommand, setCurlCommand] = useState("");
  const [parsed, setParsed] = useState<ParsedCurlCommand | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleParse = async () => {
    setParseError(null);
    setParsed(null);

    try {
      // Use the import API to validate, but we'll create from parsed data
      const res = await fetch("/api/endpoints/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "curl", data: curlCommand }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to parse");
      }

      // Import succeeded directly
      toast({ title: "Endpoint imported", description: "cURL command imported successfully" });
      onSuccess();
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Parse failed");
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label>cURL Command</Label>
        <Textarea
          placeholder={`curl -X GET https://api.example.com/health \\
  -H "Authorization: Bearer token" \\
  -H "Content-Type: application/json"`}
          value={curlCommand}
          onChange={(e) => setCurlCommand(e.target.value)}
          rows={6}
          className="font-mono text-sm"
        />
      </div>

      {parseError && (
        <p className="text-sm text-destructive">{parseError}</p>
      )}

      <Button onClick={handleParse} className="w-full" disabled={!curlCommand.trim() || loading}>
        {loading ? "Importing..." : "Import from cURL"}
      </Button>
    </div>
  );
}
