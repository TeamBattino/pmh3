/**
 * The admin's own OAuth client is managed by the auth service via env vars
 * (ADMIN_URL, ADMIN_CLIENT_SECRET). It's synced on every boot and must not
 * be editable from the admin UI, otherwise a bad edit would lock the admin
 * out of its own login flow.
 */
export const SYSTEM_ADMIN_CLIENT_ID = "pfadimh-admin";
