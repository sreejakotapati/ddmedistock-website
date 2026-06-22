// Hybrid Product Matching Engine.
//
// Combines three signals into a single confidence score (0–100):
//   1. Attribute matching  — overlap of parsed technical specs.
//   2. Fuzzy matching      — token Dice + Levenshtein on product names.
//   3. Semantic search     — OpenAI embedding cosine similarity when both the
//                            query and product vectors are available; otherwise
//                            falls back to token overlap on a search blob.
// Brand agreement adds a small bonus.

import { levenshteinRatio, tokenDice, normalize, cosineSimilarity } from "./similarity";
import type { ParsedLineItem } from "./parser";

export type CatalogProduct = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  originType: string;
  searchText: string;
  attributes: { key: string; value: string }[];
  embedding?: number[] | null;
};

export type ScoredMatch = {
  productId: string;
  product: CatalogProduct;
  score: number; // 0–100
  matchType: "ATTRIBUTE" | "FUZZY" | "SEMANTIC" | "HYBRID";
  reason: string;
};

const W = { fuzzy: 0.45, attribute: 0.3, semantic: 0.15, brand: 0.1 };

function attributeScore(
  item: ParsedLineItem,
  product: CatalogProduct,
): { score: number; matched: string[] } {
  const keys = Object.keys(item.attributes || {});
  if (keys.length === 0) return { score: 0, matched: [] };
  const map = new Map(product.attributes.map((a) => [a.key.toLowerCase(), normalize(a.value)]));
  const matched: string[] = [];
  let hits = 0;
  for (const k of keys) {
    const want = normalize(String(item.attributes[k]));
    const have = map.get(k.toLowerCase());
    if (have && (have === want || have.includes(want) || want.includes(have))) {
      hits++;
      matched.push(`${k}=${item.attributes[k]}`);
    }
  }
  return { score: hits / keys.length, matched };
}

export function scoreProduct(
  item: ParsedLineItem,
  product: CatalogProduct,
  queryEmbedding?: number[] | null,
): ScoredMatch {
  const itemName = `${item.productName} ${item.brand ?? ""}`;
  const fuzzy = 0.6 * tokenDice(itemName, product.name) +
    0.4 * levenshteinRatio(item.productName, product.name);

  const attr = attributeScore(item, product);

  // Prefer true vector similarity when embeddings exist on both sides;
  // otherwise approximate semantics with token overlap on the search blob.
  let semantic: boolean | number;
  let semanticIsVector = false;
  if (queryEmbedding && product.embedding && product.embedding.length) {
    semantic = Math.max(0, cosineSimilarity(queryEmbedding, product.embedding));
    semanticIsVector = true;
  } else {
    semantic = tokenDice(
      `${itemName} ${Object.values(item.attributes || {}).join(" ")}`,
      product.searchText,
    );
  }
  const semanticScore = semantic as number;

  const brandMatch =
    item.brand && product.brand &&
    normalize(item.brand) === normalize(product.brand)
      ? 1
      : 0;

  // Vector semantics are more trustworthy than token overlap, so weight higher.
  const semanticW = semanticIsVector ? 0.28 : 0.15;
  const fuzzyW = semanticIsVector ? 0.34 : W.fuzzy;

  const raw =
    fuzzyW * fuzzy +
    W.attribute * attr.score +
    semanticW * semanticScore +
    W.brand * brandMatch;

  const score = Math.round(Math.min(100, raw * 100));

  // Decide which signal dominated for explainability.
  const components: [ScoredMatch["matchType"], number][] = [
    ["FUZZY", fuzzyW * fuzzy],
    ["ATTRIBUTE", W.attribute * attr.score],
    ["SEMANTIC", semanticW * semanticScore],
  ];
  components.sort((a, b) => b[1] - a[1]);
  const matchType: ScoredMatch["matchType"] =
    components[0][1] > 0 && components[1][1] > 0 ? "HYBRID" : components[0][0];

  const bits: string[] = [];
  bits.push(`name ${Math.round(fuzzy * 100)}%`);
  if (attr.matched.length) bits.push(`attrs ${attr.matched.join(", ")}`);
  if (brandMatch) bits.push("brand match");
  if (semanticScore > 0.2)
    bits.push(`${semanticIsVector ? "vector" : "semantic"} ${Math.round(semanticScore * 100)}%`);

  return { productId: product.id, product, score, matchType, reason: bits.join(" · ") };
}

/** Score all products for a line item and return the top N (score > floor). */
export function matchLineItem(
  item: ParsedLineItem,
  catalog: CatalogProduct[],
  topN = 5,
  floor = 8,
  queryEmbedding?: number[] | null,
): ScoredMatch[] {
  return catalog
    .map((p) => scoreProduct(item, p, queryEmbedding))
    .filter((m) => m.score >= floor)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/**
 * Predictive substitution: from a set of matches, pick the best domestic
 * (Made in India) and best imported alternative for the admin to choose from.
 */
export function suggestAlternatives(matches: ScoredMatch[]) {
  const domestic = matches.find((m) => m.product.originType === "DOMESTIC") || null;
  const imported = matches.find((m) => m.product.originType === "IMPORTED") || null;
  return { domestic, imported };
}
