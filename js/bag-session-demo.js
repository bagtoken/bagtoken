<script>
(function(w){
  const { PR, emit, fmtUsd, fmtQty } = w.BAG;
  const DEMO_BAL_KEY='__bag_demo_bag_v2';
  const DEMO_INIT_KEY='__bag_demo_init_v2';
  const START_USD=2000;

  const getBag=()=>{ try{ const n=Number(localStorage.getItem(DEMO_BAL_KEY)); return Number.isFinite(n)&&n>0?n:0; }catch{ return 0; } };
  const setBag=(v)=>{ try{ localStorage.setItem(DEMO_BAL_KEY, String(Math.max(0, Number(v)||0))); }catch{} };

  function trySeedExact(){
    if(localStorage.getItem(DEMO_INIT_KEY)) return true;
    const { bagUsd } = PR(); if(!(bagUsd>0)) return false;
    const startBag = Math.round((START_USD/bagUsd)*1e9)/1e9;
    setBag(startBag); localStorage.setItem(DEMO_INIT_KEY,'1'); return true;
  }

  const demoSession={
    active:()=>true,
    get:()=>({addr:'demo', bag:getBag(), ts:Date.now()}),
    set:()=>{},
    spend(b){ const cur=getBag(); if(!(b>0)||cur<b) return false; setBag(cur-b); emit('bag:sessionChanged'); return true; },
    credit(b){ if(!(b>0)) return false; setBag(getBag()+b); emit('bag:sessionChanged'); return true; }
  };

  function enableDemo({statusSelector, rollButtonSelector}={}){
    try{ Object.defineProperty(w,'__BAG_FORCE_DEMO',{value:true, configurable:true}); }catch{ w.__BAG_FORCE_DEMO=true; }
    w.__bagSession = demoSession;

    const statusEl = statusSelector ? document.querySelector(statusSelector) : null;
    const rollBtn  = rollButtonSelector ? document.querySelector(rollButtonSelector) : null;

    const paint=()=>{
      const b=getBag(); const {bagUsd,xrpUsd}=PR();
      const usd=b*(bagUsd||0);
      const xrp=(bagUsd>0&&xrpUsd>0)? b*(bagUsd/xrpUsd) : 0;
      if(statusEl){
        statusEl.innerHTML = `Practice: <span style="color:#2fbf6b">${fmtQty(b)} BAG</span>` +
          (xrp?` · <span style="color:#cfe6d8">${fmtQty(xrp)} XRP</span>`:'') +
          (usd?` <span class="micro" style="opacity:.8">(${fmtUsd(usd)})</span>`:'');
      }
    };

    const seeded = trySeedExact();
    if(rollBtn) rollBtn.disabled=!seeded;
    paint();

    addEventListener('bag:pricesUpdated', ()=>{
      if(!localStorage.getItem(DEMO_INIT_KEY)){
        const ok=trySeedExact();
        if(ok && rollBtn) rollBtn.disabled=false;
      }
      paint();
    });
    addEventListener('bag:sessionChanged', paint);
  }

  function enableLive(){ w.__BAG_FORCE_DEMO=false; emit('bag:pricesUpdated'); }

  w.BAG = Object.assign(w.BAG||{}, { enableDemo, enableLive });
})(window);
</script>
