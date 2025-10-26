<script>
(function(){
  const qs = new URLSearchParams(location.search);
  const forceLive = qs.get('live') === '1'; // add ?live=1 to force live; otherwise DEMO

  const DEMO_BAL_KEY  = '__bag_demo_bag_v2'; // BAG balance
  const DEMO_INIT_KEY = '__bag_demo_init_v2';// seed marker
  const START_USD     = 2000;                // EXACT $2,000

  // --- storage helpers
  function getBag(){ try{ const n=Number(localStorage.getItem(DEMO_BAL_KEY)); return Number.isFinite(n)&&n>0?n:0; }catch{ return 0; } }
  function setBag(v){ try{ localStorage.setItem(DEMO_BAL_KEY, String(Math.max(0, Number(v)||0))); }catch{} }
  function readCache(key){
    try{
      const raw = JSON.parse(localStorage.getItem(key)||'null');
      if (!raw) return null;
      // support both shapes: {t, v:{bagUsd,xrpUsd}}  OR  {bagUsd,xrpUsd}
      if (raw && typeof raw==='object' && raw.v && typeof raw.v==='object') return raw.v;
      return raw;
    }catch{ return null; }
  }

  // --- price probes
  function liveBagUsd(){ return Number(window.__PRICES__?.bagUsd||0) || 0; }
  function cachedBagUsd(){
    const lastLive = readCache('bag_last_live_v1');
    if (lastLive?.bagUsd>0) return Number(lastLive.bagUsd);
    const viewCache = readCache('bag_prices_v8');
    if (viewCache?.bagUsd>0) return Number(viewCache.bagUsd);
    return 0;
  }

  // --- seeding
  function trySeed(){
    if (localStorage.getItem(DEMO_INIT_KEY)) return true;
    const bagUsd = liveBagUsd() || cachedBagUsd();
    if (bagUsd>0){
      setBag(START_USD / bagUsd);
      localStorage.setItem(DEMO_INIT_KEY,'1');
      // Announce so HUDs refresh immediately
      window.dispatchEvent(new CustomEvent('bag:sessionStarted', { detail:{ mode:'demo' } }));
      window.dispatchEvent(new CustomEvent('bag:hudRefresh'));
      // Show practice status if present
      const el = document.getElementById('sessionStatus');
      if (el) renderStatus(el);
      return true;
    }
    return false;
  }

  // --- demo session object
  const demoSession = {
    mode: 'demo',
    active: ()=> true,
    get:    ()=> ({ addr:'demo', bag:getBag(), ts:Date.now(), mode:'demo' }),
    spend:  (bag)=>{ const b=getBag(); if(!(bag>0)||b<bag) return false; setBag(b-bag); window.dispatchEvent(new CustomEvent('bag:hudRefresh')); return true; },
    credit: (bag)=>{ if(!(bag>0)) return false; setBag(getBag()+bag); window.dispatchEvent(new CustomEvent('bag:hudRefresh')); return true; }
  };

  // --- pretty fmt + status line
  function nf(n, d){ return (Number(n)||0).toLocaleString(undefined,{maximumFractionDigits:d}); }
  function fmt(n){
    if(!Number.isFinite(n)) return '—';
    if(Math.abs(n)>=1) return nf(n,4);
    if(Math.abs(n)>=1e-2) return nf(n,6);
    if(Math.abs(n)>=1e-4) return nf(n,8);
    return nf(n,10);
  }
  function fmtUsd(n){ return '$'+(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function renderStatus(el){
    const bag = getBag();
    const bagUsd=(window.__PRICES__?.bagUsd||0)*bag;
    const xrpUsd=(window.__PRICES__?.xrpUsd||0);
    const xrp = (xrpUsd>0 && window.__PRICES__?.bagUsd>0) ? (bag * (window.__PRICES__.bagUsd/xrpUsd)) : 0;
    el.innerHTML = `Practice: <span style="color:#2fbf6b">${fmt(bag)} BAG</span>` +
      (xrp?` · <span style="color:#a8f">${fmt(xrp)} XRP</span>`:'') +
      (bagUsd?` · <span class="micro" style="opacity:.85">${fmtUsd(bagUsd)}</span>`:'');
  }

  // --- wire modes
  function enableDemo(){
    try{ Object.defineProperty(window,'__BAG_FORCE_DEMO',{value:true, configurable:true}); }catch{ window.__BAG_FORCE_DEMO=true; }
    window.__bagSession = demoSession;

    // seed now if possible
    trySeed();
    // seed on first/any price tick
    addEventListener('bag:pricesUpdated', ()=>{ if(!localStorage.getItem(DEMO_INIT_KEY)) trySeed(); });

    // watchdog: if still not seeded after a few seconds, retry a few times
    let attempts = 0;
    const iv = setInterval(()=>{
      if (localStorage.getItem(DEMO_INIT_KEY) || ++attempts>8){ clearInterval(iv); return; }
      trySeed();
    }, 750);

    // practice label autorefresh
    addEventListener('bag:pricesUpdated', ()=>{
      const el = document.getElementById('sessionStatus');
      if (el) renderStatus(el);
    });

    // cross-tab updates
    addEventListener('storage', (e)=>{
      if (e && e.key === DEMO_BAL_KEY){ window.dispatchEvent(new CustomEvent('bag:hudRefresh')); }
    });

    // tiny debug helper
    window.__bagDemoDebug = {
      mode: ()=>window.__BAG_FORCE_DEMO,
      bag:  ()=>getBag(),
      prices: ()=>({bagUsd:window.__PRICES__?.bagUsd||0, xrpUsd:window.__PRICES__?.xrpUsd||0}),
      seed: ()=>{ localStorage.removeItem(DEMO_INIT_KEY); return trySeed(); }
    };
  }

  function enableLive(){
    window.__BAG_FORCE_DEMO=false;
    window.dispatchEvent(new CustomEvent('bag:pricesUpdated'));
    window.dispatchEvent(new CustomEvent('bag:hudRefresh'));
  }

  if (forceLive) enableLive(); else enableDemo();
})();
</script>
