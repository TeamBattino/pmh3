"use client";

import { Button } from "@/components/ui/Button";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginButton({ callbackUrl }: { callbackUrl: string }) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      className="w-full"
      size="lg"
      disabled={pending}
      onClick={() => {
        setPending(true);
        signIn("oidc", { callbackUrl });
      }}
    >
      {pending ? "Redirecting…" : "Login with Midata"}
    </Button>
  );
}
