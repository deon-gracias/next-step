import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";

const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.VERCEL_URL ?? "http://localhost:3000");

export const authClient = createAuthClient({
  plugins: [organizationClient(), adminClient()],
  baseURL: baseURL,
});
