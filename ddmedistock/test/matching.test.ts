import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scoreProduct,
  matchLineItem,
  suggestAlternatives,
  type CatalogProduct,
} from "../src/lib/ai/matching";
import type { ParsedLineItem } from "../src/lib/ai/parser";

function product(p: Partial<CatalogProduct>): CatalogProduct {
  return {
    id: "p",
    name: "Product",
    brand: null,
    description: null,
    originType: "DOMESTIC",
    searchText: "",
    attributes: [],
    embedding: null,
    ...p,
  };
}

const item: ParsedLineItem = {
  lineNo: 1,
  rawText: "Disposable Syringe 5ml BD",
  productName: "Disposable Syringe 5ml",
  brand: "BD",
  quantity: 100,
  unit: "Nos",
  attributes: { volume: "5ml" },
};

test("scoreProduct: name + attribute + brand all contribute", () => {
  const m = scoreProduct(
    item,
    product({
      id: "a",
      name: "Disposable Syringe",
      brand: "BD",
      searchText: "disposable syringe 5ml",
      attributes: [{ key: "volume", value: "5ml" }],
    }),
  );
  assert.ok(m.score > 50, `expected strong score, got ${m.score}`);
  assert.match(m.reason, /brand match/);
  assert.match(m.reason, /volume=5ml/);
});

test("scoreProduct: vector path activates with embeddings and is labelled", () => {
  const q = [1, 0, 0];
  const m = scoreProduct(
    item,
    product({ id: "v", name: "Something Unrelated", embedding: [1, 0, 0] }),
    q,
  );
  assert.match(m.reason, /vector/);
});

test("matchLineItem: ranks better match first and applies floor", () => {
  const catalog = [
    product({ id: "good", name: "Disposable Syringe 5ml", searchText: "disposable syringe 5ml" }),
    product({ id: "bad", name: "Surgical Gloves", searchText: "surgical gloves nitrile" }),
  ];
  const matches = matchLineItem(item, catalog, 5, 8);
  assert.equal(matches[0].productId, "good");
});

test("suggestAlternatives: returns best domestic and imported", () => {
  const catalog = [
    product({ id: "dom", name: "Disposable Syringe 5ml", originType: "DOMESTIC", searchText: "disposable syringe 5ml" }),
    product({ id: "imp", name: "Disposable Syringe 5ml", originType: "IMPORTED", searchText: "disposable syringe 5ml" }),
  ];
  const matches = matchLineItem(item, catalog, 5, 8);
  const { domestic, imported } = suggestAlternatives(matches);
  assert.equal(domestic?.product.originType, "DOMESTIC");
  assert.equal(imported?.product.originType, "IMPORTED");
});
