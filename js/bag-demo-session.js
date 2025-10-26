<script>
(function(){
  const qs = new URLSearchParams(location.search);
  const forceLive = qs.get('live') === '1';

  const DEMO_BAL_KEY  = '__bag_demo_bag_v2'; // shared demo BAG balance
  const DEMO_INIT_KEY = '__bag_demo_init_v2';// seed flag
  const START_USD     = 2000;                // seed to $2,000
  const FALLBACK_BAG_USD = 0.02;            // if no price, assume $0.02/BAG (=> 100,000 BAG)

  // --- storage helpers ---
  const getBag = () => {
    try{ const n = Number(localStorage.getItem(DEMO_BAL_KEY)); return Number.isFinite(n)&&n>0?n:0; }catch{ return 0; }
  };
  const setBag = (v) => {
    try{ localStorage.setItem(DEMO_BAL_KEY, String(Math.max(0, Number(v)||0))); }catch{}
  };

  // --- cached pricing (for first paint) ---
  function getCachedBagUsd(){
    try{
      const lastLive = JSON.parse(localStorage.getItem('bag_last_live_v1')||'null');
      if (lastLive?.v?.bagUsd>0) return Number(lastLive.v.bagUsd);
      const viewCache = JSON.parse(localStorage.getItem('bag_prices_v8')||'null');
      if (viewCache?.v?.bagUsd>0) return Number(viewCache.v.bagUsd);
    }catch{}
    return 0;
  }

  // --- seed to $2,000 worth of BAG (with fallback) ---
  function seedToStart(){
    const live   = Number(window.__PRICES__?.bagUsd || 0);
    const cached = getCachedBagUsd();
    const bagUsd = (live>0 ? live : (cached>0 ? cached : FALLBACK_BAG_USD));
    if (!(bagUsd>0)) return false;
    const bagAmt = START_USD / bagUsd;
    setBag(bagAmt);
    localStorage.setItem(DEMO_INIT_KEY, '1');
    try{
      window.dispatchEvent(new CustomEvent('bag:sessionStarted', { detail: { mode:'demo' }}));
      window.dispatchEvent(new CustomEvent('bag:hudRefresh'));
    }catch{}
    return true;
  }

  // --- demo session object (with mode, events) ---
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
    // If another game/page already owns a live session, do NOT override.
    if (window.__bagSession && window.__bagSession.mode === 'live'){
      window.__BAG_FORCE_DEMO = false;
      window.dispatchEvent(new CustomEvent('bag:pricesUpdated'));
      return;
    }

    // Mark page as demo
    try{ Object.defineProperty(window,'__BAG_FORCE_DEMO',{value:true, configurable:true}); }
    catch{ window.__BAG_FORCE_DEMO = true; }

    // Attach session if not already a demo
    if (!window.__bagSession || window.__bagSession.mode !== 'demo'){
      window.__bagSession = demoSession;
    }

    // Seed immediately if needed; else retry when prices arrive
    if (!localStorage.getItem(DEMO_INIT_KEY)){
      if (!seedToStart()){
        // If no price yet, retry a few times, then hard fallback
        let tries = 0, max = 15; // ~7.5s @ 500ms
        const iv = setInterval(()=>{
          if (seedToStart() || ++tries>=max){
            clearInterval(iv);
            if (!localStorage.getItem(DEMO_INIT_KEY)){
              // last-resort: force fallback seed
              const bagAmt = START_USD / FALLBACK_BAG_USD;
              setBag(bagAmt);
              localStorage.setItem(DEMO_INIT_KEY,'1');
              try{
                window.dispatchEvent(new CustomEvent('bag:sessionStarted', { detail: { mode:'demo' }}));
                window.dispatchEvent(new CustomEvent('bag:hudRefresh'));
              }catch{}
            }
          }
        }, 500);
      }
    }

    // Optional status line helper
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
    // Leave __bagSession to your live bootstrapper
    window.dispatchEvent(new CustomEvent('bag:pricesUpdated'));
  }

  if (forceLive) enableLive(); else enableDemo();

  // Keep a status label (if present) fresh
  addEventListener('bag:pricesUpdated', ()=>{
    const el = document.getElementById('sessionStatus');
    if (window.__BAG_FORCE_DEMO && window.__bagDemoHelpers && el) window.__bagDemoHelpers.renderStatus(el);
  });

  // Helpful console breadcrumb
  try{
    console.debug('[bag-demo] mode=%s, seeded=%s, BAG=%o',
      (window.__BAG_FORCE_DEMO?'demo':'live'),
      !!localStorage.getItem(DEMO_INIT_KEY),
      getBag()
    );
  }catch{}
})();
</script>
