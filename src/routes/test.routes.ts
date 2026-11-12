import type { FastifyInstance } from "fastify";
import { TestService } from "../services/test.service.js";
import { createTestSchema } from "../schemas/test.schema.js";
import { AppError } from "../utils/app-error.js";

export async function testRoutes(app: FastifyInstance) {
  const service = new TestService();

  app.post("/tests", async (request, reply) => {
    const parsed = createTestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid test data",
          details: parsed.error.flatten(),
        },
        requestId: request.id,
      });
    }

    const result = service.create(parsed.data);

    return reply.status(201).send({
      success: true,
      message: "Test created successfully",
      data: result,
    });
  });

  app.get("/tests", async () => ({
    success: true,
    data: service.findAll(),
  }));

  app.get<{ Params: { id: string } }>("/tests/:id", async (request) => {
    const result = service.findById(request.params.id);

    if (!result) {
      throw new AppError(404, "TEST_NOT_FOUND", "Test record not found");
    }

    return {
      success: true,
      data: result,
    };
  });

  app.delete<{ Params: { id: string } }>(
    "/tests/:id",
    async (request, reply) => {
      const deleted = service.delete(request.params.id);

      if (!deleted) {
        throw new AppError(404, "TEST_NOT_FOUND", "Test record not found");
      }

      return reply.status(200).send({
        success: true,
        message: "Test deleted successfully",
      });
    },
  );
}
