// ── DocTune evaluation engine · NLP primitives ──────────────────────────────

export type EmbeddingMode = "uni" | "unibi" | "char3";

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "of", "at", "by",
  "for", "with", "about", "against", "between", "into", "through", "during",
  "before", "after", "above", "below", "to", "from", "up", "down", "in", "out",
  "on", "off", "over", "under", "again", "further", "is", "are", "was", "were",
  "be", "been", "being", "have", "has", "had", "having", "do", "does", "did",
  "doing", "would", "should", "could", "ought", "i", "you", "he", "she", "it",
  "we", "they", "them", "his", "her", "its", "our", "their", "this", "that",
  "these", "those", "am", "what", "which", "who", "whom", "when", "where",
  "why", "how", "all", "any", "both", "each", "few", "more", "most", "other",
  "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than",
  "too", "very", "can", "will", "just", "as", "per", "also",
]);

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TOKEN_RE = /[a-z0-9]+(?:['’\-][a-z0-9]+)*/g;

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(TOKEN_RE) ?? [];
}

/** Crude but effective suffix stemmer for matching morphological variants. */
export function stem(t: string): string {
  if (t.length > 4 && t.endsWith("ing")) return t.slice(0, -3);
  if (t.length > 4 && t.endsWith("ies")) return `${t.slice(0, -3)}y`;
  if (t.length > 3 && t.endsWith("ed")) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("es") && !t.endsWith("ses")) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

export function contentTokens(text: string): string[] {
  return tokenize(text)
    .filter((t) => !STOPWORDS.has(t) && t.length > 1)
    .map(stem);
}

const NUM_RE = /\$?\d[\d,]*(?:\.\d+)?%?/g;

const NUM_WORDS: Record<string, string> = {
  two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7",
  eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
  thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16",
  seventeen: "17", eighteen: "18", nineteen: "19", twenty: "20",
  thirty: "30", forty: "40", fifty: "50", sixty: "60", seventy: "70",
  eighty: "80", ninety: "90",
};

const NUM_UNITS =
  "(?:percent|mg|mcg|g|kg|ml|mmhg|bpm|years?|yrs?|months?|weeks?|days?|hours?|minutes|patients|points|bps|dollars?|million|billion|thousand)";

const NUM_WORD_RE = new RegExp(
  `\\b(${Object.keys(NUM_WORDS).join("|")})(?=\\s+${NUM_UNITS}\\b)`,
  "gi",
);

const TENS_WORDS: Record<string, number> = {
  twenty: 2, thirty: 3, forty: 4, fifty: 5,
  sixty: 6, seventy: 7, eighty: 8, ninety: 9,
};
const ONES_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9,
};
const COMPOUND_RE = new RegExp(
  `\\b(${Object.keys(TENS_WORDS).join("|")})[\\s-]+(${Object.keys(ONES_WORDS).join("|")})\\b`,
  "gi",
);

/** "$1,250.00" -> "1250", "2.0" -> "2", "99.9%" -> "99.9", "-.5" safe. */
function normalizeNumericToken(raw: string): string {
  const stripped = raw.replace(/[$,%]/g, "");
  return /^-?\d+(\.\d+)?$/.test(stripped) ? String(Number(stripped)) : stripped;
}

/**
 * Numeric mentions with cross-format normalization:
 * digits ("1,250.00" ≡ "1250" ≡ "$1250"), decimal equivalence ("2.0" ≡ "2"),
 * and number words before units ("five mg" ≡ "5 mg").
 */
export function extractNumbers(text: string): string[] {
  const out: string[] = (text.match(NUM_RE) ?? []).map(normalizeNumericToken);

  // compound number words first ("twenty four months" -> "24")
  const compoundSpans: Array<[number, number]> = [];
  COMPOUND_RE.lastIndex = 0;
  let cm: RegExpExecArray | null;
  while ((cm = COMPOUND_RE.exec(text)) !== null) {
    out.push(
      String(TENS_WORDS[cm[1].toLowerCase()] * 10 + ONES_WORDS[cm[2].toLowerCase()]),
    );
    compoundSpans.push([cm.index, cm.index + cm[0].length]);
  }

  // single number words before units ("five mg" -> "5"), skipping ones
  // already consumed by a compound ("twenty four" must not also yield "4")
  NUM_WORD_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NUM_WORD_RE.exec(text)) !== null) {
    const mi = m.index;
    const insideCompound = compoundSpans.some(([s, e]) => mi >= s && mi < e);
    if (insideCompound) continue;
    const v = NUM_WORDS[m[1].toLowerCase()];
    if (v) out.push(v);
  }
  return out;
}

const DECIMAL_GUARD = "⁀";

function guardDecimals(text: string): string {
  return text.replace(/(\d)\.(\d)/g, `$1${DECIMAL_GUARD}$2`);
}

function restoreDecimals(text: string): string {
  return text.split(DECIMAL_GUARD).join(".");
}

export function splitSentences(text: string): string[] {
  const cleaned = guardDecimals(text.replace(/\s+/g, " ").trim());
  const parts =
    cleaned.match(/[^.!?]+[.!?]+(?:["'”’)\]]+)?|[^.!?]+$/g) ?? [];
  return parts
    .map((s) => restoreDecimals(s.trim()))
    .filter((s) => tokenize(s).length >= 3);
}

export type Chunk = {
  id: number;
  docName: string;
  text: string;
  sentences: string[];
  tokenCount: number;
};

/** Sentence-aware sliding chunker with token-budget overlap. */
export function chunkDocument(
  docName: string,
  text: string,
  sizeTokens: number,
  overlapTokens: number,
  startId: number,
): Chunk[] {
  const sentences = splitSentences(text);
  const chunks: Chunk[] = [];
  let cur: string[] = [];
  let curTokens = 0;
  let id = startId;

  const flush = () => {
    if (cur.length === 0) return;
    chunks.push({
      id: id++,
      docName,
      text: cur.join(" "),
      sentences: [...cur],
      tokenCount: curTokens,
    });
  };

  let i = 0;
  while (i < sentences.length) {
    const s = sentences[i];
    const st = tokenize(s).length;
    if (curTokens + st > sizeTokens && cur.length > 0) {
      flush();
      // rebuild overlap tail from the flushed chunk
      const tail: string[] = [];
      let tailTokens = 0;
      for (let j = cur.length - 1; j >= 0; j--) {
        const tt = tokenize(cur[j]).length;
        if (tailTokens + tt > overlapTokens && tail.length > 0) break;
        tail.unshift(cur[j]);
        tailTokens += tt;
      }
      cur = tail;
      curTokens = tailTokens;
    }
    cur.push(s);
    curTokens += st;
    i++;
  }
  flush();
  return chunks;
}

/** Term extraction per embedding model flavor. */
export function termsFor(text: string, mode: EmbeddingMode): string[] {
  const toks = tokenize(text);
  if (mode === "uni") return toks;
  if (mode === "unibi") {
    const terms = [...toks];
    for (let i = 0; i + 1 < toks.length; i++) {
      terms.push(`${toks[i]}_${toks[i + 1]}`);
    }
    return terms;
  }
  // char3: hashed character 3-grams (robust to morphology/typos)
  const grams: string[] = [];
  for (const t of toks) {
    const padded = `#${t}#`;
    for (let i = 0; i + 3 <= padded.length; i++) {
      grams.push(`g${hashString(padded.slice(i, i + 3)) % 2048}`);
    }
  }
  return grams;
}

export function buildIdf(docs: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  for (const d of docs) {
    for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  const n = docs.length;
  for (const [t, c] of df) {
    idf.set(t, Math.log(1 + (n - c + 0.5) / (c + 0.5)));
  }
  return idf;
}

export function tfidfVector(
  terms: string[],
  idf: Map<string, number>,
): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);
  const vec = new Map<string, number>();
  for (const [t, c] of tf) {
    vec.set(t, (c / terms.length) * (idf.get(t) ?? 0));
  }
  return vec;
}

export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const v of a.values()) na += v * v;
  for (const v of b.values()) nb += v * v;
  if (na === 0 || nb === 0) return 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  for (const [t, v] of small) {
    const w = big.get(t);
    if (w !== undefined) dot += v * w;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export class Bm25 {
  private docTokens: string[][];
  private docLen: number[];
  private avgdl: number;
  private idf: Map<string, number>;
  private k1 = 1.5;
  private b = 0.75;

  constructor(docs: string[][]) {
    this.docTokens = docs;
    this.docLen = docs.map((d) => d.length);
    this.avgdl =
      docs.reduce((acc, d) => acc + d.length, 0) / Math.max(1, docs.length);
    const df = new Map<string, number>();
    for (const d of docs) {
      for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
    }
    this.idf = new Map();
    const n = docs.length;
    for (const [t, c] of df) {
      this.idf.set(t, Math.log(1 + (n - c + 0.5) / (c + 0.5)));
    }
  }

  score(query: string[], idx: number): number {
    const doc = this.docTokens[idx];
    if (!doc) return 0;
    const tf = new Map<string, number>();
    for (const t of doc) tf.set(t, (tf.get(t) ?? 0) + 1);
    const dl = this.docLen[idx] || 1;
    let s = 0;
    for (const q of new Set(query)) {
      const f = tf.get(q) ?? 0;
      if (f === 0) continue;
      const idf = this.idf.get(q) ?? 0;
      s +=
        (idf * f * (this.k1 + 1)) /
        (f + this.k1 * (1 - this.b + (this.b * dl) / this.avgdl));
    }
    return s;
  }
}

export function minMaxNormalize(values: number[]): number[] {
  if (values.length === 0) return values;
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (max - min < 1e-12) return values.map(() => 0);
  return values.map((v) => (v - min) / (max - min));
}

/** Multiset-aware F1 over token (or number) lists. */
export function multisetF1(pred: string[], gold: string[]): number {
  if (gold.length === 0 && pred.length === 0) return 1;
  if (gold.length === 0 || pred.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const g of gold) counts.set(g, (counts.get(g) ?? 0) + 1);
  let hit = 0;
  for (const p of pred) {
    const c = counts.get(p) ?? 0;
    if (c > 0) {
      hit++;
      counts.set(p, c - 1);
    }
  }
  if (hit === 0) return 0;
  const precision = hit / pred.length;
  const recall = hit / gold.length;
  return (2 * precision * recall) / (precision + recall);
}

/** Recall of gold items covered by the prediction (multiset-aware). */
export function multisetRecall(pred: string[], gold: string[]): number {
  if (gold.length === 0) return 1;
  const counts = new Map<string, number>();
  for (const g of gold) counts.set(g, (counts.get(g) ?? 0) + 1);
  let hit = 0;
  for (const p of pred) {
    const c = counts.get(p) ?? 0;
    if (c > 0) {
      hit++;
      counts.set(p, c - 1);
    }
  }
  return hit / gold.length;
}

export function bigrams(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i + 1 < tokens.length; i++) out.push(`${tokens[i]} ${tokens[i + 1]}`);
  return out;
}
