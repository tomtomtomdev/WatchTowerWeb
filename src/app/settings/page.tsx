"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Settings {
  loginBaseUrl: string;
  loginEmail: string;
  loginPassword: string;
  hasPassword: boolean;
  cachedAccessToken: string | null;
  cachedUserId: string | null;
  tokenRefreshedAt: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{ requestBody: Record<string, unknown>; responseBody: Record<string, unknown>; responseStatus: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then(setSettings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      // Step 1: Save settings
      const saveRes = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginBaseUrl: settings.loginBaseUrl,
          loginEmail: settings.loginEmail,
          loginPassword: settings.loginPassword,
        }),
      });
      if (!saveRes.ok) {
        toast({ title: "Failed to save settings", variant: "destructive" });
        return;
      }

      toast({ title: "Settings saved, testing login..." });

      // Step 2: Trigger login flow
      const loginRes = await fetch("/api/settings/test-login", { method: "POST" });
      const loginData = await loginRes.json();

      if (loginData.debug) {
        setDebugInfo(loginData.debug);
      }

      if (loginRes.ok && loginData.success) {
        // Update displayed credentials
        setSettings({
          ...settings,
          hasPassword: true,
          loginPassword: "••••••••",
          cachedAccessToken: loginData.accessToken,
          cachedUserId: loginData.userId,
          tokenRefreshedAt: new Date().toISOString(),
        });
        toast({ title: "Login successful" });
      } else {
        // Refresh settings to show current state
        const refreshRes = await fetch("/api/settings");
        if (refreshRes.ok) {
          setSettings(await refreshRes.json());
        }
        toast({
          title: "Login failed",
          description: loginData.error || "Check credentials and RSA_PUBLIC_KEY",
          variant: "destructive"
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return <div className="p-6">Failed to load settings</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure login credentials for apply-code authentication</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Login Credentials</CardTitle>
          <CardDescription>
            These credentials are used for the apply-code login flow when refreshing tokens.
            The RSA public key is configured via the RSA_PUBLIC_KEY environment variable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loginBaseUrl">Base URL</Label>
            <Input
              id="loginBaseUrl"
              placeholder="https://api.example.com"
              value={settings.loginBaseUrl}
              onChange={(e) => setSettings({ ...settings, loginBaseUrl: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loginEmail">Email</Label>
            <Input
              id="loginEmail"
              type="email"
              placeholder="your-email@example.com"
              value={settings.loginEmail}
              onChange={(e) => setSettings({ ...settings, loginEmail: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loginPassword">Password</Label>
            <Input
              id="loginPassword"
              type="password"
              placeholder={settings.hasPassword ? "••••••••" : "Enter password"}
              value={settings.loginPassword}
              onChange={(e) => setSettings({ ...settings, loginPassword: e.target.value })}
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving & Testing..." : "Save & Test Login"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cached Credentials</CardTitle>
          <CardDescription>
            Current access token and user ID from the last successful login
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Access Token</Label>
            <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
              {settings.cachedAccessToken || <span className="text-muted-foreground">Not available</span>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>User ID</Label>
            <div className="p-3 bg-muted rounded-md font-mono text-sm">
              {settings.cachedUserId || <span className="text-muted-foreground">Not available</span>}
            </div>
          </div>
          {settings.tokenRefreshedAt && (
            <div className="space-y-2">
              <Label>Last Refreshed</Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                {new Date(settings.tokenRefreshedAt).toLocaleString()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {debugInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Login Request / Response</CardTitle>
            <CardDescription>
              Debug info from the last login attempt (HTTP {debugInfo.responseStatus})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Request Body</Label>
              <pre className="p-3 bg-muted rounded-md font-mono text-xs overflow-auto max-h-60">
                {JSON.stringify(debugInfo.requestBody, null, 2)}
              </pre>
            </div>
            <div className="space-y-2">
              <Label>Response Body</Label>
              <pre className="p-3 bg-muted rounded-md font-mono text-xs overflow-auto max-h-60">
                {JSON.stringify(debugInfo.responseBody, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
