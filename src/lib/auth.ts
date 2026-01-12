import { db } from "@/server/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import {
  organization as organizationPlugin,
  admin as adminPlugin,
} from "better-auth/plugins";
import * as schema from "@/server/db/schema";
import {
  surveyor,
  admin,
  ac,
  viewer,
  facility_coordinator,
  lead_surveyor,
} from "./permissions";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Email sending function for password reset
async function sendResetPasswordEmail({
  user,
  url,
  token,
}: {
  user: { email: string; name?: string | null };
  url: string;
  token: string;
}) {
  console.log("Sending password reset email via Better Auth");
  console.log("Reset URL:", url);

  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: [user.email],
      subject: "Reset your password",
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333333; margin: 0; font-size: 28px; font-weight: 600;">🔐 Password Reset</h1>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
            <p style="margin: 0; color: #666666; font-size: 16px; line-height: 1.5;">
              Hi ${user.name || user.email},
            </p>
            <p style="margin: 15px 0 0 0; color: #666666; font-size: 16px; line-height: 1.5;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${url}" 
               style="background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(0,123,255,0.3); transition: background-color 0.2s;">
              Reset Password
            </a>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 25px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              ⏰ <strong>This link will expire in 1 hour</strong> for security reasons.
            </p>
          </div>
          
          <div style="border-top: 1px solid #eeeeee; padding-top: 20px; margin-top: 30px;">
            <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.4;">
              If you didn't request this password reset, please ignore this email or contact support if you have concerns.
            </p>
            <p style="margin: 10px 0 0 0; color: #999999; font-size: 14px;">
              <strong>Can't click the button?</strong> Copy and paste this link: <br>
              <span style="color: #007bff; word-break: break-all; font-size: 12px;">${url}</span>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee;">
            <p style="margin: 0; color: #999999; font-size: 12px;">
              This email was sent automatically. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Password reset email sent successfully via Better Auth");
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    throw error;
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),
  trustedOrigins: [
    "https://nshc-survey-system.vercel.app",
    "http://localhost:3000",
    "https://next-step-git-main-soham-03s-projects.vercel.app",
  ],
  emailAndPassword: {
    enabled: true,
    // Add password reset configuration
    sendResetPassword: sendResetPasswordEmail,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour in seconds
  },
  plugins: [
    organizationPlugin({
      accessControl: ac,
      roles: { admin, viewer, lead_surveyor, surveyor, facility_coordinator },
    }),
    adminPlugin(),
    nextCookies(),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});

export type Session = typeof auth.$Infer.Session;
