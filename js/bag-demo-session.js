<script>
(function(){
  const qs = new URLSearchParams(location.search);
  const forceLive = qs.get('live') === '1';

  const DEMO_BAL_KEY  = '__bag_demo_bag_v2'; // BAG balance
  const DEMO_INIT_KEY = '__bag_demo_init_v2';// seed marker
  const START_USD     = 2000;                // EXACT $2,000
  const MIN_USD       = 1, MAX_USD = 2000;

  function getBag(){
    try{
      const n = Number(localStorage.getItem(DEMO_BAL_KEY));
      return Number.isFinite(n) && n > 0 ? n : 0;
    }catch{ return 0; }
  }
  function setBag(v){
    try{
      localStorage.setItem(DEMO_BAL_KEY, String(Math.max(0, Number(v)||0)));
    }catch{}
  }

  // Find a BAG/USD price even before first websocket tick
  function getCachedBagUsd(){
    try{
      // ✅ cache objects are stored plain (no ".v" wrapper)
      const lastLive = JSON.parse(localStorage.getItem('bag_last_live_v1')||'null');
      if (lastLive?.bagUsd > 0) return Number(lastLive.bagUsd);

      const viewCache = JSON.parse(localStorage.getItem('bag_prices_v8')||'null');
      if (viewCache?.bagUsd > 0) return Number(viewCache.bagUsd);
    }catch{}
    return 0;
  }

  function ensureSeedNowOrWhenReady(){
    if (localStorage.getItem(DEMO_INIT_KEY)) return true;

    const live   = Number(window.__PRICES__?.bagUsd || 0);
    const cached = getCachedBagUsd();
    const bagUsd = live > 0 ? live : (cached > 0 ? cached : 0);

    if (bagUsd > 0){
      setBag(START_USD / bagUsd);
      localStorage.setItem(DEMO_INIT_KEY,'1');
      // Let UI know a demo session exists and HUD should refresh
      window.dispatchEvent(new CustomEvent('bag:sessionStarted', { detail:{ mode:'demo' } }));
      window.dispatchEvent(new CustomEvent('bag:hudRefresh'));
      return true;
    }
    return false;
  }

  // demo session object (spend/credit actually change the fake balance)
  const demoSession = {
    mode: 'demo',
    active: ()=> true,
    get:    ()=> ({ addr:'demo', bag:getBag(), ts:Date.now(), mode:'demo' }),
    spend:  (bag)=>{
      const b=getBag();
      if(!(bag>0) || b<bag) return false;
      setBag(b-bag);
      window.dispatchEvent(new CustomEvent('bag:hudRefresh'));
      return true;
    },
    credit: (bag)=>{
      if(!(bag>0)) return false;
      setBag(getBag()+bag);
      window.dispatchEvent(new CustomEvent('bag:hudRefresh'));
      return true;
    }
  };

  function enableDemo(){
    try{
      Object.defineProperty(window,'__BAG_FORCE_DEMO',{value:true, configurable:true});
    }catch{
      window.__BAG_FORCE_DEMO=true;
    }
    window.__bagSession = demoSession;

    // Seed immediately if possible, else after first price update
    const seeded = ensureSeedNowOrWhenReady();
    addEventListener('bag:pricesUpdated', ()=>{
      if(!localStorage.getItem(DEMO_INIT_KEY)) ensureSeedNowOrWhenReady();
    });

    // expose a simple helper for pages that want a status line
    window.__bagDemoHelpers = {
      fmt(n){
        if(!Number.isFinite(n)) return '—';
        if(Math.abs(n)>=1) return n.toLocaleString(undefined,{maximumFractionDigits:4});
        if(Math.abs(n)>=1e-2) return n.toLocaleString(undefined,{maximumFractionDigits:6});
        if(Math.abs(n)>=1e-4) return n.toLocaleString(undefined,{maximumFractionDigits:8});
        return n.toLocaleString(undefined,{maximumFractionDigits:10});
      },
      fmtUsd(n){
        return '$'+(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
      },
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
    window.__BAG_FORCE_DEMO=false;
    window.dispatchEvent(new CustomEvent('bag:pricesUpdated'));
    window.dispatchEvent(new CustomEvent('bag:hudRefresh'));
  }

  if (forceLive) enableLive(); else enableDemo();

  // Keep mirrored USD/XRP numbers fresh in practice label
  addEventListener('bag:pricesUpdated', ()=>{
    const el = document.getElementById('sessionStatus');
    if (window.__BAG_FORCE_DEMO && window.__bagDemoHelpers && el) window.__bagDemoHelpers.renderStatus(el);
  });

  // Cross-tab HUD refresh if another tab updates balance
  addEventListener('storage', (e)=>{
    if (!e) return;
    if (e.key === DEMO_BAL_KEY){
      window.dispatchEvent(new CustomEvent('bag:hudRefresh'));
      const el = document.getElementById('sessionStatus');
      if (el && window.__bagDemoHelpers) window.__bagDemoHelpers.renderStatus(el);
    }
  });
})();
</script>
