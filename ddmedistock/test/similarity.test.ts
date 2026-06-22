import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cosineSimilarity,
  levenshteinRatio,
  tokenDice,
  normalize,
  tokenize,
} from "../src/lib/ai/similarity";

test("cosineSimilarity: identical vectors → 1", () => {
  assert.equal(cosineSimilarity([1, 2, 3], [1, 2, 3]), 1);
});

test("cosineSimilarity: orthogonal vectors → 0", () => {
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

test("cosineSimilarity: opposite vectors → -1", () => {
  assert.ok(Math.abs(cosineSimilarity([1, 1], [-1, -1]) - -1) < 1e-9);
});

test("cosineSimilarity: length mismatch / empty → 0 (safe)", () => {
  assert.equal(cosineSimilarity([1, 2, 3], [1, 2]), 0);
  assert.equal(cosineSimilarity([], []), 0);
  assert.equal(cosineSimilarity([0, 0], [0, 0]), 0);
});

test("levenshteinRatio: equal strings → 1, totally different → low", () => {
  assert.equal(levenshteinRatio("syringe", "syringe"), 1);
  assert.ok(levenshteinRatio("syringe", "syringe 5ml") > 0.5);
  assert.ok(levenshteinRatio("abc", "xyz") < 0.5);
});

test("tokenDice: shared tokens score higher; stopwords ignored", () => {
  const high = tokenDice("disposable syringe", "syringe disposable luer");
  const low = tokenDice("disposable syringe", "surgical gloves nitrile");
  assert.ok(high > low);
  // "the" / "of" are stopwords → no spurious overlap
  assert.equal(tokenDice("the of", "the of"), 0);
});

test("normalize and tokenize strip noise", () => {
  assert.equal(normalize("  Syringe,  5ML!! "), "syringe 5ml");
  assert.deepEqual(tokenize("Disposable Syringe (5ml)"), ["disposable", "syringe", "5ml"]);
});
