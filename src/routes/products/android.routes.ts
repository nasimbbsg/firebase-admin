import type { FastifyInstance } from "fastify";
import z from "zod";
import { AppError } from "../../utils/app-error.js";
import {
  acknowledgeAndroidProduct,
  verifyAndroidProduct,
} from "../../services/purchase/android-product.service.js";

const requestSchema = z
  .object({
    appId: z.string().min(1),
    productId: z.string().min(1),
    purchaseToken: z.string().min(1).max(4096),
  })
  .strict();

export async function androidProductRoutes(app: FastifyInstance) {
  app.post("/products/android", async (request, reply) => {
    const parsed = requestSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Invalid product verification request",
      );
    }

    const input = parsed.data;

    try {
      const result = await verifyAndroidProduct(input);

      // TODO: In one DB transaction, store the purchase (unique on orderId /
      // token hash) and grant the entitlement or coins. Skip if already stored.

      // Non-consumables must be acknowledged. Do this AFTER persisting the
      // grant. Consumables are acknowledged by the client's consumeAsync().
      if (
        result.canGrant &&
        result.productType === "non_consumable" &&
        !result.isAcknowledged
      ) {
        await acknowledgeAndroidProduct(input);
      }

      return reply.status(200).send({
        success: true,
        message: result.canGrant
          ? "Purchase verified successfully"
          : "Purchase nverified but cannot be granted",
        data: result,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      request.log.error(
        { err: error, appId: input.appId, productId: input.productId },
        "Android product verification failed",
      );

      throw new AppError(
        502,
        "GOOGLE_VERIFICATION_FAILED",
        "Unable to verify purchase with Google Play",
      );
    }
  });
}
