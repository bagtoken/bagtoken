<script>
(function(){
  const PRICE_REFRESH_MS = 15000;
  const FETCH_TIMEOUT_MS = 8000;
  const LIVE_CACHE_TTL_MS = 24*60*60*1000;
  const VIEW_CACHE_TTL_MS = 6*60*60*1000;

  const BAG_ISSUER = 'rNeYbfb9EDV8c7mNfUuooEEYYzMcEuDFbr';
  const BAG_CODE   = 'BAG';

  const VIEW_CACHE_KEY = 'bag_prices_v8';
  const LAST_LIVE_KEY  = 'bag_last_live_v1';
  const XRP_KEY        = 'xrp_usd';

  const PRICES = (window.__PRICES__ = { bagUsd:0, xrpUsd:0, source:'—', ts:0 });

  function cacheSet(k,v){ try{ localStorage.setItem(k, JSON.stringify({t:Date.now(), v})); }catch{} }
  function cacheGet(k, ttlMs){
    try{
      const o=JSON.parse(localStorage.getItem(k)||'null');
      if(!o) return null;
      return (Date.now() - (o.t||0)) <= ttlMs ? o.v : null;
    }catch{ return null; }
  }
  function timedFetch(url, opts={}, timeout=FETCH_TIMEOUT_MS){
    const ctrl = new AbortController();
    const id = setTimeout(()=>ctrl.abort(new Error('timeout')), timeout);
    try{
      const u = new URL(url, location.origin);
      u.searchParams.set('_ts', Date.now().toString());
      return fetch(u.toString(), {
        ...opts, headers:{Accept:'application/json', ...(opts.headers||{})},
        mode:'cors', cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer',
        signal: ctrl.signal
      });
    } finally { setTimeout(()=>clearTimeout(id),0); }
  }

  async function fetchXrpUsdLive(){
    try{
      const r = await timedFetch('https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd');
      if(!r.ok) throw 0;
      const v = (await r.json())?.ripple?.usd;
      if(Number(v)>0){
        PRICES.xrpUsd = Number(v);
        cacheSet(XRP_KEY, PRICES.xrpUsd);
        return true;
      }
    }catch(_){}
    return false;
  }
  function parseXrpAmount(a){ if (a==null) return null; if (typeof a==='string') return Number(a)/1_000_000; if (typeof a==='object' && a.currency==='XRP') return Number(a.value); return null; }
  function parseIouAmount(a){ if (!a || typeof a!=='object') return null; return Number(a.value); }
  async function fetchBagViaAMMLive(){
    const req = { id:1, command:'amm_info', asset:{currency:BAG_CODE,issuer:BAG_ISSUER}, asset2:{currency:'XRP'} };
    const xrpPerBag = await new Promise((resolve)=>{
      const ws = new WebSocket('wss://s1.ripple.com');
      const t = setTimeout(()=>{ try{ws.close();}catch{}; resolve(null); }, 8000);
      ws.onopen = ()=> ws.send(JSON.stringify(req));
      ws.onerror = ()=>{ clearTimeout(t); try{ws.close();}catch{}; resolve(null); };
      ws.onmessage = (ev)=>{
        try{
          const msg = JSON.parse(ev.data);
          if (msg.id!==1 || !msg.result || !msg.result.amm) return;
          clearTimeout(t); try{ws.close();}catch{};
          const amm = msg.result.amm;
          const bagBal = parseIouAmount(amm.amount);
          const xrpBal = parseXrpAmount(amm.amount2);
          if (!(bagBal>0) || !(xrpBal>0)) return resolve(null);
          const price = xrpBal / bagBal;
          if (!(price>0) || !isFinite(price)) return resolve(null);
          resolve(price);
        }catch{ resolve(null); }
      };
    });
    if (!(xrpPerBag>0) || !(PRICES.xrpUsd>0)) return false;
    PRICES.bagUsd = PRICES.xrpUsd * xrpPerBag;
    PRICES.source = 'live-amm';
    cacheSet(LAST_LIVE_KEY, { bagUsd: PRICES.bagUsd, xrpUsd: PRICES.xrpUsd });
    cacheSet(VIEW_CACHE_KEY, { bagUsd: PRICES.bagUsd, xrpUsd: PRICES.xrpUsd });
    return true;
  }

  function loadLastLiveBundle(){
    const v = cacheGet(LAST_LIVE_KEY, LIVE_CACHE_TTL_MS);
    if (v && Number(v.bagUsd)>0){
      PRICES.bagUsd = Number(v.bagUsd);
      if (Number(v.xrpUsd)>0) PRICES.xrpUsd = Number(v.xrpUsd);
      PRICES.source = 'last-live';
      return true;
    }
    return false;
  }
  function loadViewCache(){
    const v = cacheGet(VIEW_CACHE_KEY, VIEW_CACHE_TTL_MS);
    const x = cacheGet(XRP_KEY, VIEW_CACHE_TTL_MS);
    let ok=false;
    if (v && Number(v.bagUsd)>0){ PRICES.bagUsd = Number(v.bagUsd); if(Number(v.xrpUsd)>0) PRICES.xrpUsd = Number(v.xrpUsd); ok=true; }
    if (!PRICES.xrpUsd && Number(x)>0){ PRICES.xrpUsd = Number(x); ok=true; }
    if (ok && PRICES.source==='—') PRICES.source='last-live';
    return ok;
  }

  async function refresh(){
    const gotX = await fetchXrpUsdLive();
    const gotB = await fetchBagViaAMMLive();
    if (!(gotX && gotB)) { if (!loadLastLiveBundle()) loadViewCache(); }
    window.dispatchEvent(new CustomEvent('bag:pricesUpdated'));
  }

  (async ()=>{ await refresh(); setInterval(refresh, PRICE_REFRESH_MS); })();

  window.addEventListener('storage', (e)=>{
    if (['bag_prices_v8','xrp_usd','bag_last_live_v1'].includes(e.key||'')){
      if (!loadLastLiveBundle()) loadViewCache();
      window.dispatchEvent(new CustomEvent('bag:pricesUpdated'));
    }
  });
})();
</script>
