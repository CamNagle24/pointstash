// Registry of chain integrations the extension knows how to sync. Add a new
// chain by importing its module here. Every entry exposes the same shape so
// background.js can iterate without caring about chain specifics.

import { starbucks } from "./starbucks.js";
import { chickfila } from "./chickfila.js";
import { wendys } from "./wendys.js";
import { burgerking } from "./burgerking.js";
import { popeyes } from "./popeyes.js";
import { dunkin } from "./dunkin.js";
import { chipotle } from "./chipotle.js";
import { pancheros } from "./pancheros.js";
import { dairyqueen } from "./dairyqueen.js";
import { culvers } from "./culvers.js";
import { jimmyjohns } from "./jimmyjohns.js";
import { buffalowildwings } from "./buffalowildwings.js";
import { kfc } from "./kfc.js";
import { pandaexpress } from "./pandaexpress.js";

export const CHAIN_REGISTRY = {
  starbucks,
  chickfila,
  wendys,
  burgerking,
  popeyes,
  dunkin,
  chipotle,
  pancheros,
  dairyqueen,
  culvers,
  jimmyjohns,
  buffalowildwings,
  kfc,
  pandaexpress,
};

// To add a chain:
//   1. Copy _stub.js to <chain>.js
//   2. Implement fetchBalance() — make sure host_permissions in manifest.json
//      covers the chain's origin so the request can use the user's cookies.
//   3. Import and add it to CHAIN_REGISTRY above.
