// Lightweight text-similarity primitives used by the hybrid matching engine.
// These run fully offline (no external service) and stand in for vector
// embeddings when OPENAI_API_KEY is not configured.

const STOPWORDS = new Set([
  "the", "a", "an", "of", "for", "with", "and", "or", "to", "in", "ml", "no",
  "set", "pack", "box", "pcs", "pc", "nos", "unit", "units", "each",
]);

export function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9.%\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(s: string): string[] {
  return normalize(s)
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Normalized Levenshtein similarity in [0,1]. */
export function levenshteinRatio(a: string, b: string): number {
  a = normalize(a);
  b = normalize(b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/** Cosine similarity between two equal-length vectors in [-1,1]. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Dice coefficient over token sets in [0,1] — a fuzzy "bag of words" score. */
export function tokenDice(a: string, b: string): number {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return (2 * inter) / (A.size + B.size);
}
