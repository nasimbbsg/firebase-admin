import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { startRtdnListener } from "../services/purchase/rtdn.service.js";

export const registerRtdn = fp(async (app: FastifyInstance) => {
  let listener: ReturnType<typeof startRtdnListener> = null;

  app.addHook("onReady", async () => {
    listener = startRtdnListener(app.log);
  });

  app.addHook("onClose", async () => {
    await listener?.close();
  });
});
