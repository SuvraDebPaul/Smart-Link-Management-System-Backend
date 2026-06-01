import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import config from "../../config/index.js";
import { BillingServices } from "../billing/billing.service.js";
import { LoginSecurityServices } from "../notification/login-security.service.js";
import { AccountDeletionServices } from "../user/account-deletion.service.js";
import { PasswordResetEmailServices } from "./password-reset-email.service.js";
import { EmailVerificationServices } from "./email-verification.service.js";

const mongoClient = new MongoClient(config.database_url);

await mongoClient.connect();

export const betterAuthInstance = betterAuth({
  database: mongodbAdapter(mongoClient.db(), {
    client: mongoClient,
  }),

  secret: config.better_auth_secret,
  baseURL: config.better_auth_url,
  basePath: "/api/auth",

  trustedOrigins: [config.frontend_url],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await PasswordResetEmailServices.sendPasswordResetEmail(user.email, url);
    },
    resetPasswordTokenExpiresIn: 60 * 60,
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await EmailVerificationServices.sendVerificationEmail(user.email, url);
    },
    sendOnSignUp: true,
    sendOnSignIn: true,
    expiresIn: 60 * 60,
  },

  databaseHooks: {
    session: {
      create: {
        after: async (session, context) => {
          try {
            await LoginSecurityServices.createLoginSecurityAlert({
              betterAuthUserId: session.userId,
              sessionId: session.id,
              ipAddress: session.ipAddress,
              userAgent: session.userAgent,
              path: context?.path,
            });
          } catch (error) {
            console.error("Failed to create login security alert", error);
          }
        },
      },
    },
  },

  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        await BillingServices.cancelSubscriptionForAccountDeletion(user.id);
      },
      afterDelete: async (user) => {
        await AccountDeletionServices.deleteAppUserData(user.id);
      },
    },
  },

  socialProviders: {
    ...(config.google_client_id && config.google_client_secret
      ? {
          google: {
            clientId: config.google_client_id,
            clientSecret: config.google_client_secret,
          },
        }
      : {}),

    ...(config.github_client_id && config.github_client_secret
      ? {
          github: {
            clientId: config.github_client_id,
            clientSecret: config.github_client_secret,
          },
        }
      : {}),
  },
});
