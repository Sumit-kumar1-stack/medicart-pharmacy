import { z } from "zod";

const schema = z.object({
  // ------------------------------------------------------------------
  // Application
  // ------------------------------------------------------------------
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  APP_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),

  // ------------------------------------------------------------------
  // Database
  // ------------------------------------------------------------------
  DATABASE_URL: z.string().min(1),

  // ------------------------------------------------------------------
  // Redis
  // ------------------------------------------------------------------
  REDIS_URL: z
    .string()
    .default("redis://localhost:6379"),

  // ------------------------------------------------------------------
  // Session
  // ------------------------------------------------------------------
  SESSION_COOKIE_NAME: z
    .string()
    .min(1)
    .default("medicart_session"),

  SESSION_TTL_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(90)
    .default(14),

  // ------------------------------------------------------------------
  // Storage
  // ------------------------------------------------------------------
  STORAGE_DRIVER: z
    .enum(["local", "s3"])
    .default("local"),

  LOCAL_STORAGE_DIR: z
    .string()
    .default("./storage/uploads"),

  S3_BUCKET: z.string().optional(),

  S3_REGION: z
    .string()
    .default("auto"),

  S3_ENDPOINT: z.string().optional(),

  S3_ACCESS_KEY_ID: z.string().optional(),

  S3_SECRET_ACCESS_KEY: z.string().optional(),

  REQUIRE_REMOTE_STORAGE_IN_PRODUCTION: z
    .string()
    .optional()
    .transform((v) => v !== "false"),

  // ------------------------------------------------------------------
  // Payment
  // ------------------------------------------------------------------
  PAYMENT_PROVIDER: z
    .enum(["demo", "razorpay"])
    .default("demo"),

  ALLOW_DEMO_PAYMENTS_IN_PRODUCTION: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  // ------------------------------------------------------------------
  // Razorpay
  // ------------------------------------------------------------------
  RAZORPAY_KEY_ID: z.string().optional(),

  RAZORPAY_KEY_SECRET: z.string().optional(),

  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),

  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment: ${parsed.error.issues
      .map((x) => `${x.path.join(".")}: ${x.message}`)
      .join("; ")}`
  );
}

export const env = parsed.data;