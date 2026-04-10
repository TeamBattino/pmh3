import { redirect } from "next/navigation";

/**
 * Rendered by Next.js `authInterrupts` when `unauthorized()` is called by
 * `requireServerPermission()`. Redirects to next-auth's sign-in page.
 */
export default function Unauthorized() {
  redirect("/auth/signin?callbackUrl=/");
}
