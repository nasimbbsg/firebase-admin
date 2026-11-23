import { google } from "googleapis";
import { env } from "../../config/env.js";

const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/androidpublisher"],
});

await auth.authorize();

export const androidPublisher = google.androidpublisher({
  version: "v3",
  auth,
});
