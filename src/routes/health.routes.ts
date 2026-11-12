import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  }));

  app.get("/ready", async (_request, reply) => {
    // Add database, cache and dependency checks here.
    return reply.send({
      success: true,
      status: "ready",
    });
  });
}
