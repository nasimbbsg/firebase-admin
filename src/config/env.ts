import dotenv from "dotenv";
import z from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default("localhost"),
  LOG_LEVEL: z
    .enum(["fatal", "trace", "silent", "debug", "info", "warn", "error"])
    .default("info"),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),

  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().min(1),
  GOOGLE_PRIVATE_KEY: z.string().min(1),

  RTDN_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  GOOGLE_PUBSUB_PROJECT_ID: z.string().min(1).optional(),
  GOOGLE_PUBSUB_SUBSCRIPTION: z.string().min(1).optional(),

  APP_ONE_ID: z.string().min(1),
  APP_ONE_PACKAGE: z.string().min(1),

  APP_TWO_ID: z.string().min(1),
  APP_TWO_PACKAGE: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
