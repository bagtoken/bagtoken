<script>
(function(w){
  const { PR, on, fmtQty } = w.BAG;

  function mount(opts){
    const cfg=Object.assign({
      root:'#diceHud',
      balanceSel:{ value:'#balLbl', ccy:'#ccyLbl' },
      mode:'#modeLbl', bet:'#betLbl', last:'#lastLbl',
      betQty:'#betQty', curToggle:'#curToggle'
    }, opts||{});

    const $=(s)=>document.querySelector(s);
    const root=$(cfg.root);
    const balLbl=$(cfg.balanceSel.value), ccyLbl=$(cfg.balanceSel.ccy);
    const modeLbl=$(cfg.mode), betLbl=$(cfg.bet), lastLbl=$(cfg.last);
    const betQtyEl=$(cfg.betQty), curToggle=$(cfg.curToggle);

    const currentCurrency=()=>{
      const el=curToggle?.querySelector('input[name="betCur"]:checked');
      return el?String(el.value).toUpperCase():'XRP';
    };
    const selectedMode=()=> (window.__BAG_FORCE_DEMO===true)?'Demo':'Live';

    function getBalances(){
      const sess=(window.__bagSession && window.__bagSession.get && window.__bagSession.get())||{};
      const bag=Number(sess.bag)||0;
      let xrp=Number(sess.xrp);
      if(!(xrp>0)){
        const {bagUsd,xrpUsd}=PR();
        xrp = (bagUsd>0 && xrpUsd>0) ? bag*(bagUsd/xrpUsd) : 0;
      }
      return {bag,xrp};
    }

    const currentBet=()=>{
      const v=parseFloat(betQtyEl?.value||'0');
      return (Number.isFinite(v)&&v>0)? v : 0;
    };

    function render(){
      const ccy=currentCurrency();
      const {bag,xrp}=getBalances();
      if(modeLbl) modeLbl.textContent=selectedMode();
      if(betLbl)  betLbl.textContent=String(Math.floor(currentBet())||0);
      if(lastLbl) lastLbl.textContent=String(window.__DICE_LAST__||'—');
      if(balLbl && ccyLbl){
        if(ccy==='XRP'){ balLbl.textContent=fmtQty(xrp); ccyLbl.textContent='XRP'; }
        else           { balLbl.textContent=fmtQty(bag); ccyLbl.textContent='BAG'; }
      }
    }

    ['input','change'].forEach(ev=> betQtyEl?.addEventListener(ev, render));
    curToggle?.addEventListener('change', render);

    ['bag:sessionStarted','bag:sessionToppedUp','bag:sessionEnded','bag:sessionChanged',
     'bag:pricesUpdated','bag:walletConnected','bag:walletDisconnected',
     'bag:diceResult','bag:hudRefresh'].forEach(n=> on(n, render));

    render(); setTimeout(render,300); setTimeout(render,1200);
  }

  w.BAG = Object.assign(w.BAG||{}, { hud:{ mount }});
})(window);
</script>
