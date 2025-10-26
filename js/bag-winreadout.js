<!-- /js/bag-winreadout.js -->
<script>
/* $BAG — Universal WIN Readout
 * Renders an always-up-to-date payout panel for the current stake.
 * Uses: window.__PRICES__, BAGGame (labels & multipliers), and detects stake from the page.
 * Works with both Blackjack (StakeWire) and Poker (USD/XRP/BAG select).
 */
(function (w, d) {
  const PR = ()=> (w.__PRICES__ || { bagUsd:0, xrpUsd:0 });

  /* ---------- helpers ---------- */
  function fmtUsd(n){ return '$'+(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmt(n, max=6){ const x=Number(n)||0; return x.toLocaleString(undefined,{maximumFractionDigits:max}); }
  function bagFromUsd(usd){ const {bagUsd}=PR(); return (bagUsd>0) ? (usd/bagUsd) : 0; }

  // Try to read USD stake from common UIs (BJ StakeWire, Poker bet field)
  function detectStakeUSD(){
    // 1) BJ: explicit USD input
    const usdEl = d.getElementById('usdBet');
    if (usdEl && Number(usdEl.value)>0) return Number(usdEl.value);

    // 2) BJ: qty + currency toggle (XRP/BAG)
    const qtyEl = d.getElementById('betQty');
    const curToggle = d.getElementById('curToggle');
    if (qtyEl && curToggle){
      const q = Number(qtyEl.value)||0;
      const cur = (curToggle.querySelector('input[name="betCur"]:checked')||{}).value || 'XRP';
      if (q>0){
        if (cur==='BAG') return (PR().bagUsd>0) ? q*PR().bagUsd : 0;
        if (cur==='XRP') return (PR().xrpUsd>0) ? q*PR().xrpUsd : 0;
      }
    }

    // 3) Poker: select (USD/XRP/BAG) + amount
    const curSel = d.getElementById('currency');
    const betInp = d.getElementById('bet');
    if (curSel && betInp){
      const q = Number(betInp.value)||0;
      const c = String(curSel.value||'USD').toUpperCase();
      if (q>0){
        if (c==='USD') return q;
        if (c==='XRP') return (PR().xrpUsd>0) ? q*PR().xrpUsd : 0;
        if (c==='BAG') return (PR().bagUsd>0) ? q*PR().bagUsd : 0;
      }
    }

    return 0;
  }

  function ensureStyles(){
    if (d.getElementById('bag-winreadout-css')) return;
    const css = `
      .bag-winreadout{padding:12px;border:1px dashed #29543d;border-radius:12px;background:#0c2418;color:#e4efe7}
      .bag-winreadout .row{display:flex;justify-content:space-between;gap:8px;margin:4px 0}
      .bag-winreadout .label{opacity:.9}
      .bag-winreadout .amt{font-weight:800;color:#ffe175}
      .bag-winreadout .muted{opacity:.8}
    `;
    const s=d.createElement('style'); s.id='bag-winreadout-css'; s.textContent=css; d.head.appendChild(s);
  }

  /* ---------- specs per game ---------- */
  function specFor(game){
    const L = (w.BAGGame && BAGGame.labels && BAGGame.labels()) || {win:'Win', lose:'Lose', push:'Push', blackjack:'Blackjack'};
    const P = (w.BAGGame && BAGGame.payouts && BAGGame.payouts()) || {WIN:2, PUSH:1, BJ:2};

    if (game==='blackjack'){
      return [
        { key:'bj',   label:`${L.blackjack} (A+10 on deal)`, mult:P.BJ,   type:'win'  },
        { key:'win',  label:`${L.win}`,                       mult:P.WIN,  type:'win'  },
        { key:'push', label:`${L.push} (refund)`,             mult:P.PUSH, type:'push' },
        { key:'lose', label:`${L.lose}`,                      mult:0,      type:'lose' },
        { key:'hold', label:`Stake held`,                     mult:1,      type:'stake'}
      ];
    }
    // default → poker (single-draw vs CPU)
    return [
      { key:'win',  label:`${L.win} — best hand`,  mult:P.WIN,  type:'win'  },
      { key:'push', label:`${L.push} — exact tie`, mult:P.PUSH, type:'push' },
      { key:'lose', label:`${L.lose}`,             mult:0,      type:'lose' },
      { key:'hold', label:`Stake held`,            mult:1,      type:'stake'}
    ];
  }

  function render(root, game, customSpec){
    const spec = customSpec || specFor(game);
    const usd  = detectStakeUSD();
    const rows = [];

    for (const item of spec){
      let outUsd = 0, right = '';
      if (item.type==='lose'){ right = `0 BAG ($0.00)`; }
      else if (item.type==='stake'){ right = `${fmt(bagFromUsd(usd),6)} BAG (${fmtUsd(usd)})`; }
      else { outUsd = usd * (Number(item.mult)||0); right = `${fmt(bagFromUsd(outUsd),6)} BAG (${fmtUsd(outUsd)})`; }

      rows.push(`<div class="row"><span class="label">${item.label}</span><span class="amt">${right}</span></div>`);
    }

    rows.push(`<div class="row muted"><span class="label">Prices</span><span class="amt">BAG $${fmt(PR().bagUsd,6)} · XRP $${fmt(PR().xrpUsd,2)}</span></div>`);
    root.innerHTML = rows.join('');
  }

  const API = {
    mount(opts){
      ensureStyles();
      const el   = typeof opts?.root==='string' ? d.querySelector(opts.root) : (opts?.root || d.getElementById('winReadout'));
      if (!el) return null;

      const game = (opts?.game || (w.BAGGame && BAGGame.game && BAGGame.game()) || 'poker').toLowerCase();
      el.classList.add('bag-winreadout','mono');

      const redraw = ()=>render(el, game, opts?.spec);
      redraw();

      // Update on any likely state change
      w.addEventListener('bag:pricesUpdated', redraw);
      w.addEventListener('bag:hudRefresh', redraw);
      w.addEventListener('bag:sessionUpdated', redraw);

      // Inputs we commonly use for stakes
      ['usdBet','betQty','bet'].forEach(id=>{
        const n = d.getElementById(id);
        if(n){ n.addEventListener('input',redraw); n.addEventListener('change',redraw); }
      });
      // Currency toggles/selects
      const curToggle = d.getElementById('curToggle');
      if (curToggle) curToggle.addEventListener('change', redraw);
      const currencySel = d.getElementById('currency');
      if (currencySel) currencySel.addEventListener('change', redraw);

      // Cross-tab/localStorage changes that might affect prices/balances
      w.addEventListener('storage', redraw);

      return { redraw, el };
    },
    mountAuto(){
      const node = d.getElementById('winReadout') || d.querySelector('[data-winreadout]');
      if (node) return API.mount({ root: node });
      return null;
    }
  };

  w.BAGWinReadout = API;
  // auto-mount if a placeholder exists
  d.readyState !== 'loading' ? API.mountAuto() : d.addEventListener('DOMContentLoaded', API.mountAuto);
})(window, document);
</script>
