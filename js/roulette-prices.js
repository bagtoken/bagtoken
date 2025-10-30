<script>
(function(){
  // Namespace
  window.BAG = window.BAG || {};
  window.BAG.roulette = window.BAG.roulette || {};

  const S = window.BAG.roulette.state = window.BAG.roulette.state || {};
  const PR = () => (window.__PRICES__ || { bagUsd:0, xrpUsd:0 });

  function conversions(){
    const p = PR();
    if (!(p.bagUsd>0 && p.xrpUsd>0)) return { bagPerXrp:0, xrpPerBag:0 };
    return { bagPerXrp: p.xrpUsd / p.bagUsd, xrpPerBag: p.bagUsd / p.xrpUsd };
  }

  function renderLiveLine(){
    const p = PR();
    const liveBAG = document.getElementById('liveBAG');
    const liveXRP = document.getElementById('liveXRP');
    const liveConv = document.getElementById('liveConv');
    if (liveBAG) liveBAG.textContent = (p.bagUsd||0).toLocaleString(undefined,{maximumFractionDigits:6});
    if (liveXRP) liveXRP.textContent = (p.xrpUsd||0).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
    if (liveConv){
      const c = conversions();
      if (c.xrpPerBag>0 && c.bagPerXrp>0){
        liveConv.textContent = `1 BAG ≈ ${c.xrpPerBag.toFixed(6)} XRP · 1 XRP ≈ ${c.bagPerXrp.toFixed(6)} BAG`;
      } else {
        liveConv.textContent = '1 BAG ≈ — XRP · 1 XRP ≈ — BAG';
      }
    }
  }

  window.addEventListener('bag:pricesUpdated', renderLiveLine);
  renderLiveLine();

  // expose helpers (read-only)
  S.conversions = conversions;
})();
</script>
