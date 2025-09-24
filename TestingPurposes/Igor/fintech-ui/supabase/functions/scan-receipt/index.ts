// deno.json: { "imports": { "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2" } }
import { createClient } from "@supabase/supabase-js";

// Types
type Item = { name: string; qty: number; price: number };
type OCRResult = { merchant: string; items: Item[]; total: number; currency?: string };

function guessCategory(merchant: string, items: Item[]) {
  const hay = [merchant, ...items.map(i => i.name)].join(" ").toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/(linella|kaufland|milk|bread|banana|apple|yogurt|pasta|sauce|water|chicken|grocer)/, "Groceries"],
    [/(uber|taxi|bus|metro|fuel|parking)/, "Transport"],
    [/(netflix|spotify|prime|subscription|bill|electric|internet)/, "Bills"],
    [/(cafe|coffee|restaurant|bar|movie|cinema|game)/, "Fun"],
  ];
  for (const [rx, cat] of rules) if (rx.test(hay)) return cat;
  return "Other";
}

// very small mock when no OCR key present
function mockOCR(filename: string | undefined): OCRResult {
  const f = (filename || "").toLowerCase();
  if (f.includes("linella")) {
    return {
      merchant: "Linella",
      items: [
        { name: "Milk 1L", qty: 2, price: 1.25 },
        { name: "Bananas", qty: 1, price: 1.89 },
        { name: "Bread", qty: 1, price: 1.10 },
      ],
      total: 5.49,
      currency: "USD",
    };
  }
  if (f.includes("kaufland")) {
    return {
      merchant: "Kaufland",
      items: [
        { name: "Chicken Breast", qty: 1, price: 6.4 },
        { name: "Pasta", qty: 2, price: 1.3 },
        { name: "Tomato Sauce", qty: 1, price: 1.9 },
      ],
      total: 10.9,
      currency: "USD",
    };
  }
  return {
    merchant: "Supermarket",
    items: [
      { name: "Apples", qty: 1, price: 2.1 },
      { name: "Yogurt", qty: 3, price: 0.8 },
      { name: "Water 2L", qty: 2, price: 0.7 },
    ],
    total: 5.9,
    currency: "USD",
  };
}

async function runVisionOCR(imageBytes: Uint8Array): Promise<OCRResult> {
  const key = Deno.env.get("GOOGLE_VISION_KEY");
  if (!key) throw new Error("NO_KEY");
  // Minimal Vision OCR (text detection)
  const body = {
    requests: [
      {
        image: { content: btoa(String.fromCharCode(...imageBytes)) },
        features: [{ type: "TEXT_DETECTION" }],
      },
    ],
  };
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${key}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
  if (!res.ok)
