import type { Brand } from "./types";

export type Sku = {
  id: string; // url slug + storage key
  name: string; // as listed in the workbook index sheet
  brand: Brand;
  asin: string;
  model?: string;
  /**
   * What reviewers call this device when they are not using its name.
   * "air fryer" is the top word in every Combi cloud otherwise, which tells
   * you what the product is, not what anyone thinks of it. Kept per-SKU rather
   * than global so "air flow" survives on the fan and "steam" on the mop.
   */
  categoryTokens?: string[];
  /**
   * Worksheet tab names that have been seen carrying this SKU's reviews.
   * Tab names do NOT match product names, and differ between exports, so this
   * is an explicit list. Add to it rather than guessing at match time.
   */
  sheetNames: string[];
};

/**
 * Source of truth: "Sheet1" of the Ninja workbook, which indexes all twelve
 * products across both brands with their Amazon.in links. ASINs extracted from
 * those links; tracking parameters dropped.
 */
export const SKUS: Sku[] = [
  {
    id: "ninja-blast",
    name: "Ninja Blast",
    brand: "Ninja",
    asin: "B0FWY5Y7VF",
    model: "BC151INNV",
    categoryTokens: ["blender", "juicer"],
    sheetNames: ["Blast"],
  },
  {
    id: "ninja-combi",
    name: "Ninja Combi",
    brand: "Ninja",
    asin: "B0FWY8TT1X",
    model: "SFP701IN",
    categoryTokens: ["fryer", "airfryer", "oven", "cooker"],
    sheetNames: ["Combi"],
  },
  {
    id: "ninja-air-fryer-6-2l",
    name: "Ninja Air Fryer 6.2L",
    brand: "Ninja",
    asin: "B0FWY8R9W8",
    model: "AF180IN",
    categoryTokens: ["airfryer"],
    sheetNames: ["6.2 Air fryer", "6.2 Air Fryer", "Air Fryer 6.2"],
  },
  {
    id: "ninja-dual-zone",
    name: "Ninja Dual Zone",
    brand: "Ninja",
    asin: "B0FWY81CXR",
    model: "AF300IN",
    categoryTokens: ["fryer", "airfryer"],
    sheetNames: ["Dual zone", "Dual Zone"],
  },
  {
    id: "ninja-double-stack",
    name: "Ninja Double Stack",
    brand: "Ninja",
    asin: "B0FWY6L1P5",
    model: "SL300IN",
    categoryTokens: ["fryer", "airfryer"],
    sheetNames: ["DoubleStack", "Double Stack"],
  },
  {
    id: "shark-flex-breeze",
    name: "Shark Flex Breeze",
    brand: "Shark",
    asin: "B0GKNN32L5",
    model: "FA200INBK",
    categoryTokens: ["fan"],
    sheetNames: ["FlexBreeze", "Flex Breeze"],
  },
  {
    id: "shark-air-purifier",
    name: "Shark Air Purifier",
    brand: "Shark",
    asin: "B0FWRTBVBN",
    categoryTokens: ["purifier"],
    sheetNames: ["Air Purifier", "Airpurifier"],
  },
  {
    id: "shark-steam-and-scrub",
    name: "Shark Steam & Scrub",
    brand: "Shark",
    asin: "B0FYNH6PBR",
    model: "S8201IN",
    categoryTokens: ["mop", "mopping"],
    sheetNames: ["Steam and Scrub", "Steam & Scrub"],
  },
  {
    id: "shark-detect-clean-and-empty",
    name: "Shark Detect Clean and Empty",
    brand: "Shark",
    asin: "B0FWQT87JQ",
    categoryTokens: ["vacuum", "vacuume", "cleaner"],
    sheetNames: ["Clean and Detect VC", "Detect Clean and Empty"],
  },
  {
    id: "shark-power-pro-pet",
    name: "Shark Power Pro Pet",
    brand: "Shark",
    asin: "B0FWQV36NL",
    model: "IZ380INT",
    categoryTokens: ["vacuum", "vacuume", "cleaner"],
    sheetNames: ["PetPro Vacuume Cleaner", "PetPro", "Power Pro Pet"],
  },
  {
    id: "shark-hydrovac",
    name: "Shark HydroVac",
    brand: "Shark",
    asin: "B0FWQPMDCY",
    categoryTokens: ["vacuum", "vacuume", "cleaner"],
    sheetNames: ["HydroVac", "Hydrovac"],
  },
  {
    id: "shark-powerdetect",
    name: "Shark PowerDetect",
    brand: "Shark",
    asin: "B0FWQRYTMN",
    categoryTokens: ["vacuum", "vacuume", "cleaner"],
    sheetNames: ["Power Detect VC", "PowerDetect", "powerDetect"],
  },
];

export const BRANDS: Brand[] = ["Ninja", "Shark"];

export function amazonUrl(sku: Sku): string {
  return `https://www.amazon.in/dp/${sku.asin}`;
}

export function skuById(id: string): Sku | undefined {
  return SKUS.find((s) => s.id === id);
}

export function skusForBrand(brand: Brand): Sku[] {
  return SKUS.filter((s) => s.brand === brand);
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Resolve a worksheet tab name to a SKU. Returns undefined if unmapped. */
export function skuForSheet(sheetName: string): Sku | undefined {
  const n = norm(sheetName);
  return SKUS.find((s) => s.sheetNames.some((t) => norm(t) === n));
}

const BASE_TOKENS = ["ninja", "shark", "sharkninja", "amazon"];

function tokensOf(sku: Sku): string[] {
  return [
    ...sku.name.toLowerCase().split(/[^a-z0-9.]+/).filter(Boolean),
    sku.asin.toLowerCase(),
    ...(sku.model ? [sku.model.toLowerCase()] : []),
    ...(sku.categoryTokens ?? []),
  ];
}

/**
 * Tokens stripped before building word clouds and theme lists.
 *
 * Without this the top "theme" for both praise and complaints is "air fryer",
 * which is the thing being reviewed, not something anyone said about it. At SKU
 * level only that product's own name goes; at brand level every product name in
 * the brand goes, because the clouds there mix SKUs together.
 */
export function brandTokens(sku?: Sku): string[] {
  if (!sku) return BASE_TOKENS;
  return [...new Set([...BASE_TOKENS, ...tokensOf(sku)])];
}

export function brandTokensFor(brand: Brand): string[] {
  return [
    ...new Set([...BASE_TOKENS, ...skusForBrand(brand).flatMap(tokensOf)]),
  ];
}
