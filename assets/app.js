// assets/app.js
// BAG frontend → API subdomain wiring
// Expects your API to be live at https://api.getthebag.io with /health and /price

const BASE_API = 'https://api.getthebag.io';
const OTC_RATE_BAG_PER_USD = 1_000_000; // $1 = 1,000,000 BAG

// ---------- DOM helpers ----------
function $(sel) { return document.querySelector(sel); }
function setText(sel, txt) { const el = $(sel); if (el) el.textContent = txt; }
function setBadgeOnline(ok) { setText('#otc-status', ok ? 'ONLINE' : 'MAINTENANCE'); }

// ---------- API calls ----------
async function api(path) {
  const r = await fetch(`${BASE_API}${path}`, { mode: 'cors' });
  if (!r.ok) throw new Error(`http_${r.status}`);
  return r.json();
}

async function getHealth() {
  try {
    const j = await api('/health');
    return !!j.ok;
  } catch (_) {
    return false;
  }
}

async function getPrice() {
  const j = await api('/price');
  if (!j.ok) throw new Error('price_unavailable');
  return parseFloat(j.xrp_usd); // number
}

// ---------- UI binding ----------
async function init() {
  // Status
  const healthy = await getHealth();
  setBadgeOnline(healthy);

  // Price line
  if (healthy) {
    try {
      const px = await getPrice();
      setText('#xrp-usd', `$${px.toFixed(4)} / XRP`);
      window.__XRP_USD = px;
    } catch {
      setText('#xrp-usd', '—');
    }
  } else {
    setText('#xrp-usd', '—');
  }

  // Conversions
  const xrpInput = $('#xrp-input');
  const usdOut   = $('#usd-output');
  const bagOut   = $('#bag-output');

  function recalc() {
    const xrp = parseFloat(xrpInput?.value || '0') || 0;
    const px  = window.__XRP_USD || 0;
    const usd = xrp * px;
    const bag = usd * OTC_RATE_BAG_PER_USD;

    if (usdOut) usdOut.textContent = usd > 0 ? `$${usd.toFixed(2)}` : '$0.00';
    if (bagOut) bagOut.textContent = bag > 0 ? bag.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0';
  }

  xrpInput?.addEventListener('input', recalc);
  recalc();

  // Quote button optional
  const quoteBtn = $('#quote-btn');
  quoteBtn?.addEventListener('click', async () => {
    // no network post here by design, visual quote only
    recalc();
    const badge = $('#quote-status');
    if (badge) badge.textContent = healthy ? 'Quote ready' : 'Maintenance';
  });
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
