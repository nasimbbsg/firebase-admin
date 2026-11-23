import Fastify from "fastify";
import { env } from "./config/env.js";
import { registerCors } from "./plugins/cors.js";
import { registerHelmet } from "./plugins/helmet.js";
import { registerRateLimit } from "./plugins/rate-limit.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { registerRoutes } from "./routes/index.js";
import { registerRtdn } from "./plugins/rtdn.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,

      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.headers.set-cookie",
          "req.body.password",
          "req.body.token",
          "req.body.secret",
        ],
        censor: "[REDACTED]",
      },
    },

    requestIdHeader: "x-request-id",
    genReqId: () => crypto.randomUUID(),

    trustProxy: false,
    bodyLimit: 1024 * 1024,
    connectionTimeout: 100000,
    keepAliveTimeout: 72000,
  });

  await registerCors(app);
  await registerHelmet(app);
  await registerRateLimit(app);
  await registerErrorHandler(app);
  await registerRoutes(app);
  await registerRtdn(app);

  return app;
}
