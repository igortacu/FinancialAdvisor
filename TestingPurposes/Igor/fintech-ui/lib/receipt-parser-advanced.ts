// Advanced Moldovan receipt parser (Kaufland, Linella, etc.)

export type ParsedItem = {
  name: string;
  qty: number; // default 1
  unit?: string; // BUC | KG | L | PCS
  unitPrice?: number; // optional if not present
  total: number;
  discount?: number; // negative
};

export type ParsedReceipt = {
  merchant: string;
  date?: string;
  time?: string;
  currency?: string; // MDL/lei by default
  total?: number;
  vat?: number;
  items: ParsedItem[];
  debug?: {
    lines: string[];
    headerLines: string[];
    bodyLines: string[];
    footerLines: string[];
    inferredTotalFromItems?: number;
    matches?: Record<string, any>;
  };
};

// ---------------------- utils

const RO_KEYWORDS = {
  total: [/TOTAL/i, /SUMA/i, /SUMĂ/i, /\bSUM\b/i],
  vat: [/TVA/i, /VAT/i],
  discount: [/REDUCERE/i, /DISCOUNT/i, /^-\s*\d/i],
  ignoreHead: [
    /BON/i,
    /FISCAL/i,
    /CASA/i,
    /CASH/i,
    /CARD/i,
    /NR/i,
    /CHECK/i,
    /MAGAZIN/i,
  ],
  units: [/(?:BUC|PCS|KG|G|L|ML)/i],
  qtySep: /[x×@]/,
  currency: [/\bMDL\b/i, /\bLEI\b/i, /\bRON\b/i],
};

const DIGIT_FIXES: [RegExp, string][] = [
  [/O/g, "0"], // O -> 0
  [/S/g, "5"], // S -> 5
  [/l/g, "1"], // l -> 1
  [/I/g, "1"], // I -> 1
  [/B(?=\d)/g, "8"], // B->8 when before numbers
];

const PRICE_TRAIL = /([0-9]+(?:[.,][0-9]{1,2})?)\s*$/;

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

// quick contains-any
const any = (arr: RegExp[], s: string) => arr.some((r) => r.test(s));

// Levenshtein distance (tiny)
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

function fuzzyMerchant(lines: string[]): string {
  const candidates = [
    "KAUFLAND",
    "LINELLA",
    "GREEN HILLS",
    "FELICIA",
    "FOXY",
    "NR1",
    "FOOD",
    "MARKET",
    "Kaufland",
    "Linella",
  ];
  let best = { name: lines[0] || "Receipt", score: Infinity };
  for (const l of lines.slice(0, 8)) {
    for (const c of candidates) {
      const s = lev(l.toUpperCase().slice(0, 16), c.toUpperCase());
      if (s < best.score) best = { name: stripDoubles(l), score: s };
    }
  }
  return best.name;
}

// split header/body/footer by first TOTAL or TVA
function segment(lines: string[]) {
  let totalIdx = lines.findIndex((l) => any(RO_KEYWORDS.total, l));
  if (totalIdx < 0) totalIdx = lines.findIndex((l) => any(RO_KEYWORDS.vat, l));
  if (totalIdx < 0) totalIdx = Math.max(lines.length - 4, 0);

  // try to find first item-ish line start
  let startIdx = lines.findIndex(
    (l, i) =>
      !any(RO_KEYWORDS.ignoreHead, l) &&
      !any(RO_KEYWORDS.total, l) &&
      !any(RO_KEYWORDS.vat, l) &&
      // not a header number-only line
      !/^\d{2,}$/.test(l) &&
      // has either price at end or next line looks like qty x price
      (PRICE_TRAIL.test(l) ||
        (i + 1 < lines.length &&
          /(\d+(?:[.,]\d+)?)\s*(?:BUC|PCS|KG|G|L|ML)?\s*[x×@]\s*([0-9]+(?:[.,][0-9]{1,2})?)/i.test(
            lines[i + 1],
          ))),
  );

  if (startIdx < 0) startIdx = 0;

  const header = lines.slice(0, startIdx);
  const body = lines.slice(startIdx, totalIdx);
  const footer = lines.slice(totalIdx);

  return { header, body, footer };
}

// detect currency
function guessCurrency(text: string): string | undefined {
  if (/\bMDL\b/i.test(text) || /\bLEI\b/i.test(text)) return "MDL";
  if (/\bRON\b/i.test(text)) return "RON";
  if (/\bEUR\b/i.test(text)) return "EUR";
  if (/\bUSD\b/i.test(text) || /\$/i.test(text)) return "USD";
  return "MDL";
}

// parse totals from footer block
function parseTotals(footer: string[]) {
  let total: number | undefined;
  let vat: number | undefined;

  for (const l of footer) {
    if (any(RO_KEYWORDS.total, l)) {
      const m = l.match(/(?:TOTAL|SUMA|SUMĂ)\s+([0-9\.,\s]+)/i);
      if (m) total = num(m[1]);
    }
    if (any(RO_KEYWORDS.vat, l)) {
      const m = l.match(/TVA[^\d]*([0-9\.,]+)/i);
      if (m) vat = num(m[1]);
    }
  }
  // fallback: rightmost price on a footer line
  if (total == null) {
    for (const l of footer) {
      const m = l.match(PRICE_TRAIL);
      if (m) total = num(m[1]);
    }
  }
  return { total, vat };
}

// parse items from body block
function parseItems(body: string[]): ParsedItem[] {
  const items: ParsedItem[] = [];

  for (let i = 0; i < body.length; i++) {
    const line = body[i];

    // discount line attaches to previous item
    if (any(RO_KEYWORDS.discount, line) || /^-\s*\d/.test(line)) {
      const m = line.match(/-?\s*([0-9]+(?:[.,][0-9]{1,2})?)/);
      if (m && items.length) {
        const v = -Math.abs(num(m[1]));
        const last = items[items.length - 1];
        last.discount = clamp2((last.discount || 0) + v);
        last.total = clamp2(last.total + v);
      }
      continue;
    }

    // Pattern A: name + price at end (aligned column)
    const a = line.match(/^(.*?)([ \.]{2,})?([0-9]+(?:[.,][0-9]{1,2})$)/);
    if (a && a[1].trim().length >= 2) {
      const name = a[1].trim();
      const price = num(a[3]);
      items.push({
        name,
        qty: 1,
        total: clamp2(price),
        unitPrice: clamp2(price),
      });
      continue;
    }

    // Pattern B: name on this line, qty x unit on next line
    const next = body[i + 1] || "";
    const b = next.match(
      /(\d+(?:[.,]\d+)?)\s*(BUC|PCS|KG|G|L|ML)?\s*[x×@]\s*([0-9]+(?:[.,][0-9]{1,2})?)\b/i,
    );
    if (b && line.length > 2) {
      const name = line.trim();
      const qty = num(b[1]);
      const unit = b[2]?.toUpperCase();
      const unitPrice = num(b[3]);

      // sometimes total shows on same or next+1 line
      let total = clamp2(qty * unitPrice);
      const maybeTotalLine = body[i + 2] || "";
      const t1 = PRICE_TRAIL.exec(maybeTotalLine);
      if (t1 && maybeTotalLine.length < 12) total = clamp2(num(t1[1]));

      items.push({
        name,
        qty,
        unit,
        unitPrice: clamp2(unitPrice),
        total,
      });
      i++; // consumed next line
      continue;
    }

    // Pattern C: single line with qty, name, price (rare)
    const c = line.match(
      /^(\d+(?:[.,]\d+)?)\s*(?:BUC|PCS|KG|G|L|ML)?\s+(.+?)\s+([0-9]+(?:[.,][0-9]{1,2}))$/,
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

    // else: ignore line; or join wrapped name to previous item’s name
    if (items.length && line.length > 3 && !PRICE_TRAIL.test(line)) {
      const last = items[items.length - 1];
      if (last && last.name.length < 40) {
        last.name = stripDoubles(`${last.name} ${line}`);
      }
    }
  }
  return items;
}

// public entry
export function parseReceipt(ocrText: string): ParsedReceipt {
  const lines = normalize(ocrText);
  const { header, body, footer } = segment(lines);

  const merchant = fuzzyMerchant(header.length ? header : lines);

  // date & time (supports "dd.mm.yyyy HH:MM" or "dd.mm.yy HH.MM")
  const dt = ocrText.match(/(\d{2}\.\d{2}\.\d{2,4}).{0,12}(\d{2}[:.]\d{2})/);
  const date = dt?.[1];
  const time = dt?.[2]?.replace(".", ":");

  const currency = guessCurrency(ocrText);
  const { total, vat } = parseTotals(footer);
  const items = parseItems(body);

  const inferred = clamp2(items.reduce((s, it) => s + (it.total ?? 0), 0));

  const result: ParsedReceipt = {
    merchant: stripDoubles(merchant),
    date,
    time,
    currency,
    total: total ?? inferred, // fallback
    vat,
    items,
    debug: {
      lines,
      headerLines: header,
      bodyLines: body,
      footerLines: footer,
      inferredTotalFromItems: inferred,
      matches: { dt: !!dt, total: total ?? null, vat: vat ?? null },
    },
  };

  // sanity: if OCR produced a nonsense huge total vs inferred, trust inferred
  if (
    result.total &&
    Math.abs(result.total - inferred) / (inferred || 1) > 0.5
  ) {
    result.total = inferred;
  }

  // drop zero/negative ghost items (except discounts attached above)
  result.items = result.items.filter(
    (it) => it.total > 0 || (it.discount && it.name),
  );

  return result;
}
