import { supabase } from "@/api";

// naive LIKE mapping (production: regex + normalized merchants)
export async function refreshSpendExposure(userId: string) {
  // get last 90d transactions
  const { data: txs, error: txErr } = await supabase
    .from("transactions")
    .select("id, amount, merchant, created_at")
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 90 * 864e5).toISOString());

  if (txErr) throw txErr;

  const { data: maps, error: mapErr } = await supabase
    .from("brand_mappings")
    .select("merchant_pattern, symbol, sector, weight");
  if (mapErr) throw mapErr;

  const rows: Record<string, { symbol: string; sector: string; month: string; amount: number }> = {};

  for (const t of txs ?? []) {
    const merchant = String(t.merchant ?? "").toUpperCase();
    const amount = Number(t.amount || 0);
    const month = new Date(t.created_at).toISOString().slice(0, 7) + "-01";

    for (const m of maps ?? []) {
      if (merchant.includes(String(m.merchant_pattern).toUpperCase())) {
        const k = `${m.symbol}|${m.sector}|${month}`;
        rows[k] = rows[k] || { symbol: m.symbol, sector: m.sector, month, amount: 0 };
        rows[k].amount += amount * Number(m.weight || 1);
      }
    }
  }

  const upserts = Object.values(rows).map(r => ({
    user_id: userId,
    symbol: r.symbol,
    sector: r.sector,
    month: r.month,
    amount: r.amount,
  }));

  if (upserts.length) {
    const { error: upErr } = await supabase.from("spend_exposure").upsert(upserts);
    if (upErr) throw upErr;
  }
}

export async function getExposureLast90d(userId: string) {
  const since = new Date();
  since.setDate(1);
  since.setMonth(since.getMonth() - 2); // simple 90d window
  const { data, error } = await supabase
    .from("spend_exposure")
    .select("*")
    .eq("user_id", userId)
    .gte("month", since.toISOString().slice(0, 10));
  if (error) throw error;
  return data ?? [];
}
