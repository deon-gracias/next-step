import { db } from "@/server/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import * as schema from "@/server/db/schema";
import { surveyor, admin, ac, viewer } from "./permissions";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
    schema: {
      ...schema,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      accessControl: ac,
      roles: {
        admin,
        viewer,
        surveyor,
      },
    }),
    nextCookies(),
  ],
});
