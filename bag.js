const API_BASE = 'https://api.getthebag.io';

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

document.addEventListener('DOMContentLoaded', attachQuoteButton);
