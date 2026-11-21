import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { connectDB } from "./db.js";

const db = await connectDB();

// CLIENT_URL এ কমা দিয়ে একাধিক ঠিকানা দেওয়া যায়, শেষের স্ল্যাশ বাদ যায়
const clientOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((item) => item.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const trustedOrigins = [
  ...new Set([...clientOrigins, "http://localhost:3000"]),
];

const baseURL = (process.env.BETTER_AUTH_URL || "").trim().replace(/\/+$/, "");

console.log("Trusted origins:", trustedOrigins.join(", "));
console.log("Auth base URL:", baseURL);

// Google এর কী .env এ থাকলেই Google লগইন চালু হবে
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const googleEnabled = Boolean(googleClientId && googleClientSecret);

console.log(googleEnabled ? "Google login: চালু" : "Google login: বন্ধ");

export const auth = betterAuth({
  database: mongodbAdapter(db),
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },

  socialProviders: googleEnabled
    ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        },
      }
    : {},

  user: {
    modelName: "users",
    additionalFields: {
      role: { type: "string", defaultValue: "student", input: true },
      plan: { type: "string", defaultValue: "free", input: false },
      phone: { type: "string", required: false },
      bio: { type: "string", required: false },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // সাইনআপে কেউ যেন নিজেকে admin বানাতে না পারে
          const role = user.role === "tutor" ? "tutor" : "student";
          return { data: { ...user, role, plan: "free" } };
        },
      },
      update: {
        before: async (user) => {
          // client থেকে role বা plan বদলানো আটকানো
          // eslint-disable-next-line no-unused-vars
          const { role, plan, ...safe } = user;
          return { data: safe };
        },
      },
    },
  },
});