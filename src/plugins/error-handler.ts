import type { FastifyError, FastifyInstance } from "fastify";

import { AppError } from "../utils/app-error.js";

export async function registerErrorHandler(
  app: FastifyInstance,
): Promise<void> {
  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: "ROUTE_NOT_FOUND",
        message: `Route ${request.method} ${request.url} not found`,
      },
      requestId: request.id,
    });
  });

  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    // Custom application errors
    if (error instanceof AppError) {
      request.log.warn(
        {
          err: error,
          code: error.code,
        },
        "Application error",
      );

      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
        requestId: request.id,
      });
    }

    // Fastify validation errors
    const fastifyError = error as FastifyError;

    if (fastifyError.validation) {
      request.log.warn(
        {
          err: error,
          validation: fastifyError.validation,
        },
        "Request validation failed",
      );

      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: fastifyError.validation,
        },
        requestId: request.id,
      });
    }

    // Determine HTTP status code
    const statusCode =
      fastifyError.statusCode &&
      fastifyError.statusCode >= 400 &&
      fastifyError.statusCode < 500
        ? fastifyError.statusCode
        : 500;

    // Log unexpected errors
    request.log.error(
      {
        err: error,
        statusCode,
      },
      "Unhandled request error",
    );

    // Return safe error response
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: statusCode === 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR",

        message:
          statusCode === 500 ? "An unexpected error occurred" : error.message,
      },
      requestId: request.id,
    });
  });
}
