import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRfqHeuristic,
  parseRfqWithLLM,
  extractAttributes,
} from "../src/lib/ai/parser";

test("extractAttributes: pulls volume, gauge, sterility, material", () => {
  const a = extractAttributes("Sterile disposable syringe 5ml 22G latex");
  assert.equal(a.volume, "5ml");
  assert.equal(a.gauge, "22G");
  assert.equal(a.sterility, "Sterile");
  assert.equal(a.material, "latex");
  assert.equal(a.usage, "Disposable");
});

test("parseRfqHeuristic: numbered free-text list", () => {
  const items = parseRfqHeuristic(
    [
      "1. Disposable Syringe 5ml - 500 nos",
      "2. Surgical Gloves Medium x 200 pairs",
    ].join("\n"),
  );
  assert.equal(items.length, 2);
  assert.equal(items[0].quantity, 500);
  assert.equal(items[0].unit, "Nos");
  assert.equal(items[0].attributes.volume, "5ml");
  assert.equal(items[1].quantity, 200);
  assert.match(items[1].productName.toLowerCase(), /glove/);
});

test("parseRfqHeuristic: CSV rows and header skipping", () => {
  const items = parseRfqHeuristic(
    ["Sr No, Item, Qty", "1, IV Cannula 18G, 300", "2, Cotton Roll, 50 pcs"].join("\n"),
  );
  assert.equal(items.length, 2);
  assert.equal(items[0].attributes.gauge, "18G");
  assert.equal(items[1].quantity, 50);
});

test("parseRfqHeuristic: defaults quantity to 1 and unit to Unit", () => {
  const items = parseRfqHeuristic("Defibrillator Machine");
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(items[0].unit, "Unit");
});

test("parseRfqWithLLM: falls back to heuristic when AI disabled", async () => {
  delete process.env.OPENAI_API_KEY;
  const items = await parseRfqWithLLM("Surgical Mask 3ply - 1000 nos");
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1000);
  assert.equal(items[0].unit, "Nos");
});
