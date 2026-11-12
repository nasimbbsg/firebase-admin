## 2. Main modules

### A. Subscription management

Support both Google Play and Apple App Store subscriptions.

Features:

- Validate Android subscriptions.
- Validate Apple subscriptions.
- Store subscription purchase information.
- Track subscription start date and expiry date.
- Track auto-renewal status.
- Track subscription status.
- Track trial subscriotions.
- Track grace periods and billing retries.
- Track cancellation and expiration.
- Handle subscription upgrades and downgrades.
- Restore purchases.
- Query subscriptions by user, application, platform, or product.
- Maintain complete subscription history.

```json
{
  "id": "sub_12345",
  "userId": "user_123",
  "appId": "my_app",
  "platform": "android",
  "productId": "premium_monthly",
  "originalTransactionId": "transaction_123",
  "status": "active",
  "startDate": "2026-11-01T00:00:00.000Z",
  "expiryDate": "2026-12-01T00:00:00.000Z",
  "autoRenew": true,
  "isTrial": false
}
```

Suggested subscription statuses:

- pending
- active
- grace_period
- billing_retry
- paused
- canceled
- expired
- revoked

Cancellation and expiration must remain distinct: a canceled subscription can still be entitled until its expiration date.

### B. In-app product management

Support:

- Android in-app purchases.
- Apple in-app purchases.
- Consumable products.
- Non-consumable products.
- Purcahse validation.
- Purchase history.
- Refund and revocation tracking.
- Duplicate purchase prevention.
- Product ownership checks.
- Query products by user and applciation.

Exanple:

```json
{
  "id": "purchase_123",
  "userId": "user_123",
  "appId": "my_app",
  "platform": "apple",
  "productId": "coins_1000",
  "productType": "consumable",
  "quantity": 1,
  "status": "completed",
  "purchaseDate": "2026-11-11T10:00:00.000Z"
}
```

### C. Subscription and product query APIs

This is especially importent because you want to retrieve information such as the number of subscriptions and their start/end dates.

I recommend supporting:

- Total subscruiption count.
- Active subscription count.
- Expired subscription count.
- Canceled subscription count.
- Subscriptions starting within a date range.
- Subscriptions expiring within a date range.
- Subscription history for a particular user.
- Products purchased by a particular user.
- Revenue and transaction summaries.
- Platform-sepcific reports.

For example:

```
GET /api/v1/subscriptions?status=active&platform=android&page=1&limit=20
```

```
GET /api/v1/subscriptions/stats?startDate=2026-11-01&endDate=2026-11-30
```

```
GET /api/v1/subscriptions/user/:userId
```

```
GET /api/v1/products/purchases?userId=user_123
```

### D. Firebase push notifications

We will integrate the official Firebase Admin SDK.

You shound support:

1. Send Notification to a single FCM registration token.
2. Send notification to multiple FCM tokens.
3. Send notification to a Firebase topic.
4. Subscribe devices to topics.
5. Unsubscribe devices from topics.
6. Send notification to all registered devices of a user.
7. Send notification to all devices belonging to an application.
8. Store notification histopry.
9. Track successful and failed deliveries based on FCM responses.
10. Remove invalid or expired registration token.

An important distinction: FCM uses registration tokens, not Firebase UIDs, for direct device delivery. Firebase Authentication UIDs identify users. We should maintain a mapping between users and their device registration tokens.

## 2. Push notification management

I would make this a complete notificationn service, not just an endpoint that sends messages.
<br>
Suggested endpoints:

| Method | Endpoint                                 | Purpose                       |
| :----- | :--------------------------------------- | :---------------------------- |
| POST   | /api/v1/notifications/send               | Send to one device            |
| POST   | /api/v1/notifications/send/multiple      | Send to multiple devices      |
| POST   | /api/v1/notifications/send/user/:userId  | Send to all devices of a user |
| POST   | /api/v1/notifications/send/topic         | Send to a topic               |
| POST   | /api/v1/notifications/topics/subscribe   | Subscribe device to topic     |
| POST   | /api/v1/notifications/topics/unsubscribe | Unsubscribe device            |
| POST   | /api/v1/devices/register                 | Register FCM token            |
| POST   | /api/v1/devices/:id                      | Remove registered device      |
| POST   | /api/v1/notifications/history            | Notification history          |

Example send request:

```json
{
  "appId": "my_app",
  "token": "FCM_REGISTRATION_TOKEN",
  "notification": {
    "title": "Premium Activated",
    "body": "Your premium subscription is now active."
  },
  "data": {
    "type": "subscription",
    "status": "active"
  }
}
```

Example user notification:

```json
{
  "appId": "my_app",
  "userId": "user_123",
  "notification": {
    "title": "Hello!",
    "body": "Welcome to our application."
  }
}
```

#### Device management

A user might use multiple devices, so one user can have multiple FCM tokens.
For example:

```json
User: user_123
│
├── Android phone
│   └── FCM token A
│
├── Android tablet
│   └── FCM token B
│
└── iPhone
    └── FCM token C
```

Your backend should manage this relationshipo automatically.

## 4. Multi-application support

This is one of the most important archectural dicisions.

Since you want one API for multiple services and mobile applications, don't hardcode one Android package name, one Apple bundle ID, or one Firebase project.

#### Create an application registry.

<br>
For example:

| App ID    | Android package      | Apple bundle         |
| :-------- | :------------------- | :------------------- |
| app_one   | com.company.appone   | com.company.appone   |
| app_two   | com.company.apptwo   | com.company.apptwo   |
| app_three | com.company.appthree | com.company.appthree |

Each application should have its own:

- Google Play credentials and package name.
- Apple App Store credentials and bundle ID.
- Firebase project configuration.
- Product catalog.
- Subscription catalog.
- FCM device registrations.
- Purchase history.

**Security:** Every request must be associated with an authenticated application. Never let a client choose an arbitrary `appId` and access another application's purchases.
For this, I recommend:

- Application API keys for identifying registered applications.
- User authentication for user-specific operations.
- Role-based authentication for administrative operations.
- Separate service credentials for each application.

Application API keys should be stored hased in the database, and production mobile applications should not be treated as trusted secret hilders.

## Recommended API structure

<br>
Here is how I would organize the complet API.

| Module                   | Endpoint                         | Method |
| :----------------------- | :------------------------------- | :----- |
| Android subscription     | /subscriptions/android           | POST   |
| Apple subscription       | /subscriptions/apple             | POST   |
| Android product          | /products/android                | POST   |
| Apple product            | /products/apple                  | POST   |
| Subscription list        | /subscriptions                   | GET    |
| Subscription details     | /subscriptions/:id               | GET    |
| User subscriptions       | /subscriptions/user/:userId      | GET    |
| Subscription statistics  | /subscriptions/stats             | GET    |
| Product purchase history | /products/purchases              | GET    |
| User purchases           | /products/purchases/user/:userId | GET    |
| Product statistics       | /products/stats                  | GET    |
| Send notification        | /notifications/send              | POST   |
| Send to user             | /notifications/send/user/:userId | POST   |
| Send to topic            | /notifications/send/topic        | POST   |
| Register device          | /devices/register                | POST   |
| List devices             | /devices                         | GET    |
| Remove device            | /devices/:id                     | DELETE |

<br>
Additional server-to-server endpoints:

| Endpoint                      | Purpose                              |
| :---------------------------- | :----------------------------------- |
| /webhooks/google/rtdn         | Google subscription lifecycle events |
| /webhooks/apple/notifications | Apple subscription lifecycle events  |

Google **RTDN** and Apple notifications are essential. Without them, your database can become outdated when subscriptions renew, expire, get refunded, or are revoked.

## 6. Database archecture

My recommendation is **PostgreSQL + Prisma ORM**.

```
Image
```

Also Include:

- `AppApiKey` - application credentials
- `Entitlement` - whether a user currently has premium access.
- `SubscriptionEvent` - renewal, cancellation, expiration and refund history.
- `NotificationJob` - asynchronous notification processing.
- `IdempotencyKey` - duplicate request prevention.

An important design decision: keep `Subscription` and `Entitlement` separate. A user might have premium access from a loifetime purchase even without an active subscription.

## 7. Recommended technology stack

| Component          | Technology                |
| :----------------- | :------------------------ |
| Runtime            | Node.js 22+               |
| Language           | TypeScript                |
| Framework          | Fastify 5                 |
| Databse            | PostgreSQL                |
| ORM                | Prisma                    |
| Cache              | Redis                     |
| Queue              | BullMQ                    |
| Andrpod validation | Google Play Developer API |
| Apple validation   | App Store Server Library  |
| Push notifications | Firebase Admin SDK        |
| Validation         | Zod                       |
| Logging            | Pino                      |
| Securoty           | Helmet, CORS, Rate-limit  |
| Testing            | Vitest                    |
| API documentation  | Swagger / OpenAPI         |
| Deployment         | Docker                    |

## 8. Final project structure

I would organize the code like this:

```
mobile-services-api/
│
├── src/
│   ├── app.ts
│   ├── server.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── logger.ts
│   │
│   ├── plugins/
│   │   ├── cors.ts
│   │   ├── helmet.ts
│   │   ├── rate-limit.ts
│   │   ├── prisma.ts
│   │   ├── authentication.ts
│   │   └── error-handler.ts
│   │
│   ├── modules/
│   │   ├── applications/
│   │   │   ├── application.routes.ts
│   │   │   ├── application.service.ts
│   │   │   └── application.schema.ts
│   │   │
│   │   ├── subscriptions/
│   │   │   ├── subscription.routes.ts
│   │   │   ├── subscription.service.ts
│   │   │   ├── subscription.repository.ts
│   │   │   └── providers/
│   │   │       ├── google.provider.ts
│   │   │       └── apple.provider.ts
│   │   │
│   │   ├── products/
│   │   │   ├── product.routes.ts
│   │   │   ├── product.service.ts
│   │   │   └── product.repository.ts
│   │   │
│   │   ├── notifications/
│   │   │   ├── notification.routes.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── fcm.provider.ts
│   │   │   └── notification.worker.ts
│   │   │
│   │   ├── devices/
│   │   │   ├── device.routes.ts
│   │   │   └── device.service.ts
│   │   │
│   │   ├── webhooks/
│   │   │   ├── google.routes.ts
│   │   │   └── apple.routes.ts
│   │   │
│   │   └── analytics/
│   │       ├── analytics.routes.ts
│   │       └── analytics.service.ts
│   │
│   ├── shared/
│   │   ├── errors/
│   │   ├── schemas/
│   │   ├── types/
│   │   └── utils/
│   │
│   └── routes/
│       └── index.ts
│
├── prisma/
│   └── schema.prisma
│
├── tests/
│   ├── subscriptions/
│   ├── products/
│   ├── notifications/
│   └── webhooks/
│
├── certs/
│   └── apple/
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── docker-compose.yml
```

```
Build the complete production-grade Mobile Services API with these decisions:
Database: PostgreSQL + Prisma
Authentication: Custom JWT authentication
Application isolation: Multiple apps, isolated data and credentials
Firebase notifications: FCM tokens + Firebase UID + topics
Dashboard: API only, dashboard later
Use Node.js, TypeScript, Fastify, PostgreSQL/selected ORM, and modular architecture. Include complete source files, Prisma schema if applicable, Google and Apple purchase validation, subscription lifecycle webhooks, product management, FCM, tests, Docker, and production security.
```

### Dependencies

```bash
# Core
npm install fastify@^5.12.8
npm install @fastify/cors @fastify/helmet @fastify/rate-limit
npm install @fastify/jwt@^10
npm install @fastify/swagger @fastify/swagger-ui
npm install fastify-plugin

# Database
npm install @prisma/client@^7.10.1
npm install @prisma/adapter-pg@^7.10.1 pg

# Authentication and validation
npm install argon2 zod dotenv

# Google and Apple
npm install googleapis
npm install @apple/app-store-server-library

# Firebase
npm install firebase-admin@^14.5.0

# Redis and queues
npm install ioredis bullmq

# Utilities
npm install pino pino-pretty

# Development
npm install -D typescript tsx @types/node @types/pg
npm install -D prisma@^7.10.1 vitest @vitest/coverage-v8
```
