import { buildApp } from "./app.js";
import { env } from "./config/env.js";

async function startServer() {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "Shutdown signal received");

    try {
      await app.close();

      app.log.info("Server shut down successfully");
      process.exitCode = 0;
    } catch (error) {
      app.log.error({ err: error }, "Shutdown failed");
      process.exitCode = 1;
    }
  };

  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });

  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    app.log.info(
      {
        host: env.HOST,
        port: env.PORT,
        environment: env.NODE_ENV,
      },
      "API server started",
    );
  } catch (error) {
    app.log.fatal({ err: error }, "Server startup failed");

    await app.close();
    process.exitCode = 1;
  }
}

void startServer();
