import { env } from "./env.js";

export type ProductType = "consumable" | "non_consumable";

export interface CatalogProduct {
  productId: string;
  type: ProductType;
}

// Replace with database lookups one Prisma is in place.
const catalog: Record<string, Record<string, CatalogProduct>> = {
  [env.APP_ONE_ID]: {
    coins_1000: { productId: "coins_1000", type: "consumable" },
    removeAds: { productId: "remove_ads", type: "non_consumable" },
  },
  [env.APP_TWO_ID]: {},
};

export function getCatalogProduct(
  appId: string,
  productId: string,
): CatalogProduct | undefined {
  const appProducts = catalog[appId];

  if (!appProducts || !Object.hasOwn(appProducts, productId)) {
    return undefined;
  }
  return appProducts[productId];
}
