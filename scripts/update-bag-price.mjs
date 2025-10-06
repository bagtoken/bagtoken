#!/usr/bin/env node
// scripts/update-bag-price.mjs
// Builds assets/bag-price.json from your API.
// Requires repo secret: BAG_API_KEY
// Node 18+ (or Actions setup-node 20). Uses ESM + node-fetch v3.

import fs from "node:fs";
import path from "node:path";
import fetch from "node-fetch";

const API_BASE = process.env.API_BASE || "https://api.getthebag.io";
const KEY = process.env.BAG_API_KEY || "";
const FALLBACK_BAG_USD = parseFloat(process.env.BAG_USD_FALLBACK || "0.000001");

// ---- helpers ----
function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}
function isNum(n) {
  return typeof n === "number" && Number.isFinite(n);
}
async function quoteAmt({ amount, base, quote }) {
  const r = await fetch(`${API_BASE}/quote`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": KEY,
      "origin": "https://getthebag.io",
    },
    body: JSON.stringify({ amount: String(amount), base, quote }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`quote ${base}->${quote} ${r.status}: ${body.slice(0, 200)}`);
  }
  const j = await r.json();
  if (!j || !isNum(j.quote)) {
    throw new Error(`unexpected payload for ${base}->${quote}: ${JSON.stringify(j).slice(0, 200)}`);
  }
  return j.quote; // numeric
}

// ---- main ----
(async () => {
  assert(KEY, "Missing BAG_API_KEY env");

  // Use bigger notionals to reduce rounding noise, then scale back.
  // 100 USD -> XRP  => xrp_usd = 100 / XRP_received
  const usdToXrp = await quoteAmt({ amount: 100, base: "USD", quote: "XRP" });
  assert(usdToXrp > 0, "USD->XRP quote must be > 0");
  const xrp_usd = 100 / usdToXrp;

  // Try 1,000,000 USD -> BAG to derive bag_usd precisely.
  // If BAG is not quotable yet, fall back to configured price.
  let bag_usd;
  try {
    const usdToBag = await quoteAmt({ amount: 1_000_000, base: "USD", quote: "BAG" });
    assert(usdToBag > 0, "USD->BAG quote must be > 0");
    bag_usd = 1_000_000 / usdToBag; // USD per 1 BAG
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("USD->BAG quote failed, using fallback:", e.message);
    bag_usd = FALLBACK_BAG_USD;
  }

  // Derive BAG priced in XRP
  const bag_xrp = bag_usd / xrp_usd;

  const out = {
    bag_usd: +bag_usd.toFixed(12),
    xrp_usd: +xrp_usd.toFixed(6),
    bag_xrp: +bag_xrp.toFixed(12),
    timestamp: new Date().toISOString(),
  };

  // Write assets/bag-price.json
  const outPath = path.join("assets", "bag-price.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");

  // eslint-disable-next-line no-console
  console.log("Wrote", outPath, out);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
