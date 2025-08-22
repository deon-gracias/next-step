import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

const baseURL =
typeof window !== "undefined"
? window.location.origin
: process.env.APP_URL ?? "http://localhost:3000";

export const authClient = createAuthClient({
plugins: [organizationClient()],
baseURL,
});