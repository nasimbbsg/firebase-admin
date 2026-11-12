import { describe, it, expect, beforeEach, afterEach } from "vitest";

import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

describe("Testing API", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("should return health status", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("healthy");
  });

  it("should create a test record", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/tests",
      payload: {
        name: "API Integration Test",
        description: "Testing endpoint",
        status: "passed",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().success).toBe(true);
    expect(response.json().data.name).toBe("API Integration Test");
  });

  it("should reject invalid input", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/tests",
      payload: {
        name: "A",
        status: "invalid",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().success).toBe(false);
  });

  it("should return 404 for missing records", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/tests/non-existent",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("TEST_NOT_FOUND");
  });

  it("should return 404 for unknown routes", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/unknown-route",
    });

    expect(response.statusCode).toBe(404);
  });
});
