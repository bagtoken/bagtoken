<script>
(function(){
  window.BAG = window.BAG || {};
  window.BAG.roulette = window.BAG.roulette || {};
  const R = window.BAG.roulette.rules = {
    wheel: 'American (0 and 00)',
    selections: ['Straight','Dozens (1-12/13-24/25-36)','Columns (C1/C2/C3)','Red/Black','Even/Odd','Low/High'],
    stake: { minUsd:1, maxUsd:2000, settle:'BAG', convert:'$XRP auto-converts at live rate' },
    payScale: [1.00,1.25,1.50,1.75,2.00],
    note: 'Practice mode on this page. On-ledger play wires in after QA.'
  };
  // Keep your existing modal DOM but guarantee open/close wiring
  const fab = document.getElementById('rulesFab');
  const modal = document.getElementById('rulesModal');
  const close = document.getElementById('rulesClose');
  function open(){ if (modal) { modal.style.display='grid'; fab?.setAttribute('aria-expanded','true'); } }
  function hide(){ if (modal) { modal.style.display='none'; fab?.setAttribute('aria-expanded','false'); } }
  fab?.addEventListener('click', open);
  close?.addEventListener('click', hide);
  modal?.addEventListener('click', (e)=>{ if (e.target===modal) hide(); });
  addEventListener('keydown', (e)=>{ if (e.key==='Escape') hide(); });
})();
</script>
