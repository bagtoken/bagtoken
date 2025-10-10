// ======================================================
// $BAG Casino Core Script
// Live Pricing + Quote Fetch + Local Fallback
// ======================================================

const API_BASE = 'https://api.getthebag.io';

// --- Live pricing with last-known fallback --- //
const PRICE_KEY = 'bag_last_price_v1';       // { price:number, ts:number }
const STALE_AFTER_MS = 60 * 1000;            // 1 min: mark as stale (yellow)
const EXPIRED_AFTER_MS = 10 * 60 * 1000;     // 10 min: very stale (red)
const POLL_MS = 15_000;                      // poll cadence
const FETCH_TIMEOUT_MS = 6_000;              // API timeout

const $ = (id) => document.getElementById(id);

function loadLastPrice() {
  try {
    const raw = localStorage.getItem(PRICE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (typeof obj?.price !== 'number' || typeof obj?.ts !== 'number') return null;
    return obj;
  } catch { return null; }
}

function saveLastPrice(price) {
  try {
    localStorage.setItem(PRICE_KEY, JSON.stringify({ price, ts: Date.now() }));
  } catch {}
}

function setPriceUI(price, ts, { live }) {
  const el = $('price-bag');
  if (!el) return;

  el.textContent = price != null ? price.toFixed(6) : '—';
  const age = Date.now() - (ts || 0);
  el.classList.remove('text-red-500', 'text-yellow-500', 'opacity-50');

  const badge = $('price-status');
  if (badge) {
    badge.textContent = '';
    badge.classList.remove('text-yellow-400', 'text-red-400', 'hidden');
  }

  if (live) {
    if (badge) { badge.textContent = 'LIVE'; badge.classList.add('text-yellow-400'); }
    return;
  }

  if (age > EXPIRED_AFTER_MS) {
    el.classList.add('text-red-500');
    if (badge) { badge.textContent = 'STALE'; badge.classList.add('text-red-400'); }
  } else if (age > STALE_AFTER_MS) {
    el.classList.add('text-yellow-500');
    if (badge) { badge.textContent = 'CACHED'; badge.classList.add('text-yellow-400'); }
  } else {
    if (badge) { badge.textContent = 'CACHED'; badge.classList.add('text-yellow-400'); }
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
  ]);
}

async function fetchLivePrice() {
  const res = await withTimeout(fetch('/api/prices?symbols=BAG', { credentials: 'omit' }), FETCH_TIMEOUT_MS);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  const price =
    data?.BAG?.price ??
    data?.bag?.price ??
    data?.price ??
    (typeof data === 'number' ? data : null);
  if (price == null) throw new Error('No price in payload');
  return Number(price);
}

let pollTimer;

async function refreshPrice() {
  const last = loadLastPrice();
  try {
    const price = await fetchLivePrice();
    saveLastPrice(price);
    setPriceUI(price, Date.now(), { live: true });
  } catch (e) {
    if (last) {
      setPriceUI(last.price, last.ts, { live: false });
    } else {
      setPriceUI(null, 0, { live: false });
    }
  }
}

function startPricingLoop() {
  clearInterval(pollTimer);
  const last = loadLastPrice();
  if (last) setPriceUI(last.price, last.ts, { live: false });
  refreshPrice();
  pollTimer = setInterval(refreshPrice, POLL_MS);
}

// ======================================================
// Quote Calculator
// ======================================================
async function getQuote(usd) {
  const url = `${API_BASE}/api/quote?usd=${encodeURIComponent(usd)}`;
  const res = await fetch(url, { method: 'GET', mode: 'cors', credentials: 'omit' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'quote failed');
  return data;
}

function attachQuoteButton() {
  const btn = document.querySelector('[data-quote-btn]');
  const input = document.querySelector('input[data-quote-usd]');
  const out = document.querySelector('[data-quote-out]');
  if (!btn || !input || !out) return;

  let busy = false;
  btn.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    out.textContent = 'Fetching…';
    try {
      const usd = Number(input.value || 0);
      if (!isFinite(usd) || usd <= 0) throw new Error('Enter a dollar amount > 0');
      const q = await getQuote(usd);
      out.textContent = `XRP to send: ${q.xrp_to_send} (Rate: $${q.xrp_usd} / XRP)`;
    } catch (e) {
      out.textContent = `⚠️ Could not fetch quote\n${e.message || e}`;
      console.error(e);
    } finally {
      busy = false;
    }
  });
}

// ======================================================
// Init everything
// ======================================================
document.addEventListener('DOMContentLoaded', () => {
  startPricingLoop();
  attachQuoteButton();
});
