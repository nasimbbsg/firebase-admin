import { createHash } from "node:crypto";
import { getGoogleApp } from "../../config/google-apps.js";
import { androidPublisher } from "./google-client.js";

export interface VerifyAndroidSubscriptionInput {
  appId: string;
  productId: string;
  purchaseToken: string;
}

export async function verifyAndroidSubscription(
  input: VerifyAndroidSubscriptionInput,
) {
  const { appId, productId, purchaseToken } = input;

  //Resolve package name from trusted server configuration.
  const app = getGoogleApp(appId);

  if (!app) {
    throw new Error("UNSUPPORTED_APPLICATION");
  }

  const tokenHash = createHash("sha256").update(purchaseToken).digest("hex");

  // Verify purchase directly with Google.
  const response = await androidPublisher.purchases.subscriptionsv2.get({
    packageName: app.packageName,
    token: purchaseToken,
  });

  const purchase = response.data;

  // Find the purchased product in the subscription.
  const lineItem = purchase.lineItems?.find(
    (item) => item.productId === productId,
  );

  if (!lineItem) {
    throw new Error("PRODUCT_MISMATCH");
  }

  const now = Date.now();

  const expiryDate = lineItem.expiryTime ? new Date(lineItem.expiryTime) : null;

  const startDate = purchase.startTime ? new Date(purchase.startTime) : null;

  const state = purchase.subscriptionState;

  const activeStates = [
    "SUBSCRIPTION_STATE_ACTIVE",
    "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  ];

  const isActive =
    activeStates.includes(state ?? "") &&
    expiryDate !== null &&
    expiryDate.getTime() > now;

  return {
    appId,
    packageName: app.packageName,
    platform: "android",
    productId,
    purchaseToken: tokenHash,
    subscriptionState: state ?? "UNKNOWN",
    isActive,
    startDate: startDate?.toISOString() ?? null,
    expiryDate: expiryDate?.toISOString() ?? null,
    autoRenew: lineItem.autoRenewingPlan?.autoRenewEnabled ?? false,
    acknoledgementState: purchase.acknowledgementState ?? null,
    latestOrderId: lineItem.latestSuccessfulOrderId ?? null,
    verifiedAt: new Date().toISOString(),
  };
}
