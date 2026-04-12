import { redirect } from "next/navigation";

/**
 * Rendered by Next.js `authInterrupts` when `unauthorized()` is called by
 * `requireServerPermission()`. Sends the user to the admin-styled
 * `/login` page.
 */
export default function Unauthorized() {
  redirect("/login");
}
