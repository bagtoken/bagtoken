// --- CoinGecko config
const COINGECKO_API_KEY = ""; // optional Pro key
const CG_HEADERS = COINGECKO_API_KEY ? { "x-cg-pro-api-key": COINGECKO_API_KEY } : {};
const CG_BASE = "https://api.coingecko.com/api/v3";

// --- LIVE badge (OTC stays OFFLINE for now)
function setBadge(state, text) {
  const el = document.getElementById("liveStatus");
  const tx = document.getElementById("liveText");
  if (!el || !tx) return;
  el.classList.remove("live","warn","down");
  el.classList.add(state);
  tx.textContent = text;
}
setBadge("down", "OFFLINE");

// --- Toast helper
const toast = document.getElementById('toast');
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.style.display = 'none', 2200);
}

// --- Pricing: XRP fetch for conversion
async function fetchXRPPrice() {
  try {
    const res = await fetch(`${CG_BASE}/simple/price?ids=ripple&vs_currencies=usd`, { headers: CG_HEADERS, cache: "no-store" });
    const data = await res.json();
    return data && data.ripple && data.ripple.usd ? Number(data.ripple.usd) : null;
  } catch {
    return null;
  }
}

const usdInput = document.getElementById('usdInput');
const xrpConversion = document.getElementById('xrpConversion');
const bagAmount = document.getElementById('bagAmount');
const btnConnect = document.getElementById('btnConnect');
const btnBuy = document.getElementById('btnBuy');

let lastPrice = null;

// CONNECT → warning only
btnConnect.addEventListener('click', () => {
  showToast('⚠️ OTC OPENS SOON');
});

// BUY → warning only
btnBuy.addEventListener('click', () => {
  showToast('⚠️ OTC OPENS SOON');
});

// Handle input & enable BUY without any wallet dependency
async function handleUSDInput() {
  const usd = parseFloat(usdInput.value);
  xrpConversion.textContent = '';
  bagAmount.textContent = '';

  if (isNaN(usd) || usd < 1) {
    xrpConversion.textContent = usd > 0 ? '❌ Minimum $1' : '🔁 XRP Required: 0';
    bagAmount.textContent = '🪙 You’ll receive: 0 $BAG';
    btnBuy.disabled = true;
    return;
  }

  const livePrice = lastPrice ?? await fetchXRPPrice();
  lastPrice = livePrice;

  if (!livePrice) {
    xrpConversion.textContent = '⚠️ Could not fetch XRP price';
    bagAmount.textContent = '🪙 You’ll receive: 0 $BAG';
    btnBuy.disabled = true;
    return;
  }

  // Display to 2 decimals for UX; BAG math at 6 decimals
  const xrpNeeded = (usd / livePrice);
  const xrpDisplay = Math.max(0, xrpNeeded).toFixed(2);

  // $1 → 1,000,000 BAG
  const bagRaw = usd * 1_000_000;
  const bagRounded = Math.floor(bagRaw * 1e6) / 1e6; // enforce 6-decimal rounding in code path
  const bagDisplay = bagRounded.toLocaleString();

  xrpConversion.textContent = `🔁 XRP Required: ${xrpDisplay} XRP`;
  bagAmount.textContent = `🪙 You’ll receive: ${bagDisplay} $BAG`;

  btnBuy.disabled = false;
}

usdInput.addEventListener('input', handleUSDInput);
handleUSDInput();
