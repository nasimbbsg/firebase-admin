import { createHash } from "node:crypto";
import { getGoogleApp } from "../../config/google-apps.js";
import { getCatalogProduct } from "../../config/product-catalog.js";
import { AppError } from "../../utils/app-error.js";
import { androidPublisher } from "./google-client.js";

export interface VerifyAndroidProductInput {
  appId: string;
  productId: string;
  purchaseToken: string;
}

// Google ProductPurchase.purchaseState
const PURCHASE_STATE_PURCHASED = 0;
const PURCHASE_STATE_CANCELED = 1;
const PURCHASE_STATE_PENDING = 2;

// Google ProductPurchase.consumptionState
const CONSUMPTION_STATE_CONSUMED = 1;

// Google ProductPurchase.acknowledgementState
const ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED = 1;

function getGoogleStatus(error: any): number | undefined {
  const status = error?.response?.status ?? error?.status ?? error?.code;
  return typeof status === "number" ? status : Number(status) || undefined;
}

function mapGoogleError(error: unknown): never {
  const status = getGoogleStatus(error);

  // 400/404/410: invalid token, token not for this product/package, or gone.
  if (status === 400 || status === 404 || status === 410) {
    throw new AppError(
      404,
      "PURCHASE_NOT_FOUND",
      "Purchase not found for this product",
    );
  }

  throw new AppError(
    502,
    "GOOGLE_VERIFICATION_FAILED",
    "Unable to verify purchase with Google Play",
  );
}

function stateLabel(state: number | null | undefined): string {
  switch (state) {
    case PURCHASE_STATE_PURCHASED:
      return "PURCHASED";
    case PURCHASE_STATE_CANCELED:
      return "CANCELED";
    case PURCHASE_STATE_PENDING:
      return "PENDING";
    default:
      return "UNKNOWN";
  }
}

export async function verifyAndroidProduct(input: VerifyAndroidProductInput) {
  const { appId, productId, purchaseToken } = input;

  // Package name comes from trusted server configuration
  const app = getGoogleApp(appId);

  if (!app) {
    throw new AppError(400, "INVALID_APPLICATION", "Unsupported application");
  }

  // Product type come from the server catalog, vever from the client.
  const product = getCatalogProduct(appId, productId);

  if (!product) {
    throw new AppError(
      422,
      "PRODUCT_NOT_FOUND",
      "Product is not part of this application's catalog",
    );
  }

  let purchase;

  try {
    const response = await androidPublisher.purchases.products.get({
      packageName: app.packageName,
      productId,
      token: purchaseToken,
    });
    purchase = response.data;
  } catch (error) {
    mapGoogleError(error);
  }

  const isPurchased = purchase.purchaseState === PURCHASE_STATE_PURCHASED;
  const isPending = purchase.purchaseState === PURCHASE_STATE_PENDING;
  const isConsumed = purchase.consumptionState === CONSUMPTION_STATE_CONSUMED;
  const isAcknowledged =
    purchase.acknowledgementState === ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED;

  // Whether the backend may grant the item right now.
  // - non-consumable: any completed purchase (also covers restore).
  // - consumable: completed AND not yet consumed (replay protection).
  const canGrant =
    isPurchased && (product.type === "non_consumable" || !isConsumed);

  const purchaseTime = purchase.purchaseTimeMillis
    ? new Date(Number(purchase.purchaseTimeMillis))
    : null;

  return {
    appId,
    packagename: app.packageName,
    platform: "android" as const,
    productId,
    productType: product.type,
    purchaseToekn: createHash("sha256").update(purchaseToken).digest("hex"),
    orderId: purchase.orderId ?? null,
    purchaseState: stateLabel(purchase.purchaseState),
    isPurchased,
    isPending,
    isConsumed,
    isAcknowledged,
    canGrant,
    quantity: purchase.quantity ?? 1,
    isTestPurchase: purchase.purchaseType === 0,
    regionCode: purchase.regionCode ?? null,
    obfuscatedExternalAccountId: purchase.obfuscatedExternalAccountId ?? null,
    purchaseDate: purchaseTime?.toISOString() ?? null,
    verifiedAt: new Date().toISOString(),
  };
}

// Must be called withon 3 days of purchase or Google regunds it.
export async function acknowledgeAndroidProduct(
  input: VerifyAndroidProductInput,
): Promise<void> {
  const app = getGoogleApp(input.appId);

  if (!app) {
    throw new AppError(400, "INVALID_APPLICATION", "Unsupported application");
  }

  try {
    await androidPublisher.purchases.products.acknowledge({
      packageName: app.packageName,
      productId: input.productId,
      token: input.purchaseToken,
    });
  } catch (error) {
    mapGoogleError(error);
  }
}
