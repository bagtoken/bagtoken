<script>
(function(){
  const curToggle = document.getElementById('curToggle');

  function PR(){ return window.__PRICES__ || { bagUsd:0, xrpUsd:0 }; }
  function fmt(n, max=6){ const x=Number(n); if(!Number.isFinite(x)) return '—'; return x.toLocaleString(undefined,{maximumFractionDigits:max}); }

  function els(){
    return {
      hud: document.getElementById('diceHud'),
      balLbl: document.getElementById('balLbl'),
      ccyLbl: document.getElementById('ccyLbl'),
      betLbl: document.getElementById('betLbl'),
      modeLbl: document.getElementById('modeLbl'),
      lastLbl: document.getElementById('lastLbl'),
      betQtyEl: document.getElementById('betQty'),
    };
  }
  function selectedMode(){ return (window.__BAG_FORCE_DEMO===true)?'Demo':'Live'; }
  function currentCurrency(){
    const el = curToggle?.querySelector('input[name="betCur"]:checked');
    return el ? String(el.value).toUpperCase() : 'XRP';
  }
  function getBalances(){
    const sess=(window.__bagSession && window.__bagSession.get && window.__bagSession.get())||{};
    const bag=Number(sess.bag)||0;
    let xrp=Number(sess.xrp);
    if(!(xrp>0)){
      const {bagUsd,xrpUsd}=PR();
      xrp = (bagUsd>0 && xrpUsd>0) ? (bag * (bagUsd/xrpUsd)) : 0;
    }
    return {bag,xrp};
  }
  function currentBet(){
    const {betQtyEl}=els(); const v=parseFloat(betQtyEl?.value||'0');
    if(!Number.isFinite(v)||v<0) return 0; return Math.max(0, Math.floor(v));
  }

  function styleBalanceRow(){
    const { hud } = els(); if (!hud) return;
    // Make Balance pill larger and full width row; others below it
    hud.style.display = 'grid';
    hud.style.gridTemplateColumns = '1fr';
    hud.style.gap = '6px';
    const pills = hud.querySelectorAll('.pill');
    if (pills.length){
      // Balance pill is the 2nd pill in your markup: [Mode][Balance][Bet][Last]
      pills.forEach(p=>{ p.style.fontSize='12px'; p.style.padding='6px 10px'; });
      if (pills[1]){ pills[1].style.fontSize='14px'; pills[1].style.padding='8px 12px'; pills[1].style.fontWeight='800'; }
      // Place the rest in a row under Balance
      const row = document.createElement('div');
      row.style.display='flex'; row.style.flexWrap='wrap'; row.style.gap='6px';
      // Move Mode, Bet, Last into row (Balance stays)
      hud.appendChild(row);
      [pills[0], pills[2], pills[3]].forEach(p=> row.appendChild(p));
    }
  }

  function renderHud(){
    try{
      const { balLbl, ccyLbl, betLbl, modeLbl, lastLbl } = els();
      const mode=selectedMode(), ccy=currentCurrency();
      const {bag,xrp}=getBalances();
      if (modeLbl) modeLbl.textContent=mode;
      if (betLbl)  betLbl.textContent=String(currentBet());
      if (lastLbl) lastLbl.textContent=String(window.__DICE_LAST__||'—');
      if (balLbl && ccyLbl){
        if (ccy==='XRP'){ balLbl.textContent=fmt(xrp,6); ccyLbl.textContent='XRP'; }
        else            { balLbl.textContent=fmt(bag,6); ccyLbl.textContent='BAG'; }
      }
    }catch(e){}
  }

  ['bag:sessionStarted','bag:sessionToppedUp','bag:sessionEnded','bag:pricesUpdated','bag:walletConnected','bag:walletDisconnected','bag:diceResult','bag:hudRefresh']
    .forEach(ev=>addEventListener(ev, renderHud));
  document.getElementById('betQty')?.addEventListener('input', renderHud);
  curToggle?.addEventListener('change', renderHud);
  addEventListener('storage', (e)=>{ if (e && e.key === '__bag_demo_bag_v2') renderHud(); });

  // first paint + layout tweak
  renderHud();
  styleBalanceRow();
})();
</script>
