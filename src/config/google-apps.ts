import { env } from "./env.js";

export interface GoogleAppConfig {
  appId: string;
  packageName: string;
}

export const googleApps: Record<string, GoogleAppConfig> = {
  [env.APP_ONE_ID]: {
    appId: env.APP_ONE_ID,
    packageName: env.APP_ONE_PACKAGE,
  },

  [env.APP_TWO_ID]: {
    appId: env.APP_TWO_ID,
    packageName: env.APP_TWO_PACKAGE,
  },
};

export function getGoogleApp(appId: string) {
  return googleApps[appId];
}
