<script>
/*!
 * $BAG — Universal Demo Session v2
 * - Shared across all games
 * - Seeds EXACT $2,000 practice balance in BAG (per latest/cached price, else fallback)
 * - Exposes window.__bagSession { mode:'demo', active(), get(), spend(), credit() }
 * - Plays nice with live mode and other games (won’t overwrite a live session)
 */

(function(){
  // --- Config / keys ---
  const DEMO_BAL_KEY   = '__bag_demo_bag_v2';   // Stored BAG balance (number)
  const DEMO_INIT_KEY  = '__bag_demo_init_v2';  // Seed marker
  const START_USD      = 2000;                  // EXACT $2,000 seed
  const MIN_USD        = 1, MAX_USD = 2000;

  const PRICE_RETRY_MS    = 500;   // wait between price checks for first seed
  const PRICE_RETRY_COUNT = 20;    // 10s max wait before fallback
  const FALLBACK_BAG_USD  = 0.02;  // only used if no live/cached price appears in time

  // --- Helpers: storage + number formatting ---
  function getBag(){ try{ const n=Number(localStorage.getItem(DEMO_BAL_KEY)); return Number.isFinite(n)&&n>0?n:0; }catch{ return 0; } }
  function setBag(v){ try{ localStorage.setItem(DEMO_BAL_KEY, String(Math.max(0, Number(v)||0))); }catch{} }
  function seeded(){ return !!localStorage.getItem(DEMO_INIT_KEY); }
  function markSeeded(){ try{ localStorage.setItem(DEMO_INIT_KEY, '1'); }catch{} }
  function unseed(){ try{ localStorage.removeItem(DEMO_INIT_KEY); }catch{} }

  function fmt(n, max=6){
    const x = Number(n); if(!Number.isFinite(x)) return '—';
    return x.toLocaleString(undefined,{maximumFractionDigits:max});
  }
  function usd(n){ return '$'+(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }

  // --- Price access: live first, else caches used by your prices script ---
  function currentBagUsd(){
    const live = Number(window.__PRICES__?.bagUsd||0);
    if (live>0) return live;
    try{
      const lastLive = JSON.parse(localStorage.getItem('bag_last_live_v1')||'null');
      if (lastLive?.v?.bagUsd>0) return Number(lastLive.v.bagUsd);
      const viewCache = JSON.parse(localStorage.getItem('bag_prices_v8')||'null');
      if (viewCache?.v?.bagUsd>0) return Number(viewCache.v.bagUsd);
    }catch{}
    return 0;
  }

  // --- Seeding logic ---
  function seedFrom(px){
    const bagAmt = START_USD / px;
    setBag(bagAmt);
    markSeeded();
    try{
      window.dispatchEvent(new CustomEvent('bag:sessionStarted', { detail:{ mode:'demo' }}));
      window.dispatchEvent(new CustomEvent('bag:hudRefresh'));
    }catch{}
  }

  function tryImmediateSeed(){
    if (seeded()) return true;
    const px = currentBagUsd();
    if (px>0){ seedFrom(px); return true; }
    return false;
  }

  function seedWithBackoff(){
    if (tryImmediateSeed()) return;
    let tries = 0;
    const iv = setInterval(()=>{
      if (tryImmediateSeed() || ++tries>=PRICE_RETRY_COUNT){
        clearInterval(iv);
        if (!seeded()){ // final fallback so users can play immediately
          seedFrom(FALLBACK_BAG_USD);
        }
      }
    }, PRICE_RETRY_MS);
  }

  // --- Demo session facade shared by all games ---
  const demoSession = {
    mode: 'demo',
    active: ()=> true,
    get: ()=> ({ addr:'demo', bag:getBag(), ts:Date.now() }),
    spend: (bag)=>{
      const b = getBag();
      if (!(bag>0) || b<bag) return false;
      setBag(b-bag);
      try{
        window.dispatchEvent(new CustomEvent('bag:hudRefresh'));
      }catch{}
      return true;
    },
    credit: (bag)=>{
      if (!(bag>0)) return false;
      setBag(getBag()+bag);
      try{
        window.dispatchEvent(new CustomEvent('bag:hudRefresh'));
      }catch{}
      return true;
    }
  };

  // Small status helper any page can use
  window.__bagDemoHelpers = {
    fmt, usd,
    renderStatus(el){
      if(!el) return;
      const bag = getBag();
      const P = window.__PRICES__ || {};
      const bagUsd = (P.bagUsd||0) * bag;
      const xrpUsd = (P.xrpUsd||0);
      const xrp = (xrpUsd>0 && P.bagUsd>0) ? (bag * (P.bagUsd/xrpUsd)) : 0;
      el.innerHTML =
        `Practice: <span style="color:#2fbf6b">${fmt(bag)}</span> <span class="micro">BAG</span>` +
        (xrp?` · <span style="color:#a8f">${fmt(xrp)}</span> <span class="micro">XRP</span>`:'') +
        (bagUsd?` · <span class="micro" style="opacity:.85">${usd(bagUsd)}</span>`:'');
    }
  };

  // --- Mode control: obey ?live=1 and avoid clobbering a live session ---
  const qs = new URLSearchParams(location.search);
  const forceLive = qs.get('live') === '1';

  function enableDemo(){
    // If some other code already set a live session, don't overwrite it
    if (window.__bagSession && window.__bagSession.mode === 'live'){
      window.__BAG_FORCE_DEMO = false;
      window.dispatchEvent(new CustomEvent('bag:pricesUpdated'));
      return;
    }
    try{ Object.defineProperty(window,'__BAG_FORCE_DEMO',{value:true, configurable:true}); }catch{ window.__BAG_FORCE_DEMO = true; }
    window.__bagSession = demoSession;

    // Seed immediately if possible; else wait for price updates, then fallback
    if (!seeded()){
      if (!tryImmediateSeed()){
        seedWithBackoff();
      }
    }

    // Keep the optional page status fresh
    const statusEl = document.getElementById('sessionStatus');
    function render(){ if (statusEl) window.__bagDemoHelpers.renderStatus(statusEl); }
    addEventListener('bag:pricesUpdated', render);
    render();

    // Handy console utilities for QA
    window.__bagDemo = {
      forceSeedFallback(){ unseed(); seedFrom(FALLBACK_BAG_USD); console.log('[bag-demo] reseeded via fallback; BAG=', getBag()); },
      reseedFromLive(){ unseed(); const px=currentBagUsd(); if(px>0){ seedFrom(px); console.log('[bag-demo] reseeded from price; BAG=', getBag()); } else { console.warn('[bag-demo] no price yet'); } },
      balance(){ return { bag:getBag() }; },
      clear(){ try{ localStorage.removeItem(DEMO_BAL_KEY); localStorage.removeItem(DEMO_INIT_KEY); }catch{}; window.dispatchEvent(new CustomEvent('bag:hudRefresh')); }
    };
  }

  function enableLive(){
    window.__BAG_FORCE_DEMO = false;
    window.dispatchEvent(new CustomEvent('bag:pricesUpdated'));
  }

  if (forceLive) enableLive(); else enableDemo();

  // Cross-tab sync: refresh HUD if another tab changes the demo balance
  addEventListener('storage', (e)=>{
    if (e && (e.key === DEMO_BAL_KEY || e.key === DEMO_INIT_KEY)){
      try{ window.dispatchEvent(new CustomEvent('bag:hudRefresh')); }catch{}
    }
  });

  // Also refresh status when prices tick (mirrors the USD/XRP equivalents)
  addEventListener('bag:pricesUpdated', ()=>{
    const el = document.getElementById('sessionStatus');
    if (window.__BAG_FORCE_DEMO && el) window.__bagDemoHelpers.renderStatus(el);
  });
})();
</script>
