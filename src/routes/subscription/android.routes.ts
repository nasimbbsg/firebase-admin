import type { FastifyInstance } from "fastify";
import z from "zod";
import { AppError } from "../../utils/app-error.js";
import { getGoogleApp } from "../../config/google-apps.js";
import { verifyAndroidSubscription } from "../../services/purchase/android-subscription.service.js";

const requestSchema = z
  .object({
    appId: z.string().min(1),
    productId: z.string().min(1),
    purchaseToken: z.string().min(1).max(4096),
  })
  .strict();

export async function androidSubscriptionRoutes(app: FastifyInstance) {
  app.post("/subscriptions/android", async (request, reply) => {
    const parsed = requestSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new AppError(
        400,
        "VALICATION_ERROR",
        "Invalid subscription verification request",
      );
    }

    const { appId, productId, purchaseToken } = parsed.data;

    const application = getGoogleApp(appId);

    if (!application) {
      throw new AppError(400, "INVALID_APPLICATION", "Unsupported application");
    }

    // TODO: Check productId against this application's
    // server-managed product catalog.

    try {
      const result = await verifyAndroidSubscription({
        appId,
        productId,
        purchaseToken,
      });

      // TODO: Persist the verified transaction and
      // update the user's entitlement atomically.

      return reply.status(200).send({
        success: true,
        message: result.isActive
          ? "Subscription verified successfully"
          : "Subscription verified but not currently active",
        data: result,
      });
    } catch (error: any) {
      const googleStatus = error?.response?.status ?? error?.code;
      const googleReason = error?.response?.data?.error?.errors?.[0]?.reason;

      if (
        googleStatus === 410 ||
        googleReason === "subscriptionPurchaseNoLongerAvailable"
      ) {
        request.log.warn(
          { appId, productId, googleStatus, googleReason },
          "Android subscription purchase has expired beyond Google's query window",
        );

        return reply.status(200).send({
          success: true,
          message: "Subscription has expired and is no longer verifiable",
          data: {
            isActive: false,
            status: "EXPIRED",
          },
        });
      }

      if (error instanceof Error && error.message === "PRODUCT_MISMATCH") {
        throw new AppError(
          422,
          "PRODUCT_MISMATCH",
          "Purchased product does not match the required product",
        );
      }

      request.log.error(
        { err: error, appId, productId },
        "Android subscription verification failed",
      );

      throw new AppError(
        502,
        "GOOGLE_VERIFICATION_FAILED",
        "Unable to verify subscription with Google Play",
      );
    }
  });
}

// POST /api/v1/subscriptions/android

// json
// {
//   "appId": "app_one",
//   "productId": "premium_monthly",
//   "purchaseToken": "GOOGLE_PURCHASE_TOKEN"
// }
