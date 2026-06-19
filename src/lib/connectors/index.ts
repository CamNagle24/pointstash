import type { BaseConnector } from "./base";
import { mcdonaldsConnector } from "./mcdonalds";
import { chickfilaConnector } from "./chickfila";
import { wendysConnector } from "./wendys";
import { tacobellConnector } from "./tacobell";
import { burgerkingConnector } from "./burgerking";
import { popeyesConnector } from "./popeyes";
import { subwayConnector } from "./subway";
import { dunkinConnector } from "./dunkin";
import { starbucksConnector } from "./starbucks";
import { chipotleConnector } from "./chipotle";
import { pancherosConnector } from "./pancheros";
import { dairyqueenConnector } from "./dairyqueen";
import { culversConnector } from "./culvers";
import { jimmyjohnsConnector } from "./jimmyjohns";
import { buffalowildwingsConnector } from "./buffalowildwings";
import { kfcConnector } from "./kfc";
import { pandaexpressConnector } from "./pandaexpress";

export const connectors: Record<string, BaseConnector> = {
  [mcdonaldsConnector.chainSlug]: mcdonaldsConnector,
  [chickfilaConnector.chainSlug]: chickfilaConnector,
  [wendysConnector.chainSlug]: wendysConnector,
  [tacobellConnector.chainSlug]: tacobellConnector,
  [burgerkingConnector.chainSlug]: burgerkingConnector,
  [popeyesConnector.chainSlug]: popeyesConnector,
  [subwayConnector.chainSlug]: subwayConnector,
  [dunkinConnector.chainSlug]: dunkinConnector,
  [starbucksConnector.chainSlug]: starbucksConnector,
  [chipotleConnector.chainSlug]: chipotleConnector,
  [pancherosConnector.chainSlug]: pancherosConnector,
  [dairyqueenConnector.chainSlug]: dairyqueenConnector,
  [culversConnector.chainSlug]: culversConnector,
  [jimmyjohnsConnector.chainSlug]: jimmyjohnsConnector,
  [buffalowildwingsConnector.chainSlug]: buffalowildwingsConnector,
  [kfcConnector.chainSlug]: kfcConnector,
  [pandaexpressConnector.chainSlug]: pandaexpressConnector,
};

export function getConnector(slug: string): BaseConnector | undefined {
  return connectors[slug];
}

/** True iff a chain has a working API connector — used to decide whether
 *  the AddAccountModal can offer "Auto-sync" alongside MANUAL/SCREENSHOT. */
export function hasImplementedConnector(slug: string): boolean {
  return Boolean(connectors[slug]?.implemented);
}

export type { BaseConnector, AuthCredentials, AuthToken, Transaction } from "./base";
export { NotImplementedError } from "./base";
