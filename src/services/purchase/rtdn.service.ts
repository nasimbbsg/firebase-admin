import type { FastifyBaseLogger } from "fastify";
import { createHash } from "node:crypto";
import { env } from "../../config/env.js";
import { Message, PubSub, Subscription } from "@google-cloud/pubsub";

const SUBSCRIPTION_TYPES: Record<number, string> = {
  1: "SUBSCRIPTION_RECOVERED",
  2: "SUBSCRIPTION_RENEWED",
  3: "SUBSCRIPTION_CANCELED",
  4: "SUBSCRIPTION_PURCHASED",
  5: "SUBSCRIPTION_ON_HOLD",
  6: "SUBSCRIPTION_IN_GRACE_PERIOD",
  7: "SUBSCRIPTION_RESTARTED",
  8: "SUBSCRIPTION_PRICE_CHANGE_CONFIRMED",
  9: "SUBSCRIPTION_DEFERRED",
  10: "SUBSCRIPTION_PAUSED",
  11: "SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED",
  12: "SUBSCRIPTION_REVOKED",
  13: "SUBSCRIPTION_EXPIRED",
};

const ONE_TIME_TYPES: Record<number, string> = {
  1: "ONE_TIME_PRODUCT_PURCHASED",
  2: "ONE_TIME_PRODUCT_CANCELED",
};

const hashToken = (token?: string) =>
  token ? createHash("sha256").update(token).digest("hex") : undefined;

export interface RtdnListener {
  close(): Promise<void>;
}

export function startRtdnListener(log: FastifyBaseLogger): RtdnListener | null {
  if (
    !env.RTDN_ENABLED ||
    !env.GOOGLE_PUBSUB_PROJECT_ID ||
    !env.GOOGLE_PUBSUB_SUBSCRIPTION
  ) {
    log.info("RTDN listener disabled");
    return null;
  }

  const pubsub = new PubSub({
    projectId: env.GOOGLE_PUBSUB_PROJECT_ID,
    credentials: {
      client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
  });

  const subscription: Subscription = pubsub.subscription(
    env.GOOGLE_PUBSUB_SUBSCRIPTION,
    {
      flowControl: {
        maxMessages: 10,
      },
    },
  );

  subscription.on("message", (message: Message) => {
    try {
      // With the client library, message.data is already raw bytes
      // (not base64 like in push delivery).

      const payload = JSON.parse(message.data.toString("utf8"));

      // Never log raw purchase tokens: replace with a hash.
      const sub = payload.subscriptionNotification;
      const oneTime = payload.oneTimeProductNotification;
      const voided = payload.voidedPurchaseNotification;

      log.info(
        {
          messageId: message.id,
          deliveryAttempt: message.deliveryAttempt,
          packageName: payload.packageName,
          eventTime: payload.eventTimeMillis
            ? new Date(Number(payload.eventTimeMillis)).toISOString()
            : null,
          testNotification: payload.testNotification ?? undefined,
          subscriptionNotification: sub && {
            ...sub,
            notificationTypeName: SUBSCRIPTION_TYPES[sub.notificationType],
            purchaseToken: undefined,
            purchaseTokenHash: hashToken(sub.purchaseToken),
          },
          oneTimeProductNotification: oneTime && {
            ...oneTime,
            notificationTypeName: ONE_TIME_TYPES[oneTime.notificationType],
            purchaseToken: undefined,
            purchaseTokenHash: hashToken(oneTime.purchaseToken),
          },
          voidedPurchaseNotification: voided && {
            ...voided,
            purchaseToken: undefined,
            purchaseTokenHash: hashToken(voided.purchaseToken),
          },
        },
        "Play RTDN received",
      );

      // TODO: for real handling, re-verify with Google (subscriptionsv2.get),
      // persist, and update entitlements BEFORE acking.
      message.ack();
    } catch (error) {
      log.error(
        { err: error, messageId: message.id },
        "Failed to process RTDN message",
      );
      // Ack malformed messages so they don't redeliver forever.
      // Use message.nack() instead for transient failures you want retried.
      message.ack();
    }
  });

  subscription.on("error", (error) => {
    log.error({ err: error }, "RTDN subscription error");
  });

  log.info(
    { subscription: env.GOOGLE_PUBSUB_SUBSCRIPTION },
    "RTDN listener started",
  );

  return {
    async close() {
      await subscription.close();
      await pubsub.close();
    },
  };
}
