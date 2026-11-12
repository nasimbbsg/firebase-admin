import type { FastifyInstance } from "fastify";
import z from "zod";
import { AppError } from "../../utils/app-error.js";
import { verifyAndroidSubscription } from "../../services/purchase/android-subscription.service.js";
import { decodeBase64 } from "../../plugins/base64.js";
import { googleApps } from "../../config/google-apps.js";

const requestSchema = z
  .object({
    appId: z.string().min(1).optional(),
    packageName: z.string().min(1).optional(),
    productId: z.string().min(1),
    purchaseToken: z.string().min(1).max(4096),
  })
  .strict()
  .refine((data) => Boolean(data.appId || data.packageName), {
    message: "Either appId or packageName is required",
  });

const querySchema = z
  .object({
    a: z.string().min(1).max(16384),
  })
  .strict();

export async function androidSubscriptionRoutes(app: FastifyInstance) {
  app.get("/subscriptions/android", async (request, reply) => {
    const query = querySchema.safeParse(request.query);

    if (!query.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "Missing or invalid query parameter 'a'",
      );
    }
    const decoded = decodeBase64(query.data.a);

    const parsed = requestSchema.safeParse(decoded);

    if (!parsed.success) {
      throw new AppError(
        400,
        "VALICATION_ERROR",
        "Invalid subscription verification request",
      );
    }

    const { appId, packageName, productId, purchaseToken } = parsed.data;

    // Resolve application using appId or packageName
    const application = appId
      ? googleApps[appId]
      : Object.values(googleApps).find(
          (app) => app.packageName === packageName,
        );

    if (!application) {
      throw new AppError(400, "INVALID_APPLICATION", "Unsupported application");
    }

    // If both are supplied, ensure they belong to the same application.
    if (packageName && packageName !== application.packageName) {
      throw new AppError(
        400,
        "APPLICATION_MISMATCH",
        "appId and packageName do not match",
      );
    }

    // TODO: Check productId against this application's
    // server-managed product catalog.

    try {
      const result = await verifyAndroidSubscription({
        appId: application.appId,
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
          { packageName, productId, googleStatus, googleReason },
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
        { err: error, packageName, productId },
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
