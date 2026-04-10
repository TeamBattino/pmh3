"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { defaultSecurityConfig } from "@/lib/security/security-config";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function DevSignInForm() {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn("credentials", {
      roles: JSON.stringify(selectedRoles),
      redirectTo: "/",
    });
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-3xl">Developer Login</CardTitle>
          <CardDescription>
            Select roles to simulate for your session. This is only available in
            development mode.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              {defaultSecurityConfig.roles.map((role) => (
                <label
                  key={role.name}
                  className="flex items-start space-x-4 rounded-lg border p-4 hover:bg-accent cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.name)}
                    onChange={() => toggleRole(role.name)}
                    className="mt-1 h-4 w-4 rounded border-input"
                  />
                  <div className="flex flex-col">
                    <div className="font-semibold">
                      {role.name}
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      {role.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <Button type="submit" size="lg" className="w-full">
              Sign In with Selected Roles
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
