<script>
(function(){
  window.BAG = window.BAG || {};
  window.BAG.roulette = window.BAG.roulette || {};
  const S = window.BAG.roulette.state = window.BAG.roulette.state || {};

  const usdInput = document.getElementById('usdBet');
  const qtyInput = document.getElementById('betQty');
  const curWrap  = document.getElementById('curToggle');
  const unitEl   = document.querySelector('.unit');
  const limitsEl = document.getElementById('betLimits');

  function PR(){ return window.__PRICES__ || { bagUsd:0, xrpUsd:0 }; }
  function cur(){ const r=curWrap?.querySelector('input[name="betCur"]:checked'); return (r?.value||'XRP').toUpperCase(); }

  function pxFor(ccy){
    const p = PR();
    if (ccy==='BAG') return p.bagUsd||0;
    if (ccy==='XRP') return p.xrpUsd||0;
    return 0;
  }

  function clampUsd(v){
    const n = Math.max(1, Math.min(2000, Number(v)||0));
    return Math.round(n*100)/100;
  }

  function syncFromUsd(){
    const usd = clampUsd(usdInput.value);
    const ccy = cur();
    const px  = pxFor(ccy);
    if (px>0){
      const qty = usd/px;
      qtyInput.value = (ccy==='BAG' ? qty.toFixed(6) : Math.max(0.000001, qty)).toString();
      unitEl && (unitEl.textContent = ccy);
    }
    window.dispatchEvent(new CustomEvent('bag:stake:changed', { detail:{ usd, ccy }}));
  }

  function syncFromQty(){
    const ccy = cur();
    const px  = pxFor(ccy);
    const qty = Math.max(0, Number(qtyInput.value)||0);
    const usd = px>0 ? qty*px : 0;
    usdInput.value = clampUsd(usd).toFixed(2);
    unitEl && (unitEl.textContent = ccy);
    window.dispatchEvent(new CustomEvent('bag:stake:changed', { detail:{ usd, ccy }}));
  }

  usdInput?.addEventListener('input', syncFromUsd);
  qtyInput?.addEventListener('input', syncFromQty);
  curWrap?.addEventListener('change', ()=>{ syncFromUsd(); });

  window.addEventListener('bag:pricesUpdated', ()=>{ syncFromUsd(); });

  // public helpers
  S.stakeUsd = ()=> Number(usdInput?.value||0);
  S.stakeQty = ()=> Number(qtyInput?.value||0);
  S.stakeCur = cur;

  // init
  syncFromUsd();
  limitsEl && (limitsEl.textContent = 'Min $1 · Max $2,000 (USD eq.)');
})();
</script>
