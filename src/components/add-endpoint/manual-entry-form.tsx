"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { HTTP_METHODS, POLLING_INTERVALS } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

interface ManualEntryFormProps {
  onSuccess: () => void;
}

export function ManualEntryForm({ onSuccess }: ManualEntryFormProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([]);
  const [body, setBody] = useState("");
  const [pollingInterval, setPollingInterval] = useState("900");
  const [loading, setLoading] = useState(false);

  const addHeader = () => setHeaders([...headers, { key: "", value: "" }]);
  const removeHeader = (index: number) => setHeaders(headers.filter((_, i) => i !== index));
  const updateHeader = (index: number, field: "key" | "value", val: string) => {
    const updated = [...headers];
    updated[index][field] = val;
    setHeaders(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      toast({ title: "Validation error", description: "Name and URL are required", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const headersObj: Record<string, string> = {};
      headers.forEach((h) => { if (h.key.trim()) headersObj[h.key.trim()] = h.value; });

      const res = await fetch("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          method,
          headers: headersObj,
          body: body.trim() || null,
          pollingInterval: parseInt(pollingInterval),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create endpoint");
      }

      toast({ title: "Endpoint created", description: `${name} has been added` });
      onSuccess();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="My API" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="method">Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {HTTP_METHODS.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="url">URL</Label>
        <Input id="url" placeholder="https://api.example.com/health" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Headers</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addHeader}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {headers.map((h, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Key" value={h.key} onChange={(e) => updateHeader(i, "key", e.target.value)} className="flex-1" />
            <Input placeholder="Value" value={h.value} onChange={(e) => updateHeader(i, "value", e.target.value)} className="flex-1" />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeHeader(i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {!["GET", "HEAD"].includes(method) && (
        <div className="space-y-2">
          <Label htmlFor="body">Request Body</Label>
          <Textarea id="body" placeholder='{"key": "value"}' value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="interval">Polling Interval</Label>
        <Select value={pollingInterval} onValueChange={setPollingInterval}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {POLLING_INTERVALS.map((p) => (
              <SelectItem key={p.value} value={p.value.toString()}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating..." : "Create Endpoint"}
      </Button>
    </form>
  );
}
