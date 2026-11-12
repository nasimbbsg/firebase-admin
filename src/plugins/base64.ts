import { AppError } from "../utils/app-error.js";

export function decodeBase64(value: string): unknown {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch (error) {
    throw new AppError(
      400,
      "INVALIDE_ENCODED_REQUEST",
      "Invalid Base64 encoded request",
    );
  }
}
