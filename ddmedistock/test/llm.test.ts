import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isAIEnabled,
  extractLineItemsLLM,
  embedText,
  embedTexts,
} from "../src/lib/ai/llm";

// These tests assert the offline-safe contract: with no OPENAI_API_KEY the AI
// layer disables itself and returns null so callers fall back to the
// deterministic engine. (Live API behaviour is exercised only when a key set.)

test("isAIEnabled reflects OPENAI_API_KEY presence", () => {
  delete process.env.OPENAI_API_KEY;
  assert.equal(isAIEnabled(), false);
  process.env.OPENAI_API_KEY = "sk-test";
  assert.equal(isAIEnabled(), true);
  delete process.env.OPENAI_API_KEY;
});

test("extractLineItemsLLM returns null when disabled", async () => {
  delete process.env.OPENAI_API_KEY;
  assert.equal(await extractLineItemsLLM("Syringe 5ml - 10 nos"), null);
});

test("embedText / embedTexts return null when disabled", async () => {
  delete process.env.OPENAI_API_KEY;
  assert.equal(await embedText("syringe"), null);
  assert.equal(await embedTexts(["syringe", "gloves"]), null);
});

test("embedTexts returns null for empty input", async () => {
  process.env.OPENAI_API_KEY = "sk-test";
  assert.equal(await embedTexts([]), null);
  delete process.env.OPENAI_API_KEY;
});
