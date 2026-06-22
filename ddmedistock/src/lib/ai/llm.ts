// Real AI layer — LangChain + OpenAI.
//
// Provides two capabilities used by the RFQ pipeline:
//   1. extractLineItemsLLM() — structured RFQ line-item extraction via a
//      ChatOpenAI model with schema-constrained (function-calling) output.
//   2. embedText() / embedTexts() — OpenAI embeddings for semantic search.
//
// Everything is guarded by OPENAI_API_KEY. When the key is absent (or any call
// fails), callers fall back to the deterministic offline engine, so the app is
// always functional. Models are created lazily and cached per-process.

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { z } from "zod";
import { moduleLogger } from "@/lib/observability/logger";

const log = moduleLogger("ai");

export const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims
export const EMBEDDING_DIMS = 1536;

export function isAIEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

let _chat: ChatOpenAI | null = null;
let _embeddings: OpenAIEmbeddings | null = null;

function chat(): ChatOpenAI {
  if (!_chat) {
    _chat = new ChatOpenAI({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0,
      maxRetries: 2,
      timeout: 30_000,
    });
  }
  return _chat;
}

function embedder(): OpenAIEmbeddings {
  if (!_embeddings) {
    _embeddings = new OpenAIEmbeddings({ model: EMBEDDING_MODEL, maxRetries: 2 });
  }
  return _embeddings;
}

// Schema the model must conform to (LangChain withStructuredOutput).
const lineItemSchema = z.object({
  items: z.array(
    z.object({
      productName: z.string().describe("Normalized product name without quantity"),
      brand: z.string().nullish().describe("Brand if stated, else null"),
      quantity: z.number().describe("Numeric quantity, default 1"),
      unit: z.string().describe("Unit of measure e.g. Nos, Box, Pcs"),
      attributes: z
        .record(z.string(), z.string())
        .describe("Technical specs: volume, gauge, size, material, sterility, etc."),
    }),
  ),
});

export type LLMLineItem = {
  productName: string;
  brand?: string | null;
  quantity: number;
  unit: string;
  attributes: Record<string, string>;
};

/**
 * Extract structured line items from raw RFQ text. Returns null when AI is
 * disabled or the call fails, signalling the caller to use the heuristic parser.
 */
export async function extractLineItemsLLM(rawText: string): Promise<LLMLineItem[] | null> {
  if (!isAIEnabled()) return null;
  try {
    const model = chat().withStructuredOutput(lineItemSchema, { name: "extract_rfq" });
    const res = await model.invoke([
      {
        role: "system",
        content:
          "You are a medical procurement RFQ parser. Extract every requirement " +
          "line item. Normalize differently-worded products to a clean name and " +
          "capture technical specifications as attributes. Never invent items.",
      },
      { role: "user", content: rawText.slice(0, 16000) },
    ]);
    const items = res?.items ?? [];
    if (!items.length) return null;
    return items.map((it) => ({
      productName: String(it.productName || "").trim(),
      brand: it.brand ?? null,
      quantity: Number(it.quantity) || 1,
      unit: it.unit || "Unit",
      attributes: it.attributes || {},
    }));
  } catch (err) {
    log.warn({ err: (err as Error).message }, "extractLineItemsLLM failed, falling back to heuristic");
    return null;
  }
}

/** Embed a single string. Returns null on failure / disabled. */
export async function embedText(text: string): Promise<number[] | null> {
  if (!isAIEnabled()) return null;
  try {
    return await embedder().embedQuery(text.slice(0, 8000));
  } catch (err) {
    log.warn({ err: (err as Error).message }, "embedText failed");
    return null;
  }
}

/** Embed many strings in one batched request. Returns null on failure / disabled. */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (!isAIEnabled() || texts.length === 0) return null;
  try {
    return await embedder().embedDocuments(texts.map((t) => t.slice(0, 8000)));
  } catch (err) {
    log.warn({ err: (err as Error).message }, "embedTexts failed");
    return null;
  }
}
