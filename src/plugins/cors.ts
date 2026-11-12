import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";

export async function registerCors(app: FastifyInstance) {
  const origins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

  await app.register(cors, {
    origin: origins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    maxAge: 86400,
  });
}
