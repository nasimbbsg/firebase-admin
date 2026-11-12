import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.routes.js";
import { testRoutes } from "./test.routes.js";
import { androidSubscriptionRoutes } from "./subscription/android.routes.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(healthRoutes);
  await app.register(testRoutes, {
    prefix: "/api/v1",
  });
  await app.register(androidSubscriptionRoutes, {
    prefix: "/api/v1",
  });
}
