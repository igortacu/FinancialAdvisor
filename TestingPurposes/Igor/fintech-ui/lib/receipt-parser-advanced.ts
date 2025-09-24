// lib/receipt-parser-advanced.ts

// ----- Types -----
export type ParsedItem = {
  name: string;
  qty: number;
  unit?: string;
  unitPrice?: number;
  total: number;
  discount?: number;
};

export type ParsedReceipt = {
  merchant: string;
  date?: string;
  time?: string;
  currency?: string;
  total?: number;
  vat?: number;
  items: ParsedItem[];
  debug?: {
    lines: string[];
    headerLines: string[];
    bodyLines: string[];
    footerLines: string[];
    inferredTotalFromItems?: number;
    totalFromFooter?: number;
    totalFromSuma?: number;
    totalFromBottomRight?: number;
    matches?: Record<string, any>;
  };
};

// ----- Utils -----
const DIGIT_FIXES: [RegExp, string][] = [
  [/O/g, "0"],
  [/S/g, "5"],
  [/l/g, "1"],
  [/I/g, "1"],
  [/B(?=\d)/g, "8"],
];

const PRICE = /[0-9]+(?:[.,][0-9]{1,2})/;
const PRICE_TRAIL = new RegExp(`(${PRICE.source})\\s*$`);

const num = (s: string) =>
  Number(
    String(s)
      .replace(/[^\d,.\-]/g, "")
      .replace(/\s+/g, "")
      .replace(/(\d)[ ](?=\d{3}\b)/g, "$1")
      .replace(",", "."),
  );

const clamp2 = (n: number) => Number((n ?? 0).toFixed(2));
const stripDoubles = (s: string) => s.replace(/\s{2,}/g, " ").trim();

const normalize = (t: string) =>
  t
    .replace(/\t/g, " ")
    .split(/\r?\n/)
    .map((l) => stripDoubles(l))
    .filter(Boolean)
    .map((l) => DIGIT_FIXES.reduce((acc, [r, v]) => acc.replace(r, v), l));

// tiny Levenshtein
function lev(a: string, b: string) {
  const m = a.length,
    n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  return dp[m][n];
}

function any(regs: RegExp[], s: string) {
  return regs.some((r) => r.test(s));
}

// ----- Merchant detection -----
function fuzzyMerchant(lines: string[]): string {
  const candidates = [
    "KAUFLAND",
    "LINELLA",
    "GREEN HILLS",
    "FELICIA",
    "FOXY",
    "NR1",
    "MARKET",
    "S.R.L",
    "SRL",
    "MAGAZIN",
  ];
  let best = { name: lines[0] || "Receipt", score: Infinity, idx: 0 };
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const l = lines[i];
    for (const c of candidates) {
      const s = lev(l.toUpperCase().slice(0, 18), c);
      if (s < best.score) best = { name: stripDoubles(l), score: s, idx: i };
    }
  }
  // prefer uppercase merchant-like line
  if (/[A-Z]/.test(best.name) && best.name === best.name.toUpperCase()) {
    return best.name;
  }
  // try next lines that contain SRL/address
  const extra = lines
    .slice(0, 6)
    .find((x) => /\bS\.?R\.?L\b|\bstr\b|\bstra\b/i.test(x));
  return extra ? stripDoubles(extra) : stripDoubles(best.name);
}

// ----- Segmentation -----
const IGNORE_HEAD = [
  /BON/i,
  /FISCAL/i,
  /CASA/i,
  /NR/i,
  /CHECK/i,
  /MAGAZIN/i,
  /^\d{2,}$/,
];
const UNITS = /(BUC|PCS|KG|G|L|ML)/i;

function segment(lines: string[]) {
  // find first body line (start of items)
  let startIdx = lines.findIndex((l, i) => {
    if (IGNORE_HEAD.some((r) => r.test(l))) return false;
    if (PRICE_TRAIL.test(l)) return true;
    const next = lines[i + 1] || "";
    return /(\d+(?:[.,]\d+)?)\s*(?:BUC|PCS|KG|G|L|ML)?\s*[x×@]\s*([0-9]+(?:[.,][0-9]{1,2})?)/i.test(
      next,
    );
  });
  if (startIdx < 0) startIdx = 0;

  // footer: last 6 lines are typically totals/TVA
  const footerStart = Math.max(lines.length - 8, startIdx + 1);
  const header = lines.slice(0, startIdx);
  const body = lines.slice(startIdx, footerStart);
  const footer = lines.slice(footerStart);
  return { header, body, footer, footerStart };
}

// ----- Totals -----
/** very tolerant SUMA matching (handles SUHA / 5UMA / SUM4 etc.) */
function isSumaLike(s: string) {
  const up = s.toUpperCase().replace(/\s/g, "");
  // replace common OCR char swaps
  const norm = up.replace(/H/g, "M").replace(/4/g, "A").replace(/5/g, "S");
  return /SUMA\b|SUMĂ\b|SUM\b/.test(norm);
}

function extractRightmostPrice(line: string): number | undefined {
  const m = line.match(PRICE_TRAIL);
  return m ? num(m[1]) : undefined;
}

function parseTotals(lines: string[], fromIndex: number) {
  let totalFromSuma: number | undefined;
  // search around a SUMA-like line (same line or next 2)
  for (let i = fromIndex; i < lines.length; i++) {
    if (isSumaLike(lines[i])) {
      const here = extractRightmostPrice(lines[i]);
      if (here != null) {
        totalFromSuma = here;
        break;
      }
      for (let j = 1; j <= 2 && i + j < lines.length; j++) {
        const v = extractRightmostPrice(lines[i + j]);
        if (v != null) {
          totalFromSuma = v;
          break;
        }
      }
      break;
    }
  }

  // fallback: pick the largest right-most price in the last third of the receipt
  const bottom = lines.slice(Math.floor(lines.length * 0.66));
  let maxV = -Infinity;
  for (const l of bottom) {
    const v = extractRightmostPrice(l);
    if (v != null && v > maxV) maxV = v;
  }
  const totalFromBottomRight = isFinite(maxV) ? clamp2(maxV) : undefined;

  return { totalFromSuma, totalFromBottomRight };
}

// ----- Items -----
function parseItems(body: string[]): ParsedItem[] {
  const items: ParsedItem[] = [];

  for (let i = 0; i < body.length; i++) {
    const line = body[i];

    // discounts
    if (/REDUCERE|DISCOUNT|^-+\s*\d/i.test(line)) {
      const m = line.match(/-?\s*([0-9]+(?:[.,][0-9]{1,2})?)/);
      if (m && items.length) {
        const v = -Math.abs(num(m[1]));
        const last = items[items.length - 1];
        last.discount = clamp2((last.discount || 0) + v);
        last.total = clamp2((last.total || 0) + v);
      }
      continue;
    }

    // A: name ... price
    const a = line.match(new RegExp(`^(.*?)(?:[ .]{2,})?(${PRICE.source})$`));
    if (a && a[1].trim().length >= 2) {
      const name = a[1].trim();
      const price = num(a[2]);
      items.push({
        name,
        qty: 1,
        total: clamp2(price),
        unitPrice: clamp2(price),
      });
      continue;
    }

    // B: name + next line qty x price
    const next = body[i + 1] || "";
    const b = next.match(
      new RegExp(
        `(\\d+(?:[.,]\\d+)?)\\s*(?:${UNITS.source})?\\s*[x×@]\\s*(${PRICE.source})`,
        "i",
      ),
    );
    if (b && line.length > 2) {
      const name = line.trim();
      const qty = num(b[1]);
      const unitPrice = num(b[2]);
      let total = clamp2(qty * unitPrice);
      const maybeTotal = body[i + 2] || "";
      const t = extractRightmostPrice(maybeTotal);
      if (t != null && maybeTotal.length < 12) total = clamp2(t);
      items.push({
        name,
        qty,
        unitPrice: clamp2(unitPrice),
        total,
      });
      i++;
      continue;
    }

    // C: qty  name  price
    const c = line.match(
      new RegExp(
        `^(\\d+(?:[.,]\\d+)?)\\s*(?:${UNITS.source})?\\s+(.+?)\\s+(${PRICE.source})$`,
        "i",
      ),
    );
    if (c) {
      const qty = num(c[1]);
      const name = c[2].trim();
      const up = num(c[3]);
      items.push({
        name,
        qty,
        total: clamp2(qty * up),
        unitPrice: clamp2(up),
      });
      continue;
    }

    // name wrapping
    if (items.length && line.length > 3 && !PRICE_TRAIL.test(line)) {
      const last = items[items.length - 1];
      if (last && last.name.length < 40)
        last.name = stripDoubles(`${last.name} ${line}`);
    }
  }

  // remove junk
  return items.filter((it) => it.total > 0 || (it.discount && it.name));
}

// ----- Currency -----
function guessCurrency(text: string): string | undefined {
  if (/\bMDL\b/i.test(text) || /\bLEI\b/i.test(text)) return "MDL";
  if (/\bRON\b/i.test(text)) return "RON";
  if (/\bEUR\b/i.test(text)) return "EUR";
  if (/\bUSD\b/i.test(text) || /\$/i.test(text)) return "USD";
  return "MDL";
}

// ----- Public entry -----
export function parseReceipt(ocrText: string): ParsedReceipt {
  const lines = normalize(ocrText);
  const { header, body, footer, footerStart } = segment(lines);

  const merchant = fuzzyMerchant(header.length ? header : lines);

  // date & time
  const dt = ocrText.match(/(\d{2}\.\d{2}\.\d{2,4}).{0,12}(\d{2}[:.]\d{2})/);
  const date = dt?.[1];
  const time = dt?.[2]?.replace(".", ":");

  const currency = guessCurrency(ocrText);
  const items = parseItems(body);

  const inferred = clamp2(items.reduce((s, it) => s + (it.total ?? 0), 0));

  // totals
  const { totalFromSuma, totalFromBottomRight } = parseTotals(
    lines,
    footerStart,
  );
  let total: number | undefined =
    totalFromSuma ?? totalFromBottomRight ?? (inferred || undefined);

  // sanity check vs inferred
  if (
    total != null &&
    inferred > 0 &&
    Math.abs(total - inferred) / Math.max(inferred, 1) > 0.6
  ) {
    total = inferred;
  }

  return {
    merchant: stripDoubles(merchant),
    date,
    time,
    currency,
    total: total ?? undefined,
    items,
    debug: {
      lines,
      headerLines: header,
      bodyLines: body,
      footerLines: footer,
      inferredTotalFromItems: inferred,
      totalFromFooter: undefined,
      totalFromSuma,
      totalFromBottomRight,
      matches: { dt: !!dt },
    },
  };
}
