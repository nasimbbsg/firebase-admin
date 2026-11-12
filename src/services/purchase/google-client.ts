import { google } from "googleapis";
import { env } from "../../config/env.js";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/androidpublisher"],
});

export const androidPublisher = google.androidpublisher({
  version: "v3",
  auth,
});
