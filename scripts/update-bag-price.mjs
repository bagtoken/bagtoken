// Creates/updates assets/bag-price.json from your API.
// Requires repo secret: BAG_API_KEY
import fs from "node:fs";
import path from "node:path";
import fetch from "node-fetch";

const API_BASE = process.env.API_BASE || "https://api.getthebag.io";
const KEY = process.env.BAG_API_KEY;
const FALLBACK_BAG_USD = parseFloat(process.env.BAG_USD_FALLBACK || "0.000001");

// Helper to POST /quote { amount, base, quote }
async function quote({ amount = "1", base, quote }) {
  const r = await fetch(`${API_BASE}/quote`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": KEY,
      "origin": "https://getthebag.io",
    },
    body: JSON.stringify({ amount, base, quote }),
  });
  if (!r.ok) throw new Error(`quote ${base}->${quote} failed: ${r.status}`);
  const j = await r.json();
  if (!j || typeof j.quote !== "number") {
    throw new Error(`unexpected quote payload for ${base}->${quote}: ${JSON.stringify(j)}`);
  }
  return j.quote; // numeric
}

(async () => {
  // 1 USD -> XRP (how many XRP per $1)
  const xrpPerUsd = await quote({ base: "USD", quote: "XRP" }); // e.g. 0.335
  const xrp_usd = 1 / xrpPerUsd; // e.g. $2.985 per XRP

  // Try to get 1 USD -> BAG from the API; fall back if not supported
  let bagPerUsd;
  try {
    bagPerUsd = await quote({ base: "USD", quote: "BAG" }); // how many BAG per $1
  } catch {
    // Convert fallback bag_usd into bagPerUsd
    bagPerUsd = 1 / FALLBACK_BAG_USD; // e.g. 1,000,000 BAG per $1
  }
  const bag_usd = 1 / bagPerUsd; // price of 1 BAG in USD

  // BAG in XRP = bag_usd / xrp_usd
  const bag_xrp = bag_usd / xrp_usd;

  const out = {
    bag_usd: +bag_usd.toFixed(12),
    xrp_usd: +xrp_usd.toFixed(6),
    bag_xrp: +bag_xrp.toFixed(12),
    timestamp: new Date().toISOString(),
  };

  const outPath = path.join("assets", "bag-price.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log("Wrote", outPath, out);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
