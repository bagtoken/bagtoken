<script>
(function(){
  const qs = new URLSearchParams(location.search);
  const forceLive = qs.get('live') === '1';

  const DEMO_BAL_KEY  = '__bag_demo_bag_v2'; // demo BAG balance (shared across games)
  const DEMO_INIT_KEY = '__bag_demo_init_v2';// seed marker
  const START_USD     = 2000;                // exact $2,000

  // Helpers: load/save demo BAG
  function getBag(){
    try{
      const n = Number(localStorage.getItem(DEMO_BAL_KEY));
      return Number.isFinite(n) && n > 0 ? n : 0;
    }catch{ return 0; }
  }
  function setBag(v){
    try{ localStorage.setItem(DEMO_BAL_KEY, String(Math.max(0, Number(v)||0))); }catch{}
  }

  // Try to find a BAG/USD price before first live tick
  function getCachedBagUsd(){
    try{
      const lastLive = JSON.parse(localStorage.getItem('bag_last_live_v1')||'null');
      if (lastLive?.v?.bagUsd>0) return Number(lastLive.v.bagUsd);
      const viewCache = JSON.parse(localStorage.getItem('bag_prices_v8')||'null');
      if (viewCache?.v?.bagUsd>0) return Number(viewCache.v.bagUsd);
    }catch{}
    return 0;
  }

  // Seed the shared practice balance to $2,000 worth of BAG
  function ensureSeedNowOrWhenReady(){
    if (localStorage.getItem(DEMO_INIT_KEY)) return true;
    const live   = Number(window.__PRICES__?.bagUsd||0);
    const cached = getCachedBagUsd();
    const bagUsd = live>0 ? live : (cached>0 ? cached : 0);
    if (bagUsd>0){
      setBag(START_USD / bagUsd);
      localStorage.setItem(DEMO_INIT_KEY,'1');
      try{
        window.dispatchEvent(new CustomEvent('bag:sessionStarted',{detail:{mode:'demo'}}));
        window.dispatchEvent(new CustomEvent('bag:hudRefresh'));
      }catch{}
      return true;
    }
    return false;
  }

  // Idempotent demo session object (now includes mode:'demo')
  const demoSession = {
    mode: 'demo',
    active: ()=> true,
    get:    ()=> ({ addr:'demo', bag:getBag(), ts:Date.now() }),
    spend:  (bag)=>{
      const b = getBag();
      if(!(bag>0) || b<bag) return false;
      setBag(b-bag);
      try{ window.dispatchEvent(new CustomEvent('bag:hudRefresh')); }catch{}
      return true;
    },
    credit: (bag)=>{
      if(!(bag>0)) return false;
      setBag(getBag()+bag);
      try{ window.dispatchEvent(new CustomEvent('bag:hudRefresh')); }catch{}
      return true;
    }
  };

  function enableDemo(){
    // Do not override an existing live session set by another game/page
    try{
      if (window.__bagSession && window.__bagSession.mode === 'live') {
        window.__BAG_FORCE_DEMO = false;
        window.dispatchEvent(new CustomEvent('bag:pricesUpdated'));
        return;
      }
    }catch{}

    // Mark this page as demo unless someone explicitly forced live
    try{ Object.defineProperty(window,'__BAG_FORCE_DEMO',{value:true, configurable:true}); }
    catch{ window.__BAG_FORCE_DEMO = true; }

    // Only define __bagSession if not already a demo session
    if (!window.__bagSession || window.__bagSession.mode !== 'demo') {
      window.__bagSession = demoSession;
    }

    // Seed immediately if we can, else wait for first price update
    const seeded = ensureSeedNowOrWhenReady();
    addEventListener('bag:pricesUpdated', ()=>{
      if(!localStorage.getItem(DEMO_INIT_KEY)) ensureSeedNowOrWhenReady();
    });

    // Optional tiny helper for a status line (Practice: X BAG · Y XRP · $Z)
    window.__bagDemoHelpers = {
      fmt(n){
        if(!Number.isFinite(n)) return '—';
        if(Math.abs(n)>=1) return n.toLocaleString(undefined,{maximumFractionDigits:4});
        if(Math.abs(n)>=1e-2) return n.toLocaleString(undefined,{maximumFractionDigits:6});
        if(Math.abs(n)>=1e-4) return n.toLocaleString(undefined,{maximumFractionDigits:8});
        return n.toLocaleString(undefined,{maximumFractionDigits:10});
      },
      fmtUsd(n){ return '$'+(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); },
      renderStatus(el){
        if(!el) return;
        const bag = getBag();
        const bagUsd=(window.__PRICES__?.bagUsd||0)*bag;
        const xrpUsd=(window.__PRICES__?.xrpUsd||0);
        const xrp = (xrpUsd>0 && window.__PRICES__?.bagUsd>0) ? (bag * (window.__PRICES__.bagUsd/xrpUsd)) : 0;
        el.innerHTML = `Practice: <span style="color:#2fbf6b">${this.fmt(bag)} BAG</span>` +
          (xrp?` · <span style="color:#a8f">${this.fmt(xrp)} XRP</span>`:'') +
          (bagUsd?` · <span class="micro" style="opacity:.85">${this.fmtUsd(bagUsd)}</span>`:'');
      }
    };
  }

  function enableLive(){
    window.__BAG_FORCE_DEMO = false;
    // Do not touch an existing live session object if another game/page owns it
    if (!window.__bagSession || window.__bagSession.mode !== 'live') {
      // leave as-is; your live session bootstrapper should attach __bagSession
    }
    window.dispatchEvent(new CustomEvent('bag:pricesUpdated'));
  }

  // Respect ?live=1 on this page; otherwise enable demo — BUT without clobbering a live session
  if (forceLive) enableLive(); else enableDemo();

  // Keep a status label (if present) fresh
  addEventListener('bag:pricesUpdated', ()=>{
    const el = document.getElementById('sessionStatus');
    if (window.__BAG_FORCE_DEMO && window.__bagDemoHelpers && el) window.__bagDemoHelpers.renderStatus(el);
  });
})();
</script>
