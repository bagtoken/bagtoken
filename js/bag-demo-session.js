/*!
 * $BAG — Universal Demo Session v2 (shared across all games)
 * - Seeds EXACT $2,000 practice balance in BAG using live/cached price (fallback if needed)
 * - Exposes: window.__bagSession { mode:'demo', active(), get(), spend(bag), credit(bag) }
 * - Honors ?live=1 and won't overwrite an existing live session
 * - Updates HUD via 'bag:hudRefresh' and mirrors status in #sessionStatus if present
 */

(function(){
  // ---- Config / keys ----
  const DEMO_BAL_KEY   = '__bag_demo_bag_v2';   // Stored BAG balance
  const DEMO_INIT_KEY  = '__bag_demo_init_v2';  // Seed marker
  const START_USD      = 2000;                  // EXACT $2,000
  const PRICE_RETRY_MS = 500;                   // wait between price checks for first seed
  const PRICE_RETRY_COUNT = 20;                 // ~10s total
  const FALLBACK_BAG_USD  = 0.02;               // used only if no price becomes available

  // ---- URL flag for live mode ----
  const qs = new URLSearchParams(location.search);
  const forceLive = qs.get('live') === '1';

  // ---- Storage helpers ----
  function getBag(){ try{ const n = Number(localStorage.getItem(DEMO_BAL_KEY)); return Number.isFinite(n) && n>0 ? n : 0; }catch{ return 0; } }
  function setBag(v){ try{ localStorage.setItem(DEMO_BAL_KEY, String(Math.max(0, Number(v)||0))); }catch{} }
  function isSeeded(){ try{ return !!localStorage.getItem(DEMO_INIT_KEY); }catch{ return false; } }
  function markSeeded(){ try{ localStorage.setItem(DEMO_INIT_KEY, '1'); }catch{} }
  function clearSeed(){ try{ localStorage.removeItem(DEMO_INIT_KEY); }catch{} }

  // ---- Price lookup (uses live __PRICES__ if present, else your caches) ----
  function currentBagUsd(){
    const live = Number(window.__PRICES__?.bagUsd || 0);
    if (live > 0) return live;
    try{
      const lastLive = JSON.parse(localStorage.getItem('bag_last_live_v1')||'null');
      if (lastLive?.v?.bagUsd > 0) return Number(lastLive.v.bagUsd);
      const viewCache = JSON.parse(localStorage.getItem('bag_prices_v8')||'null');
      if (viewCache?.v?.bagUsd > 0) return Number(viewCache.v.bagUsd);
    }catch{}
    return 0;
  }

  // ---- Seeding logic ----
  function seedFromPx(px){
    const bagAmt = START_USD / px;
    setBag(bagAmt);
    markSeeded();
    try{
      window.dispatchEvent(new CustomEvent('bag:sessionStarted', { detail:{ mode:'demo' }}));
      window.dispatchEvent(new CustomEvent('bag:hudRefresh'));
    }catch{}
  }

  function tryImmediateSeed(){
    if (isSeeded()) return true;
    const px = currentBagUsd();
    if (px > 0){
      seedFromPx(px);
      return true;
    }
    return false;
  }

  function seedWithBackoffAndFallback(){
    if (tryImmediateSeed()) return;
    let tries = 0;
    const iv = setInterval(()=>{
      if (tryImmediateSeed() || ++tries >= PRICE_RETRY_COUNT){
        clearInterval(iv);
        if (!isSeeded()){ // final fallback so user can still play
          seedFromPx(FALLBACK_BAG_USD);
        }
      }
    }, PRICE_RETRY_MS);
  }

  // ---- Demo session facade (shared across all games) ----
  const demoSession = {
    mode: 'demo',
    active: ()=> true,
    get: ()=> ({ addr:'demo', bag:getBag(), ts:Date.now() }),
    spend: (bag)=>{
      const b = getBag();
      if (!(bag>0) || b < bag) return false;
      setBag(b - bag);
      try{ window.dispatchEvent(new CustomEvent('bag:hudRefresh')); }catch{}
      return true;
    },
    credit: (bag)=>{
      if (!(bag>0)) return false;
      setBag(getBag() + bag);
      try{ window.dispatchEvent(new CustomEvent('bag:hudRefresh')); }catch{}
      return true;
    }
  };

  // ---- Optional status helper any page can use ----
  function fmt(n, max=6){ const x=Number(n); return Number.isFinite(x) ? x.toLocaleString(undefined,{maximumFractionDigits:max}) : '—'; }
  function usd(n){ return '$'+(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
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

  // ---- Mode handling ----
  function enableDemo(){
    // If a live session is already present, don't overwrite it
    if (window.__bagSession && window.__bagSession.mode === 'live'){
      window.__BAG_FORCE_DEMO = false;
      window.dispatchEvent(new CustomEvent('bag:pricesUpdated'));
      return;
    }
    try{ Object.defineProperty(window,'__BAG_FORCE_DEMO',{value:true, configurable:true}); }catch{ window.__BAG_FORCE_DEMO = true; }
    window.__bagSession = demoSession;

    // Seed now (or wait a bit for prices), then fallback if needed
    if (!isSeeded()){
      if (!tryImmediateSeed()){
        seedWithBackoffAndFallback();
      }
    }

    // Keep optional status label fresh
    const statusEl = document.getElementById('sessionStatus');
    const render = ()=>{ if (statusEl) window.__bagDemoHelpers.renderStatus(statusEl); };
    addEventListener('bag:pricesUpdated', render);
    render();

    // Handy console helpers for QA
    window.__bagDemo = {
      balance(){ return { bag:getBag() }; },
      reseedFromPrice(){ clearSeed(); const px=currentBagUsd(); if(px>0){ seedFromPx(px); console.log('[bag-demo] reseeded from price, BAG=', getBag()); } else { console.warn('[bag-demo] no price yet'); } },
      forceFallbackSeed(){ clearSeed(); seedFromPx(FALLBACK_BAG_USD); console.log('[bag-demo] seeded via fallback, BAG=', getBag()); },
      clearAll(){ try{ localStorage.removeItem(DEMO_BAL_KEY); localStorage.removeItem(DEMO_INIT_KEY); }catch{}; window.dispatchEvent(new CustomEvent('bag:hudRefresh')); }
    };
  }

  function enableLive(){
    window.__BAG_FORCE_DEMO = false;
    window.dispatchEvent(new CustomEvent('bag:pricesUpdated'));
  }

  if (forceLive) enableLive(); else enableDemo();

  // ---- Cross-tab sync + price tick mirroring ----
  addEventListener('storage', (e)=>{
    if (!e) return;
    if (e.key === DEMO_BAL_KEY || e.key === DEMO_INIT_KEY){
      try{ window.dispatchEvent(new CustomEvent('bag:hudRefresh')); }catch{}
      const el = document.getElementById('sessionStatus');
      if (el) window.__bagDemoHelpers.renderStatus(el);
    }
  });

  addEventListener('bag:pricesUpdated', ()=>{
    const el = document.getElementById('sessionStatus');
    if (window.__BAG_FORCE_DEMO && el) window.__bagDemoHelpers.renderStatus(el);
  });
})();
