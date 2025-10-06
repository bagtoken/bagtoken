#!/usr/bin/env node
/**
 * Writes assets/bag-price.json with live XRP/USD (median of 3 exchanges),
 * and BAG/USD from env (or default). Frontend consumes this JSON.
 */
import fs from 'node:fs/promises';

const BAG_USD = Number(process.env.BAG_USD || '0.000001'); // change default if desired

async function kraken() {
  const r = await fetch('https://api.kraken.com/0/public/Ticker?pair=XRPUSD');
  const j = await r.json();
  if (!j.result) throw new Error('Kraken bad JSON');
  const k = Object.keys(j.result)[0];          // e.g. "XXRPZUSD"
  return Number(j.result[k].c[0]);             // last trade
}

async function coinbase() {
  const r = await fetch('https://api.coinbase.com/v2/prices/XRP-USD/spot');
  const j = await r.json();
  return Number(j?.data?.amount);
}

async function bitstamp() {
  const r = await fetch('https://www.bitstamp.net/api/v2/ticker/xrpusd/');
  const j = await r.json();
  return Number(j?.last);
}

async function getXrpUsd() {
  const vals = [];
  for (const fn of [kraken, coinbase, bitstamp]) {
    try {
      const v = await fn();
      if (Number.isFinite(v) && v > 0) vals.push(v);
    } catch {}
  }
  if (!vals.length) throw new Error('No XRP price sources responded');
  vals.sort((a, b) => a - b);
  return vals[Math.floor(vals.length / 2)]; // median
}

const round = (n, dp = 8) => Number(n.toFixed(dp));

(async () => {
  const xrp_usd = round(await getXrpUsd(), 6);
  const bag_usd = round(BAG_USD, 12);
  const bag_xrp = round(bag_usd / xrp_usd, 12);

  const payload = {
    bag_usd,
    xrp_usd,
    bag_xrp,
    timestamp: new Date().toISOString()
  };

  await fs.writeFile(
    'assets/bag-price.json',
    JSON.stringify(payload, null, 2) + '\n',
    'utf8'
  );

  console.log('Updated assets/bag-price.json', payload);
})();
